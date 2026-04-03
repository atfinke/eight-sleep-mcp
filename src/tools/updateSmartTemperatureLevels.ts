import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { TemperatureOverviewSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, WRITE_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerUpdateSmartTemperatureLevelsTool(
  server: McpServer,
  client: EightSleepClient,
): void {
  server.registerTool(
    "eight_sleep_update_smart_temperature_levels",
    {
      title: "Update Smart Temperature Levels",
      description:
        "Updates the saved smart-mode levels bedTimeLevel, initialSleepLevel, and finalSleepLevel. This is separate from the app's bedtime Make Permanent flow.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        bedTimeLevel: z.number().int().min(-100).max(100),
        initialSleepLevel: z.number().int().min(-100).max(100),
        finalSleepLevel: z.number().int().min(-100).max(100),
        overrideBedtimeLevel: z.number().int().min(-100).max(100).optional(),
        ignoreDeviceErrors: z.boolean().optional(),
      },
      outputSchema: createToolResultSchema(TemperatureOverviewSchema),
      annotations: WRITE_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.updateSmartTemperatureLevels({
        userId: args.userId,
        bedTimeLevel: args.bedTimeLevel,
        initialSleepLevel: args.initialSleepLevel,
        finalSleepLevel: args.finalSleepLevel,
        overrideBedtimeLevel: args.overrideBedtimeLevel,
        ignoreDeviceErrors: args.ignoreDeviceErrors,
      });
      return textResponse(result);
    },
  );
}
