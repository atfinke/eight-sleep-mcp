import { randomUUID } from "node:crypto";

import { z } from "zod";

const envSchema = z.object({
  EIGHT_SLEEP_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  EIGHT_SLEEP_EMAIL: z.string().trim().min(1).optional(),
  EIGHT_SLEEP_PASSWORD: z.string().trim().min(1).optional(),
  EIGHT_SLEEP_CLIENT_ID: z.string().trim().min(1).optional(),
  EIGHT_SLEEP_CLIENT_SECRET: z.string().trim().min(1).optional(),
  EIGHT_SLEEP_USER_ID: z.string().trim().min(1).optional(),
  EIGHT_SLEEP_CLIENT_DEVICE_ID: z.string().trim().min(1).optional(),
  EIGHT_SLEEP_CLIENT_APP_VERSION: z.string().trim().min(1).default("7.46.0"),
  EIGHT_SLEEP_USER_AGENT: z
    .string()
    .trim()
    .min(1)
    .default("iOS App - 7.46.0/58 - iPhone18,1 - iOS 26.4"),
  EIGHT_SLEEP_ACCEPT_LANGUAGE: z.string().trim().min(1).default("en-US;q=1.0"),
  EIGHT_SLEEP_IGNORE_DEVICE_ERRORS_DEFAULT: z.enum(["true", "false"]).default("false"),
  EIGHT_SLEEP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(15_000),
});

export interface EightSleepConfig {
  accessToken: string | null;
  userId: string | null;
  auth:
    | {
        email: string;
        password: string;
        clientId: string;
        clientSecret: string;
      }
    | null;
  baseUrls: {
    auth: string;
    client: string;
    app: string;
  };
  headers: {
    clientDeviceId: string;
    clientSessionId: string;
    appVersion: string;
    userAgent: string;
    acceptLanguage: string;
  };
  defaults: {
    ignoreDeviceErrors: boolean;
  };
  request: {
    timeoutMs: number;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EightSleepConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Eight Sleep MCP configuration: ${message}`);
  }

  const hasAccessToken = Boolean(parsed.data.EIGHT_SLEEP_ACCESS_TOKEN);
  const providedPasswordGrantFields = [
    parsed.data.EIGHT_SLEEP_EMAIL,
    parsed.data.EIGHT_SLEEP_PASSWORD,
    parsed.data.EIGHT_SLEEP_CLIENT_ID,
    parsed.data.EIGHT_SLEEP_CLIENT_SECRET,
  ].filter(Boolean).length;

  if (!hasAccessToken && providedPasswordGrantFields === 0) {
    throw new Error(
      "Invalid Eight Sleep MCP configuration: provide EIGHT_SLEEP_ACCESS_TOKEN or the full password-grant credential set",
    );
  }

  if (providedPasswordGrantFields > 0 && providedPasswordGrantFields < 4) {
    throw new Error(
      "Invalid Eight Sleep MCP configuration: EIGHT_SLEEP_EMAIL, EIGHT_SLEEP_PASSWORD, EIGHT_SLEEP_CLIENT_ID, and EIGHT_SLEEP_CLIENT_SECRET must all be set together",
    );
  }

  return {
    accessToken: parsed.data.EIGHT_SLEEP_ACCESS_TOKEN ?? null,
    userId: parsed.data.EIGHT_SLEEP_USER_ID ?? null,
    auth:
      providedPasswordGrantFields === 4
        ? {
            email: parsed.data.EIGHT_SLEEP_EMAIL!,
            password: parsed.data.EIGHT_SLEEP_PASSWORD!,
            clientId: parsed.data.EIGHT_SLEEP_CLIENT_ID!,
            clientSecret: parsed.data.EIGHT_SLEEP_CLIENT_SECRET!,
          }
        : null,
    baseUrls: {
      auth: "https://auth-api.8slp.net/v1",
      client: "https://client-api.8slp.net/v1",
      app: "https://app-api.8slp.net/v1",
    },
    headers: {
      clientDeviceId: parsed.data.EIGHT_SLEEP_CLIENT_DEVICE_ID ?? randomUUID(),
      clientSessionId: randomUUID(),
      appVersion: parsed.data.EIGHT_SLEEP_CLIENT_APP_VERSION,
      userAgent: parsed.data.EIGHT_SLEEP_USER_AGENT,
      acceptLanguage: parsed.data.EIGHT_SLEEP_ACCEPT_LANGUAGE,
    },
    defaults: {
      ignoreDeviceErrors: parsed.data.EIGHT_SLEEP_IGNORE_DEVICE_ERRORS_DEFAULT === "true",
    },
    request: {
      timeoutMs: parsed.data.EIGHT_SLEEP_REQUEST_TIMEOUT_MS,
    },
  };
}
