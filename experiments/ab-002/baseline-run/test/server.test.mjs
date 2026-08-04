import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { server } from "../server.mjs";
import { calculateWeeklyTotal, formatHours, getPlannerMessage } from "../public/app.js";

test("the static server refuses path traversal", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/..%2Fpackage.json`);
  assert.equal(response.status, 403);
});

test("the site serves its local HTML, CSS, and JavaScript", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  for (const [pathname, contentType] of [
    ["/", "text/html"],
    ["/styles.css", "text/css"],
    ["/app.js", "text/javascript"],
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), new RegExp(contentType));
  }
});

test("the page includes every required content landmark", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const html = await fetch(`http://127.0.0.1:${port}/`).then((response) => response.text());

  assert.match(html, /<nav[^>]*aria-label="Primary navigation"/);
  assert.match(html, /Make the week <em>feel possible\.<\/em>/);
  assert.match(html, /id="features"/);
  assert.match(html, /id="planner"/);
  assert.match(html, /id="how-it-works"/);
  assert.match(html, /<blockquote>/);
  assert.equal((html.match(/class="day(?: active)?"/g) || []).length, 7);
  assert.match(html, /type="range"[^>]*min="1"[^>]*max="6"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /prefers-reduced-motion|styles\.css/);
});

test("planner totals and messages cover interaction boundaries", () => {
  assert.equal(calculateWeeklyTotal(4, 3), 12);
  assert.equal(calculateWeeklyTotal(7, 6), 42);
  assert.equal(calculateWeeklyTotal(0, 3), 0);
  assert.equal(calculateWeeklyTotal(2, 10), 12, "hours are constrained to the UI maximum");
  assert.equal(formatHours(1), "1 hour");
  assert.equal(formatHours(12), "12 hours");
  assert.match(getPlannerMessage(0, 0), /Choose at least one day/);
  assert.match(getPlannerMessage(6, 2), /Light and intentional/);
  assert.match(getPlannerMessage(12, 4), /Spacious and steady/);
  assert.match(getPlannerMessage(20, 5), /full creative week/);
  assert.match(getPlannerMessage(30, 5), /ambitious load/);
});

test("the visual system is local, responsive, and accessibility-aware", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i, "all page resources stay local");
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /@media \(max-width:\s*980px\)/);
  assert.match(css, /@media \(max-width:\s*700px\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter/i);
});
