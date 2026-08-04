import assert from "node:assert/strict";
import test from "node:test";

import { evaluateEvidencePacket, resolveEvidencePath } from "../src/evidence-packet.mjs";

function packet(overrides = {}) {
  return {
    schemaVersion: "0.3",
    correlationId: "test-correlation",
    taskClass: "visual-interface",
    capturedAt: "2026-08-04T00:00:00.000Z",
    planHash: "c".repeat(64),
    implementationHash: "d".repeat(64),
    implementationFiles: ["src/app.js"],
    plannedReviewerIds: Array.from({ length: 10 }, (_, index) => `reviewer-${index + 1}`),
    discoveryReviewerIds: ["reviewer-1"],
    arbiterReviewerId: "reviewer-10",
    plannedReviewerBudgets: Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [`reviewer-${index + 1}`, 120_000]),
    ),
    taskSummary: "Build a responsive website.",
    acceptanceCriteria: ["Desktop and mobile states work."],
    changedFiles: ["src/app.js"],
    testResults: { passed: true, commands: ["pnpm test"], summary: "All tests pass." },
    privacyBoundary: { passed: true, summary: "No secrets or source uploads." },
    knownRisks: [],
    deterministicGateResults: [
      { id: "acceptance-coverage", status: "passed", evidence: "requirements.md" },
      { id: "tests-and-build", status: "passed", evidence: "test output" },
      { id: "privacy-boundary", status: "passed", evidence: "source review" },
      { id: "viewport-evidence", status: "passed", evidence: "screenshot manifest" },
      { id: "ui-quality", status: "passed", evidence: "UI gate output" },
    ],
    reviewerFindings: Array.from({ length: 10 }, (_, index) => ({
      reviewerId: `reviewer-${index + 1}`,
      status: "completed",
      durationMs: 1000,
      findingCount: 0,
      evidence: "shared packet",
    })),
    screenshots: [
      {
        stateId: "desktop-default",
        kind: "desktop",
        format: "png",
        path: "desktop.png",
        requestedViewport: { width: 1440, height: 1000 },
        decodedPixels: { width: 1440, height: 1000 },
        devicePixelRatio: 1,
        sourceHash: "d".repeat(64),
        sha256: "a".repeat(64),
        capturedAt: "2026-08-04T00:00:00.000Z",
      },
      {
        stateId: "mobile-default",
        kind: "mobile",
        format: "png",
        path: "mobile.png",
        requestedViewport: { width: 390, height: 844 },
        decodedPixels: { width: 390, height: 844 },
        devicePixelRatio: 1,
        sourceHash: "d".repeat(64),
        sha256: "b".repeat(64),
        capturedAt: "2026-08-04T00:00:00.000Z",
      },
    ],
    browserState: { consoleErrors: 0, consoleWarnings: 0, flowsVerified: ["core flow"] },
    uiChecks: {
      contrast: {
        passed: true,
        generatedBy: "codex-browser-gates-v1",
        capturedAt: "2026-08-04T00:00:00.000Z",
        evidence: "computed contrast ratios",
        minimumRatio: 4.5,
        failingCount: 0,
      },
      targetSizes: {
        passed: true,
        generatedBy: "codex-browser-gates-v1",
        capturedAt: "2026-08-04T00:00:00.000Z",
        evidence: "computed target dimensions",
        minimumPx: 44,
        failingCount: 0,
      },
      overflow: {
        passed: true,
        generatedBy: "codex-browser-gates-v1",
        capturedAt: "2026-08-04T00:00:00.000Z",
        evidence: "computed document bounds",
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
      },
      requiredStates: {
        passed: true,
        generatedBy: "codex-browser-gates-v1",
        capturedAt: "2026-08-04T00:00:00.000Z",
        evidence: "browser state matrix",
        requiredStateIds: ["core-flow"],
        observedStateIds: ["core-flow"],
      },
    },
    repairPasses: 0,
    lastRepairAt: null,
    finalStatus: "ready",
    ...overrides,
  };
}

test("evidence finalization is fail-closed", () => {
  const result = evaluateEvidencePacket(packet({ finalStatus: "needs-repair" }));
  assert.equal(result.valid, false);
  assert.ok(result.failures.includes("finalStatus must be ready"));
});

test("a complete visual evidence packet can finalize", () => {
  const result = evaluateEvidencePacket(packet());
  assert.equal(result.valid, true);
  assert.equal(result.reviewerCount, 10);
});

test("the packet can be validated at the pre-review phase", () => {
  const result = evaluateEvidencePacket(
    packet({ reviewerFindings: packet().reviewerFindings.slice(0, 1), finalStatus: null }),
    { phase: "before-visual" },
  );
  assert.equal(result.valid, true);
});

test("before-arbiter requires every non-arbiter outcome but not the arbiter", () => {
  const result = evaluateEvidencePacket(
    packet({ reviewerFindings: packet().reviewerFindings.slice(0, 9), finalStatus: null }),
    { phase: "before-arbiter" },
  );
  assert.equal(result.valid, true);
});

test("duplicate or unknown reviewer outcomes are rejected", () => {
  const duplicate = packet({
    reviewerFindings: packet().reviewerFindings.map((outcome) => ({ ...outcome, reviewerId: "reviewer-1" })),
  });
  const unknown = packet({
    reviewerFindings: packet().reviewerFindings.map((outcome, index) =>
      index === 0 ? { ...outcome, reviewerId: "not-planned" } : outcome,
    ),
  });
  assert.equal(evaluateEvidencePacket(duplicate).valid, false);
  assert.equal(evaluateEvidencePacket(unknown).valid, false);
});

test("missing visual proof blocks finalization", () => {
  const result = evaluateEvidencePacket(
    packet({ screenshots: [], uiChecks: null }),
  );
  assert.equal(result.valid, false);
  assert.ok(result.failures.some((failure) => failure.includes("screenshot")));
  assert.ok(result.failures.some((failure) => failure.includes("UI checks")));
});

test("visual pre-review cannot skip discovery evidence", () => {
  const result = evaluateEvidencePacket(
    packet({ reviewerFindings: [], finalStatus: null }),
    { phase: "before-visual" },
  );
  assert.equal(result.valid, false);
  assert.ok(result.failures.some((failure) => failure.includes("reviewer-1")));
});

test("evidence paths cannot escape the packet directory", () => {
  assert.throws(() => resolveEvidencePath("C:\\task\\packet.json", "..\\secret.txt"));
  assert.throws(() => resolveEvidencePath("C:\\task\\packet.json", "C:\\secret.txt"));
});
