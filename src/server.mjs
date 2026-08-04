import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getEntitlement } from "./entitlements.mjs";
import { preparePlan } from "./orchestrator.mjs";

const server = new McpServer({
  name: "ai-prompt-orchestrator",
  version: "0.2.0",
});

function resultContent(result) {
  return [{ type: "text", text: JSON.stringify(result, null, 2) }];
}

server.registerTool(
  "check_entitlement",
  {
    title: "Check orchestrator entitlement",
    description: "Check whether a local development account may use the orchestration service.",
    inputSchema: {
      account_id: z.string().min(1).describe("Local development account identifier."),
    },
    outputSchema: {
      accountId: z.string(),
      active: z.boolean(),
      status: z.string(),
      plan: z.string().nullable().optional(),
      reason: z.string(),
    },
  },
  async ({ account_id }) => {
    const entitlement = await getEntitlement(account_id);
    return {
      content: resultContent(entitlement),
      structuredContent: entitlement,
    };
  },
);

server.registerTool(
  "prepare_review",
  {
    title: "Prepare a targeted minimum-ten review plan",
    description:
      "Improve a coding request and select at least ten targeted reviewer passes, with screenshot review for visual work and parallel execution waves.",
    inputSchema: {
      account_id: z.string().min(1).describe("Local development account identifier."),
      prompt: z.string().min(1).max(20000).describe("The user's current request."),
      project_context: z
        .string()
        .max(4000)
        .optional()
        .describe("A short project summary; do not send secrets, source files, or raw transcripts."),
    },
  },
  async ({ account_id, prompt, project_context }) => {
    const entitlement = await getEntitlement(account_id);
    if (!entitlement.active) {
      const denied = {
        code: "subscription_inactive",
        accountId: account_id,
        message: "This account does not have an active AI Prompt Orchestrator entitlement.",
      };
      return {
        isError: true,
        content: resultContent(denied),
        structuredContent: denied,
      };
    }

    const plan = preparePlan(prompt, project_context ?? "");
    const response = {
      accountId: account_id,
      entitlementStatus: entitlement.status,
      ...plan,
    };
    return {
      content: resultContent(response),
      structuredContent: response,
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
