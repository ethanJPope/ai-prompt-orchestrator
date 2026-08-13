const account = {
  id: "demo-active",
  name: "Demo workspace",
  plan: "Pilot",
  entitlement: "active",
  activatedAt: new Date().toISOString(),
  runs: 4,
  reviewedTasks: 12,
  savedTimeHours: 8.4,
};

export function prototypeAccount() {
  return { ...account };
}

export function setPrototypeEntitlement(status) {
  account.entitlement = status;
  if (status === "active") account.activatedAt = new Date().toISOString();
  return prototypeAccount();
}

export function prototypeBusinessStats() {
  return {
    environment: "local-demo",
    accounts: { total: 8, active: 6, inactive: 2, activationRate: 75 },
    usage: { runsThisMonth: 37, reviewedTasks: 94, averageDurationMinutes: 18.6, averageReviewers: 10 },
    quality: { firstPassAccepted: 71, evidenceComplete: 83, targetLatencyMultiplier: 2, observedBestMultiplier: 3.3 },
    recentEvents: [
      { label: "Workspace activated", detail: "demo-active", time: "Today · 09:14" },
      { label: "Review run completed", detail: "10 planned passes · 5 gates", time: "Today · 09:01" },
      { label: "Entitlement checked", detail: "active", time: "Today · 08:57" },
    ],
  };
}
