# Controlled A/B Trial 001

Date: 2026-08-03 (America/Phoenix)

## Conclusion

The plugin did not improve accepted-result quality in this trial. Both the plugin-assisted run and the plugin-free baseline scored 100/100 on the rubric locked before either task started. Their production implementation files were byte-identical. The treatment added a somewhat more explicit test suite, but took 869.018 seconds versus 227.484 seconds: 3.82 times as long, or 641.534 additional seconds.

This is one feasibility trial, not enough evidence to conclude that the plugin never helps. It is enough to reject a claim that the current v0.1 demonstrated a quality advantage here.

## Controlled setup

- The original prompt is `experiments/ab-001/original-prompt.md`.
- Both tasks began from byte-identical copies of `experiments/ab-001/template`.
- The rubric was locked at SHA-256 `CD88D233C3FF10F6206E62A06D51DDBFDFFBB36B10BD05F34C5F9BC54B901E42`.
- The grader was locked at SHA-256 `439F8C9AF4584D65F4B0918DD496342575B4ED03F70B416F92F562F38E79E451`.
- A known-correct oracle scored 100/100; the untouched starter scored 15/100.
- Each task received one prompt and no correction or rescue turns.
- The treatment task was created while `ai-prompt-orchestrator@personal` v0.1.0 was installed and explicitly invoked it.
- The plugin and its marketplace were removed before the baseline task was created; CLI inspection confirmed the plugin was absent.
- After the baseline completed, the plugin and marketplace were restored.

## Results

| Measure | Plugin treatment | No-plugin baseline |
|---|---:|---:|
| Hidden score | 100/100 | 100/100 |
| Correction turns | 0 | 0 |
| Codex task duration | 869.018 s | 227.484 s |
| Submitted tests passing | 11/11 | 9/9 |
| Reviewer pipeline | 19 specialists + final arbiter | None from this plugin |
| Production code | Identical to baseline | Identical to treatment |

The only file that differed between completed workspaces was `test/complete-task.test.mjs`. The treatment's tests separated validation, POST-only routing, and failed-queue recovery into more explicit cases and used a deterministic signal before releasing the concurrency gate. The baseline still covered all scored requirements, including recovery after a failed persistence attempt.

## Independent checks

- The hidden grader passed all ten checks for both workspaces.
- File hashes confirmed identical `src/task-service.mjs`, `src/http-handler.mjs`, `src/task-store.mjs`, exports, package metadata, and existing tests.
- A no-index directory diff confirmed that only the newly added completion test file differed.
- Thread records confirmed the treatment called MCP tool `prepare_review` with active entitlement and ran a 20-pass contract.
- Thread records confirmed the baseline did not call the orchestrator.
- Both task final reports accurately described their implementations and test totals.

## Verified routing defect

Prompt formatting changes the review count. Passing the original multi-line prompt directly to `preparePlan` selects 12 reviewers. The treatment agent sent a semantically identical single-line version to `prepare_review`, which selected all 20.

The cause is the `fullFoundationAudit` regular expression in `src/orchestrator.mjs`: on a single line, the ordinary phrase “complete their own task” can match the first half of the full-audit pattern and a later “audit event” can match the second half. Newlines prevent the same match because `.` does not cross them. This is a false positive and made the treatment slower than its intended high-risk 12-review route.

## Limitations

- This was one task on one model in Ethan's normal Codex environment; the baseline also used the existing `verify-work` workflow.
- The prompt already stated the critical acceptance criteria clearly, leaving little room for prompt improvement.
- Both task runs and the primary grader used Node.js 24.11.0 rather than the fixture-requested Node.js 22. The bundled independent rerun used Node.js 24.14.0, so Node 22 compatibility remains unverified.
- Runtime cost was measured; token and monetary cost were not available from the task records.

## Next decision

Do not make 20 reviews the default. Fix the format-sensitive full-audit classifier, then run a small evaluation set across ambiguous bug fixes, security-sensitive changes, refactors, and UI tasks. Compare first-pass defects, correction turns, false findings, duration, and usage. The useful default is likely an adaptive minimum-ten pipeline with early exit, not unconditional all-20 review.
