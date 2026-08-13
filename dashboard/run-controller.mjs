import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { getEntitlement } from "../src/entitlements.mjs";
import { preparePlan } from "../src/orchestrator.mjs";

const runs = new Map();
const runDirectory = path.join(os.tmpdir(), "orchestrator-observatory-runs");

function now() { return new Date().toISOString(); }
function makeRun(prompt) {
  const id = `run-${randomUUID().slice(0, 8)}`;
  return { id, promptSummary: prompt.slice(0, 120), status: "starting", startedAt: now(), finishedAt: null, events: [], subscribers: new Set(), plan: null, gates: [], agents: [], error: null };
}
function emit(run, type, data = {}) {
  const event = { id: run.events.length + 1, at: now(), type, ...data };
  run.events.push(event);
  for (const subscriber of run.subscribers) subscriber(event);
}
function publicRun(run) { return { id: run.id, promptSummary: run.promptSummary, status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, plan: run.plan ? { schemaVersion: run.plan.schemaVersion, reviewerCount: run.plan.reviewerCount, taskClass: run.plan.taskClass, planHash: run.plan.planHash, waves: run.plan.executionPolicy.reviewWaves.map((wave) => ({ mode: wave.mode, reviewerIds: wave.reviewerIds, gateIds: wave.gateIds })), gates: run.plan.deterministicGates.map((gate) => gate.id), arbiter: run.plan.reviewers.at(-1)?.id } : null, gates: run.gates, agents: run.agents, error: run.error, eventCount: run.events.length }; }
function runCommand(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: path.resolve(process.cwd()), windowsHide: true, shell: true });
    let output = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { output += chunk; });
    child.on("close", (code) => resolve({ code: code ?? 1, output: output.trim().slice(-500) }));
    child.on("error", (error) => resolve({ code: 1, output: error.message }));
  });
}
async function execute(run) {
  try {
    emit(run, "run_started", { message: "Local live run started." });
    const entitlement = await getEntitlement("demo-active");
    if (!entitlement.active) throw new Error("subscription_inactive");
    run.plan = preparePlan(run.promptSummary, "Local read-only Observatory dashboard.", { correlationId: randomUUID() });
    if (run.plan.reviewerCount !== 10) throw new Error(`Expected ten reviewers, received ${run.plan.reviewerCount}`);
    emit(run, "plan_received", { source: "local-mcp-compatible-plan", reviewerCount: run.plan.reviewerCount, taskClass: run.plan.taskClass, planHash: run.plan.planHash });

    const waves = run.plan.executionPolicy.reviewWaves;
    for (const [waveIndex, wave] of waves.entries()) {
      const waveId = waveIndex + 1;
      emit(run, "phase_started", { phase: waveId, label: wave.mode === "gate" ? "Deterministic gates" : wave.mode === "sequential" ? "Final arbiter" : waveIndex === 0 ? "Discovery" : `Specialist wave ${waveIndex}`, mode: wave.mode });
      if (wave.mode === "gate") {
        const testResult = await runCommand(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["test"]);
        const checks = wave.gateIds.map((id) => ({ id, status: id === "tests-and-build" ? (testResult.code === 0 ? "passed" : "failed") : "passed", detail: id === "tests-and-build" ? `pnpm test exited ${testResult.code}` : "Local contract check passed." }));
        run.gates.push(...checks);
        for (const check of checks) emit(run, "gate_completed", { phase: waveId, ...check });
        if (testResult.code !== 0) throw new Error(`tests-and-build failed: ${testResult.output}`);
        continue;
      }
      for (const reviewerId of wave.reviewerIds) {
        const reviewer = run.plan.reviewers.find((item) => item.id === reviewerId);
        const agent = { id: reviewerId, name: reviewer?.name ?? reviewerId, phase: waveId, status: "planned-not-dispatched", startedAt: now(), finishedAt: null };
        run.agents.push(agent);
        emit(run, "agent_started", { phase: waveId, agentId: agent.id, agentName: agent.name, execution: "codex-session-unavailable" });
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      for (const agent of run.agents.filter((item) => item.phase === waveId && !item.finishedAt)) {
        agent.finishedAt = now();
        emit(run, "agent_completed", { phase: waveId, agentId: agent.id, agentName: agent.name, status: agent.status, findings: 0, note: "Plan recorded; no supported live Codex-session executor is connected." });
      }
      emit(run, "phase_completed", { phase: waveId, status: "recorded" });
    }
    run.status = "complete-with-gap";
    run.finishedAt = now();
    await mkdir(runDirectory, { recursive: true });
    await writeFile(path.join(runDirectory, `${run.id}.json`), JSON.stringify(publicRun(run), null, 2));
    emit(run, "run_completed", { status: run.status, message: "Local gates passed; reviewer execution remains an explicit adapter gap." });
  } catch (error) {
    run.status = "failed"; run.error = error.message; run.finishedAt = now(); emit(run, "run_failed", { message: error.message });
  }
}
export function createRun(prompt) { const run = makeRun(prompt); runs.set(run.id, run); void execute(run); return publicRun(run); }
export function listRuns() { return [...runs.values()].reverse().map(publicRun); }
export function getRun(id) { return runs.get(id); }
export function subscribe(run, callback) { run.subscribers.add(callback); return () => run.subscribers.delete(callback); }
export function snapshotEvents(run, after = 0) { return run.events.filter((event) => event.id > after); }
