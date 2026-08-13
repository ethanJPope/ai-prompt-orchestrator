import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

import { getEntitlement } from "../src/entitlements.mjs";
import { preparePlan } from "../src/orchestrator.mjs";
import { createFileRunStore } from "../src/local-run-store.mjs";

const runs = new Map();
const runStore = createFileRunStore();

function now() {
  return new Date().toISOString();
}

function waveName(wave, index) {
  if (wave.mode === "gate") return "deterministic-gates";
  if (wave.mode === "sequential") return "final-arbiter";
  return index === 0 ? "discovery" : `specialist-wave-${index}`;
}

function phaseLabel(wave, index) {
  if (wave.mode === "gate") return "Deterministic gates";
  if (wave.mode === "sequential") return "Final arbiter";
  return index === 0 ? "Discovery" : `Specialist wave ${index}`;
}

function makePacket(id, correlationId, startedAt) {
  return {
    runId: id,
    correlationId,
    planHash: null,
    currentPhase: "starting",
    reviewerStatuses: [],
    gateResults: [],
    reviewerMessages: [],
    waveHandoffs: [],
    contradictions: [],
    finalArbiterResult: null,
    timing: {
      startedAt,
      finishedAt: null,
      totalDurationMs: null,
      phases: [],
    },
  };
}

function makeRun(prompt) {
  const id = `run-${randomUUID().slice(0, 8)}`;
  const startedAt = now();
  const correlationId = randomUUID();
  return {
    id,
    promptSummary: prompt.slice(0, 120),
    status: "starting",
    startedAt,
    finishedAt: null,
    events: [],
    subscribers: new Set(),
    plan: null,
    gates: [],
    agents: [],
    error: null,
    packet: makePacket(id, correlationId, startedAt),
  };
}

function updateReviewerStatus(run, agentId, update) {
  const existing = run.packet.reviewerStatuses.find((item) => item.id === agentId);
  if (existing) Object.assign(existing, update);
  else run.packet.reviewerStatuses.push({ id: agentId, ...update });
}

function updatePhaseTiming(run, phase, update) {
  const existing = run.packet.timing.phases.find((item) => item.phase === phase);
  if (existing) Object.assign(existing, update);
  else run.packet.timing.phases.push({ phase, ...update });
}

async function emit(run, type, data = {}) {
  const event = { id: run.events.length + 1, at: now(), type, ...data };
  run.events.push(event);
  for (const subscriber of run.subscribers) {
    try { subscriber(event); } catch { /* disconnected SSE clients are isolated */ }
  }
  await runStore.save(run);
}

function publicRun(run) {
  return {
    id: run.id,
    promptSummary: run.promptSummary,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    plan: run.plan
      ? {
          schemaVersion: run.plan.schemaVersion,
          reviewerCount: run.plan.reviewerCount,
          taskClass: run.plan.taskClass,
          planHash: run.plan.planHash,
          waves: (run.plan.executionPolicy?.reviewWaves ?? []).map((wave) => ({
            mode: wave.mode,
            reviewerIds: wave.reviewerIds,
            gateIds: wave.gateIds,
          })),
          gates: run.plan.deterministicGates.map((gate) => gate.id),
          arbiter: run.plan.reviewers.at(-1)?.id,
        }
      : null,
    gates: run.gates,
    agents: run.agents,
    packet: run.packet,
    error: run.error,
    eventCount: run.events.length,
  };
}

function runCommand(command, args = [], timeoutMs = 120_000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      windowsHide: true,
      shell: process.platform === "win32",
    });
    let output = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { output += chunk; });
    child.on("close", (code) => finish({ code: code ?? 1, output: output.trim().slice(-500) }));
    child.on("error", (error) => finish({ code: 1, output: error.message }));
    const timeout = setTimeout(() => {
      child.kill();
      finish({ code: 124, output: `command timed out after ${timeoutMs}ms` });
    }, timeoutMs);
  });
}

function evaluateLocalGate(id, run, testResult) {
  if (id === "tests-and-build") {
    return {
      id,
      status: testResult.code === 0 ? "passed" : "failed",
      detail: `pnpm test exited ${testResult.code}`,
    };
  }
  if (id === "acceptance-coverage") {
    const passed = run.plan?.reviewerCount === 10
      && run.plan?.reviewers?.length === 10
      && run.plan?.deterministicGates?.some((gate) => gate.id === id);
    return {
      id,
      status: passed ? "passed" : "failed",
      detail: passed
        ? "Ten planned reviewers and the required acceptance gate are present."
        : "The plan does not contain the required ten-reviewer acceptance contract.",
    };
  }
  if (id === "privacy-boundary") {
    const storesOnlySummary = typeof run.promptSummary === "string"
      && run.promptSummary.length <= 120
      && !Object.hasOwn(run, "sourceFiles")
      && !Object.hasOwn(run, "sourceCode");
    return {
      id,
      status: storesOnlySummary ? "passed" : "failed",
      detail: storesOnlySummary
        ? "Run storage contains a bounded prompt summary and no source-file or source-code payload."
        : "The run input exceeds the local summary boundary or contains source payload fields.",
    };
  }
  return { id, status: "not-run", detail: "No local evaluator is registered for this gate." };
}

function recordHandoff(run, waves, index) {
  const nextWave = waves[index + 1];
  if (!nextWave) return;
  run.packet.waveHandoffs.push({
    from: waveName(waves[index], index),
    to: waveName(nextWave, index + 1),
    messageIds: run.packet.reviewerMessages.map((message) => message.messageId),
    unresolved: run.packet.contradictions.map((item) => item.claim ?? item),
    at: now(),
  });
}

async function execute(run) {
  try {
    await emit(run, "run_started", { message: "Local live run started." });
    const entitlement = await getEntitlement("demo-active");
    if (!entitlement.active) throw new Error("subscription_inactive");

    run.plan = preparePlan(
      run.promptSummary,
      "Local read-only Observatory dashboard.",
      { correlationId: run.packet.correlationId },
    );
    if (run.plan.reviewerCount !== 10) {
      throw new Error(`Expected ten reviewers, received ${run.plan.reviewerCount}`);
    }
    run.packet.planHash = run.plan.planHash;
    await emit(run, "plan_received", {
      source: "local-mcp-compatible-plan",
      reviewerCount: run.plan.reviewerCount,
      taskClass: run.plan.taskClass,
      planHash: run.plan.planHash,
    });

    if (!run.plan.substantive) {
      run.status = "bypassed";
      run.finishedAt = now();
      run.packet.currentPhase = "bypassed";
      run.packet.timing.finishedAt = run.finishedAt;
      run.packet.timing.totalDurationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
      await runStore.save(run);
      await emit(run, "run_completed", { status: run.status, message: run.plan.bypassReason });
      return;
    }

    const waves = run.plan.executionPolicy.reviewWaves;
    for (const [waveIndex, wave] of waves.entries()) {
      const phase = waveIndex + 1;
      const label = phaseLabel(wave, waveIndex);
      const startedAt = now();
      run.packet.currentPhase = label;
      updatePhaseTiming(run, phase, { label, startedAt });
      await emit(run, "phase_started", { phase, label, mode: wave.mode });

      if (wave.mode === "gate") {
        const testResult = await runCommand(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["test"]);
        const checks = wave.gateIds.map((id) => evaluateLocalGate(id, run, testResult));
        run.gates.push(...checks);
        run.packet.gateResults.push(...checks);
        for (const check of checks) await emit(run, "gate_completed", { phase, ...check });
        const failedChecks = checks.filter((check) => check.status !== "passed");
        if (failedChecks.length > 0) {
          throw new Error(`${failedChecks.map((check) => check.id).join(", ")} failed: ${testResult.output}`);
        }
      } else {
        for (const reviewerId of wave.reviewerIds) {
          const reviewer = run.plan.reviewers.find((item) => item.id === reviewerId);
          const agent = {
            id: reviewerId,
            name: reviewer?.name ?? reviewerId,
            phase,
            status: "planned-not-dispatched",
            startedAt: now(),
            finishedAt: null,
          };
          run.agents.push(agent);
          updateReviewerStatus(run, reviewerId, {
            name: agent.name,
            phase,
            status: agent.status,
            startedAt: agent.startedAt,
            finishedAt: null,
          });
          await emit(run, "agent_started", {
            phase,
            agentId: agent.id,
            agentName: agent.name,
            execution: "codex-session-unavailable",
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 350));
        for (const agent of run.agents.filter((item) => item.phase === phase && !item.finishedAt)) {
          agent.finishedAt = now();
          updateReviewerStatus(run, agent.id, { finishedAt: agent.finishedAt, status: agent.status });
          await emit(run, "agent_completed", {
            phase,
            agentId: agent.id,
            agentName: agent.name,
            status: agent.status,
            findings: 0,
            note: "Plan recorded; no supported live Codex-session executor is connected.",
          });
        }
        if (wave.mode === "sequential") {
          run.packet.finalArbiterResult = {
            status: "not-dispatched",
            note: "Final arbiter plan recorded; no supported live Codex-session executor is connected.",
            at: now(),
          };
        }
      }

      const finishedAt = now();
      updatePhaseTiming(run, phase, {
        finishedAt,
        durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      });
      await emit(run, "phase_completed", { phase, status: wave.mode === "gate" ? "passed" : "recorded" });
      recordHandoff(run, waves, waveIndex);
    }

    run.status = "complete-with-gap";
    run.finishedAt = now();
    run.packet.currentPhase = "complete-with-gap";
    run.packet.timing.finishedAt = run.finishedAt;
    run.packet.timing.totalDurationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
    await emit(run, "run_completed", {
      status: run.status,
      message: "Local gates passed; reviewer execution remains an explicit adapter gap.",
    });
  } catch (error) {
    run.status = "failed";
    run.error = error.message;
    run.finishedAt = now();
    run.packet.currentPhase = "failed";
    run.packet.timing.finishedAt = run.finishedAt;
    run.packet.timing.totalDurationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
    await emit(run, "run_failed", { message: error.message });
  }
}

export function createRun(prompt) {
  const run = makeRun(prompt);
  runs.set(run.id, run);
  void runStore.save(run);
  void execute(run);
  return publicRun(run);
}

export async function listRuns() {
  const persisted = await runStore.list();
  const combined = new Map(persisted.map((run) => [run.id, run]));
  for (const run of runs.values()) combined.set(run.id, publicRun(run));
  return [...combined.values()].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export async function getRun(id) {
  const active = runs.get(id);
  if (active) return active;
  const persisted = await runStore.get(id);
  if (!persisted) return null;
  persisted.subscribers = new Set();
  runs.set(id, persisted);
  return persisted;
}

export function subscribe(run, callback) {
  run.subscribers ??= new Set();
  run.subscribers.add(callback);
  return () => run.subscribers.delete(callback);
}

export function snapshotEvents(run, after = 0) {
  return run.events.filter((event) => event.id > after);
}

export function publicRunForServer(run) {
  return publicRun(run);
}
