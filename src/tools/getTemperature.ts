import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { TemperatureToolResultSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerGetTemperatureTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "eight_sleep_get_temperature",
    {
      title: "Get Temperature",
      description:
        "Returns the current temperature state by combining the client-api and app-api temperature endpoints.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
      },
      outputSchema: createToolResultSchema(TemperatureToolResultSchema),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const temperature = await client.getTemperature(args.userId);
      return textResponse(temperature);
    },
  );
}
