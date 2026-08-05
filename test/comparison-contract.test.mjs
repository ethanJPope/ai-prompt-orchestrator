import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_INTERACTION_IDS,
  hashComparisonPrompt,
  validateComparisonPair,
  validateComparisonRun,
} from "../src/comparison-contract.mjs";

const prompt = "Build the same deterministic website in both chats.\nRUN_ID: generated per run";
const promptIdentity = hashComparisonPrompt(prompt);

function run(overrides = {}) {
  return {
    schemaVersion: "1.0",
    runId: "run-alpha-7q",
    capturedAt: "2026-08-05T02:00:11.498Z",
    blind: { assignment: "hidden", pluginMentioned: false },
    prompt: promptIdentity,
    controls: {
      starterFingerprint: "a".repeat(64),
      model: "gpt-5",
      reasoningEffort: "high",
      viewportContract: "1440x1000-and-390x844",
    },
    workspace: {
      path: "C:\\fixture",
      branch: "main",
      latestCommit: "b".repeat(40),
      workingTreeClean: true,
      changedFiles: ["app/page.tsx"],
    },
    timing: {
      startedAt: "2026-08-05T01:00:00.000Z",
      finishedAt: "2026-08-05T01:20:00.000Z",
      durationMs: 1_200_000,
      source: "explicit-task-clock",
      idleDurationMs: 0,
    },
    commands: [{
      command: "npm test",
      required: true,
      status: "passed",
      exitCode: 0,
      summary: "Tests passed.",
      outputTail: "1 test passed",
    }],
    browser: {
      desktop: {
        width: 1440,
        height: 1000,
        screenshotPath: "work/desktop.png",
        screenshotAttached: true,
        decodedWidth: 1440,
        decodedHeight: 1000,
        devicePixelRatio: 1,
        status: "passed",
        consoleErrors: 0,
        consoleWarnings: 0,
        horizontalOverflowPx: 0,
        notes: "Captured after final validation.",
      },
      mobile: {
        width: 390,
        height: 844,
        screenshotPath: "work/mobile.png",
        screenshotAttached: true,
        decodedWidth: 390,
        decodedHeight: 844,
        devicePixelRatio: 1,
        status: "passed",
        consoleErrors: 0,
        consoleWarnings: 0,
        horizontalOverflowPx: 0,
        notes: "Captured after final validation.",
      },
    },
    interactionChecks: REQUIRED_INTERACTION_IDS.map((id) => ({
      id,
      required: true,
      status: "passed",
      observedResult: `${id} passed in the browser.`,
    })),
    finalResponse: {
      text: "Built, validated, and documented known limitations. Artifacts attached.",
      includesBuildSummary: true,
      includesValidationSummary: true,
      includesKnownLimitations: true,
    },
    artifacts: {
      desktopScreenshot: "work/desktop.png",
      mobileScreenshot: "work/mobile.png",
      evidencePackage: "work/comparison-run.json",
    },
    evidenceGaps: [],
    unresolvedIssues: [],
    ...overrides,
  };
}

test("a complete run satisfies the fail-closed evidence contract", () => {
  const result = validateComparisonRun(run());
  assert.equal(result.valid, true);
  assert.deepEqual(result.failures, []);
});

test("prompt identity ignores run-specific identity lines", () => {
  const withRunMetadata = hashComparisonPrompt(
    `${prompt}\nPROMPT_SHA256: ${"0".repeat(64)}\nPROMPT_CHARACTER_COUNT: 12`,
  );
  assert.deepEqual(withRunMetadata, promptIdentity);
});

test("a complete pair checks identical controls and reports the timing ratio", () => {
  const result = validateComparisonPair([
    run(),
    run({
      runId: "run-beta-9m",
      capturedAt: "2026-08-05T02:00:21.444Z",
      timing: {
        startedAt: "2026-08-05T01:00:00.000Z",
        finishedAt: "2026-08-05T01:30:00.000Z",
        durationMs: 1_800_000,
        source: "explicit-task-clock",
        idleDurationMs: 0,
      },
    }),
  ]);
  assert.equal(result.valid, true);
  assert.equal(result.durationRatio, 1.5);
});

test("placeholder IDs, incomplete interactions, and weak timing are rejected", () => {
  const placeholder = validateComparisonRun(run({ runId: "REPLACE_WITH_OPAQUE_ID" }));
  assert.equal(placeholder.valid, false);
  assert.ok(placeholder.failures.some((failure) => failure.includes("runId")));

  const result = validateComparisonRun(run({
    timing: {
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      source: "unknown",
      idleDurationMs: null,
    },
    interactionChecks: run().interactionChecks.filter((check) => check.id !== "keyboard-focus"),
  }));
  assert.equal(result.valid, false);
  assert.ok(result.failures.some((failure) => failure.includes("timing")));
  assert.ok(result.failures.some((failure) => failure.includes("keyboard-focus")));
});

test("mismatched prompt and starter fingerprints invalidate a pair", () => {
  const result = validateComparisonPair([
    run(),
    run({
      runId: "run-beta-9m",
      prompt: { sha256: "c".repeat(64), characterCount: 10 },
      controls: {
        ...run().controls,
        starterFingerprint: "d".repeat(64),
      },
    }),
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.failures.some((failure) => failure.includes("prompt hash")));
  assert.ok(result.failures.some((failure) => failure.includes("starter fingerprint")));
});
