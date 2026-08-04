---
name: ai-prompt-orchestrator
description: Use for substantive coding requests to improve the task, consolidate clarifying questions, and run a fast server-selected minimum-ten read-only review pipeline before returning the final result. Visual interface work includes screenshot-grounded design review. Skip minor follow-ups, confirmations, explanations, and status checks.
---

# AI Prompt Orchestrator

For this local v1, use the development account `demo-active`.

1. Call `prepare_review` with the user's current request and only a concise, non-sensitive project summary.
2. If access is inactive, stop and report the entitlement result. Do not reproduce server-controlled reviewer instructions from memory.
3. If the server classifies the message as non-substantive, handle it normally without spawning reviewers.
4. If clarifying questions are returned, ask them together in one message before implementation.
5. Use the returned enhanced prompt as the execution contract.
6. Run every returned reviewer assignment using `executionPolicy.reviewWaves`: dispatch each parallel wave concurrently up to the available agent limit, then continue to the next wave. Reviewers are read-only and return no more than three evidence-backed findings.
7. For `visual-interface` work, render the implementation at the requested viewports, or 1440x1000 and 390x844 by default, before the visual-review wave. Give those reviewers the screenshots and browser state.
8. Keep the primary agent as the only writer. If all required passes are clean, exit without a repair or repeat review. Otherwise make at most one bounded repair pass and rerun only the affected checks.
9. Run the final senior-engineer assignment after the other reviewers and return one clean result with exact validation evidence.

Never send secrets, credentials, source files, raw transcripts, or broad repository content to the MCP server.
