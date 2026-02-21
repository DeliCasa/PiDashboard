# Quickstart: Live Ops Validation

**Feature**: 060-live-ops-validation
**Date**: 2026-02-21

## Prerequisites

1. **PiOrchestrator running** on the Raspberry Pi with V1 session/evidence endpoints exposed on port 8082
2. **At least one session** with evidence captures in PiOrchestrator (from smoke run or manual trigger)
3. **Network access** to Pi — either LAN (`192.168.1.124`) or SSH tunnel
4. **Node.js 22+** installed locally

## Setup

### 1. Verify PiOrchestrator Is Running

```bash
ssh pi "sudo systemctl status piorchestrator"
```

### 2. Verify V1 Endpoints Are Available on Port 8082

```bash
# Sessions list (should return JSON with sessions array)
ssh pi "curl -s http://localhost:8082/api/v1/diagnostics/sessions | head -c 200"

# Camera diagnostics (should return JSON with cameras array)
ssh pi "curl -s http://localhost:8082/api/dashboard/diagnostics/cameras | head -c 200"
```

If sessions endpoint returns 404, PiOrchestrator needs the V1 routes registered on port 8082 (see handoff document).

### 3. Set Up Dev Proxy

**Option A: SSH Tunnel (recommended)**
```bash
# In a separate terminal — tunnels Pi port 8082 to localhost:8082
ssh -L 8082:localhost:8082 pi
```

**Option B: Direct LAN (if on same network)**
The default `vite.config.ts` proxy target is `http://192.168.1.124:8082`.

### 4. Start Development Server

```bash
cd /home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard
npm run dev
```

Open http://localhost:5173 in browser.

## Validation Checklist

### Step 1: Session List (US1)

1. Click the **Operations** tab
2. Verify: Sessions load within 5 seconds
3. Verify: Each session shows status badge, container ID, timestamps, capture count
4. Verify: Status filter tabs work (All, Active, Complete, Partial, Failed)
5. Verify: Active sessions with `elapsed_seconds > 300` show "Stale" indicator

**If sessions don't load**: Check browser Network tab — the request to `/api/v1/diagnostics/sessions` should be proxied to PiOrchestrator. A 404 means the endpoint isn't registered on port 8082.

### Step 2: Evidence Images (US2)

1. Click a session with evidence captures
2. Verify: Session detail opens with metadata (session ID, container ID, timestamps)
3. Verify: Evidence thumbnails render (base64 inline images)
4. Verify: Capture tag badges show (Before Open, After Close, etc.)
5. Click a thumbnail — verify: Full-size preview modal opens with Download button
6. **Network tab check**: No requests to `192.168.10.x` or `192.168.1.x:9000` (MinIO)

**If images don't render**: Check if `image_data` field is present in the evidence API response. Recent captures (< 24h) should have base64 data. Older captures show "Stored in S3" placeholder.

### Step 3: Camera Health (US3)

1. On the Operations tab, verify the camera health section is visible
2. Verify: Each camera shows device ID, online/offline status
3. Verify: Health metrics visible (signal strength, capture rate, error count)
4. Verify: Last seen timestamp is displayed

**If camera health doesn't load**: Check `/api/dashboard/diagnostics/cameras` response in Network tab.

### Step 4: Failure Diagnostics (US4)

1. Find or create a failed session in PiOrchestrator
2. Open the failed session detail
3. Verify: Failure reason and phase displayed in a red/destructive error block
4. Verify: Correlation ID displayed (if present) with copy-to-clipboard button
5. Click copy button — verify: Toast confirmation appears
6. Verify: Failed captures listed separately with their failure reasons

### Step 5: Console & Network Verification

1. Open browser Developer Tools → Console tab
2. Navigate through Operations tab, session list, session detail, evidence
3. Verify: **Zero uncaught errors** in console
4. Open Network tab
5. Verify: **Zero requests** to MinIO LAN addresses (192.168.10.x, 192.168.1.x:9000)
6. Verify: All `/api/` requests go to `localhost:5173` (proxied) or same-origin

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sessions return 404 | V1 endpoints not on port 8082 | Apply PiOrchestrator handoff |
| Images show "Stored in S3" | No base64 data for old captures | Create a new session to generate recent captures |
| Proxy connection refused | Pi not reachable or SSH tunnel down | Check `ping 192.168.1.124` and tunnel |
| Schema validation warnings in console | API response field mismatch | Check PiOrchestrator version matches expected schema |
| Camera health empty | No cameras registered | Register at least one ESP32 camera |

## Producing Validation Artifacts

After completing all checklist steps:

1. Take a screenshot of the session list showing real sessions
2. Take a screenshot of a session detail with evidence images rendered
3. Take a screenshot of camera health dashboard
4. Save screenshots as validation artifacts in `specs/060-live-ops-validation/artifacts/`

```bash
mkdir -p specs/060-live-ops-validation/artifacts
# Screenshots are saved manually from the browser
```
