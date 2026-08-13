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

## Local backend v1

The repository now contains two local server surfaces:

- `src/server.mjs` is the stdio MCP server started by the Codex plugin. It exposes `check_entitlement` and `prepare_review`.
- `dashboard/server.mjs` is the local HTTP backend for the Observatory. Start it with:

```powershell
pnpm dashboard
```

It listens on `http://localhost:4321` by default. Set `DASHBOARD_PORT` to use another port.

The local HTTP API includes:

```text
POST /api/runs
GET  /api/runs
GET  /api/runs/:id
GET  /api/runs/:id/events       # Server-Sent Events
GET  /api/account
POST /api/account/activate
POST /api/account/deactivate
GET  /api/customer/stats
GET  /api/business/stats
```

Runs are memory-backed while active and persisted as task-local JSON snapshots under the operating system temporary directory. Set `ORCHESTRATOR_RUNS_PATH` to choose a local storage directory. Each packet records the run and correlation IDs, plan hash, current phase, reviewer statuses, gates, structured messages, wave handoffs, contradictions, arbiter status, and timing.

Activation and deactivation update the same local entitlement file used by the MCP server, so the next MCP request returns either an allowed decision or `subscription_inactive`. This remains a demo boundary, not authentication.

### macOS Monterey

The code uses portable Node.js APIs and the MCP SDK declares Node.js 18 or newer, but the current dependency tree includes a package requiring Node.js 20 or newer. Use Node.js 22 LTS on Monterey. Node.js 24's prebuilt macOS binaries require macOS 13.5 or newer, so Node.js 24 is not the right installation for Monterey. Install dependencies with `pnpm install`, run `pnpm test`, then use `pnpm dashboard` and `pnpm smoke`.

Validate a completed task-local evidence packet before allowing a final clean result:

```powershell
pnpm validate:evidence <path-to-packet.json> --plan=<returned-review-plan.json>
```

The validator fails closed when the packet is not bound to the returned plan, required gates or generated UI measurements are missing, evidence paths escape the task directory, fresh UI evidence or ten reviewer outcomes are missing, or the final ready status is absent.

For a blinded plugin/no-plugin website comparison, use the stricter pair contract:

```powershell
pnpm validate:comparison <run-a.json> <run-b.json>
```

Each run must include the same prompt hash, starter fingerprint, model, and reasoning setting; trustworthy start/finish timing; exact desktop and mobile screenshot evidence; zero console errors and warnings; every required interaction check; and a complete final response. The command reports the timing ratio and fails closed on missing evidence. The repeatable protocol and the next copy-paste task are in `experiments/ab-005/RUN.md` and `experiments/ab-005/original-prompt.md`.

To verify the prompt identity constants before a run:

```powershell
pnpm hash:comparison-prompt experiments/ab-005/original-prompt.md
```

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
