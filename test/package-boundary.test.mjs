import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildLocalMcpConfig } from "../scripts/configure-local-plugin.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, "..");
const pluginRoot = path.join(projectRoot, "plugins", "ai-prompt-orchestrator");

async function textFiles(root, ignored = new Set()) {
  const results = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await textFiles(fullPath, ignored)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

test("server-controlled reviewer logic is not bundled in the plugin", async () => {
  const files = await textFiles(pluginRoot);
  const combined = (
    await Promise.all(files.map(async (file) => readFile(file, "utf8")))
  ).join("\n");

  for (const forbidden of [
    "Repository Discovery and System Map",
    "Architecture and Module Boundaries",
    "reviewerPrompt",
    "keywords:",
  ]) {
    assert.equal(combined.includes(forbidden), false, `Plugin leaked: ${forbidden}`);
  }

  const mcpConfig = buildLocalMcpConfig(projectRoot);
  const serverPath = path.resolve(
    mcpConfig.mcpServers["ai-prompt-orchestrator"].args[0],
  );
  assert.equal(serverPath.startsWith(pluginRoot), false);
  assert.equal(serverPath, path.join(projectRoot, "src", "server.mjs"));
});

test("tracked project files contain no common credential patterns", async () => {
  const files = await textFiles(projectRoot, new Set([".git", "node_modules"]));
  const patterns = [
    /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];

  for (const file of files) {
    const contents = await readFile(file, "utf8");
    for (const pattern of patterns) {
      assert.equal(pattern.test(contents), false, `Possible credential in ${file}`);
    }
  }
});
