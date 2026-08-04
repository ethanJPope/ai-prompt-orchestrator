import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.resolve(moduleDirectory, "../data/entitlements.json");

export function entitlementPath() {
  return process.env.ORCHESTRATOR_ENTITLEMENTS_PATH || defaultPath;
}

export async function getEntitlement(accountId) {
  const contents = await readFile(entitlementPath(), "utf8");
  const store = JSON.parse(contents);
  const record = store.accounts?.[accountId];

  if (!record) {
    return {
      accountId,
      active: false,
      status: "missing",
      reason: "No entitlement exists for this account.",
    };
  }

  return {
    accountId,
    active: record.status === "active",
    status: record.status,
    plan: record.plan ?? null,
    reason:
      record.status === "active"
        ? "Entitlement is active."
        : "Subscription entitlement is inactive.",
  };
}
