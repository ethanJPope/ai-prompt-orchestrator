import assert from "node:assert/strict";
import test from "node:test";

import { createHttpHandler } from "../src/http-handler.mjs";
import { TaskService } from "../src/task-service.mjs";
import { InMemoryTaskStore } from "../src/task-store.mjs";

const completedAt = "2026-08-03T12:34:56.000Z";

const seed = (overrides = {}) => ({
  id: "task-1",
  ownerId: "user-1",
  title: "Original",
  completedAt: null,
  version: 1,
  ...overrides,
});

function setup({ tasks = [seed()], beforeCommit, audit } = {}) {
  const store = new InMemoryTaskStore(tasks, { beforeCommit });
  const service = new TaskService({
    store,
    clock: () => new Date(completedAt),
    audit,
  });
  return { store, handle: createHttpHandler({ service }) };
}

function complete(handle, overrides = {}) {
  return handle({
    method: "POST",
    path: "/api/tasks/task-1/complete",
    actor: { id: "user-1" },
    ...overrides,
  });
}

test("an owner can complete a task through the HTTP adapter", async () => {
  const audits = [];
  const { store, handle } = setup({ audit: async (event) => audits.push(event) });

  const response = await complete(handle);

  assert.deepEqual(response, {
    status: 200,
    body: {
      task: seed({ completedAt, version: 2 }),
    },
  });
  assert.deepEqual(store.snapshot("task-1"), seed({ completedAt, version: 2 }));
  assert.deepEqual(audits, [
    { type: "task.completed", actorId: "user-1", taskId: "task-1" },
  ]);
});

test("completion requires authentication and does not persist or audit", async () => {
  let commits = 0;
  const audits = [];
  const { store, handle } = setup({
    beforeCommit: async () => commits++,
    audit: async (event) => audits.push(event),
  });

  const response = await complete(handle, { actor: null });

  assert.deepEqual(response, {
    status: 401,
    body: { error: "authentication_required" },
  });
  assert.deepEqual(store.snapshot("task-1"), seed());
  assert.equal(commits, 0);
  assert.deepEqual(audits, []);
});

test("completion hides another owner's task exactly like a missing task", async () => {
  const audits = [];
  const { store, handle } = setup({ audit: async (event) => audits.push(event) });

  const [otherOwner, missing] = await Promise.all([
    complete(handle, { actor: { id: "user-2" } }),
    complete(handle, { path: "/api/tasks/missing/complete" }),
  ]);

  const hiddenResponse = { status: 404, body: { error: "task_not_found" } };
  assert.deepEqual(otherOwner, hiddenResponse);
  assert.deepEqual(missing, hiddenResponse);
  assert.deepEqual(store.snapshot("task-1"), seed());
  assert.deepEqual(audits, []);
});

test("repeated completion by the owner is idempotent", async () => {
  let commits = 0;
  const audits = [];
  const { handle } = setup({
    beforeCommit: async () => commits++,
    audit: async (event) => audits.push(event),
  });

  const first = await complete(handle);
  const repeated = await complete(handle);

  assert.deepEqual(repeated, first);
  assert.equal(commits, 1);
  assert.equal(audits.length, 1);
});

test("concurrent completion persists one transition and emits one audit event", async () => {
  let commits = 0;
  let releaseCommit;
  const commitGate = new Promise((resolve) => {
    releaseCommit = resolve;
  });
  const audits = [];
  const { store, handle } = setup({
    beforeCommit: async () => {
      commits++;
      await commitGate;
    },
    audit: async (event) => audits.push(event),
  });

  const requests = Array.from({ length: 20 }, () => complete(handle));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(commits, 1);
  releaseCommit();
  const responses = await Promise.all(requests);

  assert.equal(commits, 1);
  assert.equal(audits.length, 1);
  assert.deepEqual(store.snapshot("task-1"), seed({ completedAt, version: 2 }));
  for (const response of responses) {
    assert.deepEqual(response, responses[0]);
    assert.equal(response.status, 200);
  }
});

test("a persistence failure leaves memory unchanged, emits no audit, and does not poison retries", async () => {
  let attempts = 0;
  const audits = [];
  const { store, handle } = setup({
    beforeCommit: async () => {
      attempts++;
      if (attempts === 1) throw new Error("database unavailable");
    },
    audit: async (event) => audits.push(event),
  });

  const failed = await complete(handle);

  assert.deepEqual(failed, { status: 500, body: { error: "internal_error" } });
  assert.deepEqual(store.snapshot("task-1"), seed());
  assert.deepEqual(audits, []);

  const retried = await complete(handle);
  assert.equal(retried.status, 200);
  assert.deepEqual(store.snapshot("task-1"), seed({ completedAt, version: 2 }));
  assert.equal(attempts, 2);
  assert.equal(audits.length, 1);
});

test("completion preserves validation and route conventions", async () => {
  const { handle } = setup();

  const invalid = await complete(handle, { path: "/api/tasks/%20/complete" });
  const wrongMethod = await complete(handle, { method: "GET" });

  assert.deepEqual(invalid, {
    status: 400,
    body: { error: "invalid_request", message: "taskId is required" },
  });
  assert.deepEqual(wrongMethod, {
    status: 404,
    body: { error: "route_not_found" },
  });
});
