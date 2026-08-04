# Restart on another device

Paste the block below into a new Codex task on the other Windows device.

```text
I am continuing the AI Prompt Orchestrator project on a new device.

Repository: https://github.com/ethanJPope/ai-prompt-orchestrator.git
Target branch: main
Goal: restore the repository, install its local Codex plugin, and verify the current prototype without changing its product behavior.

Please do the following:
1. Confirm Git, Node.js 20 or newer, pnpm, and the Codex desktop app are available. Do not print tokens or credentials.
2. Clone the repository into a sensible local development folder, or use the existing clone if one is already present. Preserve any existing local changes.
3. Check out `main`, pull the latest changes, and read `AGENTS.md`, `PROJECT.md`, and `README.md` before editing anything.
4. From the repository root, run `pnpm install --frozen-lockfile`.
5. Run `pnpm setup:plugin`. Confirm that `plugins/ai-prompt-orchestrator/.mcp.json` was generated with paths for this device. This file is machine-local and must not be committed.
6. Run `pnpm test`, `pnpm smoke`, and `pnpm audit --prod`. Report the exact results.
7. Validate `plugins/ai-prompt-orchestrator` and its bundled skill with the current Codex plugin/skill validators if those validators are available on this device.
8. Confirm the repo contains `.agents/plugins/marketplace.json`, then open this repository as the active project in the Codex desktop app and restart the app so it reloads the repo marketplace.
9. In the desktop app, open **Plugins**, find **AI Prompt Orchestrator** under the local **Personal** marketplace, and install or enable it. Do not assume the standalone `codex` executable has plugin-management commands; use the desktop Plugins Directory unless this device's current official interface clearly provides another supported route.
10. Tell me to start a new Codex task so the updated skill and MCP server load cleanly. In that new task, verify that the `ai-prompt-orchestrator` skill and its `prepare_review` tool are available.

Important constraints:
- Keep the plugin thin. Reviewer selection, entitlement logic, and reviewer instructions stay in `src/`, outside the plugin folder.
- Never commit `.env` files, credentials, tokens, customer code, or the generated `.mcp.json`.
- This is still a local technical prototype, not production authentication or billing.
- Do not activate payments, form a company, publish a marketplace release, or make external promises.
- Substantive tasks must retain at least ten review passes, including the final arbiter.

Stop and explain the exact blocker if repository access, desktop plugin discovery, or Codex authentication is unavailable. Otherwise complete the setup and give me the visible proof for every check.
```
