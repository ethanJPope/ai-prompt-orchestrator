import { createHash } from "node:crypto";
import { z } from "zod";

export const COMPARISON_SCHEMA_VERSION = "1.0";

const nonEmptyString = z.string().min(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/i);
const isoTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/);

export const REQUIRED_INTERACTION_IDS = [
  "desktop-layout",
  "mobile-layout",
  "mobile-navigation",
  "scenario-selection",
  "scenario-comparison",
  "project-search",
  "project-filter",
  "project-sort",
  "project-detail-open",
  "project-detail-close",
  "visit-invalid",
  "visit-valid",
  "resource-filter",
  "resource-load-more",
  "newsletter-validation",
  "keyboard-focus",
  "reduced-motion",
  "console-clean",
  "no-overflow",
];

/**
 * Keep the run-specific opaque ID out of the prompt identity. This lets the
 * two chats generate different run IDs while still proving they received the
 * exact same task text.
 */
export function canonicalizeComparisonPrompt(promptText) {
  return String(promptText)
    .replace(/^\s*(?:RUN_ID|PROMPT_SHA256|PROMPT_CHARACTER_COUNT)\s*:\s*.*(?:\r?\n|$)/gim, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function hashComparisonPrompt(promptText) {
  const canonical = canonicalizeComparisonPrompt(promptText);
  return {
    sha256: createHash("sha256").update(canonical, "utf8").digest("hex"),
    characterCount: canonical.length,
  };
}

const commandSchema = z.object({
  command: nonEmptyString,
  required: z.boolean(),
  status: z.enum(["passed", "failed", "not-run", "unknown"]),
  exitCode: z.number().int().nullable(),
  summary: nonEmptyString,
  outputTail: z.string(),
});

const viewportSchema = z.object({
  width: z.literal(1440).or(z.literal(390)),
  height: z.literal(1000).or(z.literal(844)),
  screenshotPath: z.string().nullable(),
  screenshotAttached: z.boolean(),
  decodedWidth: z.number().int().positive(),
  decodedHeight: z.number().int().positive(),
  devicePixelRatio: z.number().positive(),
  status: z.enum(["passed", "failed", "not-run", "unknown"]),
  consoleErrors: z.number().int().nonnegative(),
  consoleWarnings: z.number().int().nonnegative(),
  horizontalOverflowPx: z.number().nonnegative(),
  notes: nonEmptyString,
});

const interactionSchema = z.object({
  id: nonEmptyString,
  required: z.boolean(),
  status: z.enum(["passed", "failed", "not-run", "unknown"]),
  observedResult: nonEmptyString,
});

export const comparisonRunSchema = z.object({
  schemaVersion: z.literal(COMPARISON_SCHEMA_VERSION),
  runId: z.string().min(3).regex(/^(?!REPLACE|RUN[_-]?ID|TODO)/i),
  capturedAt: isoTimestamp,
  blind: z.object({
    assignment: z.literal("hidden"),
    pluginMentioned: z.literal(false),
  }),
  prompt: z.object({
    sha256,
    characterCount: z.number().int().positive(),
  }),
  controls: z.object({
    starterFingerprint: sha256,
    model: nonEmptyString,
    reasoningEffort: nonEmptyString,
    viewportContract: z.literal("1440x1000-and-390x844"),
  }),
  workspace: z.object({
    path: z.string().nullable(),
    branch: z.string().nullable(),
    latestCommit: z.string().nullable(),
    workingTreeClean: z.boolean().nullable(),
    changedFiles: z.array(nonEmptyString),
  }),
  timing: z.object({
    startedAt: isoTimestamp.nullable(),
    finishedAt: isoTimestamp.nullable(),
    durationMs: z.number().int().nonnegative().nullable(),
    source: z.enum(["explicit-task-clock", "thread-metadata", "external-stopwatch", "unknown"]),
    idleDurationMs: z.number().int().nonnegative().nullable(),
  }),
  commands: z.array(commandSchema).min(1),
  browser: z.object({
    desktop: viewportSchema.extend({ width: z.literal(1440), height: z.literal(1000) }),
    mobile: viewportSchema.extend({ width: z.literal(390), height: z.literal(844) }),
  }),
  interactionChecks: z.array(interactionSchema),
  finalResponse: z.object({
    text: nonEmptyString,
    includesBuildSummary: z.boolean(),
    includesValidationSummary: z.boolean(),
    includesKnownLimitations: z.boolean(),
  }),
  artifacts: z.object({
    desktopScreenshot: nonEmptyString,
    mobileScreenshot: nonEmptyString,
    evidencePackage: nonEmptyString,
  }),
  evidenceGaps: z.array(nonEmptyString),
  unresolvedIssues: z.array(nonEmptyString),
});

function hasValidTiming(run) {
  if (
    run.timing.source === "unknown" ||
    run.timing.startedAt === null ||
    run.timing.finishedAt === null ||
    run.timing.durationMs === null
  ) {
    return false;
  }
  const derivedDuration = Date.parse(run.timing.finishedAt) - Date.parse(run.timing.startedAt);
  return derivedDuration >= 0 && Math.abs(derivedDuration - run.timing.durationMs) <= 5_000;
}

function checkViewport(viewport, expectedWidth, expectedHeight, label, failures) {
  if (!viewport.screenshotAttached && !viewport.screenshotPath) {
    failures.push(`${label} screenshot must be attached or have a saved path`);
  }
  if (viewport.status !== "passed") failures.push(`${label} viewport check must pass`);
  if (viewport.decodedWidth !== expectedWidth || viewport.decodedHeight !== expectedHeight) {
    failures.push(`${label} screenshot dimensions must match the requested viewport`);
  }
  if (viewport.consoleErrors !== 0 || viewport.consoleWarnings !== 0) {
    failures.push(`${label} browser console must have zero errors and warnings`);
  }
  if (viewport.horizontalOverflowPx !== 0) failures.push(`${label} viewport has horizontal overflow`);
}

export function validateComparisonRun(run) {
  const parsedResult = comparisonRunSchema.safeParse(run);
  if (!parsedResult.success) {
    return {
      valid: false,
      failures: parsedResult.error.issues.map((issue) =>
        `${issue.path.join(".") || "run"}: ${issue.message}`,
      ),
      parsed: null,
    };
  }
  const parsed = parsedResult.data;
  const failures = [];
  if (!hasValidTiming(parsed)) failures.push("timing must contain a trustworthy start, finish, duration, and source");

  checkViewport(parsed.browser.desktop, 1440, 1000, "desktop", failures);
  checkViewport(parsed.browser.mobile, 390, 844, "mobile", failures);

  const interactions = new Map(parsed.interactionChecks.map((check) => [check.id, check]));
  for (const interactionId of REQUIRED_INTERACTION_IDS) {
    const check = interactions.get(interactionId);
    if (!check) failures.push(`missing required interaction check: ${interactionId}`);
    else if (!check.required) failures.push(`required interaction must be marked required: ${interactionId}`);
    else if (check.status !== "passed") failures.push(`required interaction did not pass: ${interactionId}`);
  }
  if (interactions.size !== parsed.interactionChecks.length) failures.push("interaction check IDs must be unique");

  const requiredCommands = parsed.commands.filter((command) => command.required);
  if (requiredCommands.length === 0) failures.push("at least one required command must be recorded");
  if (requiredCommands.some((command) => command.status !== "passed" || command.exitCode !== 0)) {
    failures.push("every required command must pass with exit code 0");
  }

  if (!parsed.finalResponse.includesBuildSummary) failures.push("final response must include a build summary");
  if (!parsed.finalResponse.includesValidationSummary) failures.push("final response must include validation results");
  if (!parsed.finalResponse.includesKnownLimitations) failures.push("final response must include known limitations");

  return { valid: failures.length === 0, failures, parsed };
}

export function validateComparisonPair(runs) {
  if (!Array.isArray(runs) || runs.length !== 2) {
    throw new Error("Exactly two comparison runs are required");
  }
  const first = validateComparisonRun(runs[0]);
  const second = validateComparisonRun(runs[1]);
  const failures = [
    ...first.failures.map((failure) => `run 1: ${failure}`),
    ...second.failures.map((failure) => `run 2: ${failure}`),
  ];
  if (!first.parsed || !second.parsed) {
    return {
      valid: false,
      failures,
      durationRatio: null,
      runs: [first.parsed, second.parsed],
    };
  }
  const [left, right] = [first.parsed, second.parsed];
  if (left.runId === right.runId) failures.push("run IDs must be unique");
  if (left.prompt.sha256 !== right.prompt.sha256) failures.push("both runs must use the same prompt hash");
  if (left.prompt.characterCount !== right.prompt.characterCount) failures.push("both runs must use the same prompt character count");
  if (left.controls.starterFingerprint !== right.controls.starterFingerprint) failures.push("both runs must use the same starter fingerprint");
  if (left.controls.model !== right.controls.model) failures.push("both runs must use the same model");
  if (left.controls.reasoningEffort !== right.controls.reasoningEffort) failures.push("both runs must use the same reasoning effort");

  const durations = [left.timing.durationMs, right.timing.durationMs];
  const durationRatio = durations[0] && durations[1]
    ? Math.max(...durations) / Math.min(...durations)
    : null;
  return {
    valid: failures.length === 0,
    failures,
    durationRatio,
    runs: [left, right],
  };
}
