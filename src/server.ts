import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { EightSleepClient } from "./eight-sleep/client.js";
import { registerTools } from "./tools/index.js";

export function createServer(client: EightSleepClient): McpServer {
  const server = new McpServer({
    name: "eight-sleep-mcp",
    version: "0.2.0",
  });

  registerTools(server, client);

  return server;
}
