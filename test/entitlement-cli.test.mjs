import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execFileAsync = promisify(execFile);
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(testDirectory, "../scripts/set-entitlement.mjs");

test("the admin CLI changes an isolated entitlement immediately", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "orchestrator-entitlement-"));
  const entitlementFile = path.join(temporaryDirectory, "entitlements.json");

  try {
    await writeFile(
      entitlementFile,
      `${JSON.stringify({ accounts: { tester: { status: "active", plan: "development" } } })}\n`,
      "utf8",
    );

    const { stdout } = await execFileAsync(
      process.execPath,
      [scriptPath, "tester", "inactive"],
      {
        env: {
          ...process.env,
          ORCHESTRATOR_ENTITLEMENTS_PATH: entitlementFile,
        },
      },
    );
    const updated = JSON.parse(await readFile(entitlementFile, "utf8"));

    assert.match(stdout, /tester: active -> inactive/);
    assert.equal(updated.accounts.tester.status, "inactive");
    assert.ok(updated.accounts.tester.updatedAt);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
