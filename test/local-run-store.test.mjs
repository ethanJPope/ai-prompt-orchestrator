import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createFileRunStore } from "../src/local-run-store.mjs";

test("file-backed run storage survives a new store instance", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "orchestrator-run-store-"));
  try {
    const run = {
      id: "run-test-1",
      startedAt: "2026-08-13T00:00:00.000Z",
      status: "complete-with-gap",
      packet: {
        runId: "run-test-1",
        correlationId: "corr-test-1",
        planHash: "a".repeat(64),
        currentPhase: "complete-with-gap",
        reviewerStatuses: [],
        gateResults: [{ id: "tests-and-build", status: "passed" }],
        reviewerMessages: [],
        waveHandoffs: [],
        contradictions: [],
        finalArbiterResult: null,
        timing: { startedAt: "2026-08-13T00:00:00.000Z" },
      },
      events: [{ id: 1, type: "run_started" }],
      subscribers: new Set(),
    };

    await createFileRunStore(directory).save(run);
    const reopened = createFileRunStore(directory);
    const loaded = await reopened.get(run.id);
    const listed = await reopened.list();

    assert.equal(loaded.packet.correlationId, "corr-test-1");
    assert.equal(loaded.packet.gateResults[0].status, "passed");
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, run.id);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
