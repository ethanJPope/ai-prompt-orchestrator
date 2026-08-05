import { readFile } from "node:fs/promises";
import { validateComparisonPair } from "../src/comparison-contract.mjs";

const paths = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));

if (paths.length !== 2) {
  console.error("Usage: pnpm validate:comparison <run-a.json> <run-b.json>");
  process.exit(2);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${path}: ${error.message}`);
  }
}

try {
  const result = validateComparisonPair(await Promise.all(paths.map(readJson)));
  console.log(JSON.stringify({
    valid: result.valid,
    durationRatio: result.durationRatio,
    runIds: result.runs.map((run) => run?.runId ?? null),
    failures: result.failures,
  }, null, 2));
  if (!result.valid) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
