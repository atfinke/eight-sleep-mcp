import { z } from "zod";

const NumericLevelSchema = z.number().int().min(-100).max(100);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const AuthTokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.string().optional(),
    expires_in: z.number().int().positive().optional(),
    refresh_token: z.string().optional(),
    userId: z.string().min(1),
  })
  .passthrough();

export const TemperatureScheduleSchema = z
  .object({
    id: z.string().optional(),
    enabled: z.boolean().optional(),
    time: z.string().optional(),
    days: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    startSettings: z
      .object({
        bedtime: NumericLevelSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const CurrentUserSchema = z
  .object({
    userId: z.string().min(1),
    email: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displaySettings: z
      .object({
        locale: z.string().optional(),
        clockSystem: z.string().optional(),
        measurementSystem: z.string().optional(),
      })
      .passthrough()
      .optional(),
    currentDevice: z
      .object({
        id: z.string().min(1),
        side: z.string().optional(),
        timeZone: z.string().optional(),
        specialization: z.string().optional(),
      })
      .passthrough()
      .optional(),
    devices: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
  })
  .passthrough();

export const CurrentUserResponseSchema = z
  .object({
    user: CurrentUserSchema,
  })
  .passthrough();

export const DeviceKelvinSchema = z
  .object({
    targetLevels: z.array(z.number()).optional(),
    scheduleProfiles: z
      .array(
        z
          .object({
            enabled: z.boolean().optional(),
            startLocalTime: z.string().optional(),
            weekDays: z.record(z.string(), z.boolean()).optional(),
          })
          .passthrough(),
      )
      .optional(),
    level: z.number().optional(),
    currentTargetLevel: z.number().optional(),
    currentActivity: z.string().optional(),
  })
  .passthrough();

export const DeviceSchema = z
  .object({
    deviceId: z.string().min(1),
    ownerId: z.string().optional(),
    online: z.boolean().optional(),
    timezone: z.string().optional(),
    modelString: z.string().optional(),
    firmwareVersion: z.string().optional(),
    lastHeard: z.string().optional(),
    hasWater: z.boolean().optional(),
    needsPriming: z.boolean().optional(),
    isTemperatureAvailable: z.boolean().optional(),
    features: z.array(z.string()).optional(),
    leftHeatingLevel: z.number().optional(),
    leftTargetHeatingLevel: z.number().optional(),
    rightHeatingLevel: z.number().optional(),
    rightTargetHeatingLevel: z.number().optional(),
    leftKelvin: DeviceKelvinSchema.optional(),
    rightKelvin: DeviceKelvinSchema.optional(),
    sensorInfo: z
      .object({
        skuName: z.string().optional(),
        model: z.string().optional(),
        version: z.number().optional(),
        connected: z.boolean().optional(),
        lastConnected: z.string().optional(),
      })
      .passthrough()
      .optional(),
    wifiInfo: z
      .object({
        signalStrength: z.number().optional(),
        ssid: z.string().optional(),
        ipAddr: z.string().optional(),
        asOf: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const DeviceResponseSchema = z
  .object({
    result: DeviceSchema,
  })
  .passthrough();

export const ClientTemperatureStateSchema = z
  .object({
    currentLevel: z.number(),
    settings: z
      .object({
        scheduleType: z.string().optional(),
        smartMode: z.string().optional(),
        timeBased: z
          .object({
            level: z.number().optional(),
            durationSeconds: z.number().optional(),
          })
          .passthrough()
          .optional(),
        smart: z
          .object({
            bedTimeLevel: NumericLevelSchema.optional(),
            initialSleepLevel: NumericLevelSchema.optional(),
            finalSleepLevel: NumericLevelSchema.optional(),
          })
          .passthrough()
          .optional(),
        schedules: z.array(TemperatureScheduleSchema).optional(),
        smartProfiles: z.array(z.unknown()).optional(),
      })
      .passthrough(),
    nextScheduledTimestamp: z.string().optional(),
    currentState: z
      .object({
        type: z.string(),
        started: z.string().optional(),
        instance: z
          .object({
            timestamp: z.string().optional(),
            startedFrom: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
    currentSchedule: TemperatureScheduleSchema.optional(),
    nextSchedule: TemperatureScheduleSchema.optional(),
    nextBedtimeDisplayWindow: z
      .object({
        displayWindowHours: z.number().optional(),
        nextTimestampInWindow: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    overrideLevels: z
      .object({
        bedtime: NumericLevelSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const TemperatureOverviewSchema = z
  .object({
    devices: z.array(
      z
        .object({
          device: z
            .object({
              deviceId: z.string().min(1),
              side: z.string().optional(),
              specialization: z.string().optional(),
            })
            .passthrough(),
          currentLevel: z.number(),
          currentDeviceLevel: z.number().optional(),
          overrideLevels: z.record(z.string(), z.number()).optional(),
          currentState: z
            .object({
              type: z.string(),
              started: z.string().optional(),
              instance: z
                .object({
                  timestamp: z.string().optional(),
                  startedFrom: z.string().optional(),
                })
                .passthrough()
                .optional(),
            })
            .passthrough(),
          smart: z
            .object({
              bedTimeLevel: NumericLevelSchema.optional(),
              initialSleepLevel: NumericLevelSchema.optional(),
              finalSleepLevel: NumericLevelSchema.optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough(),
    ),
    temperatureSettings: z
      .array(
        z
          .object({
            name: z.string(),
            bedTimeLevel: NumericLevelSchema.optional(),
            initialSleepLevel: NumericLevelSchema.optional(),
            finalSleepLevel: NumericLevelSchema.optional(),
          })
          .passthrough(),
      )
      .optional(),
    nextScheduledTimestamp: z.string().optional(),
    schedules: z.array(TemperatureScheduleSchema).optional(),
    currentSchedule: TemperatureScheduleSchema.optional(),
    nextSchedule: TemperatureScheduleSchema.optional(),
  })
  .passthrough();

export const TemperatureEventsResponseSchema = z
  .object({
    events: z.array(
      z
        .object({
          eventTime: IsoDateTimeSchema,
          actionType: z.string(),
          deviceId: z.string(),
          currentPhase: z.string().optional(),
          previousPhase: z.string().optional(),
          currentLevel: z.number().optional(),
          previousLevel: z.number().optional(),
          currentBedTime: NumericLevelSchema.optional(),
          currentInitialSleep: NumericLevelSchema.optional(),
          currentFinalSleep: NumericLevelSchema.optional(),
          previousBedTime: NumericLevelSchema.optional(),
          previousInitialSleep: NumericLevelSchema.optional(),
          previousFinalSleep: NumericLevelSchema.optional(),
          previousSchedules: z.array(TemperatureScheduleSchema).optional(),
          currentSchedules: z.array(TemperatureScheduleSchema).optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const TimeSeriesPointSchema = z.tuple([IsoDateTimeSchema, z.number()]);
const SleepStageSchema = z
  .object({
    stage: z.string(),
    duration: z.number(),
  })
  .passthrough();
const SleepStageSummarySchema = z
  .object({
    totalDuration: z.number().optional(),
    sleepDuration: z.number().optional(),
    outDuration: z.number().optional(),
    awakeDuration: z.number().optional(),
    lightDuration: z.number().optional(),
    deepDuration: z.number().optional(),
    remDuration: z.number().optional(),
    awakeBeforeSleepDuration: z.number().optional(),
    awakeBetweenSleepDuration: z.number().optional(),
    awakeAfterSleepDuration: z.number().optional(),
    outBetweenSleepDuration: z.number().optional(),
    wasoDuration: z.number().optional(),
    deepPercentOfSleep: z.number().optional(),
    remPercentOfSleep: z.number().optional(),
    lightPercentOfSleep: z.number().optional(),
  })
  .passthrough();
export const SleepIntervalSchema = z
  .object({
    id: z.string(),
    deviceTimeAtUpdate: IsoDateTimeSchema.optional(),
    ts: IsoDateTimeSchema,
    score: z.number().optional(),
    duration: z.number().optional(),
    sleepStart: IsoDateTimeSchema.optional(),
    sleepEnd: IsoDateTimeSchema.optional(),
    timezone: z.string().optional(),
    sleepAlgorithmVersion: z.string().optional(),
    presenceAlgorithmVersion: z.string().optional(),
    hrvAlgorithmVersion: z.string().optional(),
    stageSummary: SleepStageSummarySchema.optional(),
    stages: z.array(SleepStageSchema).optional(),
    snoring: z
      .array(
        z
          .object({
            intensity: z.string(),
            duration: z.number(),
          })
          .passthrough(),
      )
      .optional(),
    timeseries: z.record(z.string(), z.array(TimeSeriesPointSchema)).optional(),
  })
  .passthrough();

export const SleepIntervalSummarySchema = SleepIntervalSchema.omit({
  stages: true,
  snoring: true,
  timeseries: true,
});

export const SleepIntervalsResponseSchema = z
  .object({
    next: z.string().optional(),
    intervals: z.array(SleepIntervalSchema),
  })
  .passthrough();

export const AutopilotModeResponseSchema = z
  .object({
    autopilotMode: z.string().optional(),
    autopilotEnabled: z.boolean(),
    autopilotOptions: z
      .object({
        ambientTempEnabled: z.boolean().optional(),
        llmEnabled: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const TemperatureToolResultSchema = z
  .object({
    userId: z.string().min(1),
    settings: ClientTemperatureStateSchema,
    overview: TemperatureOverviewSchema,
  })
  .passthrough();

export const TemperatureEventsToolResultSchema = z
  .object({
    userId: z.string().min(1),
    from: IsoDateTimeSchema,
    events: TemperatureEventsResponseSchema.shape.events,
  })
  .passthrough();

export const SleepIntervalsToolResultSchema = z
  .object({
    userId: z.string().min(1),
    pagesFetched: z.number().int().min(1),
    next: z.string().nullable(),
    intervals: SleepIntervalsResponseSchema.shape.intervals,
  })
  .passthrough();

export const LatestSleepSummarySchema = z.object({
  sleepStart: IsoDateTimeSchema,
  sleepEnd: IsoDateTimeSchema,
  sleepDuration: z.number().nonnegative(),
  deepPct: z.number().min(0).max(1),
  remPct: z.number().min(0).max(1),
  lightPct: z.number().min(0).max(1),
});

export const PermanentBedtimeToolResultSchema = z
  .object({
    userId: z.string().min(1),
    scheduleId: z.string().min(1),
    bedtimeLevel: NumericLevelSchema,
    schedule: ClientTemperatureStateSchema,
    overview: TemperatureOverviewSchema,
  })
  .passthrough();

export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
export type DeviceResponse = z.infer<typeof DeviceResponseSchema>;
export type ClientTemperatureState = z.infer<typeof ClientTemperatureStateSchema>;
export type TemperatureOverview = z.infer<typeof TemperatureOverviewSchema>;
export type TemperatureEventsResponse = z.infer<typeof TemperatureEventsResponseSchema>;
export type SleepIntervalsResponse = z.infer<typeof SleepIntervalsResponseSchema>;
export type AutopilotModeResponse = z.infer<typeof AutopilotModeResponseSchema>;
export type SleepInterval = z.infer<typeof SleepIntervalSchema>;
export type SleepIntervalSummary = z.infer<typeof SleepIntervalSummarySchema>;
export type LatestSleepSummary = z.infer<typeof LatestSleepSummarySchema>;
