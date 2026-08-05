# Restart on another device

Paste this block into a new Codex task on the other Windows device:

```text
I am continuing the AI Prompt Orchestrator project from the latest pushed main branch.

Repository: https://github.com/ethanJPope/ai-prompt-orchestrator.git
Branch/commit: main / 3e7e2c45eddf7497b6fa70c70731ad8466099c2d
Current goal: run a valid blinded AB-005 plugin-versus-normal-Codex website trial.

1. Clone the repository or use the existing clone. Preserve unrelated local changes.
2. Check out main, pull the latest commit, then read AGENTS.md, PROJECT.md, README.md, experiments/ab-005/RUN.md, and experiments/ab-005/original-prompt.md.
3. From the repository root run: pnpm install --frozen-lockfile; pnpm setup:plugin; pnpm test; pnpm smoke.
4. Confirm the generated plugins/ai-prompt-orchestrator/.mcp.json is machine-local and is not staged or committed.
5. Open this repository as the active project in Codex Desktop, restart the app, and enable the local AI Prompt Orchestrator plugin from the repo marketplace.
6. Create two new Codex chats with the same starter fixture, model, reasoning setting, and exact prompt from experiments/ab-005/original-prompt.md.
7. Enable the plugin in exactly one chat. In the other, verify there is no ai-prompt-orchestrator prepare_review call; do not rely on labels alone.
8. Do not reuse the previous invalid trial: it used different controls and both thread records showed orchestrator activity.
9. Require each chat to save work/comparison-run.json, attach exact 1440x1000 and 390x844 screenshots, record explicit UTC timing, and exercise all 19 interaction IDs.
10. After both chats finish, save the two packages as run-a.json and run-b.json and run: pnpm validate:comparison run-a.json run-b.json.
11. Keep the plugin mapping hidden until raw evidence is frozen. Then report both thread deep links, the validator output, the mapping, and any blockers.

Constraints: keep the plugin thin; never commit credentials, .env files, customer code, or generated .mcp.json; do not activate payments or publish anything; preserve the minimum-ten review requirement for substantive work.

Stop and explain the exact blocker if GitHub access, plugin discovery, browser rendering, or the no-plugin control cannot be established. Otherwise give visible proof for every check.
```
