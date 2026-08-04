# AI Prompt Orchestrator v0.3

This is a local proof of the proposed paid Codex workflow:

1. A thin Codex plugin calls a local MCP server.
2. The server checks the account entitlement on every tool call.
3. Substantive prompts receive an improved task brief and exactly ten targeted reviewer profiles.
4. Minor follow-ups bypass the review panel.
5. Deactivating the account blocks the next server request without uninstalling the plugin.

Normal interface work receives exactly ten passes, including two specialists that inspect rendered desktop and mobile screenshots. v0.3 adds a versioned review contract, one task-local evidence packet, tiered reviewer budgets, a discovery and gate phase before specialist waves, fail-closed evidence validation, and task-local latency telemetry. Independent specialists run in bounded parallel waves; the final arbiter remains last. A clean first implementation exits without a repair cycle, while a failed gate allows one focused repair and reruns only affected checks.

The server does not call an LLM in this version. Codex is expected to run the selected reviewer prompts as read-only subagents and keep the main agent as the only writer.

## Run the proof

```powershell
pnpm install
pnpm test
pnpm smoke
pnpm audit --prod
```

Expected smoke-test result:

- `demo-active` receives exactly ten reviewers.
- A website request receives ten reviewers, screenshot-grounded visual QA, parallel waves, and a one-repair cap.
- A v0.3 website plan includes evidence-packet, budget, deterministic-gate, and telemetry contracts.
- The test changes that account to inactive in an isolated temporary entitlement file.
- Its next MCP call returns `subscription_inactive`.

Validate a completed task-local evidence packet before allowing a final clean result:

```powershell
pnpm validate:evidence <path-to-packet.json> --plan=<returned-review-plan.json>
```

The validator fails closed when the packet is not bound to the returned plan, required gates or generated UI measurements are missing, evidence paths escape the task directory, fresh UI evidence or ten reviewer outcomes are missing, or the final ready status is absent.

The tracked development accounts live in `data/entitlements.json`:

- `demo-active`
- `demo-cancelled`

Change a local development entitlement with:

```powershell
pnpm entitlement demo-active inactive
pnpm entitlement demo-active active
```

This is deliberately not authentication. A caller can currently claim any account ID. Production must replace `account_id` with an OAuth-verified subject and check subscription entitlement server-side.

## Local Codex plugin

The local marketplace manifest is at `.agents/plugins/marketplace.json`. The plugin is under `plugins/ai-prompt-orchestrator`, and its generated MCP configuration starts this repository's local server over stdio.

The MCP file contains the checkout's absolute path, so it is intentionally ignored by Git. Generate it after every fresh clone or whenever the repository moves:

```powershell
pnpm install --frozen-lockfile
pnpm setup:plugin
pnpm test
pnpm smoke
```

The repository already contains `.agents/plugins/marketplace.json`, so the Codex desktop app can discover it as a repo marketplace. After generating `.mcp.json`:

1. Open this repository as the active project in the Codex desktop app.
2. Restart the desktop app so it reloads the repo marketplace.
3. Open **Plugins**, find **AI Prompt Orchestrator** under the local **Personal** marketplace, and install or enable it.
4. Start a new Codex task so the skill and MCP tools load from a clean boundary.

Do not assume the standalone `codex` executable supports plugin-management subcommands; older CLI builds do not. The desktop Plugins Directory is the authoritative installation route for this repo-local prototype.

For a full new-device restart prompt, see `RESTART-ON-ANOTHER-DEVICE.md`.

## Production boundary

Keep these capabilities server-side:

- account entitlement;
- reviewer selection and routing;
- reviewer instructions;
- quality scoring and policy updates;
- rate limits and usage records.

The published plugin should contain only the bootstrap workflow and connection metadata. A production server should use Streamable HTTP, OAuth 2.1, short-lived tokens, per-request token verification, and an external subscription system. No real payment activation belongs in this prototype.

## Privacy boundary

The current tool accepts only the task prompt and an optional short project-context summary. It does not request repository contents, secrets, raw transcripts, or source files. Expanding that boundary requires an explicit privacy decision and user consent.
