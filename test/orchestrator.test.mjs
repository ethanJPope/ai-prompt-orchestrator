import assert from "node:assert/strict";
import test from "node:test";

import { AGENTS } from "../src/agents.mjs";
import {
  buildReviewWaves,
  classifyTask,
  isSubstantivePrompt,
  preparePlan,
  selectReviewers,
} from "../src/orchestrator.mjs";
import { hashReviewPlan, reviewPlanSchema } from "../src/review-contract.mjs";
import {
  appendCollaborationMessage,
  buildWaveHandoff,
  createCollaborationMessage,
} from "../src/review-collaboration.mjs";

test("the registry keeps the requested profiles and adds visual specialists", () => {
  assert.equal(AGENTS.length, 22);
  assert.equal(new Set(AGENTS.map((agent) => agent.id)).size, 22);
  assert.ok(AGENTS.some((agent) => agent.id === "visual-art-direction"));
  assert.ok(AGENTS.some((agent) => agent.id === "responsive-visual-qa"));
});

test("minor follow-ups bypass the review pipeline", () => {
  assert.equal(isSubstantivePrompt("continue"), false);
  const plan = preparePlan("What changed?");
  assert.equal(plan.substantive, false);
  assert.equal(plan.reviewerCount, 0);
});

test("substantive work receives exactly ten passes and ends with the arbiter", () => {
  const plan = preparePlan(
    "Implement a reusable frontend settings page and verify its success and failure behavior.",
    "Existing web application repository.",
  );
  assert.equal(plan.substantive, true);
  assert.equal(plan.reviewerCount, 10);
  assert.ok(plan.reviewers.some((reviewer) => reviewer.id === "frontend-state"));
  assert.equal(plan.reviewers.at(-1).id, "final-senior-review");
});

test("website work receives screenshot-grounded visual reviewers within ten passes", () => {
  const plan = preparePlan(
    "Build and verify a responsive website for a student focus planner.",
    "A local HTML, CSS, and JavaScript project.",
  );

  assert.equal(classifyTask(plan.enhancedPrompt), "visual-interface");
  assert.equal(plan.taskClass, "visual-interface");
  assert.equal(plan.reviewerCount, 10);
  assert.ok(plan.reviewers.some((reviewer) => reviewer.id === "visual-art-direction"));
  assert.ok(plan.reviewers.some((reviewer) => reviewer.id === "responsive-visual-qa"));
  assert.ok(
    plan.reviewers
      .find((reviewer) => reviewer.id === "visual-art-direction")
      .prompt.includes("1440x1000 and 390x844"),
  );
  assert.match(plan.enhancedPrompt, /render the interface at 1440x1000 and 390x844/i);
});

test("common UI prompts route through the visual interface pipeline", () => {
  for (const prompt of [
    "Build a React settings page with keyboard navigation.",
    "Create an accessible login form.",
    "Implement an onboarding screen for mobile.",
  ]) {
    assert.equal(classifyTask(prompt), "visual-interface", prompt);
  }
});

test("v0.3 plans expose a validated evidence, budget, and gate contract", () => {
  const plan = preparePlan(
    "Build and test a responsive settings page with a polished mobile layout.",
    "Existing local website project.",
  );
  const parsed = reviewPlanSchema.parse(plan);

  assert.equal(parsed.schemaVersion, "0.3");
  assert.match(parsed.planHash, /^[a-f0-9]{64}$/);
  assert.equal(
    hashReviewPlan({ ...parsed, accountId: "demo-active", entitlementStatus: "active" }),
    parsed.planHash,
  );
  assert.equal(parsed.correlationId, "local-plan");
  assert.equal(parsed.reviewerCount, 10);
  assert.equal(Object.keys(parsed.reviewBudgets).length, 10);
  assert.equal(parsed.evidencePacket.location, "task-local");
  assert.ok(parsed.evidencePacket.requiredFields.includes("planHash"));
  assert.ok(parsed.evidencePacket.visualFields.includes("screenshotHashes"));
  assert.ok(parsed.deterministicGates.some((gate) => gate.id === "viewport-evidence"));
  assert.ok(parsed.deterministicGates.some((gate) => gate.id === "ui-quality"));
  assert.equal(parsed.executionPolicy.latencyTargetMultiplier, 2);
  assert.equal(parsed.telemetry.location, "task-local");
  assert.ok(parsed.telemetry.recordFields.includes("waveDurations"));
  assert.equal(parsed.collaboration.transport, "task-local-shared-packet");
  assert.equal(parsed.collaboration.broker, "primary-agent");
  assert.ok(parsed.collaboration.consumeRules.some((rule) => /confirm, contradict, or extend/i.test(rule)));
  assert.equal(parsed.collaboration.waveHandoffs.length, 3);
  assert.ok(parsed.reviewers.every((reviewer) => reviewer.prompt.includes("evidence packet")));
  assert.ok(parsed.reviewers.every((reviewer) => reviewer.budget.timeoutMs >= 120_000));
});

test("review waves preserve ten passes while parallelizing specialists", () => {
  const reviewers = selectReviewers("Build a responsive landing page and verify it in a browser.");
  const waves = buildReviewWaves(reviewers, 4);
  const flattened = waves.flatMap((wave) => wave.reviewerIds);

  assert.deepEqual(new Set(flattened), new Set(reviewers.map((reviewer) => reviewer.id)));
  assert.equal(flattened.length, reviewers.length);
  assert.ok(waves.filter((wave) => wave.mode !== "gate").slice(0, -1).every((wave) => wave.mode === "parallel"));
  assert.ok(waves.filter((wave) => wave.mode !== "gate").slice(0, -1).every((wave) => wave.reviewerIds.length <= 4));
  assert.equal(waves.at(-1).mode, "sequential");
  assert.deepEqual(waves.at(-1).reviewerIds, ["final-senior-review"]);
  assert.equal(waves.at(-1).maxParallelism, 1);
  assert.ok(waves.filter((wave) => wave.mode !== "gate").every((wave) => wave.timeoutMs >= 120_000));
});

test("reviewer messages are shared, bounded, and handed off between waves", () => {
  const first = createCollaborationMessage({
    reviewerId: "repository-discovery",
    wave: "discovery",
    claim: "The dashboard server is the local execution boundary.",
    evidenceRefs: ["dashboard/server.mjs"],
    nextReviewerAction: "Confirm the boundary and inspect event-stream consumers.",
  });
  const second = createCollaborationMessage({
    reviewerId: "architecture-boundaries",
    wave: "specialist-waves",
    kind: "confirms",
    claim: "The event stream remains behind the dashboard server.",
    evidenceRefs: ["dashboard/server.mjs", "dashboard/run-controller.mjs"],
    relatedMessageIds: [first.messageId],
    nextReviewerAction: "Check that no reviewer receives write access.",
  });
  const messages = appendCollaborationMessage(appendCollaborationMessage([], first), second);
  const handoff = buildWaveHandoff(messages, "discovery", "specialist-waves");
  assert.equal(messages.length, 2);
  assert.deepEqual(handoff.messageIds, [first.messageId, second.messageId]);
  assert.match(handoff.instruction, /Consume 2 shared finding message/);
  assert.throws(() => appendCollaborationMessage(messages, first), /Duplicate collaboration message/);
});

test("a clean first pass exits without adding repair or repeat-review cycles", () => {
  const plan = preparePlan(
    "Build and test a responsive homepage.",
    "Existing local website project.",
  );

  assert.equal(plan.executionPolicy.maxParallelism, 4);
  assert.equal(plan.executionPolicy.maxRepairPasses, 1);
  assert.equal(plan.executionPolicy.earlyExitAfterCleanRequiredPasses, true);
  assert.equal(plan.executionPolicy.latencyTargetMultiplier, 2);
  assert.ok(plan.executionPolicy.reviewWaves.some((wave) => wave.mode === "gate"));
  assert.equal(
    plan.executionPolicy.reviewWaves.flatMap((wave) => wave.reviewerIds).length,
    10,
  );
});

test("high-risk authentication work keeps exactly ten bounded specialist passes", () => {
  const reviewers = selectReviewers(
    "Add OAuth login, preserve accounts, protect secrets, and deploy it to production.",
  );
  assert.equal(reviewers.length, 10);
  assert.ok(reviewers.some((reviewer) => reviewer.id === "authorization"));
  assert.ok(reviewers.some((reviewer) => reviewer.id === "configuration-secrets"));
  assert.ok(reviewers.some((reviewer) => reviewer.id === "deployment-readiness"));
});

test("a complete foundation audit selects a broad bounded ten-profile slice", () => {
  const reviewers = selectReviewers("Perform a complete production readiness audit of the repository.");
  assert.equal(reviewers.length, 10);
  assert.equal(reviewers.at(-1).id, "final-senior-review");
});

test("formatting does not turn an ordinary completion task into a full audit", () => {
  const multiline = `Finish completeTask in this production project.
Only an owner may complete their task.
Concurrent calls must produce one audit event.`;
  const singleLine = multiline.replace(/\s+/g, " ");

  assert.equal(selectReviewers(multiline).length, 10);
  assert.equal(selectReviewers(singleLine).length, 10);
});
