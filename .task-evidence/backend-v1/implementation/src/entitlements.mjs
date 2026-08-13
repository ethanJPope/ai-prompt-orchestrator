import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.resolve(moduleDirectory, "../data/entitlements.json");

export function entitlementPath() {
  return process.env.ORCHESTRATOR_ENTITLEMENTS_PATH || defaultPath;
}

export const DEMO_ACCOUNT_ID = "demo-active";

async function readStore() {
  const contents = await readFile(entitlementPath(), "utf8");
  return JSON.parse(contents);
}

async function writeStore(store) {
  await writeFile(entitlementPath(), `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function getEntitlement(accountId) {
  const store = await readStore();
  const record = store.accounts?.[accountId];

  if (!record) {
    return {
      accountId,
      active: false,
      status: "missing",
      decision: "subscription_inactive",
      reason: "No entitlement exists for this account.",
    };
  }

  return {
    accountId,
    active: record.status === "active",
    status: record.status,
    decision: record.status === "active" ? "allowed" : "subscription_inactive",
    plan: record.plan ?? null,
    reason:
      record.status === "active"
        ? "Entitlement is active."
        : "Subscription entitlement is inactive.",
  };
}

export async function setEntitlement(accountId, status) {
  if (!new Set(["active", "inactive"]).has(status)) {
    throw new Error(`Unsupported entitlement status: ${status}`);
  }

  const store = await readStore();
  if (!store.accounts?.[accountId]) {
    throw new Error(`No entitlement exists for account: ${accountId}`);
  }
  store.accounts[accountId].status = status;
  await writeStore(store);
  return getEntitlement(accountId);
}
