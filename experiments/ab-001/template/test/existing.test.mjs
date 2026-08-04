import assert from "node:assert/strict";
import test from "node:test";

import { createHttpHandler } from "../src/http-handler.mjs";
import { TaskService } from "../src/task-service.mjs";
import { InMemoryTaskStore } from "../src/task-store.mjs";

const seed = () => ({
  id: "task-1",
  ownerId: "user-1",
  title: "Original",
  completedAt: null,
  version: 1,
});

test("an owner can rename a task through the HTTP adapter", async () => {
  const store = new InMemoryTaskStore([seed()]);
  const service = new TaskService({ store });
  const handle = createHttpHandler({ service });

  const response = await handle({
    method: "POST",
    path: "/api/tasks/task-1/rename",
    actor: { id: "user-1" },
    body: { title: "Updated" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.task.title, "Updated");
  assert.equal(response.body.task.version, 2);
});

test("rename hides another owner's task", async () => {
  const service = new TaskService({ store: new InMemoryTaskStore([seed()]) });
  const handle = createHttpHandler({ service });

  const response = await handle({
    method: "POST",
    path: "/api/tasks/task-1/rename",
    actor: { id: "user-2" },
    body: { title: "Stolen" },
  });

  assert.deepEqual(response, { status: 404, body: { error: "task_not_found" } });
});
