import { readFile } from "node:fs/promises";
import { hashComparisonPrompt } from "../src/comparison-contract.mjs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: pnpm hash:comparison-prompt <prompt.md>");
  process.exit(2);
}

try {
  const result = hashComparisonPrompt(await readFile(path, "utf8"));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Could not hash ${path}: ${error.message}`);
  process.exitCode = 1;
}
