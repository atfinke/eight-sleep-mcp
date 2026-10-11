import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { TemperatureOverviewSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, WRITE_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerSetCurrentLevelTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "eight_sleep_set_current_level",
    {
      title: "Set Current Temperature Level",
      description:
        "Immediately sets the active temperature level (-100 coldest to 100 warmest). Does not edit bedtime schedules or saved smart temperature levels.",
      inputSchema: {
        level: z.number().int().min(-100).max(100),
        userId: z.string().trim().min(1).optional(),
        ignoreDeviceErrors: z.boolean().optional(),
      },
      outputSchema: createToolResultSchema(TemperatureOverviewSchema),
      annotations: WRITE_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.setCurrentLevel({
        level: args.level,
        userId: args.userId,
        ignoreDeviceErrors: args.ignoreDeviceErrors,
      });
      return textResponse(result);
    },
  );
}
