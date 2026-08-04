# Project State

Last verified: 2026-08-03

## Stage

Stage 0: technical feasibility prototype. Customer demand, quality improvement, privacy acceptance, and unit economics remain unvalidated.

## Current proof target

Measure whether the installed orchestrator improves first-pass accepted quality over normal Codex on identical coding tasks, and quantify its latency cost.

Status: three controlled trials completed on 2026-08-03. Trial 001 tied at 100/100 with byte-identical production code. In trial 002, the no-plugin baseline was visually stronger (48/50 versus 43/50). In trial 003, version 0.2 reversed the quality result: the plugin scored 92.5/100 versus 85.5/100, although its visual edge was only 42/45 versus 41/45. Plugin treatments took 3.82×, 3.30×, and 4.74× as long. See `evidence/ab-001-results.md`, `evidence/ab-002-visual-results.md`, and `evidence/ab-003-results.md`.

Version 0.2 was exercised in trial 003. Visual-interface work received exactly ten targeted passes, including two screenshot-grounded visual reviewers. The pipeline improved product completeness and responsive accessibility, but the 4.74× latency ratio was worse than version 0.1's previous trial. Ten full `xhigh` reviewer turns are not a viable speed design even when scheduled in bounded waves. The current v0.2 setup adds a portable new-device generator so the thin local plugin no longer commits one machine's absolute server path.

## Locked v0.3 constraints

- Minimum-ten means ten actual read-only reviewer-agent turns; deterministic checks supplement them and do not count toward ten.
- Normal substantive work must target no more than 2× the wall-clock time of normal Codex.
- The first supported surface is the Codex desktop app; CLI and IDE support are deferred.
- v0.3 remains local and free of real billing or payment activation.
- Websites and UI work is the first optimized task class because it has the strongest measured evidence.

## Current implementation stopping point

- Thin local Codex plugin scaffolded.
- Fresh clones can generate their machine-local MCP configuration with `pnpm setup:plugin`.
- MCP server produces deterministic enhanced prompts and reviewer plans.
- v0.3 review plans expose versioned evidence-packet, reviewer-budget, deterministic-gate, finalization, and telemetry contracts.
- The visual classifier covers common UI language such as React settings pages, login forms, and onboarding screens.
- Review waves run discovery first, then a gate phase, then bounded specialists, with the arbiter last.
- `pnpm validate:evidence <packet.json> --plan=<returned-review-plan.json>` fails closed on plan mismatch, missing gates or generated UI measurements, stale screenshots, incomplete reviewers, duplicate or unknown outcomes, unsafe paths, and non-ready final status.
- The original twenty server-side reviewer profiles remain available, with two added visual specialists.
- Visual requests require consistent desktop and mobile renders before visual review.
- Review plans expose bounded parallel waves, a one-repair cap, and clean-pass early exit.
- Manual entitlement changes take effect on the next request.
- Unit and MCP smoke tests pass.
- The dependency audit, plugin validator, skill validator, package-boundary test, and credential-pattern scan pass.

## Not in v1

- OAuth 2.1 or hosted deployment.
- Payment processing or subscription checkout.
- Model or Codex API calls from the server.
- Automatic prompt-submit or stop hooks.
- Customer source-code upload.

## Next action

Create the task-local evidence packet during a fresh blinded AB-004 website trial, run the v0.3 workflow in both treatment and baseline tasks, and compare quality and wall-clock time against the 2× target.

## Restart packet

- Stopping point: v0.3 contract and fail-closed evidence validator are implemented; 61 tests, MCP smoke, and production dependency audit pass.
- Evidence: `evidence/ab-001-results.md`, `evidence/ab-002-visual-results.md`, `evidence/ab-003-results.md`, and all three experiment metadata files.
- What was just tried: identical complex festival-site prompts were run in isolated plugin and normal-Codex tasks; both test suites, both viewport flows, source requirements, accessibility details, and screenshots were independently checked.
- Useful signal: targeted minimum-ten review can improve functional completeness and accessibility, but the visible design gain was marginal and latency regressed.
- Next single action: run `experiments/ab-004/RUN.md` with a new website prompt and hidden assignment labels.
- Expected result: retain ten independent verdicts and the quality advantage while bringing treatment duration to no more than 2× baseline.
- Do not repeat: do not treat AB-003 as blinded evidence, because the treatment labels were revealed before adjudication. Use a fresh unseen fixture and conceal assignment until raw scores are recorded.
