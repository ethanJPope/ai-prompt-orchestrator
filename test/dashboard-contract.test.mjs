import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("the Observatory exposes live-run UI and event-stream wiring", async () => {
  const [html, app, server, controller] = await Promise.all([
    readFile(path.join(root, "dashboard/index.html"), "utf8"),
    readFile(path.join(root, "dashboard/app.js"), "utf8"),
    readFile(path.join(root, "dashboard/server.mjs"), "utf8"),
    readFile(path.join(root, "dashboard/run-controller.mjs"), "utf8"),
  ]);

  assert.match(html, /Orchestrator Observatory/);
  assert.match(app, /Start live test/);
  assert.match(app, /EventSource/);
  assert.match(server, /\/api\/runs/);
  assert.match(server, /text\/event-stream/);
  assert.match(controller, /reviewer execution remains an explicit adapter gap/);
  assert.match(html, /Customer portal/);
  assert.match(html, /Business console/);
  assert.match(app, /Activate plugin/);
  assert.match(server, /api\/prototype\/activate/);
  assert.match(server, /api\/prototype\/business-stats/);
});
