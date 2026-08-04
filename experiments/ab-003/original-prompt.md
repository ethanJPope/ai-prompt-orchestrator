# Fresh website A/B prompt — AB-003

Build **Night Signal**, a premium single-page festival website and interactive schedule planner for a fictional three-night creative-technology festival in Phoenix.

Work only in the current workspace. Complete the implementation in one pass without asking follow-up questions; make strong, reasonable product and design decisions wherever this brief leaves room. Do not mention this experiment, orchestration, agents, or reviewers in the website or its documentation.

## Product and audience

Night Signal brings together independent filmmakers, musicians, designers, and creative coders. The audience is visually literate people ages 16–30. The site should feel like a collectible festival program translated into a precise digital product—not a generic SaaS landing page or event template.

Use this exact hero headline:

> Three nights. One shared frequency.

Use the event details **October 16–18 · Phoenix, Arizona** and the positioning line **Sound, light, film, and code after dark.**

## Technical boundary

- Use only local HTML, CSS, and vanilla JavaScript.
- Use Node's built-in modules for the local server and automated tests.
- Do not use packages, frameworks, CDNs, remote fonts, external images, network requests, analytics, or build tools.
- CSS shapes, text glyphs, and locally written inline markup are allowed. Do not use remote or data-URI assets.
- The finished project must run with `npm start` and test with `npm test`.
- Include a concise README with exact run, test, and interaction instructions.
- Keep application code modular enough to test schedule filtering, conflict detection, saved-session persistence, and form validation without a browser.

## Required page structure

Create one cohesive, responsive page containing:

1. A keyboard-accessible skip link and sticky navigation with the Night Signal wordmark, section links, and a live saved-session count.
2. A visually commanding hero using the exact supplied headline, event details, two clear calls to action, and an original CSS-built signal or broadcast motif.
3. A compact “transmission” strip communicating three useful festival facts without behaving like a decorative marquee.
4. An editorial introduction that establishes the festival's point of view.
5. The main interactive schedule explorer.
6. A distinctive venue-map or wayfinding section showing three fictional spaces: **The Array**, **Mesa Hall**, and **Signal Yard**.
7. A featured-voices section with at least four named fictional artists or speakers and clearly differentiated disciplines.
8. A short manifesto or testimonial section that creates an emotional pause in the page.
9. An accessible FAQ accordion with at least four useful questions.
10. A final ticket-interest section with a locally validated email form, followed by a complete footer.

## Schedule explorer

Seed at least 15 sessions across Friday, Saturday, and Sunday. Every session needs a stable ID, day, start time, end time, title, discipline, venue, speaker, short description, and capacity status.

The schedule must include these sessions so conflict behavior can be checked:

- Friday, 7:00–8:00 PM — **Cinema for Closed Eyes** — Film — The Array
- Friday, 7:30–8:30 PM — **Sculpting the Sub-Bass** — Sound — Mesa Hall
- Saturday, 2:00–3:15 PM — **Interfaces That Misbehave** — Design — The Array
- Saturday, 2:30–3:30 PM — **Small Models, Strange Worlds** — Code — Signal Yard
- Sunday, 6:00–7:00 PM — **The Last Light Lab** — Light — Mesa Hall

Implement all of the following:

- Friday, Saturday, and Sunday day controls.
- Discipline filters for All, Film, Sound, Design, Code, and Light.
- A text search that matches session title, speaker, venue, or discipline.
- A helpful empty state when no sessions match.
- Session cards that show time, title, discipline, venue, speaker, capacity, and save state.
- A details dialog for each session. It must close through its close control, Escape, and backdrop; restore focus to the opener; and keep keyboard focus contained while open.
- Save and remove controls whose state is visible and announced accessibly.
- Saved sessions persisted in `localStorage` and restored safely after reload. Corrupt stored data must not break the app.
- A “My night” drawer or panel grouping saved sessions by day, with remove controls and a clear-all action.
- Conflict detection for overlapping saved sessions on the same day. Show a clear warning naming both conflicting sessions; adjacent sessions where one begins exactly when another ends must not conflict.
- A live summary showing the number of saved sessions and conflicts.
- Useful URL state for the selected day and discipline filter, without causing a page reload.

## Visual direction

Aim for confident editorial art direction with strong hierarchy and surprising composition. Use a restrained palette built from near-black ink, warm paper, signal red-orange, ultraviolet, and one pale electric accent. Use system fonts deliberately; create personality through scale, weight, spacing, rules, labels, and composition.

The visual language should include sharp geometry, offset alignment, strong typographic contrast, and a small amount of purposeful motion. Avoid gradients, glassmorphism, generic feature-card grids, excessive pills, default-looking shadows, stock imagery, and decoration that reduces legibility. Rounded corners should be rare and intentional.

The schedule must feel like the visual centerpiece, not an afterthought. Selected, sold-out, nearly-full, conflict, hover, focus, and empty states must all look deliberately designed. The mobile version should feel recomposed rather than merely stacked.

## Responsive and accessibility requirements

- Treat **1440×1000** and **390×844** as primary review sizes.
- No horizontal overflow at either size.
- Preserve a strong first viewport, readable type, clear calls to action, and usable schedule controls on mobile.
- Use semantic landmarks, logical headings, native controls where possible, visible keyboard focus, useful labels, and live regions for dynamic feedback.
- Meet WCAG AA contrast for normal text and controls.
- Respect `prefers-reduced-motion` and maintain full functionality without animation.
- Make tap targets practical on mobile and keep dialogs/drawers usable at short viewport heights.

## Validation and completion evidence

- Add meaningful automated tests for filtering, search, overlap boundaries, storage recovery, saved-session totals, email validation, server happy paths, and path-traversal refusal.
- Run the complete test suite and fix all failures.
- Launch the site locally and verify the main flow in a real browser: filter sessions, search, save both overlapping Friday sessions, confirm the conflict warning, remove one, open and close details, reload to confirm persistence, clear the lineup, and submit both invalid and valid email values.
- Inspect the page at 1440×1000 and 390×844 for overflow, overlap, clipping, weak states, and console errors.
- Save final screenshots as `artifacts/desktop-1440x1000.png` and `artifacts/mobile-390x844.png`.
- Before finishing, make one focused visual-polish pass based on the rendered screenshots.

Return one concise completion summary containing the run command, test result, interaction result, screenshot paths, and any genuine remaining limitation. The implementation—not the explanation—is the priority.
