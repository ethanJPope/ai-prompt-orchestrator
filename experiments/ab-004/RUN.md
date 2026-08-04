# AB-004 fresh blinded UI latency trial

Purpose: test whether v0.3 keeps ten actual reviewer-agent turns while reducing treatment latency to no more than 2× normal Codex.

## Locked protocol

1. Choose one new, complex website or UI prompt that has not appeared in AB-001 through AB-003.
2. Save the prompt and rubric only after both task assignments are created, or store them in a sealed evaluator location until both tasks finish.
3. Create two isolated Codex desktop tasks within one minute of each other. Conceal which task has the plugin until raw scores and timings are recorded.
4. Give both tasks byte-identical prompts, the same blank fixture, and the same model/reasoning settings.
5. Treatment must return exactly ten actual reviewer-agent assignments, create one shared task-local evidence packet, honor reviewer budgets, run deterministic UI gates, and record task-local telemetry.
6. Baseline must use normal Codex without the plugin.
7. Record dispatch-to-final-answer duration, tests, browser flow, console output, screenshots, and any repair turns for both tasks.
8. Re-run each submitted test suite from a clean process and inspect both desktop and mobile states independently.
9. Score raw evidence before revealing assignment. Record visual, product, responsive-accessibility, engineering, and completion scores separately.

## Pass thresholds

- Ten actual treatment reviewer turns complete; deterministic gates do not count toward ten.
- Treatment quality advantage is at least 5 points, or no material regression if the baseline is already excellent.
- Treatment duration is no more than 2× baseline duration.
- No serious privacy, security, or correctness regression.

## Decision

- Pass: keep v0.3's evidence-and-budget architecture and begin a second replication trial.
- Mixed: keep the quality path, but tune budgets and packet size before considering hosted work.
- Fail: if runtime remains above 3× or the quality advantage disappears, redesign the ten-review execution model before adding billing or external distribution.

Do not reuse the AB-003 prompt, exposed task labels, or screenshots as fresh evidence.
