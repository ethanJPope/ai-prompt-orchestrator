# Controlled Visual A/B Trial 002

Date: 2026-08-03 (America/Phoenix)

## Conclusion

The no-plugin baseline was visually stronger in this trial. It scored 48/50 for visual quality versus 43/50 for the plugin treatment. Both sites were polished, functional, responsive, and free of horizontal overflow. The treatment's ten reviews improved test and delivery coverage, but did not improve the visible design.

The locked raw rubric produced a 93/100 tie because the static checker gave the baseline 25/30. Independent inspection showed that deduction was a checker false positive: it matched the `http://www.w3.org/2000/svg` namespace inside a local embedded data-URI texture, not an external network request. With that corrected interpretation, the baseline is 98/100 and the treatment is 93/100.

The treatment took 1,067.164 seconds versus 323.148 seconds for the baseline: 3.30 times as long, or 744.016 additional seconds.

## Visual score

| Category | Plugin treatment | No-plugin baseline |
|---|---:|---:|
| Hierarchy and first-screen impact | 9/10 | 10/10 |
| Brand coherence and prompt fit | 9/10 | 10/10 |
| Composition, spacing, visual rhythm | 8/10 | 9/10 |
| Product preview and planner presentation | 9/10 | 9/10 |
| Mobile craftsmanship | 8/10 | 10/10 |
| **Visual total** | **43/50** | **48/50** |

The baseline's hero has more controlled typography, a cleaner product-preview composition, a stronger full-width mobile primary action, and better placement of the product preview near the mobile fold. The treatment remains strong, especially in the dark planner section, but its hero preview contains a cramped handwritten note at the lower-right edge and its mobile action stack is less cohesive.

## Technical and interaction results

| Measure | Plugin treatment | No-plugin baseline |
|---|---:|---:|
| Submitted tests | 7/7 | 5/5 |
| Static checker, raw | 30/30 | 25/30 |
| Static checker, adjudicated | 30/30 | 30/30 |
| Browser behavior | 20/20 | 20/20 |
| Desktop overflow | None | None |
| Mobile overflow at 390px | None | None |
| Console errors/warnings | None | None |
| Slider update | Passed | Passed |
| Day-toggle update | Passed | Passed |

For the treatment, changing the slider moved the total from 8 to 20 hours, then enabling Wednesday moved it to 25. For the baseline, the same actions moved the total from 12 to 20 to 25. Both updated contextual live-region messages and `aria-pressed` state correctly.

## What the plugin reviews actually improved

The treatment's reviewer passes found three concrete nonvisual gaps in its first draft: interaction was tested only through pure functions, the static server lacked happy-path delivery tests, and runtime/README metadata was stale or implicit. Those were fixed before handoff. The final treatment therefore had stronger automated interaction and server-delivery coverage than the baseline.

This is useful evidence that the current pipeline helps verification depth. It is not evidence that it improves visual taste or composition.

## Controlled setup

- Both tasks received the same prompt in `experiments/ab-002/original-prompt.md` and byte-identical blank fixtures.
- The rubric was locked at SHA-256 `31E987202E0184D372A44E1F0B20318CF74FE5B6C741ACEF5ADAEAAE58BDDEA5`.
- The static checker was locked at SHA-256 `A8498FC5EA9DE3C0776FAF99F1FA29929566701ECBE6CD973F7071B2D8F46C9C`.
- The treatment called the installed orchestrator and completed nine specialist passes plus the final arbiter.
- The plugin was removed and confirmed absent before the baseline task was created, then restored after the comparison.
- Both tasks received one prompt and no rescue follow-up.
- Matching screenshots were captured from the same local browser at 1440×1000 and 390×844.

## Uncertainty

- Visual scoring is reasoned judgment against a locked rubric, not an objective measurement or blinded multi-person panel.
- This is a single design brief on one model in Ethan's normal Codex environment.
- The pages were not published and no external user preference test was run.
- Token and monetary cost were unavailable; duration is the measured cost proxy.

## Product implication

After two controlled trials, the current minimum-ten pipeline has not improved first-pass output quality enough to justify its latency. It did deepen test coverage. The next version should separate visual/product critique from generic engineering review, run fewer default passes, and add targeted visual reviewers with screenshot feedback after rendering rather than relying primarily on source-code review.
