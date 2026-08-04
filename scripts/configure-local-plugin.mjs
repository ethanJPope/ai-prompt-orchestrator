import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(scriptDirectory, "..");

export function buildLocalMcpConfig(root = projectRoot) {
  return {
    mcpServers: {
      "ai-prompt-orchestrator": {
        command: "node",
        args: [path.join(root, "src", "server.mjs")],
        env: {
          ORCHESTRATOR_ENTITLEMENTS_PATH: path.join(root, "data", "entitlements.json"),
        },
      },
    },
  };
}

export async function writeLocalMcpConfig({
  root = projectRoot,
  outputPath = path.join(root, "plugins", "ai-prompt-orchestrator", ".mcp.json"),
} = {}) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(buildLocalMcpConfig(root), null, 2)}\n`, "utf8");
  return outputPath;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const outputPath = await writeLocalMcpConfig();
  console.log(`Configured local plugin MCP: ${outputPath}`);
  console.log(`Project root: ${projectRoot}`);
}
