import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  calculateWeeklyTotal,
  formatSelectedDays,
  getFocusStatus,
  initializePlanner,
} from "../public/app.js";

const readPublicFile = (name) => readFile(new URL(`../public/${name}`, import.meta.url), "utf8");

test("planner total clamps inputs to seven days and one to six hours", () => {
  assert.equal(calculateWeeklyTotal(4, 2), 8);
  assert.equal(calculateWeeklyTotal(9, 9), 42);
  assert.equal(calculateWeeklyTotal(-2, 0), 0);
});

test("planner status covers empty, light, balanced, full, and ambitious weeks", () => {
  assert.match(getFocusStatus(0, 0), /Choose at least one day/);
  assert.match(getFocusStatus(6, 3), /light week/);
  assert.match(getFocusStatus(12, 4), /workable rhythm/);
  assert.match(getFocusStatus(21, 7), /full week/);
  assert.match(getFocusStatus(30, 5), /ambitious load/);
});

test("selected day summary uses clear short labels and handles an empty week", () => {
  assert.equal(formatSelectedDays(["Monday", "Thursday", "Saturday"]), "Mon, Thu, Sat");
  assert.equal(formatSelectedDays([]), "None yet");
});

test("planner wiring updates state for day toggles and slider input", () => {
  const makeButton = (day, selected) => {
    const attributes = new Map([["aria-pressed", String(selected)]]);
    const classes = new Set(selected ? ["is-selected"] : []);
    const listeners = new Map();
    return {
      dataset: { day },
      getAttribute: (name) => attributes.get(name),
      setAttribute: (name, value) => attributes.set(name, value),
      addEventListener: (name, handler) => listeners.set(name, handler),
      classList: { toggle: (name, force) => force ? classes.add(name) : classes.delete(name) },
      trigger: (name) => listeners.get(name)(),
      hasClass: (name) => classes.has(name),
    };
  };

  const buttons = [
    makeButton("Monday", true),
    makeButton("Tuesday", false),
    makeButton("Wednesday", false),
    makeButton("Thursday", true),
    makeButton("Friday", false),
    makeButton("Saturday", false),
    makeButton("Sunday", false),
  ];
  const inputListeners = new Map();
  const hoursInput = {
    value: "2",
    addEventListener: (name, handler) => inputListeners.set(name, handler),
    trigger: (name) => inputListeners.get(name)(),
  };
  const hoursValue = { textContent: "" };
  const selectedDays = { textContent: "" };
  const weeklyTotal = { textContent: "" };
  const plannerStatus = { textContent: "" };
  const planner = {
    querySelectorAll: () => buttons,
    querySelector: (selector) => ({
      "#focus-hours": hoursInput,
      "#hours-value": hoursValue,
      "#selected-days": selectedDays,
    })[selector],
  };
  const root = {
    querySelector: (selector) => ({
      "#focus-planner": planner,
      "#weekly-total": weeklyTotal,
      "#planner-status": plannerStatus,
    })[selector],
  };

  initializePlanner(root);
  assert.equal(weeklyTotal.textContent, "4");
  assert.equal(hoursValue.textContent, "2 hours");
  assert.equal(selectedDays.textContent, "Mon, Thu");

  buttons[6].trigger("click");
  assert.equal(buttons[6].getAttribute("aria-pressed"), "true");
  assert.equal(buttons[6].hasClass("is-selected"), true);
  assert.equal(weeklyTotal.textContent, "6");
  assert.equal(selectedDays.textContent, "Mon, Thu, Sun");

  hoursInput.value = "5";
  hoursInput.trigger("input");
  assert.equal(hoursValue.textContent, "5 hours");
  assert.equal(weeklyTotal.textContent, "15");
  assert.match(plannerStatus.textContent, /full week/);
});

test("page contains the required structure and interactive controls", async () => {
  const html = await readPublicFile("index.html");
  assert.match(html, /<h1[^>]*>Make the week <span>feel <em>possible\.<\/em><\/span><\/h1>/);
  assert.equal((html.match(/class="day-toggle/g) || []).length, 7);
  assert.match(html, /type="range"[^>]*min="1"[^>]*max="6"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<nav[^>]*aria-label="Primary navigation"/);
  assert.match(html, /<section[^>]*id="method"/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<footer/);
});

test("assets are local and accessibility safeguards are present", async () => {
  const [html, css, js] = await Promise.all([
    readPublicFile("index.html"),
    readPublicFile("styles.css"),
    readPublicFile("app.js"),
  ]);

  assert.doesNotMatch(`${html}\n${css}\n${js}`, /https?:\/\//i);
  assert.doesNotMatch(html, /<(?:img|picture|video|iframe)\b/i);
  assert.doesNotMatch(css, /(?:gradient|url)\s*\(/i);
  assert.match(html, /class="skip-link"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(js, /aria-pressed/);
});
