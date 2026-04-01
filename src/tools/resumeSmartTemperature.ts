import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { TemperatureOverviewSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, WRITE_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerResumeSmartTemperatureTool(
  server: McpServer,
  client: EightSleepClient,
): void {
  server.registerTool(
    "resume_smart_temperature",
    {
      title: "Resume Smart Temperature",
      description:
        "Resumes Eight Sleep smart temperature mode using the captured app-api temperature/pod request shape.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        ignoreDeviceErrors: z.boolean().optional(),
      },
      outputSchema: createToolResultSchema(TemperatureOverviewSchema),
      annotations: WRITE_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.resumeSmartTemperature({
        userId: args.userId,
        ignoreDeviceErrors: args.ignoreDeviceErrors,
      });
      return textResponse(result);
    },
  );
}
