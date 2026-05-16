import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { EightSleepClient } from "../eight-sleep/client.js";
import { SleepTrendsToolResultSchema } from "../eight-sleep/types.js";
import { createToolResultSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { textResponse } from "./response.js";

const DateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

function todayInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function daysAgoInTimezone(timezone: string, days: number): string {
  const ms = Date.now() - days * 86_400_000;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(ms));
}

export function registerGetSleepTrendsTool(server: McpServer, client: EightSleepClient): void {
  server.registerTool(
    "eight_sleep_get_sleep_trends",
    {
      title: "Get Sleep Trends",
      description:
        "Returns daily sleep aggregates with proprietary scores. Each day includes: score (0-100 single-night Sleep Score), sleepQualityScore (with sub-components for hrv, respiratoryRate, heartRate, deep, rem, waso), sleepRoutineScore (with wakeupConsistency, sleepStartConsistency, latencyAsleepSeconds), and durations. Top-level avgScore is the period rolling average. Scores live exclusively in this endpoint; the intervals endpoint returns score=0.",
      inputSchema: {
        days: z.number().int().min(1).max(90).default(14),
        from: z.string().regex(DateOnlyRegex).optional(),
        to: z.string().regex(DateOnlyRegex).optional(),
        timezone: z.string().min(1).default("UTC"),
        userId: z.string().trim().min(1).optional(),
      },
      outputSchema: createToolResultSchema(SleepTrendsToolResultSchema),
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const timezone = args.timezone;
      const to = args.to ?? todayInTimezone(timezone);
      const from = args.from ?? daysAgoInTimezone(timezone, args.days);
      const trends = await client.getSleepTrends({
        from,
        to,
        timezone,
        userId: args.userId,
      });
      return textResponse(trends);
    },
  );
}
