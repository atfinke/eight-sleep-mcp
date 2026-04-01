import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { PermanentBedtimeToolResultSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, WRITE_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerSetBedtimeScheduleTool(
  server: McpServer,
  client: EightSleepClient,
): void {
  server.registerTool(
    "set_bedtime_schedule",
    {
      title: "Set Bedtime Schedule",
      description:
        "Persists the bedtime level to the selected bedtime schedule and clears any temporary override, matching the app's Make Permanent flow.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        bedtimeLevel: z.number().int().min(-100).max(100),
        scheduleId: z.string().trim().min(1).optional(),
        ignoreDeviceErrors: z.boolean().optional(),
      },
      outputSchema: createToolResultSchema(PermanentBedtimeToolResultSchema),
      annotations: WRITE_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.setBedtimeSchedule({
        userId: args.userId,
        bedtimeLevel: args.bedtimeLevel,
        scheduleId: args.scheduleId,
        ignoreDeviceErrors: args.ignoreDeviceErrors,
      });
      return textResponse(result);
    },
  );
}
