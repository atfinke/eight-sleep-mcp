import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { LatestSleepSummarySchema } from "../eight-sleep/types.js";
import { createToolResultSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerGetLatestSleepSummaryTool(
  server: McpServer,
  client: EightSleepClient,
): void {
  server.registerTool(
    "eight_sleep_get_latest_sleep_summary",
    {
      title: "Get Latest Sleep Summary",
      description:
        "Returns compact summary metrics for the most recent sleep interval without timeseries data.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
      },
      outputSchema: createToolResultSchema(LatestSleepSummarySchema),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const summary = await client.getLatestSleepSummary({
        userId: args.userId,
      });
      return textResponse(summary);
    },
  );
}
