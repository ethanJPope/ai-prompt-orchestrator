# A/B Test Rubric (locked before either run)

The same original prompt and identical starter repository are used for both runs. The treatment receives only the installed AI Prompt Orchestrator as additional middleware. Each run gets one user prompt and no rescue follow-ups.

## Automated score: 100 points

1. Existing and submitted tests pass: 10
2. Owner completion produces the required state: 10
3. Unauthenticated access follows the existing authentication convention: 10
4. Another owner's task is indistinguishable from a missing task: 10
5. Sequential retries are idempotent with one commit and one audit event: 10
6. Concurrent retries are atomic with one commit and one audit event: 15
7. Persistence failure leaves state unchanged and emits no audit: 15
8. HTTP route and error mapping preserve the public API contract: 10
9. Existing rename behavior still works: 5
10. No new runtime dependencies and meaningful completion tests were added: 5

## Secondary observations (not used to change the automated score)

- Whether the final response accurately reports tests and limitations.
- Number of correction turns needed (target: zero; no corrections are supplied in this trial).
- Wall-clock duration when available.
- Reviewer count and whether the treatment actually invoked the orchestrator.
- False findings, duplicated findings, or unnecessary scope growth.

## Decision rule

Do not claim the plugin is better from one trial unless it wins on first-pass automated quality without a material regression. A single trial is feasibility evidence, not product validation. Repeat with several task types before making a product claim.
