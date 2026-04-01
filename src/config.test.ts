import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "./config.js";

test("loadConfig accepts access-token-only configuration", () => {
  const config = loadConfig({
    EIGHT_SLEEP_ACCESS_TOKEN: "token-1",
  });

  assert.equal(config.accessToken, "token-1");
  assert.equal(config.auth, null);
  assert.equal(config.userId, null);
  assert.equal(config.defaults.ignoreDeviceErrors, false);
  assert.equal(config.request.timeoutMs, 15_000);
  assert.match(config.headers.clientDeviceId, /^[0-9a-f-]{36}$/u);
  assert.match(config.headers.clientSessionId, /^[0-9a-f-]{36}$/u);
});

test("loadConfig rejects partial password grant configuration", () => {
  assert.throws(
    () =>
      loadConfig({
        EIGHT_SLEEP_EMAIL: "user@example.com",
        EIGHT_SLEEP_PASSWORD: "secret",
      }),
    /must all be set together/u,
  );
});

test("loadConfig accepts full password grant configuration", () => {
  const config = loadConfig({
    EIGHT_SLEEP_EMAIL: "user@example.com",
    EIGHT_SLEEP_PASSWORD: "secret",
    EIGHT_SLEEP_CLIENT_ID: "client-id",
    EIGHT_SLEEP_CLIENT_SECRET: "client-secret",
    EIGHT_SLEEP_USER_ID: "user-123",
    EIGHT_SLEEP_CLIENT_DEVICE_ID: "device-123",
    EIGHT_SLEEP_IGNORE_DEVICE_ERRORS_DEFAULT: "true",
  });

  assert.deepEqual(config.auth, {
    email: "user@example.com",
    password: "secret",
    clientId: "client-id",
    clientSecret: "client-secret",
  });
  assert.equal(config.userId, "user-123");
  assert.equal(config.headers.clientDeviceId, "device-123");
  assert.equal(config.defaults.ignoreDeviceErrors, true);
  assert.equal(config.request.timeoutMs, 15_000);
});

test("loadConfig accepts a custom request timeout", () => {
  const config = loadConfig({
    EIGHT_SLEEP_ACCESS_TOKEN: "token-1",
    EIGHT_SLEEP_REQUEST_TIMEOUT_MS: "5000",
  });

  assert.equal(config.request.timeoutMs, 5000);
});
