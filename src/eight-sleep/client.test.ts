import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../config.js";
import { EightSleepClient, EightSleepNetworkError, EightSleepResponseParseError } from "./client.js";

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function installFetchMock(handler: (call: FetchCall) => Promise<Response> | Response): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | string, init?: RequestInit) => {
    const url = input instanceof URL ? input.toString() : String(input);
    return handler({ url, init });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("EightSleepClient attaches headers to authenticated requests", async () => {
  const restoreFetch = installFetchMock(({ url, init }) => {
    assert.equal(url, "https://client-api.8slp.net/v1/users/me");
    assert.equal(init?.method, "GET");

    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer token-123");
    assert.equal(headers["X-Client-Device-Id"], "device-123");
    assert.equal(headers["X-Client-App-Version"], "7.46.0");
    assert.equal(headers.Accept, "application/json");
    assert.equal(headers["Content-Type"], undefined);
    assert.match(headers["X-Client-Request-Id"] ?? "", /^[0-9a-f-]{36}$/u);

    return jsonResponse({
      user: {
        userId: "user-123",
        email: "user@example.com",
        currentDevice: {
          id: "device-abc",
        },
      },
    });
  });

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_ACCESS_TOKEN: "token-123",
        EIGHT_SLEEP_CLIENT_DEVICE_ID: "device-123",
      }),
    );

    const currentUser = await client.getCurrentUser();
    assert.equal(currentUser.user.userId, "user-123");
  } finally {
    restoreFetch();
  }
});

test("EightSleepClient coalesces concurrent password-grant auth calls", async () => {
  let authCalls = 0;
  const restoreFetch = installFetchMock(async ({ url }) => {
    if (url === "https://auth-api.8slp.net/v1/tokens") {
      authCalls += 1;
      return jsonResponse({
        access_token: "fresh-token",
        userId: "user-123",
        expires_in: 7200,
      });
    }

    if (url === "https://client-api.8slp.net/v1/users/me") {
      return jsonResponse({
        user: {
          userId: "user-123",
          email: "user@example.com",
          currentDevice: {
            id: "device-abc",
          },
        },
      });
    }

    if (url.startsWith("https://app-api.8slp.net/v1/users/user-123/temp-events?from=")) {
      return jsonResponse({
        events: [],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_EMAIL: "user@example.com",
        EIGHT_SLEEP_PASSWORD: "secret",
        EIGHT_SLEEP_CLIENT_ID: "client-id",
        EIGHT_SLEEP_CLIENT_SECRET: "client-secret",
        EIGHT_SLEEP_USER_ID: "user-123",
      }),
    );

    await Promise.all([
      client.getCurrentUser(),
      client.getTemperatureEvents({
        userId: "user-123",
      }),
    ]);

    assert.equal(authCalls, 1);
  } finally {
    restoreFetch();
  }
});

test("EightSleepClient retries once after a 401 when refresh credentials are available", async () => {
  const authorizations: string[] = [];
  let currentUserCalls = 0;

  const restoreFetch = installFetchMock(async ({ url, init }) => {
    if (url === "https://client-api.8slp.net/v1/users/me") {
      currentUserCalls += 1;
      const headers = init?.headers as Record<string, string>;
      assert.ok(headers.Authorization);
      authorizations.push(headers.Authorization);

      if (currentUserCalls === 1) {
        return new Response("unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        });
      }

      return jsonResponse({
        user: {
          userId: "user-123",
          email: "user@example.com",
          currentDevice: {
            id: "device-abc",
          },
        },
      });
    }

    if (url === "https://auth-api.8slp.net/v1/tokens") {
      return jsonResponse({
        access_token: "fresh-token",
        userId: "user-123",
        expires_in: 7200,
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_ACCESS_TOKEN: "stale-token",
        EIGHT_SLEEP_EMAIL: "user@example.com",
        EIGHT_SLEEP_PASSWORD: "secret",
        EIGHT_SLEEP_CLIENT_ID: "client-id",
        EIGHT_SLEEP_CLIENT_SECRET: "client-secret",
      }),
    );

    const currentUser = await client.getCurrentUser();
    assert.equal(currentUser.user.userId, "user-123");
    assert.deepEqual(authorizations, ["Bearer stale-token", "Bearer fresh-token"]);
  } finally {
    restoreFetch();
  }
});

test("EightSleepClient surfaces invalid JSON responses clearly", async () => {
  const restoreFetch = installFetchMock(() =>
    new Response("not-json", {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }),
  );

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_ACCESS_TOKEN: "token-123",
      }),
    );

    await assert.rejects(
      () => client.getCurrentUser(),
      (error: unknown) =>
        error instanceof EightSleepResponseParseError &&
        error.message.includes("returned invalid JSON"),
    );
  } finally {
    restoreFetch();
  }
});

test("EightSleepClient turns temperature off with the captured temperature write shape", async () => {
  const restoreFetch = installFetchMock(({ url, init }) => {
    if (url === "https://app-api.8slp.net/v1/users/user-123/temperature/pod?ignoreDeviceErrors=false") {
      assert.equal(init?.method, "PUT");
      assert.equal(init?.body, JSON.stringify({ currentState: { type: "off" } }));

      const headers = init?.headers as Record<string, string>;
      assert.equal(headers.Authorization, "Bearer token-123");
      assert.equal(headers["Content-Type"], "application/json");

      return jsonResponse({
        devices: [
          {
            device: {
              deviceId: "device-abc",
            },
            currentLevel: 0,
            currentState: {
              type: "off",
            },
          },
        ],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_ACCESS_TOKEN: "token-123",
        EIGHT_SLEEP_USER_ID: "user-123",
      }),
    );

    const response = await client.turnOffTemperature();
    assert.equal(response.devices[0]?.currentState.type, "off");
  } finally {
    restoreFetch();
  }
});

test("EightSleepClient saves bedtime to the schedule and clears overrides", async () => {
  const restoreFetch = installFetchMock(({ url, init }) => {
    if (url === "https://client-api.8slp.net/v1/users/user-123/temperature") {
      return jsonResponse({
        currentLevel: -27,
        settings: {
          scheduleType: "smart",
          smart: {
            bedTimeLevel: -22,
            initialSleepLevel: -31,
            finalSleepLevel: -20,
          },
          schedules: [
            {
              id: "schedule-1",
              enabled: true,
              time: "21:30:00",
              days: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ],
              startSettings: {
                bedtime: -17,
              },
            },
          ],
        },
        currentState: {
          type: "smart:bedtime",
        },
        currentSchedule: {
          id: "schedule-1",
          enabled: true,
          time: "21:30:00",
          days: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          startSettings: {
            bedtime: -17,
          },
        },
      });
    }

    if (url === "https://app-api.8slp.net/v1/users/user-123/bedtime?jsonErrorResponses=true") {
      assert.equal(init?.method, "PUT");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        schedules: [
          {
            id: "schedule-1",
            enabled: true,
            time: "21:30:00",
            days: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
            startSettings: {
              bedtime: -37,
            },
          },
        ],
      });

      return jsonResponse({
        currentLevel: -37,
        settings: {
          scheduleType: "smart",
          smart: {
            bedTimeLevel: -22,
            initialSleepLevel: -31,
            finalSleepLevel: -20,
          },
          schedules: [
            {
              id: "schedule-1",
              enabled: true,
              time: "21:30:00",
              days: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ],
              startSettings: {
                bedtime: -37,
              },
            },
          ],
        },
        currentState: {
          type: "smart:bedtime",
        },
        currentSchedule: {
          id: "schedule-1",
          enabled: true,
          time: "21:30:00",
          days: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          startSettings: {
            bedtime: -37,
          },
        },
        overrideLevels: {
          bedtime: -37,
        },
      });
    }

    if (url === "https://app-api.8slp.net/v1/users/user-123/temperature/pod?ignoreDeviceErrors=false") {
      assert.equal(init?.method, "PUT");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        smart: {
          bedTimeLevel: -22,
          initialSleepLevel: -31,
          finalSleepLevel: -20,
        },
        overrideLevels: {},
      });

      return jsonResponse({
        devices: [
          {
            device: {
              deviceId: "device-abc",
            },
            currentLevel: -37,
            overrideLevels: {},
            currentState: {
              type: "smart:bedtime",
            },
            smart: {
              bedTimeLevel: -22,
              initialSleepLevel: -31,
              finalSleepLevel: -20,
            },
          },
        ],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_ACCESS_TOKEN: "token-123",
        EIGHT_SLEEP_USER_ID: "user-123",
      }),
    );

    const response = await client.setBedtimeSchedule({
      bedtimeLevel: -37,
    });

    assert.equal(response.scheduleId, "schedule-1");
    assert.equal(response.bedtimeLevel, -37);
    assert.equal(response.schedule.currentSchedule?.startSettings?.bedtime, -37);
    assert.deepEqual(response.overview.devices[0]?.overrideLevels, {});
  } finally {
    restoreFetch();
  }
});

test("EightSleepClient surfaces schema mismatches clearly", async () => {
  const restoreFetch = installFetchMock(() =>
    jsonResponse({
      wrong: true,
    }),
  );

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_ACCESS_TOKEN: "token-123",
      }),
    );

    await assert.rejects(
      () => client.getCurrentUser(),
      (error: unknown) =>
        error instanceof EightSleepResponseParseError &&
        error.message.includes("did not match the expected schema"),
    );
  } finally {
    restoreFetch();
  }
});

test("EightSleepClient wraps fetch rejections as network errors", async () => {
  const restoreFetch = installFetchMock(() => {
    throw new Error("socket hang up");
  });

  try {
    const client = new EightSleepClient(
      loadConfig({
        EIGHT_SLEEP_ACCESS_TOKEN: "token-123",
      }),
    );

    await assert.rejects(
      () => client.getCurrentUser(),
      (error: unknown) =>
        error instanceof EightSleepNetworkError &&
        error.message.includes("network request failed") &&
        error.message.includes("/users/me"),
    );
  } finally {
    restoreFetch();
  }
});
