import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { AutopilotModeResponseSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, WRITE_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerSetAutopilotEnabledTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "set_autopilot_enabled",
    {
      title: "Set Autopilot Enabled",
      description: "Toggles the captured level-suggestions-mode autopilot flag.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        enabled: z.boolean(),
      },
      outputSchema: createToolResultSchema(AutopilotModeResponseSchema),
      annotations: WRITE_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.setAutopilotEnabled({
        userId: args.userId,
        enabled: args.enabled,
      });
      return textResponse(result);
    },
  );
}
