import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  evaluateEvidencePacket,
  hashEvidenceFile,
  hashImplementationFiles,
  readPngDimensions,
  resolveVerifiedEvidencePath,
} from "../src/evidence-packet.mjs";
import { hashReviewPlan } from "../src/review-contract.mjs";

const packetPath = process.argv.find((value) => !value.startsWith("--") && value !== process.argv[0] && value !== process.argv[1]);
const phaseArgument = process.argv.find((value) => value.startsWith("--phase="));
const planArgument = process.argv.find((value) => value.startsWith("--plan="));
const phase = phaseArgument ? phaseArgument.slice("--phase=".length) : "final";
if (!packetPath) {
  console.error("Usage: node scripts/validate-evidence-packet.mjs <packet.json> --plan=<review-plan.json> [--phase=before-visual|before-arbiter|final]");
  process.exitCode = 2;
} else {
  try {
    const packet = JSON.parse(await readFile(packetPath, "utf8"));
    if (!planArgument) throw new Error("A returned review plan is required to validate plan binding");
    const planPath = planArgument.slice("--plan=".length);
    const plan = JSON.parse(await readFile(planPath, "utf8"));
    if (packet.planHash !== hashReviewPlan(plan)) throw new Error("Evidence packet planHash does not match the returned review plan");
    const actualImplementationHash = await hashImplementationFiles(packetPath, packet.implementationFiles);
    if (packet.implementationHash.toLowerCase() !== actualImplementationHash) {
      throw new Error("Implementation hash mismatch");
    }
    for (const screenshot of packet.screenshots ?? []) {
      const screenshotPath = await resolveVerifiedEvidencePath(packetPath, screenshot.path);
      const actualHash = await hashEvidenceFile(screenshotPath);
      if (screenshot.sha256.toLowerCase() !== actualHash) {
        throw new Error(`Screenshot hash mismatch: ${screenshot.path}`);
      }
      const actualDimensions = await readPngDimensions(screenshotPath);
      if (
        actualDimensions.width !== screenshot.decodedPixels.width ||
        actualDimensions.height !== screenshot.decodedPixels.height
      ) {
        throw new Error(`Screenshot dimension mismatch: ${screenshot.path}`);
      }
    }
    const result = evaluateEvidencePacket(packet, { phase });
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
