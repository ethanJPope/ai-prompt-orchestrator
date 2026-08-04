import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginConfigPath = path.resolve(
  scriptDirectory,
  "../plugins/ai-prompt-orchestrator/.mcp.json",
);
const pluginConfig = JSON.parse(await readFile(pluginConfigPath, "utf8"));
const localServer = pluginConfig.mcpServers["ai-prompt-orchestrator"];
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "orchestrator-smoke-"));
const entitlementFile = path.join(temporaryDirectory, "entitlements.json");

async function writeStatus(status) {
  await writeFile(
    entitlementFile,
    `${JSON.stringify(
      {
        accounts: {
          "smoke-user": { status, plan: "development" },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

await writeStatus("active");

const transport = new StdioClientTransport({
  command: localServer.command,
  args: localServer.args,
  env: {
    ...process.env,
    ...localServer.env,
    ORCHESTRATOR_ENTITLEMENTS_PATH: entitlementFile,
  },
  stderr: "pipe",
});
const client = new Client({ name: "ai-prompt-orchestrator-smoke", version: "0.3.0" });

try {
  await client.connect(transport);
  const activeResult = await client.callTool({
    name: "prepare_review",
    arguments: {
      account_id: "smoke-user",
      prompt:
        "Implement OAuth login in the existing web app, preserve current accounts, add negative-path tests, and provide rollback evidence.",
      project_context: "Existing production web application.",
    },
  });

  assert.equal(activeResult.isError, undefined);
  assert.equal(activeResult.structuredContent.substantive, true);
  assert.equal(activeResult.structuredContent.schemaVersion, "0.3");
  assert.match(activeResult.structuredContent.correlationId, /^[0-9a-f-]{36}$/i);
  assert.equal(activeResult.structuredContent.reviewerCount, 10);
  assert.equal(
    activeResult.structuredContent.reviewers.at(-1).id,
    "final-senior-review",
  );

  const visualResult = await client.callTool({
    name: "prepare_review",
    arguments: {
      account_id: "smoke-user",
      prompt:
        "Build and test a responsive landing page with a polished desktop and mobile layout.",
      project_context: "Local website project.",
    },
  });
  assert.equal(visualResult.structuredContent.taskClass, "visual-interface");
  assert.equal(visualResult.structuredContent.reviewerCount, 10);
  assert.equal(visualResult.structuredContent.evidencePacket.location, "task-local");
  assert.equal(visualResult.structuredContent.executionPolicy.latencyTargetMultiplier, 2);
  assert.equal(
    visualResult.structuredContent.telemetry.correlationId,
    visualResult.structuredContent.correlationId,
  );
  assert.equal(visualResult.structuredContent.executionPolicy.maxRepairPasses, 1);
  assert.ok(
    visualResult.structuredContent.deterministicGates.some(
      (gate) => gate.id === "viewport-evidence",
    ),
  );
  assert.ok(
    visualResult.structuredContent.reviewers.some(
      (reviewer) => reviewer.id === "visual-art-direction",
    ),
  );

  await writeStatus("inactive");
  const inactiveResult = await client.callTool({
    name: "prepare_review",
    arguments: {
      account_id: "smoke-user",
      prompt: "Implement the approved OAuth plan.",
    },
  });

  assert.equal(inactiveResult.isError, true);
  assert.equal(inactiveResult.structuredContent.code, "subscription_inactive");
  console.log(
    JSON.stringify(
      {
        activeReviewerCount: activeResult.structuredContent.reviewerCount,
        visualReviewerCount: visualResult.structuredContent.reviewerCount,
        visualReviewWaves: visualResult.structuredContent.executionPolicy.reviewWaves.length,
        finalReviewer: activeResult.structuredContent.reviewers.at(-1).name,
        inactiveResult: inactiveResult.structuredContent.code,
        proof: "The same installed client was denied immediately after entitlement deactivation.",
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
