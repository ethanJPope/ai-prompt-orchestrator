import { AGENTS, AGENT_BY_ID } from "./agents.mjs";
import { REVIEW_SCHEMA_VERSION, hashReviewPlan } from "./review-contract.mjs";

const ALWAYS_SELECTED = [
  "repository-discovery",
  "domain-invariants",
  "testing-strategy",
  "final-senior-review",
];

const VISUAL_INTERFACE_SELECTED = [
  "repository-discovery",
  "domain-invariants",
  "input-contracts",
  "frontend-state",
  "visual-art-direction",
  "responsive-visual-qa",
  "performance-scalability",
  "testing-strategy",
  "authoritative-docs",
  "final-senior-review",
];

const VISUAL_REVIEWERS = new Set(["visual-art-direction", "responsive-visual-qa"]);

const VISUAL_INTERFACE_PATTERN =
  /\b(?:website|webpage|homepage|landing page|web app|frontend|user interface|ui|responsive|mobile layout|dashboard|design system|settings page|login form|onboarding screen|screen|component|react|vue|svelte|html|css|a11y|accessibility)\b/;

const FOLLOW_UPS = new Set([
  "continue",
  "yes",
  "no",
  "ok",
  "okay",
  "thanks",
  "thank you",
  "status",
  "what changed",
  "show me",
]);

const ACTION_WORDS = [
  "add",
  "audit",
  "build",
  "change",
  "create",
  "debug",
  "deploy",
  "design",
  "fix",
  "implement",
  "migrate",
  "refactor",
  "remove",
  "review",
  "secure",
  "test",
  "update",
];

const HIGH_RISK_WORDS = [
  "auth",
  "credential",
  "database",
  "delete",
  "deploy",
  "migration",
  "oauth",
  "payment",
  "production",
  "secret",
];

export function isSubstantivePrompt(prompt) {
  const normalized = prompt.trim().toLowerCase().replace(/[.!?]+$/g, "");
  if (!normalized || FOLLOW_UPS.has(normalized)) return false;
  if (normalized.length >= 80) return true;
  return ACTION_WORDS.some((word) => new RegExp(`\\b${word}\\b`).test(normalized));
}

function matchScore(agent, normalizedPrompt) {
  return agent.keywords.reduce(
    (score, keyword) =>
      score + (new RegExp(`\\b${keyword.replaceAll("-", "[- ]")}\\b`).test(normalizedPrompt) ? 10 : 0),
    0,
  );
}

function reviewerPrompt(agent, originalPrompt, taskClass, budget) {
  const lines = [
    `You are the ${agent.name} reviewer.`,
    `Purpose: ${agent.purpose}`,
    "Work read-only. Do not edit files or make external changes.",
    "Start with the shared task-local evidence packet supplied by the primary agent; do not rediscover the whole repository unless it reports an evidence gap.",
    `Budget: ${budget.timeoutMs}ms, at most ${budget.maxToolCalls} tool calls, and at most ${budget.maxFindings} findings. Stop and report a timeout or evidence gap when the budget is exhausted.`,
    "Return at most three confirmed findings, with supporting file or test evidence, severity, uncertainty, and the smallest repair.",
    "Do not repeat another reviewer's role or invent issues to justify your participation.",
  ];

  if (VISUAL_REVIEWERS.has(agent.id)) {
    lines.push(
      "Inspect rendered screenshots at 1440x1000 and 390x844, or the user's exact requested viewports.",
      "Judge the visible result, not CSS declarations alone. Check the fold, hierarchy, type, spacing, contrast, overflow, overlap, and interaction state.",
      "If screenshots or browser state are unavailable, report that evidence gap instead of claiming the design passes.",
    );
  }

  if (agent.id === "final-senior-review") {
    lines.push(
      "Arbitrate the shared findings packet and deterministic gate results. Do not perform broad repository rediscovery unless a specific contradiction or evidence gap requires it.",
    );
  }

  lines.push(`Task class: ${taskClass}`, `Task: ${originalPrompt}`);
  return lines.join("\n");
}

function reviewerBudget(agentId) {
  if (agentId === "final-senior-review") {
    return {
      tier: "arbiter",
      reasoningEffort: "high",
      timeoutMs: 180_000,
      maxToolCalls: 8,
      maxFindings: 3,
      inputArtifact: "shared-evidence-packet-and-review-findings",
    };
  }
  if (VISUAL_REVIEWERS.has(agentId)) {
    return {
      tier: "visual",
      reasoningEffort: "medium",
      timeoutMs: 180_000,
      maxToolCalls: 10,
      maxFindings: 3,
      inputArtifact: "shared-evidence-packet-with-screenshots-and-browser-state",
    };
  }
  return {
    tier: "light",
    reasoningEffort: "low",
    timeoutMs: 120_000,
    maxToolCalls: 6,
    maxFindings: 3,
    inputArtifact: "shared-evidence-packet",
  };
}

function buildEvidencePacket(taskClass) {
  return {
    required: true,
    location: "task-local",
    format: "json",
    requiredFields: [
      "taskSummary",
      "acceptanceCriteria",
      "changedFiles",
      "testResults",
      "knownRisks",
      "privacyBoundary",
      "implementationHash",
      "implementationFiles",
      "plannedReviewerIds",
      "plannedReviewerBudgets",
      "arbiterReviewerId",
      "discoveryReviewerIds",
      "planHash",
    ],
    appendOnlyFields: ["deterministicGateResults", "reviewerFindings", "telemetry"],
    phases: [
      "before-review: create packet after implementation and initial tests",
      "before-visual-review: append deterministic gate results and fresh UI evidence",
      "before-arbiter: append bounded reviewer outcomes",
      "final: append final status and timing without rewriting prior evidence",
    ],
    visualFields:
      taskClass === "visual-interface"
        ? ["desktopScreenshot", "mobileScreenshot", "viewportMetadata", "decodedDimensions", "devicePixelRatio", "browserState", "implementationHash", "screenshotHashes"]
        : [],
    privacyRules: [
      "Keep the packet task-local and do not send it to the MCP server.",
      "Do not include credentials, secrets, raw transcripts, or customer source code beyond the minimum evidence needed by reviewers.",
    ],
    freshnessRule: "Capture after implementation and before discovery; after any repair, invalidate UI screenshots and recapture them before visual review.",
  };
}

function buildDeterministicGates(taskClass) {
  const gates = [
    {
      id: "acceptance-coverage",
      description: "Every explicit acceptance requirement is mapped to evidence or marked unresolved.",
      required: true,
      evidence: "requirements checklist in the shared evidence packet",
    },
    {
      id: "tests-and-build",
      description: "Relevant tests and build or delivery checks pass from a clean process.",
      required: true,
      evidence: "test and build output in the shared evidence packet",
    },
    {
      id: "privacy-boundary",
      description: "No secrets, customer data, or unexpected external writes cross the review boundary.",
      required: true,
      evidence: "source inspection and command log",
    },
  ];

  if (taskClass === "visual-interface") {
    gates.push(
      {
        id: "viewport-evidence",
        description: "Fresh desktop and mobile screenshots exist at the requested viewports with dimensions and hashes recorded.",
        required: true,
        evidence: "screenshot manifest and browser state in the shared evidence packet",
      },
      {
        id: "ui-quality",
        description: "Contrast, practical target sizes, overflow, console errors, and required visual states are checked.",
        required: true,
        evidence: "deterministic UI gate output and visual reviewer findings",
      },
    );
  }

  return gates;
}

function buildTelemetry(correlationId) {
  return {
    location: "task-local",
    correlationId,
    recordFields: [
      "startedAt",
      "completedAt",
      "totalDurationMs",
      "waveDurations",
      "reviewerStatuses",
      "repairPasses",
      "deterministicGateResults",
    ],
    privacyRules: [
      "Record timing and status metadata only; do not record prompt text, source contents, secrets, or raw reviewer transcripts.",
      "Keep telemetry task-local until an explicit privacy decision authorizes a hosted service.",
    ],
  };
}

function reviewerPhase(agentId) {
  if (agentId === "final-senior-review") return "arbiter";
  if (agentId === "repository-discovery") return "discovery";
  if (VISUAL_REVIEWERS.has(agentId)) return "visual-review";
  return "review";
}

export function classifyTask(prompt) {
  const normalized = prompt.toLowerCase().replace(/\s+/g, " ").trim();
  return VISUAL_INTERFACE_PATTERN.test(normalized) ? "visual-interface" : "general-engineering";
}

export function selectReviewers(prompt) {
  const normalized = prompt.toLowerCase().replace(/\s+/g, " ").trim();
  const taskClass = classifyTask(prompt);
  const fullFoundationAudit =
    /\b(?:full|complete|entire)\s+(?:(?:repository|project|codebase|system|application|web app)\s+)?(?:(?:foundation|production readiness|readiness|security)\s+)?(?:audit|review)\b/.test(
      normalized,
    );

  if (fullFoundationAudit) {
    const foundationIds = [
      "repository-discovery",
      "architecture-boundaries",
      "configuration-secrets",
      "data-integrity",
      "authorization",
      "input-contracts",
      "performance-scalability",
      "testing-strategy",
      "deployment-readiness",
      "final-senior-review",
    ];
    return foundationIds.map((id, index) => {
      const agent = AGENT_BY_ID.get(id);
      return {
      order: index + 1,
      id: agent.id,
      name: agent.name,
      phase: reviewerPhase(agent.id),
      budget: reviewerBudget(agent.id),
      prompt: reviewerPrompt(agent, prompt, taskClass, reviewerBudget(agent.id)),
      };
    });
  }

  const targetCount = 10;
  const selected = new Set(
    taskClass === "visual-interface" ? VISUAL_INTERFACE_SELECTED : ALWAYS_SELECTED,
  );
  const ranked = AGENTS.filter((agent) => !selected.has(agent.id)).sort((left, right) => {
    const scoreDifference = matchScore(right, normalized) - matchScore(left, normalized);
    return scoreDifference || left.id.localeCompare(right.id);
  });

  for (const agent of ranked) {
    if (selected.size >= targetCount) break;
    selected.add(agent.id);
  }

  const finalId = "final-senior-review";
  const orderedIds = [...selected].filter((id) => id !== finalId);
  orderedIds.sort((left, right) => {
    const leftAgent = AGENT_BY_ID.get(left);
    const rightAgent = AGENT_BY_ID.get(right);
    const scoreDifference = matchScore(rightAgent, normalized) - matchScore(leftAgent, normalized);
    return scoreDifference || left.localeCompare(right);
  });
  orderedIds.push(finalId);

  return orderedIds.map((id, index) => {
    const agent = AGENT_BY_ID.get(id);
    return {
      order: index + 1,
      id,
      name: agent.name,
      phase: reviewerPhase(id),
      budget: reviewerBudget(agent.id),
      prompt: reviewerPrompt(agent, prompt, taskClass, reviewerBudget(agent.id)),
    };
  });
}

export function buildReviewWaves(reviewers, maxParallelism = 4, gateIds = []) {
  const parallelism = Math.max(1, Math.floor(maxParallelism));
  const arbiter = reviewers.find((reviewer) => reviewer.phase === "arbiter");
  const discovery = reviewers.filter((reviewer) => reviewer.phase === "discovery");
  const specialists = reviewers.filter(
    (reviewer) => reviewer.phase !== "arbiter" && reviewer.phase !== "discovery",
  );
  const waves = [];

  if (discovery.length > 0) {
    waves.push({
      mode: "parallel",
      reviewerIds: discovery.map((reviewer) => reviewer.id),
      gateIds: [],
      maxParallelism: Math.min(parallelism, discovery.length),
      timeoutMs: Math.max(...discovery.map((reviewer) => reviewer.budget.timeoutMs)),
    });
  }

  if (gateIds.length > 0) {
    waves.push({
      mode: "gate",
      reviewerIds: [],
      gateIds,
      maxParallelism: 0,
      timeoutMs: 0,
    });
  }

  for (let index = 0; index < specialists.length; index += parallelism) {
    waves.push({
      mode: "parallel",
      reviewerIds: specialists.slice(index, index + parallelism).map((reviewer) => reviewer.id),
      gateIds: [],
      maxParallelism: parallelism,
      timeoutMs: Math.max(...specialists.slice(index, index + parallelism).map((reviewer) => reviewer.budget.timeoutMs)),
    });
  }

  if (arbiter) {
    waves.push({
      mode: "sequential",
      reviewerIds: [arbiter.id],
      gateIds: [],
      maxParallelism: 1,
      timeoutMs: arbiter.budget.timeoutMs,
    });
  }

  return waves;
}

export function clarifyingQuestions(prompt, projectContext = "") {
  const normalized = `${prompt} ${projectContext}`.toLowerCase();
  const questions = [];

  if (!projectContext.trim() && !/\b(repo|repository|folder|file|project)\b/.test(normalized)) {
    questions.push("Which repository, project, or path is in scope?");
  }
  if (!/\b(accept|done|expected|pass|test|verify|proof|result)\b/.test(normalized)) {
    questions.push("What visible result or test would prove this task is complete?");
  }
  if (
    HIGH_RISK_WORDS.some((word) => normalized.includes(word)) &&
    !/\b(preserve|breaking|behavior change|rollback|migration plan)\b/.test(normalized)
  ) {
    questions.push("Must existing behavior and data remain backward compatible?");
  }

  return questions.slice(0, 3);
}

export function preparePlan(prompt, projectContext = "", options = {}) {
  const correlationId = options.correlationId ?? "local-plan";
  const substantive = isSubstantivePrompt(prompt);
  if (!substantive) {
    const plan = {
      schemaVersion: REVIEW_SCHEMA_VERSION,
      correlationId,
      substantive: false,
      bypassReason: "This appears to be a minor follow-up or non-implementation message.",
      clarifyingQuestions: [],
      enhancedPrompt: prompt.trim(),
      taskClass: null,
      reviewerCount: 0,
      reviewers: [],
      reviewBudgets: {},
      evidencePacket: null,
      deterministicGates: [],
      telemetry: null,
      executionPolicy: null,
    };
    return { ...plan, planHash: hashReviewPlan(plan) };
  }

  const questions = clarifyingQuestions(prompt, projectContext);
  const reviewers = selectReviewers(prompt);
  const taskClass = classifyTask(prompt);
  const reviewBudgets = Object.fromEntries(
    reviewers.map((reviewer) => [reviewer.id, reviewer.budget]),
  );
  const evidencePacket = buildEvidencePacket(taskClass);
  const deterministicGates = buildDeterministicGates(taskClass);
  const telemetry = buildTelemetry(correlationId);
  const reviewWaves = buildReviewWaves(
    reviewers,
    4,
    deterministicGates.map((gate) => gate.id),
  );
  const contextLine = projectContext.trim() || "Not supplied; inspect the active repository before acting.";
  const enhancedPrompt = [
    "Substantive engineering task",
    "",
    `Original request: ${prompt.trim()}`,
    `Project context: ${contextLine}`,
    "",
    "Execution contract:",
    "- Resolve material ambiguity before implementation.",
    "- Keep reviewer agents read-only; only the primary agent may edit.",
    "- Before wave 1, create one fresh task-local JSON evidence packet with the required fields, a timestamp, and a hash; give every reviewer the same packet reference.",
    `- Complete all ${reviewers.length} assigned evaluation passes. Run independent specialists concurrently in the supplied waves, with the final arbiter last.`,
    "- Honor each reviewer's budget, record completion or timeout, and do not replace a timed-out reviewer with an extra unplanned agent.",
    "- If the first implementation passes its acceptance checks and reviewers find no material issue, stop without a repair or repeat review.",
    "- If repair is necessary, make one bounded correction pass and rerun only affected checks before the final arbiter.",
    ...(taskClass === "visual-interface"
      ? [
          "- Render the interface at 1440x1000 and 390x844 before visual review.",
          "- Give visual reviewers the rendered screenshots and interactive browser state; prioritize visible hierarchy and layout defects.",
        ]
      : []),
    "- Cite direct repository evidence and exact validation results.",
    "- Preserve existing behavior unless a change is explicitly approved.",
    "- Return one consolidated result without duplicate or contradictory findings.",
    "- The treatment target is no more than 2x normal Codex wall-clock time; record enough timing evidence to evaluate that target.",
  ].join("\n");

  const plan = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    correlationId,
    substantive: true,
    bypassReason: null,
    clarifyingQuestions: questions,
    enhancedPrompt,
    taskClass,
    reviewerCount: reviewers.length,
    reviewers,
    reviewBudgets,
    evidencePacket,
    deterministicGates,
    telemetry,
    executionPolicy: {
      maxParallelism: 4,
      maxRepairPasses: 1,
      earlyExitAfterCleanRequiredPasses: true,
      latencyTargetMultiplier: 2,
      reviewWaves,
    },
  };
  return { ...plan, planHash: hashReviewPlan(plan) };
}
