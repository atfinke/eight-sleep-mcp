import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { SleepIntervalsToolResultSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerGetSleepIntervalsTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "get_sleep_intervals",
    {
      title: "Get Sleep Intervals",
      description:
        "Returns sleep interval pages from the client-api intervals feed. Use next to continue pagination.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        next: z.string().trim().min(1).optional(),
        pages: z.number().int().min(1).max(5).optional(),
      },
      outputSchema: createToolResultSchema(SleepIntervalsToolResultSchema),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const intervals = await client.getSleepIntervals({
        userId: args.userId,
        next: args.next,
        pages: args.pages,
      });
      return textResponse(intervals);
    },
  );
}
