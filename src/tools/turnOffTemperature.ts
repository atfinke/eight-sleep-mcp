import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { TemperatureOverviewSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, WRITE_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerTurnOffTemperatureTool(
  server: McpServer,
  client: EightSleepClient,
): void {
  server.registerTool(
    "eight_sleep_turn_off_temperature",
    {
      title: "Turn Off Temperature",
      description:
        "Turns off active temperature control using the captured app-api temperature/pod request shape. This does not power down the hardware.",
      inputSchema: {
        userId: z.string().trim().min(1).optional(),
        ignoreDeviceErrors: z.boolean().optional(),
      },
      outputSchema: createToolResultSchema(TemperatureOverviewSchema),
      annotations: WRITE_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const result = await client.turnOffTemperature({
        userId: args.userId,
        ignoreDeviceErrors: args.ignoreDeviceErrors,
      });
      return textResponse(result);
    },
  );
}
