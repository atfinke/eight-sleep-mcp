import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { CurrentUserSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

export function registerGetCurrentUserTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "get_current_user",
    {
      title: "Get Current User",
      description: "Returns the authenticated Eight Sleep user profile and resolved user identifier.",
      outputSchema: createToolResultSchema(CurrentUserSchema),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async () => {
      const currentUser = await client.getCurrentUser();
      return textResponse(currentUser.user);
    },
  );
}
