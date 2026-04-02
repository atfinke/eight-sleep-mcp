# Eight Sleep MCP

Unofficial MCP server for Eight Sleep, reverse-engineered from observed mobile app traffic and validated against live device behavior.

Built entirely by OpenAI GPT-5.4 via Codex.

## Overview

This project exposes Eight Sleep account, device, temperature, and sleep data through MCP, and supports the core temperature controls confirmed from live app traffic.

Supported capabilities include:

- reading account, device, temperature, recent temperature events, and sleep intervals
- reading a compact summary of the most recent sleep interval without timeseries payloads
- fetching compact interval pages with `get_sleep_intervals` `view: "summary"` when full timeseries are not needed
- resuming smart temperature mode
- turning temperature control off
- applying a temporary bedtime temperature change
- saving a bedtime temperature change to the active schedule
- updating saved smart temperature levels
- toggling Autopilot

## Behavior Model

- Temporary bedtime changes are sent as override values to the pod temperature endpoint.
- Permanent bedtime changes update the bedtime schedule, then clear the temporary override.
- Smart temperature profile editing is separate from bedtime schedule editing.
- Turning temperature off disables active heating and cooling; it does not power down the hardware.

## API Coverage

The current implementation uses confirmed requests across `auth-api`, `client-api`, and `app-api`, including authentication, user and device reads, temperature state, temperature events, bedtime schedule updates, pod temperature control, and Autopilot mode changes.

## Sleep Data Guidance

For LLM-facing clients, use the compact sleep tools by default.

Golden paths:

- Use `get_latest_sleep_summary` for the most recent night when you only need compact summary metrics.
- Use `get_sleep_intervals` with `view: "summary"` when you need multiple recent intervals but do not need `timeseries`, `stages`, or `snoring`.

Example `get_latest_sleep_summary` response:

```json
{
  "sleepStart": "2026-04-02T03:38:30.000Z",
  "sleepEnd": "2026-04-02T15:35:30.000Z",
  "sleepDuration": 34380,
  "deepPct": 0.12,
  "remPct": 0.24,
  "lightPct": 0.64
}
```

Example compact interval call:

```json
{
  "tool": "get_sleep_intervals",
  "arguments": {
    "pages": 3,
    "view": "summary"
  }
}
```

`sleepStart` and `sleepEnd` are returned as UTC ISO timestamps. Convert them to the user's local timezone in the caller if you need local bedtime or wake time.

## Setup

```bash
npm install
cp .env.example .env
npm test
npm run build
```

Configuration supports either:

- `EIGHT_SLEEP_ACCESS_TOKEN`
- or `EIGHT_SLEEP_EMAIL`, `EIGHT_SLEEP_PASSWORD`, `EIGHT_SLEEP_CLIENT_ID`, and `EIGHT_SLEEP_CLIENT_SECRET`

Optional values:

- `EIGHT_SLEEP_USER_ID`
- `EIGHT_SLEEP_CLIENT_DEVICE_ID`
- `EIGHT_SLEEP_REQUEST_TIMEOUT_MS`

## MCP Bundle

For bundle-aware clients, a `manifest.json` is included and a local MCP bundle can be built with:

```bash
npm run package:mcpb
```

That produces an `.mcpb` file for one-click installation in clients that support MCP bundles.

## MCP Setup

The server runs over stdio.

Example client configuration for the built server:

```json
{
  "mcpServers": {
    "eight-sleep": {
      "command": "node",
      "args": ["/absolute/path/to/eight-sleep-mcp/dist/index.js"],
      "cwd": "/absolute/path/to/eight-sleep-mcp"
    }
  }
}
```

For local development without building first:

```json
{
  "mcpServers": {
    "eight-sleep": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/absolute/path/to/eight-sleep-mcp"
    }
  }
}
```

If a client does not support `cwd`, pass the Eight Sleep environment variables directly in the client configuration instead of relying on `.env`.
