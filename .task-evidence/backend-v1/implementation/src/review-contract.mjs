import { createHash } from "node:crypto";
import { z } from "zod";

export const REVIEW_SCHEMA_VERSION = "0.3";

const nonEmptyString = z.string().min(1);

export const reviewerBudgetSchema = z.object({
  tier: z.enum(["light", "visual", "arbiter"]),
  reasoningEffort: z.enum(["low", "medium", "high", "xhigh"]),
  timeoutMs: z.number().int().min(30_000),
  maxToolCalls: z.number().int().min(1),
  maxFindings: z.number().int().min(1).max(3),
  inputArtifact: nonEmptyString,
});

export const evidencePacketSchema = z.object({
  required: z.boolean(),
  location: z.enum(["task-local", "primary-agent-context"]),
  format: z.literal("json"),
  requiredFields: z.array(nonEmptyString).min(1),
  appendOnlyFields: z.array(nonEmptyString).min(1),
  phases: z.array(nonEmptyString).min(3),
  visualFields: z.array(nonEmptyString),
  privacyRules: z.array(nonEmptyString).min(1),
  freshnessRule: nonEmptyString,
});

export const deterministicGateSchema = z.object({
  id: nonEmptyString,
  description: nonEmptyString,
  required: z.boolean(),
  evidence: nonEmptyString,
});

export const telemetrySchema = z.object({
  location: z.literal("task-local"),
  correlationId: nonEmptyString,
  recordFields: z.array(nonEmptyString).min(1),
  privacyRules: z.array(nonEmptyString).min(1),
});

export const collaborationSchema = z.object({
  transport: z.literal("task-local-shared-packet"),
  broker: z.literal("primary-agent"),
  messageFields: z.array(nonEmptyString).min(1),
  publishRules: z.array(nonEmptyString).min(1),
  consumeRules: z.array(nonEmptyString).min(1),
  waveHandoffs: z.array(z.object({
    from: nonEmptyString,
    to: nonEmptyString,
    artifact: nonEmptyString,
  })).min(1),
  privacyRules: z.array(nonEmptyString).min(1),
});

export const reviewerSchema = z.object({
  order: z.number().int().positive(),
  id: nonEmptyString,
  name: nonEmptyString,
  phase: z.enum(["discovery", "review", "visual-review", "arbiter"]),
  budget: reviewerBudgetSchema,
  prompt: nonEmptyString,
});

export const reviewWaveSchema = z.object({
  mode: z.enum(["parallel", "sequential", "gate"]),
  reviewerIds: z.array(nonEmptyString),
  gateIds: z.array(nonEmptyString),
  maxParallelism: z.number().int().nonnegative(),
  timeoutMs: z.number().int().min(0),
});

export const executionPolicySchema = z.object({
  maxParallelism: z.number().int().positive(),
  maxRepairPasses: z.literal(1),
  earlyExitAfterCleanRequiredPasses: z.boolean(),
  latencyTargetMultiplier: z.number().positive().max(10),
  reviewWaves: z.array(reviewWaveSchema).min(1),
});

export const reviewPlanFields = {
  schemaVersion: z.literal(REVIEW_SCHEMA_VERSION),
  planHash: z.string().regex(/^[a-f0-9]{64}$/i),
  correlationId: nonEmptyString,
  substantive: z.boolean(),
  bypassReason: z.string().nullable(),
  clarifyingQuestions: z.array(nonEmptyString),
  enhancedPrompt: nonEmptyString,
  taskClass: z.enum(["visual-interface", "general-engineering"]).nullable(),
  reviewerCount: z.number().int().nonnegative(),
  reviewers: z.array(reviewerSchema),
  reviewBudgets: z.record(z.string(), reviewerBudgetSchema),
  evidencePacket: evidencePacketSchema.nullable(),
  deterministicGates: z.array(deterministicGateSchema),
  telemetry: telemetrySchema.nullable(),
  collaboration: collaborationSchema.nullable(),
  executionPolicy: executionPolicySchema.nullable(),
};

export const reviewPlanOutputSchema = z.object(reviewPlanFields);

export const reviewPlanSchema = reviewPlanOutputSchema.superRefine((plan, context) => {
  if (!plan.substantive) {
    if (plan.reviewerCount !== 0 || plan.reviewers.length !== 0) {
      context.addIssue({
        code: "custom",
        path: ["reviewers"],
        message: "A non-substantive plan cannot contain reviewers.",
      });
    }
    return;
  }

  if (plan.reviewerCount !== 10 || plan.reviewers.length !== 10) {
    context.addIssue({
      code: "custom",
      path: ["reviewerCount"],
      message: "Substantive work must receive exactly ten reviewers.",
    });
  }
  const reviewerIds = plan.reviewers.map((reviewer) => reviewer.id);
  if (new Set(reviewerIds).size !== reviewerIds.length) {
    context.addIssue({
      code: "custom",
      path: ["reviewers"],
      message: "Reviewer IDs must be unique.",
    });
  }
  const budgetIds = Object.keys(plan.reviewBudgets);
  if (budgetIds.length !== reviewerIds.length || budgetIds.some((id) => !reviewerIds.includes(id))) {
    context.addIssue({
      code: "custom",
      path: ["reviewBudgets"],
      message: "Review budgets must contain exactly the planned reviewer IDs.",
    });
  }
  if (!plan.evidencePacket || !plan.executionPolicy || !plan.taskClass) {
    context.addIssue({
      code: "custom",
      path: ["executionPolicy"],
      message: "Substantive plans require evidence, gates, and execution policy.",
    });
  }
  if (!plan.collaboration) {
    context.addIssue({
      code: "custom",
      path: ["collaboration"],
      message: "Substantive plans require a shared reviewer collaboration contract.",
    });
  }
});

export const reviewResponseShape = {
  accountId: nonEmptyString,
  entitlementStatus: nonEmptyString,
  accessDecision: z.enum(["allowed", "subscription_inactive"]),
  ...reviewPlanFields,
};

export const reviewResponseSchema = z.object(reviewResponseShape);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function hashReviewPlan(plan) {
  const {
    planHash: _ignored,
    accountId: _accountId,
    entitlementStatus: _entitlementStatus,
    accessDecision: _accessDecision,
    ...hashablePlan
  } = plan;
  return createHash("sha256").update(JSON.stringify(canonicalize(hashablePlan))).digest("hex");
}
