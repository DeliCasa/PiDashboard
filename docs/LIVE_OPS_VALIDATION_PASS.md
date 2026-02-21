# PiDashboard Live Ops PASS Report

**Date**: 2026-02-21
**Validator**: Claude Code (automated E2E + manual API verification)
**Status**: **PASS**

## Configuration

| Parameter | Value |
|-----------|-------|
| **PiOrchestrator Base URL** | `http://192.168.1.124:8082` |
| **PiDashboard Dev Server** | `http://localhost:5173` (Vite proxy to Pi) |
| **PiOrchestrator Version** | Binary from 2026-02-21 17:16 (Spec 083 / commit `3ce66a4`) |
| **Session ID Verified** | `live-ops-1771697501` |
| **Container ID** | `019c34df-a56a-7d6c-84bf-99ffd06043ea` |
| **Camera** | `esp-1cdbd47a4f10` (ESP32-CAM, real hardware) |
| **Playwright Runner** | Docker `mcr.microsoft.com/playwright:v1.58.2-noble` |

## Session Creation

Fresh smoke session created via live container action API:

```
POST /api/v1/containers/019c34df-a56a-7d6c-84bf-99ffd06043ea/actions
  action: OPEN  -> completed (captureMs=987ms, actuationMs=5000ms)
  action: CLOSE -> completed (captureMs=670ms)
```

Session `live-ops-1771697501` produced 4 real evidence captures from the ESP32-CAM.

## Validation Results

### 1. Sessions List Loads (PASS)

- Operations tab navigated successfully
- API call to `/api/v1/sessions` returned 1 session
- Session card rendered with:
  - Session ID: `live-ops-1771697501`
  - Status badges: "Paired" + "Complete"
  - Container: `019c34df-a56a-7d6c-84bf-99ffd06043ea`
  - Started: 06:11:47 PM
  - 4/4 captures

**Screenshot**: `tests/e2e/screenshots/live-ops-sessions-list.png`

### 2. Session Detail + Lifecycle Timestamps (PASS)

- Session detail view rendered after clicking session card
- Lifecycle metadata verified:
  - "Session Detail" heading with `live-ops-1771697501`
  - "Complete" badge
  - Started: 06:11:47 PM
  - Duration: 14m
  - 4/4 captures, "Paired" badge
- Correlation IDs section visible:
  - Session: `live-ops-1771697501`
  - Container: `019c34df-a56a-7d6c-84bf-99ffd06043ea`
- Copy-to-clipboard buttons present

**Screenshot**: `tests/e2e/screenshots/live-ops-session-detail.png`

### 3. Evidence Images Render (PASS)

- Evidence API returned 4 captures, all with `image_data` (base64 JPEG)
- 4 `<img>` elements rendered with `data:image` src (real ESP32-CAM photos)
- Capture tags visible: BEFORE_OPEN, AFTER_OPEN, BEFORE_CLOSE, AFTER_CLOSE
- Camera IDs displayed: `esp-1cdbd4...`
- Timestamps shown: "14m ago"
- Images show real vending machine interior (shelving, products)

**Screenshot**: `tests/e2e/screenshots/live-ops-evidence-images.png`

## Config Adjustments Required

### 1. Sessions API Endpoint (Fixed)

The PiDashboard sessions API client was calling `/v1/diagnostics/sessions` (port 8081 endpoint, requires API key). Port 8082 exposes a read-only endpoint at `/v1/sessions` (Spec 084).

**Fix applied**: `src/infrastructure/api/sessions.ts` now tries `/v1/sessions` first, falls back to `/v1/diagnostics/sessions`.

### 2. Rate Limiting Observation

Port 8082 applies a 1 req/sec rate limit across all `/api/v1/sessions/*` endpoints. When the session list loads and the user immediately clicks into session detail, the evidence fetch can be rate-limited (HTTP 429). The UI handles this gracefully with a "Retry" button, and retry succeeds after the rate window clears.

**Recommendation**: Consider separate rate limit buckets for session listing vs. evidence fetching, or increase the limit to 2 req/sec for the dashboard port.

## Playwright Test Output

```
Running 3 tests using 1 worker

  PASS  sessions list loads with live data (3.3s)
  PASS  session detail renders lifecycle metadata (6.2s)
  PASS  evidence images render after retry (14.4s)

  3 passed (26.1s)
```

## Screenshot Paths

| Screenshot | Path |
|-----------|------|
| Sessions List | `tests/e2e/screenshots/live-ops-sessions-list.png` |
| Session Detail | `tests/e2e/screenshots/live-ops-session-detail.png` |
| Evidence Images | `tests/e2e/screenshots/live-ops-evidence-images.png` |

## No Mocks Used

All data in this validation comes from:
- Live PiOrchestrator on Raspberry Pi (`192.168.1.124:8082`)
- Real ESP32-CAM camera (`esp-1cdbd47a4f10`) capturing real JPEG images
- Real MinIO object storage on Pi for evidence persistence
- Real container action orchestration (door open/close with GPIO actuation)
