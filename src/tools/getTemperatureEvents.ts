import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { TemperatureEventsToolResultSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerGetTemperatureEventsTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "eight_sleep_get_temperature_events",
    {
      title: "Get Temperature Events",
      description: "Returns recent temperature events. If from is omitted, the server uses the past hour.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        from: z.string().trim().min(1).optional(),
      },
      outputSchema: createToolResultSchema(TemperatureEventsToolResultSchema),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const events = await client.getTemperatureEvents({
        userId: args.userId,
        from: args.from,
      });
      return textResponse(events);
    },
  );
}
