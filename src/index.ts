import "dotenv/config";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { EightSleepClient } from "./eight-sleep/client.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new EightSleepClient(config);
  const currentUser = await client.getCurrentUser();
  const deviceId = await client.getPrimaryDeviceId();

  console.error(
    `Authenticated to Eight Sleep as ${currentUser.user.email} (user ${currentUser.user.userId}, device ${deviceId})`,
  );

  const server = createServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("Eight Sleep MCP server is running on stdio");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
