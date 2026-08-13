import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

export function defaultRunStorePath() {
  return process.env.ORCHESTRATOR_RUNS_PATH || path.join(os.tmpdir(), "orchestrator-observatory-runs");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSafeRunId(runId) {
  if (typeof runId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(runId)) {
    throw new Error(`Invalid run ID: ${runId}`);
  }
}

async function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

function serializableRun(run) {
  const { subscribers: _subscribers, ...persisted } = run;
  return clone(persisted);
}

function validateStoredRun(run, runId) {
  if (!run || run.id !== runId || !Array.isArray(run.events) || !run.packet || typeof run.packet !== "object") {
    throw new Error(`Invalid persisted run record: ${runId}`);
  }
  return run;
}

export function createFileRunStore(root = defaultRunStorePath()) {
  const writeQueues = new Map();

  function runDirectory(runId) {
    assertSafeRunId(runId);
    return path.join(root, runId);
  }

  function runPath(runId) {
    return path.join(runDirectory(runId), "run.json");
  }

  async function save(run) {
    const previous = writeQueues.get(run.id) ?? Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(async () => {
        await mkdir(runDirectory(run.id), { recursive: true });
        await writeJsonAtomically(runPath(run.id), serializableRun(run));
      });
    writeQueues.set(run.id, next);
    await next;
  }

  async function get(runId) {
    try {
      return validateStoredRun(JSON.parse(await readFile(runPath(runId), "utf8")), runId);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async function list() {
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }

    const runs = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .filter((entry) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(entry.name))
        .map((entry) => get(entry.name)),
    );
    return runs.filter(Boolean).sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  return { root, save, get, list };
}
