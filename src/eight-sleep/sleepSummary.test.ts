import assert from "node:assert/strict";
import test from "node:test";

import { compactSleepInterval, selectLatestSleepInterval } from "./sleepSummary.js";
import type { SleepInterval } from "./types.js";

test("compactSleepInterval strips bulky arrays and timeseries data", () => {
  const interval: SleepInterval = {
    id: "interval-123",
    ts: "2026-04-02T15:35:30.000Z",
    sleepStart: "2026-04-02T03:38:30.000Z",
    sleepEnd: "2026-04-02T15:35:30.000Z",
    score: 82,
    stageSummary: {
      sleepDuration: 34_380,
      deepPercentOfSleep: 0.12,
      remPercentOfSleep: 0.24,
      lightPercentOfSleep: 0.64,
    },
    stages: [
      {
        stage: "light",
        duration: 1_200,
      },
    ],
    snoring: [
      {
        intensity: "low",
        duration: 30,
      },
    ],
    timeseries: {
      heartRate: [["2026-04-02T04:00:00.000Z", 60]],
    },
  };

  const compactInterval = compactSleepInterval(interval);

  assert.deepEqual(compactInterval, {
    id: "interval-123",
    ts: "2026-04-02T15:35:30.000Z",
    sleepStart: "2026-04-02T03:38:30.000Z",
    sleepEnd: "2026-04-02T15:35:30.000Z",
    stageSummary: {
      sleepDuration: 34_380,
      deepPercentOfSleep: 0.12,
      remPercentOfSleep: 0.24,
      lightPercentOfSleep: 0.64,
    },
  });
});

test("selectLatestSleepInterval prefers the newest sleepEnd timestamp", () => {
  const olderInterval: SleepInterval = {
    id: "older",
    ts: "2026-04-01T10:00:00.000Z",
    sleepEnd: "2026-04-01T10:00:00.000Z",
  };
  const latestInterval: SleepInterval = {
    id: "latest",
    ts: "2026-04-02T09:00:00.000Z",
    sleepEnd: "2026-04-02T09:00:00.000Z",
  };

  const selectedInterval = selectLatestSleepInterval([olderInterval, latestInterval]);

  assert.equal(selectedInterval?.id, "latest");
});
