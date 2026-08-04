import assert from "node:assert/strict";
import test from "node:test";

import { NotFoundError } from "../src/errors.mjs";
import { TaskService } from "../src/task-service.mjs";
import { InMemoryTaskStore } from "../src/task-store.mjs";

const task = () => ({ id: "t1", ownerId: "u1", title: "Test", completedAt: null, version: 1 });

test("completeTask is owner-only and idempotent", async () => {
  const audits = [];
  const service = new TaskService({
    store: new InMemoryTaskStore([task()]),
    clock: () => new Date("2026-08-03T12:00:00Z"),
    audit: async (event) => audits.push(event),
  });
  await assert.rejects(() => service.completeTask({ actor: { id: "u2" }, taskId: "t1" }), NotFoundError);
  const first = await service.completeTask({ actor: { id: "u1" }, taskId: "t1" });
  const second = await service.completeTask({ actor: { id: "u1" }, taskId: "t1" });
  assert.deepEqual(second, first);
  assert.equal(audits.length, 1);
});

test("concurrent completion produces one transition", async () => {
  let commits = 0;
  const store = new InMemoryTaskStore([task()], { beforeCommit: async () => { commits += 1; } });
  const service = new TaskService({ store, clock: () => new Date(), audit: async () => {} });
  await Promise.all(Array.from({ length: 5 }, () => service.completeTask({ actor: { id: "u1" }, taskId: "t1" })));
  assert.equal(commits, 1);
});
