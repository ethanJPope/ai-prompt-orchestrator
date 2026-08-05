Build **Afterimage**, a premium interactive website for a fictional moving-image archive about how cities, memory, and people change after dark.

Work only in the current workspace. Inspect the existing project structure first, then implement the site using the project’s existing stack. If it is a blank static fixture, use local HTML, CSS, and JavaScript under `public/`. Do not ask follow-up questions; make strong, reasonable product and design decisions.

Do not mention this prompt, experiments, plugins, orchestration, agents, reviewers, or assignment labels in the website or its documentation. Do not use external APIs, remote images, external fonts, analytics, video embeds, or network-dependent assets. Use local assets, CSS-generated visuals, inline SVG, or carefully designed placeholders. Keep all data deterministic and local.

## Product direction

Afterimage should feel like a cinematic editorial archive and exhibition guide—not a streaming-service clone, generic SaaS dashboard, or template landing page. The audience is visually literate people aged 16–35 who care about independent film, cities, sound, and public life.

Use a disciplined visual system:

- near-black ink and warm paper surfaces;
- oxidized copper, sodium orange, electric cyan, and one restrained violet accent;
- oversized condensed display typography paired with a readable editorial sans;
- film-frame borders, grain-like CSS texture, contact-sheet grids, timestamps, catalog marks, and map/route motifs;
- asymmetrical but intentional composition with a clear reading rhythm;
- restrained motion that feels like a projector starting, with a complete reduced-motion alternative.

The result should feel authored, tactile, credible, and calm enough to read. Avoid neon cyberpunk clutter, excessive glassmorphism, fake film-player controls, and filler copy.

## Required experience

Create one cohesive responsive website containing:

1. **Sticky archive navigation**
   - Afterimage wordmark and a small “moving-image archive” descriptor.
   - Links to “The Archive,” “Screenings,” “Field Notes,” and “About.”
   - A primary “Reserve a seat” button.
   - An accessible mobile menu toggle with `aria-expanded`, Escape-to-close, and a visible focus state.

2. **Editorial hero**
   - A strong headline about the city after dark and a concise supporting paragraph.
   - Primary and secondary calls to action that scroll to real sections.
   - A CSS/SVG “light trail” visual that resembles a long-exposure street scene, with labeled coordinates, reel number, and local time.
   - A featured film card with title, director, year, runtime, city, and a clear non-playing “View catalog entry” action.

3. **Archive thesis and metrics**
   - Explain why moving images can preserve a city’s invisible rituals.
   - Describe the relationship between streets, sound, memory, and collective attention.
   - Three editorial metric cards with believable figures and short explanations.
   - Include a small horizontal “archive pulse” data visualization made with CSS or inline SVG.

4. **Interactive Archive Explorer**
   - At least eight realistic local film records with title, director, city, year, runtime, mood, status, and tags.
   - Search input that filters by title, director, city, and tags without a reload.
   - Category filters for “Street Study,” “Portrait,” “Sound Map,” and “Speculative.”
   - A sort control with at least “Featured,” “Newest,” and “Shortest”; numeric years and runtimes must sort numerically, not lexicographically.
   - Selectable film cards with clear hover, selected, focus, and disabled states.
   - A comparison control that allows exactly two films, shows an empty/reset state, and presents a readable side-by-side comparison with runtime, year, city, and mood.
   - Clicking a card opens an accessible detail dialog or drawer with a close button, labeled content, Escape-to-close, focus moved into the dialog, full Tab/Shift+Tab focus trapping, and focus restored to the triggering card on close. The mobile layout must remain usable.

5. **Screenings and reservation planner**
   - A date strip with at least four screening dates and time options.
   - Visit type options (“Just me,” “Bring a friend,” “Small group”) and a number-of-seats control.
   - A calculated summary that updates as date, time, and seats change.
   - Invalid submission must produce an accessible `role="alert"` without pretending to reserve anything.
   - A valid submission must produce a clear `role="status"` confirmation and preserve the selected summary.
   - Keep this local UI state; do not imply a real ticket purchase or backend booking.

6. **Night route timeline**
   - A responsive sequence from “Last light” through “Blue hour,” “Midnight cut,” and “First train.”
   - Desktop may use a horizontal visual timeline; mobile must become a readable stacked sequence.
   - Include location, time, and one-sentence context for each stop.

7. **Field Notes and resources**
   - At least six local resources labeled Field Note, Interview, Listening Guide, or Map.
   - Search and type filtering without a reload.
   - A featured resource with stronger visual hierarchy.
   - A “Load more field notes” or progressive-disclosure control that has a visible count change and a useful end state.

8. **Newsletter and footer**
   - Newsletter input with accessible invalid-email and success states; no network request.
   - Archive summary, contact link, social-style links, privacy/accessibility links, and a small catalog colophon.
   - Every visible control must work, scroll to a real target, open a real local state, or be clearly marked as unavailable. Do not ship dead buttons or fake play controls.

## Quality and evidence requirements

- Fully responsive and visually checked at exactly `1440x1000` and `390x844`.
- No horizontal overflow at either viewport; record the measured overflow in the evidence package.
- Use semantic landmarks, labels, practical touch targets, readable contrast, and visible `:focus-visible` treatment.
- Keyboard navigation must work for the menu, filters, comparison, dialog/drawer, forms, and progressive disclosure.
- Verify the dialog’s complete focus trap and focus restoration, not merely that its close button receives focus.
- Verify `prefers-reduced-motion` with motion disabled or substituted by a static state.
- Run the project’s dependency install (if needed), test, lint, production build, and local browser preview commands. Record exact commands, exit codes, and short output tails.
- Inspect the rendered result in a browser after the final repair. Check console errors and warnings, not only errors.
- Resolve broken interactions, contrast problems, layout shifts, console diagnostics, and obvious responsive defects before finishing.
- Use realistic copy and deterministic local mock data.

## Blinded run protocol

At the first implementation action, generate a fresh random opaque run ID of at least eight characters (do not reuse the example `run-7q4m`) and record the current UTC time as `startedAt`. Do not encode whether this chat has any extra tooling. At the instant the final validation and screenshot capture finish, record `finishedAt` and compute `durationMs` from those two UTC timestamps. If there was a user/approval wait, record it separately as `idleDurationMs`.

Use these exact prompt identity constants in the evidence package. They are the hash and character count of this prompt after normalizing CRLF to LF and removing the `RUN_ID`, `PROMPT_SHA256`, and `PROMPT_CHARACTER_COUNT` lines:

PROMPT_SHA256: c45f303791e4f149756ac7da4af6992a8f0091bc32a2b2f8dbcc2cd64a915528
PROMPT_CHARACTER_COUNT: 11481

Save a JSON evidence package at `work/comparison-run.json` and include the same JSON in the final response. Use schema version `1.0` and these exact required interaction IDs:

`desktop-layout`, `mobile-layout`, `mobile-navigation`, `scenario-selection`, `scenario-comparison`, `project-search`, `project-filter`, `project-sort`, `project-detail-open`, `project-detail-close`, `visit-invalid`, `visit-valid`, `resource-filter`, `resource-load-more`, `newsletter-validation`, `keyboard-focus`, `reduced-motion`, `console-clean`, `no-overflow`.

The IDs are intentionally generic evaluator names: map them to the Afterimage equivalents (for example, Archive Explorer selection is `scenario-selection`, film search is `project-search`, film detail is `project-detail-open`, reservation is `visit-valid`, and Field Notes is `resource-filter`). Record every ID exactly once with `passed`, `failed`, `not-run`, or `unknown` and a concrete observed result. Do not omit a failed or unrun check.

The JSON must contain: `schemaVersion`, opaque `runId`, `capturedAt`, hidden assignment fields, `prompt` identity, model/reasoning and starter fingerprint controls, workspace metadata, explicit timing, commands, exact desktop/mobile browser evidence, all interaction checks, final-response text flags, artifact paths, evidence gaps, and unresolved issues. Set `blind.assignment` to `hidden` and `blind.pluginMentioned` to `false`. The final response must have `Built`, `Validated`, `Known limitations`, and `Artifacts` sections. Do not reveal any assignment label.

Use this exact object shape; replace every placeholder with observed values. `interactionChecks` must contain one object for every required ID above, exactly once:

```json
{
  "schemaVersion": "1.0",
  "runId": "run-7q4m",
  "capturedAt": "2026-08-05T02:00:00.000Z",
  "blind": { "assignment": "hidden", "pluginMentioned": false },
  "prompt": { "sha256": "<use PROMPT_SHA256 above>", "characterCount": 11512 },
  "controls": { "starterFingerprint": "<64-char-sha256>", "model": "<model>", "reasoningEffort": "<setting>", "viewportContract": "1440x1000-and-390x844" },
  "workspace": { "path": "<path-or-null>", "branch": "<branch-or-null>", "latestCommit": "<commit-or-null>", "workingTreeClean": true, "changedFiles": ["<file>"] },
  "timing": { "startedAt": "2026-08-05T01:00:00.000Z", "finishedAt": "2026-08-05T01:20:00.000Z", "durationMs": 1200000, "source": "explicit-task-clock", "idleDurationMs": 0 },
  "commands": [{ "command": "npm test", "required": true, "status": "passed", "exitCode": 0, "summary": "<summary>", "outputTail": "<tail>" }],
  "browser": {
    "desktop": { "width": 1440, "height": 1000, "screenshotPath": "work/afterimage-desktop.png", "screenshotAttached": true, "decodedWidth": 1440, "decodedHeight": 1000, "devicePixelRatio": 1, "status": "passed", "consoleErrors": 0, "consoleWarnings": 0, "horizontalOverflowPx": 0, "notes": "<observed result>" },
    "mobile": { "width": 390, "height": 844, "screenshotPath": "work/afterimage-mobile.png", "screenshotAttached": true, "decodedWidth": 390, "decodedHeight": 844, "devicePixelRatio": 1, "status": "passed", "consoleErrors": 0, "consoleWarnings": 0, "horizontalOverflowPx": 0, "notes": "<observed result>" }
  },
  "interactionChecks": [{ "id": "desktop-layout", "required": true, "status": "passed", "observedResult": "<observed result>" }],
  "finalResponse": { "text": "<the final response text>", "includesBuildSummary": true, "includesValidationSummary": true, "includesKnownLimitations": true },
  "artifacts": { "desktopScreenshot": "work/afterimage-desktop.png", "mobileScreenshot": "work/afterimage-mobile.png", "evidencePackage": "work/comparison-run.json" },
  "evidenceGaps": [],
  "unresolvedIssues": []
}
```

Finish with a concise summary of what was built, the commands run, the measured browser results, known limitations, and the path to `work/comparison-run.json`.
