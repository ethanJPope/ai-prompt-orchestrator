---
name: ai-prompt-orchestrator
description: Use for substantive coding requests to improve the task, consolidate clarifying questions, and run a fast server-selected minimum-ten read-only review pipeline before returning the final result. Visual interface work includes screenshot-grounded design review. Skip minor follow-ups, confirmations, explanations, and status checks.
---

# AI Prompt Orchestrator

For this local v0.3, use the development account `demo-active`.

1. Call `prepare_review` with the user's current request and only a concise, non-sensitive project summary.
2. If access is inactive, stop and report the entitlement result. Do not reproduce server-controlled reviewer instructions from memory.
3. If the server classifies the message as non-substantive, handle it normally without spawning reviewers.
4. If clarifying questions are returned, ask them together in one message before implementation.
5. Validate the returned `schemaVersion`, reviewer count, review budgets, evidence-packet contract, deterministic gates, and execution policy before implementation.
6. Use the returned enhanced prompt as the execution contract.
7. Before wave 1, create one fresh task-local JSON evidence packet containing the required fields. Record its timestamp and hash. Keep it out of the MCP request and do not commit it to the user's repository unless explicitly requested.
8. Run every returned reviewer assignment using `executionPolicy.reviewWaves`: dispatch each parallel wave concurrently up to the available agent limit, then continue to the next wave. Reviewers are read-only, honor their individual budgets, and return no more than three evidence-backed findings. Record completion or timeout; never add an unplanned replacement reviewer.
9. For `visual-interface` work, run every deterministic UI gate and render the implementation at the requested viewports, or 1440x1000 and 390x844 by default, before the visual-review wave. Give visual reviewers fresh PNG screenshots, viewport metadata, decoded dimensions, device-pixel ratio, implementation hash, screenshot hashes, and browser state from the evidence packet.
10. Before the visual wave, run `pnpm validate:evidence <packet.json> --plan=<returned-review-plan.json> --phase=before-visual`. Treat failure as blocked and do not dispatch visual reviewers until the packet is repaired.
11. Keep the primary agent as the only writer. If all required passes are clean, exit without a repair or repeat review. Otherwise make at most one bounded repair pass, invalidate all UI screenshots, recapture them, and rerun only the affected checks.
12. After all specialist outcomes are appended, run `pnpm validate:evidence <packet.json> --plan=<returned-review-plan.json> --phase=before-arbiter`. Give the final senior-engineer assignment the shared findings packet and deterministic gate results; it must not repeat broad repository discovery unless there is a contradiction or evidence gap.
13. Record total and per-wave timing so the result can be compared with the no-plugin baseline. The local target is no more than 2x normal Codex wall-clock time.
14. Use the returned telemetry contract to record timing, reviewer status, gate results, and repair count only. Do not store prompt text, source contents, secrets, or raw reviewer transcripts.
15. Before finalizing, run `pnpm validate:evidence <packet.json> --plan=<returned-review-plan.json> --phase=final`. Treat a failed or incomplete gate, stale screenshot, missing reviewer outcome, or non-ready final status as blocked; do not report the task as clean.

Never send secrets, credentials, source files, raw transcripts, or broad repository content to the MCP server.
