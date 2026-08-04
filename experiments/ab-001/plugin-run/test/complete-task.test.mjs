import assert from "node:assert/strict";
import test from "node:test";

import { createHttpHandler } from "../src/http-handler.mjs";
import { TaskService } from "../src/task-service.mjs";
import { InMemoryTaskStore } from "../src/task-store.mjs";

const COMPLETED_AT = "2026-08-03T12:34:56.000Z";

const seed = (overrides = {}) => ({
  id: "task-1",
  ownerId: "user-1",
  title: "Original",
  completedAt: null,
  version: 1,
  ...overrides,
});

function completionRequest(overrides = {}) {
  return {
    method: "POST",
    path: "/api/tasks/task-1/complete",
    actor: { id: "user-1" },
    ...overrides,
  };
}

function createApp({ tasks = [seed()], beforeCommit, clock, audit } = {}) {
  const store = new InMemoryTaskStore(tasks, { beforeCommit });
  const service = new TaskService({
    store,
    clock: clock ?? (() => new Date(COMPLETED_AT)),
    audit,
  });
  return { store, handle: createHttpHandler({ service }) };
}

test("an owner can complete a task through the HTTP adapter", async () => {
  const audits = [];
  const { store, handle } = createApp({ audit: async (event) => audits.push(event) });

  const response = await handle(completionRequest());

  const expectedTask = seed({ completedAt: COMPLETED_AT, version: 2 });
  assert.deepEqual(response, { status: 200, body: { task: expectedTask } });
  assert.deepEqual(store.snapshot("task-1"), expectedTask);
  assert.deepEqual(audits, [
    { type: "task.completed", actorId: "user-1", taskId: "task-1" },
  ]);
});

test("completion requires authentication and does not change state", async () => {
  const audits = [];
  const { store, handle } = createApp({ audit: async (event) => audits.push(event) });

  const response = await handle(completionRequest({ actor: undefined }));

  assert.deepEqual(response, {
    status: 401,
    body: { error: "authentication_required" },
  });
  assert.deepEqual(store.snapshot("task-1"), seed());
  assert.deepEqual(audits, []);
});

test("completion hides foreign-owned tasks exactly like missing tasks", async () => {
  const audits = [];
  const { store, handle } = createApp({ audit: async (event) => audits.push(event) });

  const foreignResponse = await handle(
    completionRequest({ actor: { id: "user-2" } }),
  );
  const missingResponse = await handle(
    completionRequest({ path: "/api/tasks/missing/complete" }),
  );

  const notFound = { status: 404, body: { error: "task_not_found" } };
  assert.deepEqual(foreignResponse, notFound);
  assert.deepEqual(missingResponse, notFound);
  assert.deepEqual(store.snapshot("task-1"), seed());
  assert.deepEqual(audits, []);
});

test("completion preserves the established taskId validation response", async () => {
  const { handle } = createApp();

  const response = await handle(
    completionRequest({ path: "/api/tasks/%20/complete" }),
  );

  assert.deepEqual(response, {
    status: 400,
    body: { error: "invalid_request", message: "taskId is required" },
  });
});

test("repeated completion is idempotent", async () => {
  const audits = [];
  let commits = 0;
  let clockCalls = 0;
  const times = [
    new Date("2026-08-03T12:34:56.000Z"),
    new Date("2026-08-03T13:34:56.000Z"),
  ];
  const { store, handle } = createApp({
    beforeCommit: async () => {
      commits += 1;
    },
    clock: () => times[clockCalls++],
    audit: async (event) => audits.push(event),
  });

  const first = await handle(completionRequest());
  const second = await handle(completionRequest());

  assert.deepEqual(second, first);
  assert.equal(first.body.task.completedAt, COMPLETED_AT);
  assert.equal(first.body.task.version, 2);
  assert.equal(commits, 1);
  assert.equal(audits.length, 1);
  assert.deepEqual(store.snapshot("task-1"), first.body.task);
});

test("concurrent completions persist and audit exactly one transition", async () => {
  let releaseCommit;
  let signalCommitStarted;
  const commitStarted = new Promise((resolve) => {
    signalCommitStarted = resolve;
  });
  const commitGate = new Promise((resolve) => {
    releaseCommit = resolve;
  });
  const audits = [];
  let commits = 0;
  const { store, handle } = createApp({
    beforeCommit: async () => {
      commits += 1;
      signalCommitStarted();
      await commitGate;
    },
    audit: async (event) => audits.push(event),
  });

  const pending = Array.from({ length: 20 }, () => handle(completionRequest()));
  await commitStarted;
  releaseCommit();
  const responses = await Promise.all(pending);

  const expected = {
    status: 200,
    body: { task: seed({ completedAt: COMPLETED_AT, version: 2 }) },
  };
  for (const response of responses) assert.deepEqual(response, expected);
  assert.equal(commits, 1);
  assert.deepEqual(audits, [
    { type: "task.completed", actorId: "user-1", taskId: "task-1" },
  ]);
  assert.deepEqual(store.snapshot("task-1"), expected.body.task);
});

test("a persistence failure leaves state unchanged and emits no audit event", async () => {
  const audits = [];
  const { store, handle } = createApp({
    beforeCommit: async () => {
      throw new Error("persistence unavailable");
    },
    audit: async (event) => audits.push(event),
  });

  const response = await handle(completionRequest());

  assert.deepEqual(response, { status: 500, body: { error: "internal_error" } });
  assert.deepEqual(store.snapshot("task-1"), seed());
  assert.deepEqual(audits, []);
});

test("a failed completion does not poison the next queued transition", async () => {
  let commitAttempts = 0;
  const audits = [];
  const { store, handle } = createApp({
    beforeCommit: async () => {
      commitAttempts += 1;
      if (commitAttempts === 1) throw new Error("transient failure");
    },
    audit: async (event) => audits.push(event),
  });

  const [failed, succeeded] = await Promise.all([
    handle(completionRequest()),
    handle(completionRequest()),
  ]);

  assert.deepEqual(failed, { status: 500, body: { error: "internal_error" } });
  assert.equal(succeeded.status, 200);
  assert.equal(succeeded.body.task.version, 2);
  assert.equal(commitAttempts, 2);
  assert.equal(audits.length, 1);
  assert.deepEqual(store.snapshot("task-1"), succeeded.body.task);
});

test("the completion endpoint remains POST-only", async () => {
  const { store, handle } = createApp();

  const response = await handle(completionRequest({ method: "GET" }));

  assert.deepEqual(response, { status: 404, body: { error: "route_not_found" } });
  assert.deepEqual(store.snapshot("task-1"), seed());
});
