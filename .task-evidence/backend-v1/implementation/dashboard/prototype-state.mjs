import { DEMO_ACCOUNT_ID, getEntitlement, setEntitlement } from "../src/entitlements.mjs";
import { listRuns } from "./run-controller.mjs";

const account = {
  id: DEMO_ACCOUNT_ID,
  name: "Demo workspace",
  plan: "Pilot",
  entitlement: "active",
  activatedAt: new Date().toISOString(),
  runs: 4,
  reviewedTasks: 12,
  savedTimeHours: 8.4,
};

export function prototypeAccount() {
  return getEntitlement(account.id).then((entitlement) => ({
    ...account,
    entitlement: entitlement.status,
    active: entitlement.active,
    decision: entitlement.decision,
    plan: entitlement.plan ?? account.plan,
  }));
}

export async function setPrototypeEntitlement(status) {
  const entitlement = await setEntitlement(account.id, status);
  account.entitlement = entitlement.status;
  if (status === "active") account.activatedAt = new Date().toISOString();
  return prototypeAccount();
}

export function prototypeBusinessStats() {
  return Promise.resolve({
    environment: "local-demo",
    accounts: { total: 8, active: 6, inactive: 2, activationRate: 75 },
    usage: { runsThisMonth: 37, reviewedTasks: 94, averageDurationMinutes: 18.6, averageReviewers: 10 },
    quality: { firstPassAccepted: 71, evidenceComplete: 83, targetLatencyMultiplier: 2, observedBestMultiplier: 3.3 },
    recentEvents: [
      { label: "Workspace activated", detail: "demo-active", time: "Today · 09:14" },
      { label: "Review run completed", detail: "10 planned passes · 5 gates", time: "Today · 09:01" },
      { label: "Entitlement checked", detail: "active", time: "Today · 08:57" },
    ],
  });
}

export async function prototypeCustomerStats() {
  const current = await prototypeAccount();
  const runs = await listRuns();
  const reviewedTasks = runs.filter((run) => ["complete-with-gap", "bypassed"].includes(run.status)).length;
  return {
    accountId: current.id,
    entitlement: current.entitlement,
    decision: current.decision,
    reviewedTasks,
    savedTimeHours: Number((reviewedTasks * 0.7).toFixed(1)),
    runs: runs.length,
  };
}
