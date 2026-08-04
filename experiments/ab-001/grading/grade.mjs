import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const subject = path.resolve(process.argv[2] ?? "");
if (!process.argv[2] || !fs.existsSync(subject)) {
  console.error("Usage: node grade.mjs <subject-directory>");
  process.exit(2);
}

const load = (relativePath) => import(pathToFileURL(path.join(subject, relativePath)).href);
const [{ TaskService }, { InMemoryTaskStore }, errors, { createHttpHandler }] = await Promise.all([
  load("src/task-service.mjs"),
  load("src/task-store.mjs"),
  load("src/errors.mjs"),
  load("src/http-handler.mjs"),
]);

const seed = () => ({ id: "task-1", ownerId: "owner", title: "Ship", completedAt: null, version: 3 });
const fixedNow = new Date("2026-08-03T12:00:00.000Z");
const results = [];

async function check(name, points, fn) {
  try {
    await fn();
    results.push({ name, points, earned: points, status: "pass" });
  } catch (error) {
    results.push({ name, points, earned: 0, status: "fail", error: error?.stack ?? String(error) });
  }
}

await check("Submitted test suite passes", 10, async () => {
  const run = spawnSync(process.execPath, ["--test"], { cwd: subject, encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
});

await check("Owner completion state", 10, async () => {
  const store = new InMemoryTaskStore([seed()]);
  const service = new TaskService({ store, clock: () => fixedNow });
  const task = await service.completeTask({ actor: { id: "owner" }, taskId: "task-1" });
  assert.equal(task.completedAt, fixedNow.toISOString());
  assert.equal(task.version, 4);
  assert.equal(task.ownerId, "owner");
});

await check("Authentication convention", 10, async () => {
  const service = new TaskService({ store: new InMemoryTaskStore([seed()]), clock: () => fixedNow });
  await assert.rejects(
    () => service.completeTask({ actor: null, taskId: "task-1" }),
    (error) => error instanceof errors.AuthenticationError && error.message === "Authentication required",
  );
});

await check("Ownership non-disclosure", 10, async () => {
  const service = new TaskService({ store: new InMemoryTaskStore([seed()]), clock: () => fixedNow });
  const capture = async (taskId) => {
    try {
      await service.completeTask({ actor: { id: "intruder" }, taskId });
      return null;
    } catch (error) {
      return { constructor: error.constructor, name: error.name, message: error.message };
    }
  };
  const existing = await capture("task-1");
  const missing = await capture("missing");
  assert.ok(existing);
  assert.equal(existing.constructor, errors.NotFoundError);
  assert.deepEqual(existing, missing);
});

await check("Sequential idempotency", 10, async () => {
  let commits = 0;
  const audits = [];
  const store = new InMemoryTaskStore([seed()], { beforeCommit: async () => { commits += 1; } });
  const service = new TaskService({ store, clock: () => fixedNow, audit: async (event) => audits.push(event) });
  const first = await service.completeTask({ actor: { id: "owner" }, taskId: "task-1" });
  const second = await service.completeTask({ actor: { id: "owner" }, taskId: "task-1" });
  assert.deepEqual(second, first);
  assert.equal(commits, 1);
  assert.equal(audits.length, 1);
  assert.deepEqual(audits[0], { type: "task.completed", actorId: "owner", taskId: "task-1" });
});

await check("Concurrent atomicity", 15, async () => {
  let commits = 0;
  const audits = [];
  const store = new InMemoryTaskStore([seed()], {
    beforeCommit: async () => {
      commits += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
    },
  });
  const service = new TaskService({ store, clock: () => fixedNow, audit: async (event) => audits.push(event) });
  const responses = await Promise.all(
    Array.from({ length: 12 }, () => service.completeTask({ actor: { id: "owner" }, taskId: "task-1" })),
  );
  assert.ok(responses.every((task) => task.version === 4 && task.completedAt === fixedNow.toISOString()));
  assert.equal(commits, 1);
  assert.equal(audits.length, 1);
});

await check("Persistence failure rollback", 15, async () => {
  const audits = [];
  const store = new InMemoryTaskStore([seed()], { beforeCommit: async () => { throw new Error("disk full"); } });
  const service = new TaskService({ store, clock: () => fixedNow, audit: async (event) => audits.push(event) });
  await assert.rejects(() => service.completeTask({ actor: { id: "owner" }, taskId: "task-1" }), /disk full/);
  assert.deepEqual(store.snapshot("task-1"), seed());
  assert.equal(audits.length, 0);
});

await check("HTTP route and error mapping", 10, async () => {
  const store = new InMemoryTaskStore([seed()]);
  const service = new TaskService({ store, clock: () => fixedNow });
  const handle = createHttpHandler({ service });
  const owner = await handle({ method: "POST", path: "/api/tasks/task-1/complete", actor: { id: "owner" } });
  const outsider = await handle({ method: "POST", path: "/api/tasks/task-1/complete", actor: { id: "outsider" } });
  const anonymous = await handle({ method: "POST", path: "/api/tasks/task-1/complete", actor: null });
  assert.equal(owner.status, 200);
  assert.deepEqual(Object.keys(owner.body), ["task"]);
  assert.deepEqual(outsider, { status: 404, body: { error: "task_not_found" } });
  assert.deepEqual(anonymous, { status: 401, body: { error: "authentication_required" } });
});

await check("Rename regression", 5, async () => {
  const store = new InMemoryTaskStore([seed()]);
  const service = new TaskService({ store });
  const renamed = await service.renameTask({ actor: { id: "owner" }, taskId: "task-1", title: " Updated " });
  assert.equal(renamed.title, "Updated");
  assert.equal(renamed.version, 4);
});

await check("Dependency and test scope", 5, async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(subject, "package.json"), "utf8"));
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
  const testFiles = fs.readdirSync(path.join(subject, "test")).filter((name) => name.endsWith(".test.mjs"));
  const combined = testFiles.map((name) => fs.readFileSync(path.join(subject, "test", name), "utf8")).join("\n");
  assert.match(combined, /completeTask|\/complete/);
  assert.match(combined, /concurrent|Promise\.all|idempotent|another owner|not found/i);
});

const total = results.reduce((sum, result) => sum + result.points, 0);
const earned = results.reduce((sum, result) => sum + result.earned, 0);
console.log(JSON.stringify({ subject, earned, total, results }, null, 2));
process.exitCode = earned === total ? 0 : 1;
