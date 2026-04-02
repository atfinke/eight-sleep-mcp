import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { registerGetCurrentUserTool } from "./getCurrentUser.js";
import { registerGetDeviceTool } from "./getDevice.js";
import { registerGetLatestSleepSummaryTool } from "./getLatestSleepSummary.js";
import { registerGetSleepIntervalsTool } from "./getSleepIntervals.js";
import { registerGetTemperatureEventsTool } from "./getTemperatureEvents.js";
import { registerGetTemperatureTool } from "./getTemperature.js";
import { registerResumeSmartTemperatureTool } from "./resumeSmartTemperature.js";
import { registerSetAutopilotEnabledTool } from "./setAutopilotEnabled.js";
import { registerSetBedtimeScheduleTool } from "./setBedtimeSchedule.js";
import { registerSetTemporaryBedtimeLevelTool } from "./setTemporaryBedtimeLevel.js";
import { registerTurnOffTemperatureTool } from "./turnOffTemperature.js";
import { registerUpdateSmartTemperatureLevelsTool } from "./updateSmartTemperatureLevels.js";

export function registerTools(server: McpServer, client: EightSleepClient): void {
  registerGetCurrentUserTool(server, client);
  registerGetDeviceTool(server, client);
  registerGetTemperatureTool(server, client);
  registerGetTemperatureEventsTool(server, client);
  registerGetLatestSleepSummaryTool(server, client);
  registerGetSleepIntervalsTool(server, client);
  registerResumeSmartTemperatureTool(server, client);
  registerTurnOffTemperatureTool(server, client);
  registerSetTemporaryBedtimeLevelTool(server, client);
  registerSetBedtimeScheduleTool(server, client);
  registerUpdateSmartTemperatureLevelsTool(server, client);
  registerSetAutopilotEnabledTool(server, client);
}
