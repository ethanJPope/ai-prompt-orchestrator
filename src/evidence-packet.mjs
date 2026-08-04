import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const nonEmptyString = z.string().min(1);
const isoTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);

const generatedUiCheckSchema = z.object({
  passed: z.boolean(),
  generatedBy: z.literal("codex-browser-gates-v1"),
  capturedAt: isoTimestamp,
  evidence: nonEmptyString,
});

export const screenshotEvidenceSchema = z.object({
  stateId: nonEmptyString,
  kind: z.enum(["desktop", "mobile"]),
  format: z.literal("png"),
  path: nonEmptyString,
  requestedViewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  decodedPixels: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  devicePixelRatio: z.number().positive(),
  sourceHash: nonEmptyString,
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  capturedAt: isoTimestamp,
});

export const gateResultSchema = z.object({
  id: nonEmptyString,
  status: z.enum(["passed", "failed", "not-run"]),
  evidence: nonEmptyString,
});

export const reviewerOutcomeSchema = z.object({
  reviewerId: nonEmptyString,
  status: z.enum(["completed", "timed-out", "failed"]),
  durationMs: z.number().int().nonnegative(),
  findingCount: z.number().int().nonnegative().max(3),
  evidence: nonEmptyString,
});

export const evidencePacketDocumentSchema = z.object({
  schemaVersion: z.literal("0.3"),
  correlationId: nonEmptyString,
  taskClass: z.enum(["visual-interface", "general-engineering"]),
  capturedAt: isoTimestamp,
  planHash: z.string().regex(/^[a-f0-9]{64}$/i),
  implementationHash: z.string().regex(/^[a-f0-9]{64}$/i),
  implementationFiles: z.array(nonEmptyString).min(1),
  plannedReviewerIds: z.array(nonEmptyString).length(10),
  discoveryReviewerIds: z.array(nonEmptyString).min(1),
  arbiterReviewerId: nonEmptyString,
  plannedReviewerBudgets: z.record(z.string(), z.number().int().positive()),
  taskSummary: nonEmptyString,
  acceptanceCriteria: z.array(nonEmptyString).min(1),
  changedFiles: z.array(nonEmptyString),
  testResults: z.object({
    passed: z.boolean(),
    commands: z.array(nonEmptyString),
    summary: nonEmptyString,
  }),
  privacyBoundary: z.object({
    passed: z.boolean(),
    summary: nonEmptyString,
  }),
  knownRisks: z.array(nonEmptyString),
  deterministicGateResults: z.array(gateResultSchema),
  reviewerFindings: z.array(reviewerOutcomeSchema),
  screenshots: z.array(screenshotEvidenceSchema),
  browserState: z.object({
    consoleErrors: z.number().int().nonnegative(),
    consoleWarnings: z.number().int().nonnegative(),
    flowsVerified: z.array(nonEmptyString),
  }),
  uiChecks: z
    .object({
      contrast: generatedUiCheckSchema.extend({
        minimumRatio: z.number().positive(),
        failingCount: z.number().int().nonnegative(),
      }),
      targetSizes: generatedUiCheckSchema.extend({
        minimumPx: z.number().positive(),
        failingCount: z.number().int().nonnegative(),
      }),
      overflow: generatedUiCheckSchema.extend({
        horizontalOverflowPx: z.number().nonnegative(),
        verticalOverflowPx: z.number().nonnegative(),
      }),
      requiredStates: generatedUiCheckSchema.extend({
        requiredStateIds: z.array(nonEmptyString).min(1),
        observedStateIds: z.array(nonEmptyString),
      }),
    })
    .nullable(),
  repairPasses: z.number().int().min(0).max(1),
  lastRepairAt: isoTimestamp.nullable(),
  finalStatus: z.enum(["ready", "needs-repair", "blocked"]).nullable(),
});

const REQUIRED_BASE_GATES = ["acceptance-coverage", "tests-and-build", "privacy-boundary"];
const REQUIRED_VISUAL_GATES = ["viewport-evidence", "ui-quality"];

export function evaluateEvidencePacket(packet, { phase = "final" } = {}) {
  if (!["before-visual", "before-arbiter", "final"].includes(phase)) {
    throw new Error(`Unknown evidence validation phase: ${phase}`);
  }
  const parsed = evidencePacketDocumentSchema.parse(packet);
  const failures = [];
  const gateById = new Map(parsed.deterministicGateResults.map((gate) => [gate.id, gate]));
  const plannedIds = new Set(parsed.plannedReviewerIds);
  const outcomeIds = parsed.reviewerFindings.map((outcome) => outcome.reviewerId);
  const uniqueOutcomeIds = new Set(outcomeIds);
  if (uniqueOutcomeIds.size !== outcomeIds.length) failures.push("reviewer outcomes must not contain duplicate IDs");
  if (outcomeIds.some((reviewerId) => !plannedIds.has(reviewerId))) failures.push("reviewer outcome contains an unknown ID");
  if (!plannedIds.has(parsed.arbiterReviewerId)) failures.push("arbiterReviewerId must be in plannedReviewerIds");
  if (parsed.plannedReviewerIds.length !== plannedIds.size) failures.push("planned reviewer IDs must be unique");
  if (!parsed.discoveryReviewerIds.every((reviewerId) => plannedIds.has(reviewerId))) {
    failures.push("discoveryReviewerIds must be in plannedReviewerIds");
  }
  const budgetIds = Object.keys(parsed.plannedReviewerBudgets);
  if (budgetIds.length !== plannedIds.size || budgetIds.some((reviewerId) => !plannedIds.has(reviewerId))) {
    failures.push("plannedReviewerBudgets must contain exactly the planned reviewer IDs");
  }

  for (const gateId of REQUIRED_BASE_GATES) {
    if (gateById.get(gateId)?.status !== "passed") {
      failures.push(`${gateId} must be passed`);
    }
  }
  if (!parsed.testResults.passed) failures.push("tests-and-build evidence is not passing");
  if (!parsed.privacyBoundary.passed) failures.push("privacy boundary evidence is not passing");

  if (parsed.taskClass === "visual-interface") {
    for (const gateId of REQUIRED_VISUAL_GATES) {
      if (gateById.get(gateId)?.status !== "passed") failures.push(`${gateId} must be passed`);
    }
    const desktop = parsed.screenshots.find((shot) => shot.kind === "desktop");
    const mobile = parsed.screenshots.find((shot) => shot.kind === "mobile");
    if (!desktop || !mobile) failures.push("fresh desktop and mobile screenshot evidence is required");
    for (const screenshot of parsed.screenshots) {
      const expectedWidth = Math.round(screenshot.requestedViewport.width * screenshot.devicePixelRatio);
      const expectedHeight = Math.round(screenshot.requestedViewport.height * screenshot.devicePixelRatio);
      if (screenshot.decodedPixels.width !== expectedWidth || screenshot.decodedPixels.height !== expectedHeight) {
        failures.push(`${screenshot.stateId} decoded pixels do not match requested viewport and devicePixelRatio`);
      }
      if (screenshot.sourceHash !== parsed.implementationHash) {
        failures.push(`${screenshot.stateId} source hash does not match implementationHash`);
      }
    }
    if (parsed.repairPasses > 0) {
      if (!parsed.lastRepairAt) failures.push("lastRepairAt is required after a repair");
      else if (parsed.screenshots.some((shot) => shot.capturedAt <= parsed.lastRepairAt)) {
        failures.push("UI screenshots must be recaptured after the last repair");
      }
    }
    if (parsed.browserState.consoleErrors > 0) failures.push("browser console errors are present");
    if (parsed.browserState.consoleWarnings > 0) failures.push("browser console warnings are present");
    const uiChecks = parsed.uiChecks;
    const missingStates = uiChecks
      ? uiChecks.requiredStates.requiredStateIds.filter(
          (stateId) => !uiChecks.requiredStates.observedStateIds.includes(stateId),
        )
      : [];
    if (
      !uiChecks ||
      !uiChecks.contrast.passed ||
      !uiChecks.targetSizes.passed ||
      !uiChecks.overflow.passed ||
      !uiChecks.requiredStates.passed ||
      uiChecks.contrast.failingCount > 0 ||
      uiChecks.targetSizes.failingCount > 0 ||
      uiChecks.overflow.horizontalOverflowPx > 0 ||
      uiChecks.overflow.verticalOverflowPx > 0 ||
      missingStates.length > 0
    ) {
      failures.push("all deterministic UI checks must pass");
    }
  }

  const expectedReviewers = parsed.reviewerFindings.length;
  const requiredReviewerIds = phase === "before-visual"
    ? parsed.discoveryReviewerIds
    : phase === "before-arbiter"
      ? parsed.plannedReviewerIds.filter((reviewerId) => reviewerId !== parsed.arbiterReviewerId)
      : parsed.plannedReviewerIds;
  const missingReviewerIds = requiredReviewerIds.filter((reviewerId) => !uniqueOutcomeIds.has(reviewerId));
  if (missingReviewerIds.length > 0) failures.push(`missing reviewer outcomes: ${missingReviewerIds.join(", ")}`);
  if (parsed.reviewerFindings.some((outcome) => outcome.status !== "completed" && requiredReviewerIds.includes(outcome.reviewerId))) {
    failures.push("every required reviewer must complete");
  }
  if (parsed.reviewerFindings.some((outcome) => outcome.status === "completed" && outcome.durationMs > (parsed.plannedReviewerBudgets[outcome.reviewerId] ?? 0))) {
    failures.push("completed reviewer duration exceeded its budget");
  }
  if (phase === "final" && parsed.reviewerFindings.length !== plannedIds.size) {
    failures.push("final evidence must contain exactly one outcome for every planned reviewer");
  }
  if (phase === "final" && parsed.finalStatus !== "ready") failures.push("finalStatus must be ready");

  return {
    valid: failures.length === 0,
    failures,
    reviewerCount: expectedReviewers,
    requiredGateIds: parsed.taskClass === "visual-interface" ? [...REQUIRED_BASE_GATES, ...REQUIRED_VISUAL_GATES] : REQUIRED_BASE_GATES,
  };
}

export async function hashEvidenceFile(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

export async function hashImplementationFiles(packetPath, implementationFiles) {
  const hash = createHash("sha256");
  for (const implementationFile of [...implementationFiles].sort()) {
    const resolvedPath = await resolveVerifiedEvidencePath(packetPath, implementationFile);
    hash.update(implementationFile);
    hash.update("\0");
    hash.update(await readFile(resolvedPath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function readPngDimensions(filePath) {
  const contents = await readFile(filePath);
  const signature = "89504e470d0a1a0a";
  if (contents.subarray(0, 8).toString("hex") !== signature || contents.length < 24) {
    throw new Error(`Evidence image is not a readable PNG: ${filePath}`);
  }
  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20),
  };
}

export function resolveEvidencePath(packetPath, evidencePath) {
  const slashNormalized = evidencePath.replaceAll("\\", "/");
  if (path.isAbsolute(evidencePath) || path.posix.isAbsolute(slashNormalized) || path.win32.isAbsolute(evidencePath)) {
    throw new Error(`Evidence path must be relative to the packet: ${evidencePath}`);
  }
  const normalized = path.normalize(evidencePath);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`) || slashNormalized === ".." || slashNormalized.startsWith("../")) {
    throw new Error(`Evidence path escapes the packet directory: ${evidencePath}`);
  }
  return path.resolve(path.dirname(packetPath), normalized);
}

export async function resolveVerifiedEvidencePath(packetPath, evidencePath) {
  const candidate = resolveEvidencePath(packetPath, evidencePath);
  const basePath = await realpath(path.dirname(packetPath));
  const targetPath = await realpath(candidate);
  const relative = path.relative(basePath, targetPath);
  if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`Evidence path resolves outside the packet directory: ${evidencePath}`);
  }
  return targetPath;
}
