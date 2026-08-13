import { randomUUID } from "node:crypto";
import { z } from "zod";

const nonEmptyString = z.string().min(1);

export const collaborationMessageSchema = z.object({
  messageId: nonEmptyString,
  reviewerId: nonEmptyString,
  wave: nonEmptyString,
  kind: z.enum(["new", "confirms", "contradicts", "extends", "evidence-gap"]),
  claim: nonEmptyString,
  evidenceRefs: z.array(nonEmptyString).min(1),
  severity: z.enum(["info", "low", "medium", "high", "blocker"]),
  confidence: z.number().min(0).max(1),
  relatedMessageIds: z.array(nonEmptyString),
  nextReviewerAction: nonEmptyString,
});

export function createCollaborationMessage(input) {
  return collaborationMessageSchema.parse({
    messageId: input.messageId ?? `msg-${randomUUID().slice(0, 8)}`,
    reviewerId: input.reviewerId,
    wave: input.wave,
    kind: input.kind ?? "new",
    claim: input.claim,
    evidenceRefs: input.evidenceRefs,
    severity: input.severity ?? "info",
    confidence: input.confidence ?? 0.5,
    relatedMessageIds: input.relatedMessageIds ?? [],
    nextReviewerAction: input.nextReviewerAction,
  });
}

export function appendCollaborationMessage(messages, message) {
  const parsed = collaborationMessageSchema.parse(message);
  if (messages.some((entry) => entry.messageId === parsed.messageId)) {
    throw new Error(`Duplicate collaboration message: ${parsed.messageId}`);
  }
  return [...messages, parsed];
}

export function buildWaveHandoff(messages, fromWave, toWave) {
  const relevant = messages.filter((message) => message.wave === fromWave || message.relatedMessageIds.some((id) => messages.find((entry) => entry.messageId === id)?.wave === fromWave));
  return {
    from: fromWave,
    to: toWave,
    messageIds: relevant.map((message) => message.messageId),
    unresolved: relevant.filter((message) => message.kind === "contradicts" || message.kind === "evidence-gap").map((message) => message.claim),
    instruction: relevant.length
      ? `Consume ${relevant.length} shared finding message(s); confirm, contradict, or extend them with new evidence.`
      : "No prior findings were published; perform scoped discovery and publish evidence gaps.",
  };
}
