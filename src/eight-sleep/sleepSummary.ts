import type { LatestSleepSummary, SleepInterval, SleepIntervalSummary } from "./types.js";

interface SleepBreakdown {
  sleepDuration: number;
  deepPct: number;
  remPct: number;
  lightPct: number;
}

const SLEEP_STAGE_NAMES = new Set(["deep", "light", "rem"]);

function getComparableTimestamp(interval: SleepInterval): number {
  const rawTimestamp = interval.sleepEnd ?? interval.deviceTimeAtUpdate ?? interval.ts;
  const parsedTimestamp = Date.parse(rawTimestamp);
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : Number.NEGATIVE_INFINITY;
}

function getBreakdownFromStageSummary(interval: SleepInterval): SleepBreakdown | null {
  const stageSummary = interval.stageSummary;

  if (!stageSummary?.sleepDuration || stageSummary.sleepDuration <= 0) {
    return null;
  }

  const sleepDuration = stageSummary.sleepDuration;
  const deepPct =
    stageSummary.deepPercentOfSleep ?? (stageSummary.deepDuration ?? 0) / sleepDuration;
  const remPct = stageSummary.remPercentOfSleep ?? (stageSummary.remDuration ?? 0) / sleepDuration;
  const lightPct =
    stageSummary.lightPercentOfSleep ?? (stageSummary.lightDuration ?? 0) / sleepDuration;

  return {
    sleepDuration,
    deepPct,
    remPct,
    lightPct,
  };
}

function getBreakdownFromStages(interval: SleepInterval): SleepBreakdown | null {
  if (!interval.stages?.length) {
    return null;
  }

  let sleepDuration = 0;
  let deepDuration = 0;
  let remDuration = 0;
  let lightDuration = 0;

  for (const stage of interval.stages) {
    if (!SLEEP_STAGE_NAMES.has(stage.stage)) {
      continue;
    }

    sleepDuration += stage.duration;

    if (stage.stage === "deep") {
      deepDuration += stage.duration;
    }

    if (stage.stage === "rem") {
      remDuration += stage.duration;
    }

    if (stage.stage === "light") {
      lightDuration += stage.duration;
    }
  }

  if (sleepDuration <= 0) {
    return null;
  }

  return {
    sleepDuration,
    deepPct: deepDuration / sleepDuration,
    remPct: remDuration / sleepDuration,
    lightPct: lightDuration / sleepDuration,
  };
}

function getSleepBreakdown(interval: SleepInterval): SleepBreakdown | null {
  return getBreakdownFromStageSummary(interval) ?? getBreakdownFromStages(interval);
}

export function selectLatestSleepInterval(intervals: readonly SleepInterval[]): SleepInterval | null {
  let latestInterval: SleepInterval | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const interval of intervals) {
    const comparableTimestamp = getComparableTimestamp(interval);

    if (latestInterval === null || comparableTimestamp > latestTimestamp) {
      latestInterval = interval;
      latestTimestamp = comparableTimestamp;
    }
  }

  return latestInterval;
}

export function summarizeSleepInterval(interval: SleepInterval): LatestSleepSummary {
  const sleepStart = interval.sleepStart;
  const sleepEnd = interval.sleepEnd;
  const breakdown = getSleepBreakdown(interval);

  if (!sleepStart || !sleepEnd || !breakdown) {
    throw new Error(`Eight Sleep interval ${interval.id} does not include enough summary data`);
  }

  return {
    sleepStart,
    sleepEnd,
    sleepDuration: breakdown.sleepDuration,
    deepPct: breakdown.deepPct,
    remPct: breakdown.remPct,
    lightPct: breakdown.lightPct,
  };
}

export function compactSleepInterval(interval: SleepInterval): SleepIntervalSummary {
  const {
    score: _score,
    stages: _stages,
    snoring: _snoring,
    timeseries: _timeseries,
    ...summaryInterval
  } = interval;
  return summaryInterval;
}
