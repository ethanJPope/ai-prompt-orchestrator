# Controlled A/B Trial 003

Date: 2026-08-03 (America/Phoenix)

## Conclusion

Version 0.2 improved first-pass quality in this trial, but it did not improve speed. The plugin treatment scored 92.5/100 versus 85.5/100 for normal Codex. Most of the gain came from product completeness and accessibility rather than a dramatic visual-design difference: the visual scores were 42/45 and 41/45.

The treatment took 3,549.511 seconds (59m 09.5s) versus 748.107 seconds (12m 28.1s) for the baseline. That is 4.74 times as long, or 2,801.404 additional seconds (46m 41.4s). This is slower than trial 002's 3.30× ratio.

Exactly ten plugin reviewers ran: nine specialists in bounded waves followed by the final arbiter. The minimum-ten promise was therefore met, but this trial shows that ten full, high-reasoning reviewer turns are too expensive for the quality margin delivered.

## Locked score

| Category | Plugin treatment | No-plugin baseline |
|---|---:|---:|
| Visual execution | 42.0/45 | 41.0/45 |
| Product behavior | 25.0/25 | 22.0/25 |
| Responsive accessibility | 13.5/15 | 9.5/15 |
| Engineering evidence | 10.0/10 | 10.0/10 |
| Completion evidence | 2.0/5 | 3.0/5 |
| **Total** | **92.5/100** | **85.5/100** |

The visual result is effectively a narrow edge rather than a decisive win. The plugin version recomposed more cleanly on mobile and exposed schedule conflicts more clearly. The baseline had an equally strong desktop identity and a more editorial schedule grid. A one-point visual difference is within reasonable evaluator variance.

## Browser and test evidence

| Measure | Plugin treatment | No-plugin baseline |
|---|---:|---:|
| Independently rerun tests | 9/9 | 8/8 |
| Desktop document overflow | None | None |
| Mobile document overflow | None | None |
| Console errors or warnings | None | None |
| Search and filters | Passed | Passed |
| Saved schedule persistence | Passed | Passed |
| Details dialog and initial focus | Passed | Passed |
| Invalid and valid email states | Passed | Passed |
| Named overlap warning | Passed | Failed |

In the plugin build, saving "Cinema for Closed Eyes" and "Sculpting the Sub-Bass" produced a visible warning naming both overlapping sessions. The baseline correctly detected the overlap and styled the cards, but it did not present the required warning naming both sessions.

Both implementations correctly handled saving, removal, counts, grouping, clearing, persistence, search, and email validation. Both had deterministic logic and server-boundary tests, local assets, reproducible commands, and no observed external network dependency.

## Confirmed defects

### Plugin treatment

- The brief required a sold-out session/state, but the delivered schedule did not include one.
- Several small-text color combinations failed WCAG AA contrast, including red-on-paper and muted gray-on-paper treatments.
- The ultraviolet focus outline did not consistently reach the 3:1 focus-indicator contrast target.
- A few mobile controls were smaller than the practical 44×44 target.
- The required-name screenshots were captured before later polish; extra `-final` screenshots were also not regenerated after the final source edits.

### No-plugin baseline

- It detected overlap but omitted the clear, named conflict warning required by the brief.
- Drawer overflow styling targets a class not present in the markup, so a long saved list could push content beyond the viewport.
- The tab semantics were incomplete, the result count was not live, and closed-drawer controls remained keyboard-focusable offscreen.
- Several contrast pairs failed WCAG AA, and multiple interactive targets were substantially below 44×44.
- Mobile signal artwork extended beyond and was clipped by its visual container.

## Completion-score note

Both tasks set the requested browser viewports, but the stored PNGs are 1425×990 and 375×812 rather than literal 1440×1000 and 390×844, so neither received the two screenshot-dimension points. The baseline final answer accurately disclosed its local-only form behavior. The plugin answer did not disclose the missing sold-out state, contrast gaps, or the fact that its referenced screenshots preceded the last edits.

## Controlled setup and limitations

- The two task attachments were byte-identical: SHA-256 `B4DB26E3C176974B0EE3D9807EBB74A29EF29EFB074D7480115CD6DB7F1DD9E5`.
- Both used `gpt-5.6-luna` at `xhigh` reasoning and started 22 seconds apart.
- The treatment invoked the installed orchestrator and launched exactly ten required reviewers.
- Each task received one build prompt and no corrective follow-up.
- The user revealed which task used the plugin before scoring, so this was not a blinded adjudication. Independent test reruns, browser reproduction, source inspection, and specialist checks reduced but did not remove that bias.
- Visual scoring is reasoned judgment against the locked rubric, not user-preference testing.
- This is one complex website brief on one model. Token and monetary costs were unavailable, so wall-clock duration is the cost proxy.

## Product implication

Version 0.2 reversed trial 002's quality result, but failed its speed goal. The next version should preserve ten checks while making them lighter: prepare one shared evidence packet, run most reviewers at lower reasoning with strict time and tool budgets, restrict screenshot/browser work to visual specialists, and allow repair only for a failed gate. Automated contrast, tap-target, requirement-coverage, and final-screenshot checks should become hard gates before another controlled trial.
