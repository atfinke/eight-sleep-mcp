import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { EightSleepConfig } from "../config.js";
import { selectLatestSleepInterval, summarizeSleepInterval } from "./sleepSummary.js";
import {
  AuthTokenResponseSchema,
  AutopilotModeResponseSchema,
  ClientTemperatureStateSchema,
  CurrentUserResponseSchema,
  DeviceResponseSchema,
  SleepIntervalsResponseSchema,
  TemperatureEventsResponseSchema,
  TemperatureOverviewSchema,
} from "./types.js";
import type { SleepIntervalsResponse } from "./types.js";

type ApiBase = "auth" | "client" | "app";

interface RequestOptions<TSchema extends z.ZodTypeAny> {
  base: ApiBase;
  path: string;
  schema: TSchema;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
}

interface CachedAuthState {
  accessToken: string | null;
  userId: string | null;
  expiresAt: number | null;
}

export class EightSleepResponseParseError extends Error {
  constructor(message: string, readonly url: string) {
    super(message);
    this.name = "EightSleepResponseParseError";
  }
}

export class EightSleepApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(message);
    this.name = "EightSleepApiError";
  }
}

export class EightSleepNetworkError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly cause: unknown,
  ) {
    super(message, {
      cause: cause instanceof Error ? cause : undefined,
    });
    this.name = "EightSleepNetworkError";
  }
}

export class EightSleepClient {
  private readonly authState: CachedAuthState;
  private authPromise: Promise<string> | null = null;

  constructor(private readonly config: EightSleepConfig) {
    this.authState = {
      accessToken: config.accessToken,
      userId: config.userId,
      expiresAt: null,
    };
  }

  async getCurrentUser() {
    return this.requestJson({
      base: "client",
      path: "/users/me",
      schema: CurrentUserResponseSchema,
    });
  }

  async getResolvedUserId(explicitUserId?: string): Promise<string> {
    if (explicitUserId) {
      return explicitUserId;
    }

    if (this.authState.userId) {
      return this.authState.userId;
    }

    const currentUser = await this.getCurrentUser();
    this.authState.userId = currentUser.user.userId;
    return currentUser.user.userId;
  }

  async getPrimaryDeviceId(): Promise<string> {
    const currentUser = await this.getCurrentUser();
    const deviceId = currentUser.user.currentDevice?.id ?? currentUser.user.devices?.[0];

    if (!deviceId) {
      throw new Error("Eight Sleep did not return a current device for the authenticated user");
    }

    return deviceId;
  }

  async getDevice(deviceId?: string) {
    const resolvedDeviceId = deviceId ?? (await this.getPrimaryDeviceId());
    const response = await this.requestJson({
      base: "client",
      path: `/devices/${encodeURIComponent(resolvedDeviceId)}`,
      schema: DeviceResponseSchema,
    });

    return response.result;
  }

  async getTemperature(userId?: string) {
    const resolvedUserId = await this.getResolvedUserId(userId);
    const [settings, overview] = await Promise.all([
      this.getClientTemperatureState(resolvedUserId),
      this.requestJson({
        base: "app",
        path: `/users/${encodeURIComponent(resolvedUserId)}/temperature/all`,
        schema: TemperatureOverviewSchema,
      }),
    ]);

    return {
      userId: resolvedUserId,
      settings,
      overview,
    };
  }

  async getTemperatureEvents(input?: {
    userId?: string | undefined;
    from?: string | undefined;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input?.userId);
    const from = input?.from ?? new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({ from });

    const response = await this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/temp-events?${params.toString()}`,
      schema: TemperatureEventsResponseSchema,
    });

    return {
      userId: resolvedUserId,
      from,
      ...response,
    };
  }

  async getSleepIntervals(input?: {
    userId?: string | undefined;
    next?: string | undefined;
    pages?: number | undefined;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input?.userId);
    const pages = Math.min(Math.max(input?.pages ?? 1, 1), 5);
    const intervals: SleepIntervalsResponse["intervals"] = [];
    let nextCursor = input?.next ?? null;
    let pagesFetched = 0;

    for (let index = 0; index < pages; index += 1) {
      const params = new URLSearchParams();

      if (nextCursor) {
        params.set("next", nextCursor);
      }

      const path = params.size
        ? `/users/${encodeURIComponent(resolvedUserId)}/intervals?${params.toString()}`
        : `/users/${encodeURIComponent(resolvedUserId)}/intervals`;

      const response = await this.requestJson({
        base: "client",
        path,
        schema: SleepIntervalsResponseSchema,
      });

      intervals.push(...response.intervals);
      pagesFetched += 1;

      if (!response.next) {
        nextCursor = null;
        break;
      }

      nextCursor = response.next;
    }

    return {
      userId: resolvedUserId,
      pagesFetched,
      next: nextCursor,
      intervals,
    };
  }

  async getLatestSleepSummary(input?: {
    userId?: string | undefined;
  }) {
    const response = await this.getSleepIntervals({
      userId: input?.userId,
      pages: 1,
    });
    const latestInterval = selectLatestSleepInterval(response.intervals);

    if (!latestInterval) {
      throw new Error("Eight Sleep did not return any sleep intervals for the requested user");
    }

    return summarizeSleepInterval(latestInterval);
  }

  async resumeSmartTemperature(input?: {
    userId?: string | undefined;
    ignoreDeviceErrors?: boolean | undefined;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input?.userId);
    return this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/temperature/pod?ignoreDeviceErrors=${String(
        input?.ignoreDeviceErrors ?? this.config.defaults.ignoreDeviceErrors,
      )}`,
      method: "PUT",
      body: {
        currentState: {
          type: "smart",
        },
      },
      schema: TemperatureOverviewSchema,
    });
  }

  async turnOffTemperature(input?: {
    userId?: string | undefined;
    ignoreDeviceErrors?: boolean | undefined;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input?.userId);
    return this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/temperature/pod?ignoreDeviceErrors=${String(
        input?.ignoreDeviceErrors ?? this.config.defaults.ignoreDeviceErrors,
      )}`,
      method: "PUT",
      body: {
        currentState: {
          type: "off",
        },
      },
      schema: TemperatureOverviewSchema,
    });
  }

  async setBedtimeSchedule(input: {
    userId?: string | undefined;
    bedtimeLevel: number;
    scheduleId?: string | undefined;
    ignoreDeviceErrors?: boolean | undefined;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input.userId);
    const currentTemperature = await this.getClientTemperatureState(resolvedUserId);
    const schedules = currentTemperature.settings.schedules ?? [];

    if (schedules.length === 0) {
      throw new Error("Eight Sleep did not return any bedtime schedules for the authenticated user");
    }

    const selectedScheduleId = input.scheduleId ?? currentTemperature.currentSchedule?.id ?? schedules[0]?.id;

    if (!selectedScheduleId) {
      throw new Error(
        "Eight Sleep returned bedtime schedules, but none exposed a usable schedule ID for a permanent bedtime update",
      );
    }

    let matchedSelectedSchedule = false;
    const normalizedSchedules = schedules.map((schedule) => {
      if (!schedule.id) {
        throw new Error(
          "Eight Sleep returned a bedtime schedule without an ID, which cannot be updated safely",
        );
      }

      if (!schedule.time || !schedule.days) {
        throw new Error(
          `Eight Sleep returned bedtime schedule ${schedule.id} without the required time or days fields`,
        );
      }

      const bedtime =
        schedule.id === selectedScheduleId ? input.bedtimeLevel : schedule.startSettings?.bedtime;

      if (schedule.id === selectedScheduleId) {
        matchedSelectedSchedule = true;
      }

      return {
        id: schedule.id,
        time: schedule.time,
        days: schedule.days,
        enabled: schedule.enabled ?? true,
        ...(typeof bedtime === "number"
          ? {
              startSettings: {
                bedtime,
              },
            }
          : {}),
      };
    });

    if (!matchedSelectedSchedule) {
      throw new Error(
        `Eight Sleep did not return the requested bedtime schedule ${selectedScheduleId}`,
      );
    }

    const schedule = await this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/bedtime?jsonErrorResponses=true`,
      method: "PUT",
      body: {
        schedules: normalizedSchedules,
      },
      schema: ClientTemperatureStateSchema,
    });

    const smart = schedule.settings.smart ?? currentTemperature.settings.smart;
    const body: Record<string, unknown> = {
      overrideLevels: {},
    };

    if (smart) {
      body.smart = smart;
    }

    const overview = await this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/temperature/pod?ignoreDeviceErrors=${String(
        input.ignoreDeviceErrors ?? this.config.defaults.ignoreDeviceErrors,
      )}`,
      method: "PUT",
      body,
      schema: TemperatureOverviewSchema,
    });

    return {
      userId: resolvedUserId,
      scheduleId: selectedScheduleId,
      bedtimeLevel: input.bedtimeLevel,
      schedule,
      overview,
    };
  }

  async setTemporaryBedtimeLevel(input: {
    userId?: string | undefined;
    bedtimeLevel: number;
    ignoreDeviceErrors?: boolean | undefined;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input.userId);
    return this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/temperature/pod?ignoreDeviceErrors=${String(
        input.ignoreDeviceErrors ?? this.config.defaults.ignoreDeviceErrors,
      )}`,
      method: "PUT",
      body: {
        overrideLevels: {
          bedTime: input.bedtimeLevel,
        },
      },
      schema: TemperatureOverviewSchema,
    });
  }

  async updateSmartTemperatureLevels(input: {
    userId?: string | undefined;
    bedTimeLevel: number;
    initialSleepLevel: number;
    finalSleepLevel: number;
    overrideBedtimeLevel?: number | undefined;
    ignoreDeviceErrors?: boolean | undefined;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input.userId);
    const body: Record<string, unknown> = {
      smart: {
        bedTimeLevel: input.bedTimeLevel,
        initialSleepLevel: input.initialSleepLevel,
        finalSleepLevel: input.finalSleepLevel,
      },
    };

    if (typeof input.overrideBedtimeLevel === "number") {
      body.overrideLevels = {
        bedTime: input.overrideBedtimeLevel,
      };
    }

    return this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/temperature/pod?ignoreDeviceErrors=${String(
        input.ignoreDeviceErrors ?? this.config.defaults.ignoreDeviceErrors,
      )}`,
      method: "PUT",
      body,
      schema: TemperatureOverviewSchema,
    });
  }

  async setAutopilotEnabled(input: {
    userId?: string | undefined;
    enabled: boolean;
  }) {
    const resolvedUserId = await this.getResolvedUserId(input.userId);
    return this.requestJson({
      base: "app",
      path: `/users/${encodeURIComponent(resolvedUserId)}/level-suggestions-mode`,
      method: "PUT",
      body: {
        autopilotEnabled: input.enabled,
      },
      schema: AutopilotModeResponseSchema,
    });
  }

  private async getAccessToken(): Promise<string> {
    if (
      this.authState.accessToken &&
      (!this.authState.expiresAt || Date.now() < this.authState.expiresAt)
    ) {
      return this.authState.accessToken;
    }

    if (!this.config.auth) {
      throw new Error(
        "Eight Sleep access token is missing or expired, and no password-grant credentials were configured for reauthentication",
      );
    }

    if (!this.authPromise) {
      this.authPromise = this.authenticateWithPasswordGrant().finally(() => {
        this.authPromise = null;
      });
    }

    return this.authPromise;
  }

  private async getClientTemperatureState(userId: string) {
    return this.requestJson({
      base: "client",
      path: `/users/${encodeURIComponent(userId)}/temperature`,
      schema: ClientTemperatureStateSchema,
    });
  }

  private async requestJson<TSchema extends z.ZodTypeAny>(
    options: RequestOptions<TSchema>,
    retried = false,
  ): Promise<z.infer<TSchema>> {
    const method = options.method ?? "GET";
    const authenticated = options.authenticated ?? true;
    const url = this.toUrl(options.base, options.path);
    const hasBody = options.body !== undefined;
    const headers = await this.buildHeaders(authenticated, hasBody);
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.request.timeoutMs),
    };

    if (hasBody) {
      init.body = JSON.stringify(options.body);
    }

    let response: Response;

    try {
      response = await fetch(url, init);
    } catch (error) {
      throw this.toNetworkError(error, url);
    }

    if (response.status === 401 && authenticated && !retried && this.config.auth) {
      this.authState.accessToken = null;
      this.authState.expiresAt = null;
      return this.requestJson(options, true);
    }

    if (!response.ok) {
      throw await this.toApiError(response, url);
    }

    const payload = await this.readJsonResponse(response, url);

    try {
      return options.schema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.issues
          .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
          .join("; ");
        throw new EightSleepResponseParseError(
          `Eight Sleep API response did not match the expected schema for ${url}: ${details}`,
          url,
        );
      }

      throw error;
    }
  }

  private async buildHeaders(
    authenticated: boolean,
    hasBody: boolean,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Accept-Language": this.config.headers.acceptLanguage,
      "User-Agent": this.config.headers.userAgent,
      "X-Client-App-Version": this.config.headers.appVersion,
      "X-Client-Device-Id": this.config.headers.clientDeviceId,
      "X-Client-Request-Id": randomUUID(),
      "X-Client-Session-Id": this.config.headers.clientSessionId,
    };

    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    if (authenticated) {
      headers.Authorization = `Bearer ${await this.getAccessToken()}`;
    }

    return headers;
  }

  private toUrl(base: ApiBase, path: string): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.config.baseUrls[base]}/${normalizedPath}`;
  }

  private async toApiError(response: Response, url: string): Promise<EightSleepApiError> {
    const body = await response.text();
    const trimmedBody = body.length > 500 ? `${body.slice(0, 500)}...` : body;
    return new EightSleepApiError(
      `Eight Sleep API request failed with ${response.status} ${response.statusText}`,
      response.status,
      url,
      trimmedBody,
    );
  }

  private async authenticateWithPasswordGrant(): Promise<string> {
    const response = await this.requestJson({
      base: "auth",
      path: "/tokens",
      method: "POST",
      body: {
        grant_type: "password",
        username: this.config.auth!.email,
        password: this.config.auth!.password,
        client_id: this.config.auth!.clientId,
        client_secret: this.config.auth!.clientSecret,
      },
      authenticated: false,
      schema: AuthTokenResponseSchema,
    });

    this.authState.accessToken = response.access_token;
    this.authState.userId = this.authState.userId ?? response.userId;
    this.authState.expiresAt = response.expires_in
      ? Date.now() + response.expires_in * 1000 - 60_000
      : null;

    return response.access_token;
  }

  private async readJsonResponse(response: Response, url: string): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      const preview = text.length > 200 ? `${text.slice(0, 200)}...` : text;
      throw new EightSleepResponseParseError(
        `Eight Sleep API returned invalid JSON for ${url}: ${preview}`,
        url,
      );
    }
  }

  private toNetworkError(error: unknown, url: string): EightSleepNetworkError {
    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        return new EightSleepNetworkError(
          `Eight Sleep API request timed out after ${this.config.request.timeoutMs}ms`,
          url,
          error,
        );
      }

      return new EightSleepNetworkError(
        `Eight Sleep API network request failed for ${url}: ${error.message}`,
        url,
        error,
      );
    }

    return new EightSleepNetworkError(
      `Eight Sleep API network request failed for ${url}`,
      url,
      error,
    );
  }
}
