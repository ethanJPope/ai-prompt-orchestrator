# AI Prompt Orchestrator Working Rules

- Keep the Codex plugin thin. Paid routing logic and the agent registry belong in `src/`, not under `plugins/`.
- This v1 is a local entitlement and orchestration proof. Do not add real payments or claim production authentication.
- Never store tokens, passwords, payment details, or customer source code in this repository.
- Reviewer agents are read-only. Only the primary Codex agent may edit the user's project.
- Every substantive task must receive at least ten evaluation passes, including the final arbiter.
- Minor follow-ups, confirmations, and status checks bypass the review pipeline.
- Run `pnpm test`, `pnpm smoke`, and the plugin validators before handoff.
