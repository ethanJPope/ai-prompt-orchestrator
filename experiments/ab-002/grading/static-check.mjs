import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const subject = path.resolve(process.argv[2] ?? "");
if (!process.argv[2] || !fs.existsSync(subject)) {
  console.error("Usage: node static-check.mjs <subject-directory>");
  process.exit(2);
}

const results = [];
async function check(name, points, fn) {
  try {
    await fn();
    results.push({ name, points, earned: points, status: "pass" });
  } catch (error) {
    results.push({ name, points, earned: 0, status: "fail", error: error?.message ?? String(error) });
  }
}

const publicDir = path.join(subject, "public");
const read = (name) => fs.readFileSync(path.join(publicDir, name), "utf8");

await check("Required files and submitted tests", 5, async () => {
  for (const name of ["index.html", "styles.css", "app.js"]) {
    assert.equal(fs.existsSync(path.join(publicDir, name)), true, `${name} is missing`);
  }
  const run = spawnSync(process.execPath, ["--test"], { cwd: subject, encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
});

await check("Required content and sections", 5, async () => {
  const html = read("index.html");
  for (const required of [
    /Make the week feel possible\./i,
    /<nav\b/i,
    /<main\b/i,
    /<footer\b/i,
    /how it works|three steps|01/i,
    /testimonial|blockquote/i,
  ]) assert.match(html, required);
});

await check("Fully local asset boundary", 5, async () => {
  const combined = [read("index.html"), read("styles.css"), read("app.js")].join("\n");
  assert.doesNotMatch(combined, /https?:\/\/|@import|fetch\s*\(|XMLHttpRequest|new\s+WebSocket/i);
  const pkg = JSON.parse(fs.readFileSync(path.join(subject, "package.json"), "utf8"));
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
});

await check("Planner interaction contract", 10, async () => {
  const html = read("index.html");
  const js = read("app.js");
  assert.ok((html.match(/data-day=/g) ?? []).length >= 7, "fewer than seven data-day controls");
  assert.match(html, /type=["']range["']/i);
  assert.match(html, /min=["']1["']/i);
  assert.match(html, /max=["']6["']/i);
  assert.match(html, /weekly[-_ ]?total|total[-_ ]?hours/i);
  assert.match(html, /status|message/i);
  assert.match(js, /addEventListener/);
  assert.match(js, /aria-pressed|classList\.toggle|toggleAttribute/);
});

await check("Responsive and accessibility evidence", 5, async () => {
  const html = read("index.html");
  const css = read("styles.css");
  assert.match(html, /<html[^>]+lang=/i);
  assert.match(html, /<meta[^>]+name=["']viewport["']/i);
  assert.match(css, /@media\s*\([^)]*(max-width|width\s*<)/i);
  assert.match(css, /prefers-reduced-motion/i);
  assert.match(css, /:focus-visible/i);
  assert.match(css, /overflow-x\s*:\s*(hidden|clip)/i);
});

const total = results.reduce((sum, result) => sum + result.points, 0);
const earned = results.reduce((sum, result) => sum + result.earned, 0);
console.log(JSON.stringify({ subject, earned, total, results }, null, 2));
process.exitCode = earned === total ? 0 : 1;
