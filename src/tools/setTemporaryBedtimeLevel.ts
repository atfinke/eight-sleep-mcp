import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { TemperatureOverviewSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, WRITE_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerSetTemporaryBedtimeLevelTool(
  server: McpServer,
  client: EightSleepClient,
): void {
  server.registerTool(
    "eight_sleep_set_temporary_bedtime_level",
    {
      title: "Set Temporary Bedtime Level",
      description:
        "Sets a temporary bedtime level using overrideLevels.bedTime. This matches the app's immediate bedtime dial change, not Make Permanent.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        bedtimeLevel: z.number().int().min(-100).max(100),
        ignoreDeviceErrors: z.boolean().optional(),
      },
      outputSchema: createToolResultSchema(TemperatureOverviewSchema),
      annotations: WRITE_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.setTemporaryBedtimeLevel({
        userId: args.userId,
        bedtimeLevel: args.bedtimeLevel,
        ignoreDeviceErrors: args.ignoreDeviceErrors,
      });
      return textResponse(result);
    },
  );
}
