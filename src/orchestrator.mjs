import { AGENTS, AGENT_BY_ID } from "./agents.mjs";

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
  /\b(?:website|webpage|homepage|landing page|web app|frontend|user interface|ui|responsive|mobile layout|dashboard|design system)\b/;

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

function reviewerPrompt(agent, originalPrompt) {
  const lines = [
    `You are the ${agent.name} reviewer.`,
    `Purpose: ${agent.purpose}`,
    "Work read-only. Do not edit files or make external changes.",
    "Inspect direct evidence relevant to the assigned task.",
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

  lines.push(`Task: ${originalPrompt}`);
  return lines.join("\n");
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
    return AGENTS.map((agent, index) => ({
      order: index + 1,
      id: agent.id,
      name: agent.name,
      phase: reviewerPhase(agent.id),
      prompt: reviewerPrompt(agent, prompt),
    }));
  }

  const targetCount = HIGH_RISK_WORDS.some((word) => normalized.includes(word)) ? 12 : 10;
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
      prompt: reviewerPrompt(agent, prompt),
    };
  });
}

export function buildReviewWaves(reviewers, maxParallelism = 4) {
  const parallelism = Math.max(1, Math.floor(maxParallelism));
  const arbiter = reviewers.find((reviewer) => reviewer.phase === "arbiter");
  const specialists = reviewers.filter((reviewer) => reviewer.phase !== "arbiter");
  const waves = [];

  for (let index = 0; index < specialists.length; index += parallelism) {
    waves.push({
      mode: "parallel",
      reviewerIds: specialists.slice(index, index + parallelism).map((reviewer) => reviewer.id),
    });
  }

  if (arbiter) {
    waves.push({ mode: "sequential", reviewerIds: [arbiter.id] });
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

export function preparePlan(prompt, projectContext = "") {
  const substantive = isSubstantivePrompt(prompt);
  if (!substantive) {
    return {
      substantive: false,
      bypassReason: "This appears to be a minor follow-up or non-implementation message.",
      clarifyingQuestions: [],
      enhancedPrompt: prompt.trim(),
      reviewerCount: 0,
      reviewers: [],
    };
  }

  const questions = clarifyingQuestions(prompt, projectContext);
  const reviewers = selectReviewers(prompt);
  const taskClass = classifyTask(prompt);
  const reviewWaves = buildReviewWaves(reviewers);
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
    `- Complete all ${reviewers.length} assigned evaluation passes. Run independent specialists concurrently in the supplied waves, with the final arbiter last.`,
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
  ].join("\n");

  return {
    substantive: true,
    bypassReason: null,
    clarifyingQuestions: questions,
    enhancedPrompt,
    taskClass,
    reviewerCount: reviewers.length,
    reviewers,
    executionPolicy: {
      maxParallelism: 4,
      maxRepairPasses: 1,
      earlyExitAfterCleanRequiredPasses: true,
      reviewWaves,
    },
  };
}
