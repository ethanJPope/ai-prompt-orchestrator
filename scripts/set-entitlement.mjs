import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , accountId, requestedStatus] = process.argv;
const validStatuses = new Set(["active", "inactive"]);

if (!accountId || !validStatuses.has(requestedStatus)) {
  console.error("Usage: pnpm entitlement <account-id> <active|inactive>");
  process.exitCode = 2;
} else {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const storePath =
    process.env.ORCHESTRATOR_ENTITLEMENTS_PATH ||
    path.resolve(scriptDirectory, "../data/entitlements.json");
  const store = JSON.parse(await readFile(storePath, "utf8"));
  const previous = store.accounts?.[accountId];
  if (!previous) {
    console.error(`Unknown account: ${accountId}`);
    process.exitCode = 3;
  } else {
    store.accounts[accountId] = {
      ...previous,
      status: requestedStatus,
      updatedAt: new Date().toISOString(),
    };
    await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    console.log(`${accountId}: ${previous.status} -> ${requestedStatus}`);
  }
}
