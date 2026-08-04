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

test("substantive work receives at least ten passes and ends with the arbiter", () => {
  const plan = preparePlan(
    "Implement a reusable frontend settings page and verify its success and failure behavior.",
    "Existing web application repository.",
  );
  assert.equal(plan.substantive, true);
  assert.ok(plan.reviewerCount >= 10);
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

test("review waves preserve ten passes while parallelizing specialists", () => {
  const reviewers = selectReviewers("Build a responsive landing page and verify it in a browser.");
  const waves = buildReviewWaves(reviewers, 4);
  const flattened = waves.flatMap((wave) => wave.reviewerIds);

  assert.deepEqual(flattened, reviewers.map((reviewer) => reviewer.id));
  assert.ok(waves.slice(0, -1).every((wave) => wave.mode === "parallel"));
  assert.ok(waves.slice(0, -1).every((wave) => wave.reviewerIds.length <= 4));
  assert.deepEqual(waves.at(-1), {
    mode: "sequential",
    reviewerIds: ["final-senior-review"],
  });
});

test("a clean first pass exits without adding repair or repeat-review cycles", () => {
  const plan = preparePlan(
    "Build and test a responsive homepage.",
    "Existing local website project.",
  );

  assert.equal(plan.executionPolicy.maxParallelism, 4);
  assert.equal(plan.executionPolicy.maxRepairPasses, 1);
  assert.equal(plan.executionPolicy.earlyExitAfterCleanRequiredPasses, true);
  assert.equal(
    plan.executionPolicy.reviewWaves.flatMap((wave) => wave.reviewerIds).length,
    10,
  );
});

test("high-risk authentication work receives expanded specialist coverage", () => {
  const reviewers = selectReviewers(
    "Add OAuth login, preserve accounts, protect secrets, and deploy it to production.",
  );
  assert.ok(reviewers.length >= 12);
  assert.ok(reviewers.some((reviewer) => reviewer.id === "authorization"));
  assert.ok(reviewers.some((reviewer) => reviewer.id === "configuration-secrets"));
  assert.ok(reviewers.some((reviewer) => reviewer.id === "deployment-readiness"));
});

test("a complete foundation audit selects every registered profile", () => {
  const reviewers = selectReviewers("Perform a complete production readiness audit of the repository.");
  assert.equal(reviewers.length, AGENTS.length);
});

test("formatting does not turn an ordinary completion task into a full audit", () => {
  const multiline = `Finish completeTask in this production project.
Only an owner may complete their task.
Concurrent calls must produce one audit event.`;
  const singleLine = multiline.replace(/\s+/g, " ");

  assert.equal(selectReviewers(multiline).length, 12);
  assert.equal(selectReviewers(singleLine).length, 12);
});
