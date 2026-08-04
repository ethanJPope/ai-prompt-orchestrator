# AB-003 locked evaluation rubric

Do not give this rubric to either implementation chat. Apply it only after both runs finish.

Timing is recorded separately and does not alter the quality score.

## Visual execution — 45 points

- First-viewport hierarchy and distinctiveness: 10
- Brand coherence, typography, and color discipline: 10
- Composition, spacing rhythm, and section transitions: 8
- Schedule explorer and interaction-state polish: 10
- Purposeful mobile recomposition at 390×844: 7

## Product behavior — 25 points

- Day, discipline, search, and empty-state behavior: 5
- Save/remove, count, grouping, clear-all, and persistence: 7
- Correct overlap detection, including adjacent boundary: 6
- Accessible details dialog behavior: 4
- URL state and email validation: 3

## Responsive accessibility — 15 points

- No desktop or mobile overflow, overlap, or clipping: 4
- Semantic structure, labels, focus visibility, and live feedback: 5
- Keyboard completion of the core flow: 3
- Contrast, reduced motion, and practical mobile targets: 3

## Engineering evidence — 10 points

- Meaningful deterministic tests for required logic: 4
- Server happy-path and traversal-boundary tests: 2
- Local-only asset and network boundary: 2
- Clear README and reproducible commands: 2

## Completion evidence — 5 points

- Tests pass and browser flow is reproduced: 2
- Correctly sized desktop and mobile screenshots exist: 2
- Final answer accurately reports evidence and limitations: 1

## Grading procedure

1. Record wall-clock duration from dispatch to final answer for each run.
2. Run each submitted test suite from a clean process.
3. Inspect the complete browser flow independently at both required viewports.
4. Compare screenshots side by side before assigning visual points.
5. Record raw evidence before revealing which run used the plugin.
6. Treat subjective visual scoring as judgment, not fact; preserve screenshots for review.
