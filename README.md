# AI Prompt Orchestrator v0.2

This is a local proof of the proposed paid Codex workflow:

1. A thin Codex plugin calls a local MCP server.
2. The server checks the account entitlement on every tool call.
3. Substantive prompts receive an improved task brief and at least ten targeted reviewer profiles.
4. Minor follow-ups bypass the review panel.
5. Deactivating the account blocks the next server request without uninstalling the plugin.

Normal interface work receives exactly ten passes, including two specialists that inspect rendered desktop and mobile screenshots. Independent specialists run in bounded parallel waves; the final arbiter remains last. A clean first implementation exits without a repair cycle, while a failed gate allows one focused repair and reruns only affected checks.

The server does not call an LLM in this version. Codex is expected to run the selected reviewer prompts as read-only subagents and keep the main agent as the only writer.

## Run the proof

```powershell
pnpm install
pnpm test
pnpm smoke
```

Expected smoke-test result:

- `demo-active` receives at least ten reviewers.
- A website request receives ten reviewers, screenshot-grounded visual QA, parallel waves, and a one-repair cap.
- The test changes that account to inactive in an isolated temporary entitlement file.
- Its next MCP call returns `subscription_inactive`.

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

The repository-local marketplace is not installed automatically. When ready to test it in Codex, add this repository as a local marketplace and install the plugin:

```powershell
codex plugin marketplace add <absolute-path-to-this-repository>
codex plugin add ai-prompt-orchestrator@personal
```

Start a new Codex task after installation so the skill and MCP tools load from a clean boundary.

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
