# AB-005 blinded evidence-package trial

Purpose: make plugin/no-plugin website comparisons reproducible, easy to inspect from thread links, and fail closed when timing or quality evidence is missing.

## Before starting

1. Use the exact text in `original-prompt.md` in both Codex chats. Do not add a plugin label, treatment label, or extra requirement.
2. Use the same starter fixture, model, reasoning setting, and desktop Codex surface for both chats.
3. Create two opaque run IDs independently (for example, `run-7q4m` and `run-9mz2`). Do not put the assignment in the ID, final response, workspace name, or evidence package.
4. Keep the assignment mapping hidden until the evaluator has recorded raw scores. The evaluator may receive the mapping later.

## Required evidence from each chat

At the first implementation action, record `startedAt` in UTC. Immediately after the final validation, record `finishedAt` in UTC and set `durationMs` to the difference. Use `source: explicit-task-clock`; record any user/approval wait separately as `idleDurationMs` instead of silently inflating or shrinking the duration.

Each chat must:

- save and attach a final `1440x1000` desktop screenshot and `390x844` mobile screenshot;
- record decoded image dimensions, device-pixel ratio, console errors, console warnings, and horizontal overflow;
- run the same required commands: dependency install if needed, project test, lint, production build, and a local browser preview;
- exercise every interaction ID listed in `original-prompt.md`, including search, filter, sort, modal focus trapping, invalid and valid form states, resource disclosure, keyboard focus, and reduced-motion behavior;
- record a clean/failed result for every interaction, never silently omit a check;
- save `work/comparison-run.json` and include that exact JSON in the final response;
- finish the response with `Built`, `Validated`, `Known limitations`, and `Artifacts` sections.

The JSON must conform to `src/comparison-contract.mjs` schema `1.0`. `blind.assignment` must be `hidden` and `blind.pluginMentioned` must be `false`. Use the prompt identity constants printed in the prompt. The prompt hash excludes the run-specific `RUN_ID`, `PROMPT_SHA256`, and `PROMPT_CHARACTER_COUNT` lines.

## Evaluation order

1. Receive both thread deep links and both JSON packages.
2. Save them as `run-a.json` and `run-b.json` without changing their contents.
3. Run:

   ```powershell
   pnpm validate:comparison run-a.json run-b.json
   ```

4. If validation fails, report the exact missing or invalid evidence before judging quality. Do not infer missing timing, screenshots, or interactions from prose.
5. Score each run while the assignment is still hidden. Use the same rubric: visual direction 25, product/content 20, interaction correctness 25, responsive/accessibility 20, engineering/test quality 10.
6. Record serious defects separately from the numerical score. A security, data-loss, broken-build, unusable-mobile, or inaccessible-core-flow defect is a release blocker regardless of score.
7. Reveal the mapping only after the raw evidence and scores are frozen. Compare quality delta and `durationRatio`; the target is no more than `2.0`.

## Decision rules

- **Pass:** both packages validate; no release blocker; treatment is at least 5 rubric points better or has no material regression; ratio is `<= 2.0`.
- **Mixed:** evidence validates but quality advantage is unclear, or the ratio is above `2.0` and below `3.0`; keep the pipeline and tune execution/evidence overhead.
- **Fail:** invalid evidence, a release blocker, ratio `>= 3.0`, or a material quality regression; fix the testing or review architecture before adding billing or distribution.

This trial is not a claim that a single website proves product-market fit. It is a measurement of first-pass quality and time under controlled conditions.
