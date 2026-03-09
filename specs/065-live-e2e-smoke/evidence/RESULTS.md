# Live E2E Smoke Test Results

**Date**: 2026-03-08T19:52:00Z
**Target**: PiOrchestrator via Vite proxy (API→localhost:8082, RPC→localhost:8081)
**Pi Host**: delicasa-pi-001 (192.168.1.124)
**Duration**: 19.5s
**Status**: **PASS**

## Test Results

| # | Test | Status | Duration |
|---|------|--------|----------|
| 1 | Live RPC Smoke: Sessions > should render operations view from live RPC | PASS | 2.1s |
| 2 | Live RPC Smoke: Sessions > should drill into session detail if sessions exist | SKIPPED | — |
| 3 | Live RPC Smoke: Cameras > should render camera list from live RPC | PASS | 1.3s |
| 4 | Live RPC Smoke: Cameras > should show camera health metrics if cameras exist | PASS | 3.4s |
| 5 | Live RPC Smoke: Evidence > should display evidence when session has captures | SKIPPED | — |
| 6 | Live RPC Smoke: REST endpoints > should load system info from live API | PASS | 1.6s |
| 7 | Live RPC Smoke: No Console Errors > should not produce unhandled console errors during RPC navigation | PASS | 1.6s |

**Summary**: 5 passed, 2 skipped, 0 failed

## Skipped Tests

Tests 2 and 5 were skipped because no active sessions exist on the Pi at test time. These tests include pre-flight checks that correctly detect the absence of session data and skip gracefully — this is expected behavior, not a failure.

## Environment

- **Pi Host**: delicasa-pi-001 (192.168.1.124)
- **Pi Status**: healthy (CPU 0%, Memory 12%, Temp 55°C, Uptime 5.4 days)
- **Access Method**: SSH tunnel (localhost:8082→Pi:8082, localhost:8081→Pi:8081)
- **Browser**: Chromium (Playwright 1.57.0)
- **Playwright Workers**: 1
- **Test Runner**: `LIVE_RPC=1 VITE_PI_HOST=localhost npx playwright test --project=live-rpc`

## Screenshots

| File | Description |
|------|-------------|
| `screenshots/live-rpc-sessions-list.png` | Operations tab with session list (empty — no active sessions) |
| `screenshots/live-rpc-camera-list.png` | Camera Management tab with paired cameras |
| `screenshots/live-rpc-camera-health.png` | Camera card with health metrics (RSSI, heap, uptime) |
| `screenshots/live-rpc-system-info.png` | System tab with real Pi metrics |

## Verdict

**PiDashboard LIVE E2E PASS** — All RPC and REST smoke tests pass against the live PiOrchestrator stack. Sessions and evidence tests skip correctly when no session data exists. Camera and system endpoints return real data and render without console errors.
