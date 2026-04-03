import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { DeviceSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerGetDeviceTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "eight_sleep_get_device",
    {
      title: "Get Device",
      description:
        "Returns the current Eight Sleep device details. If deviceId is omitted, the user's current device is used.",
      inputSchema: {
        deviceId: z.string().trim().min(1).optional(),
      },
      outputSchema: createToolResultSchema(DeviceSchema),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const device = await client.getDevice(args.deviceId);
      return textResponse(device);
    },
  );
}
