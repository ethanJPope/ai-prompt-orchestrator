export const AGENTS = [
  {
    id: "repository-discovery",
    name: "Repository Discovery and System Map",
    purpose: "Map the system and identify evidence gaps before conclusions.",
    keywords: ["repository", "repo", "system", "flow", "entry", "module"],
  },
  {
    id: "architecture-boundaries",
    name: "Architecture and Module Boundaries",
    purpose: "Check ownership, coupling, dependencies, and architectural drift.",
    keywords: ["architecture", "module", "service", "refactor", "dependency"],
  },
  {
    id: "redundant-patterns",
    name: "Redundant Code and Competing Patterns",
    purpose: "Find duplicated behavior and competing implementations.",
    keywords: ["duplicate", "redundant", "consolidate", "utility", "pattern"],
  },
  {
    id: "dead-code",
    name: "Dead Code, Stale Features, and Unused Dependencies",
    purpose: "Separate confirmed obsolete code from uncertain dynamic usage.",
    keywords: ["dead", "unused", "remove", "legacy", "dependency"],
  },
  {
    id: "error-handling",
    name: "Error Handling: Fail Fast and Fail Loud",
    purpose: "Review negative paths, swallowed failures, retries, and timeouts.",
    keywords: ["error", "failure", "retry", "timeout", "exception"],
  },
  {
    id: "configuration-secrets",
    name: "Configuration, Environment, and Secrets",
    purpose: "Review configuration validation, environment drift, and secret exposure.",
    keywords: ["config", "environment", "secret", "credential", "deploy"],
  },
  {
    id: "data-integrity",
    name: "Data Model and Persistence Integrity",
    purpose: "Review schemas, constraints, transactions, concurrency, and migrations.",
    keywords: ["database", "data", "schema", "migration", "query", "transaction"],
  },
  {
    id: "domain-invariants",
    name: "Business Logic and Domain Invariants",
    purpose: "Trace business rules and confirm they are enforced consistently.",
    keywords: ["business", "rule", "workflow", "behavior", "domain"],
  },
  {
    id: "authorization",
    name: "Authentication, Authorization, and Trust Boundaries",
    purpose: "Review identity, access control, ownership, privilege, and trust boundaries.",
    keywords: ["auth", "login", "permission", "role", "user", "tenant", "oauth"],
  },
  {
    id: "input-contracts",
    name: "Input Validation and API Contracts",
    purpose: "Review validation and contracts across every external boundary.",
    keywords: ["api", "input", "validation", "contract", "endpoint", "request"],
  },
  {
    id: "integration-isolation",
    name: "External Integrations and Failure Isolation",
    purpose: "Review third-party boundaries, retries, timeouts, and reconciliation.",
    keywords: ["integration", "webhook", "provider", "external", "api", "oauth"],
  },
  {
    id: "background-idempotency",
    name: "Background Jobs, Scheduling, and Idempotency",
    purpose: "Review duplicate execution, retries, queues, shutdown, and reconciliation.",
    keywords: ["job", "queue", "schedule", "background", "event", "idempotent"],
  },
  {
    id: "frontend-state",
    name: "Frontend Structure and State Management",
    purpose: "Review component boundaries, state ownership, accessibility, and async UX.",
    keywords: ["frontend", "ui", "component", "state", "form", "accessibility"],
  },
  {
    id: "visual-art-direction",
    name: "Rendered Visual Art Direction",
    purpose:
      "Inspect consistent desktop and mobile screenshots for hierarchy, composition, typography, spacing, brand coherence, and visible defects.",
    keywords: ["website", "webpage", "landing", "visual", "design", "typography", "layout", "brand"],
  },
  {
    id: "responsive-visual-qa",
    name: "Responsive Visual and Interaction QA",
    purpose:
      "Compare rendered desktop and mobile states for fold placement, overflow, overlap, legibility, tap targets, and interaction feedback.",
    keywords: ["website", "webpage", "responsive", "mobile", "desktop", "breakpoint", "layout", "interaction"],
  },
  {
    id: "performance-scalability",
    name: "Performance and Scalability Foundations",
    purpose: "Separate measured bottlenecks from speculative optimization.",
    keywords: ["performance", "scale", "slow", "latency", "memory", "cache"],
  },
  {
    id: "observability",
    name: "Observability, Logging, and Operational Visibility",
    purpose: "Check whether failures and critical workflows are operable in production.",
    keywords: ["log", "metric", "trace", "monitor", "alert", "production"],
  },
  {
    id: "testing-strategy",
    name: "Testing Strategy and Quality Gates",
    purpose: "Build a risk-based test matrix and verify meaningful behavior.",
    keywords: ["test", "quality", "coverage", "regression", "verify"],
  },
  {
    id: "supply-chain",
    name: "Build, Dependency, and Supply-Chain Hygiene",
    purpose: "Review reproducibility, packages, build scripts, and dependency risk.",
    keywords: ["build", "package", "dependency", "lockfile", "container", "supply"],
  },
  {
    id: "deployment-readiness",
    name: "Deployment and Production Readiness",
    purpose: "Review deployment, rollback, recovery, scaling, and runtime safety.",
    keywords: ["deploy", "production", "rollback", "release", "hosting", "backup"],
  },
  {
    id: "authoritative-docs",
    name: "Documentation and Authoritative Project Rules",
    purpose: "Reconcile documentation with verified implementation and commands.",
    keywords: ["docs", "documentation", "readme", "instructions", "agents"],
  },
  {
    id: "final-senior-review",
    name: "Final Senior-Engineer Review and Consolidation",
    purpose: "Skeptically arbitrate all evidence, remove duplicates, and set final status.",
    keywords: ["final", "review", "production", "ready", "audit"],
  },
];

export const AGENT_BY_ID = new Map(AGENTS.map((agent) => [agent.id, agent]));
