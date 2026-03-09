# Data Model: Live E2E Smoke Tests

**Feature**: 065-live-e2e-smoke
**Date**: 2026-03-08

## Entities

### Evidence Bundle

The evidence bundle is a directory of files, not a database entity.

```
specs/065-live-e2e-smoke/evidence/
├── RESULTS.md                    # Human-readable summary
├── screenshots/                  # Playwright screenshots (committed)
│   ├── sessions-list.png
│   ├── session-detail.png
│   ├── camera-list.png
│   └── ...
└── traces/                       # Playwright traces (gitignored)
    └── *.zip
```

### RESULTS.md Structure

```markdown
# Live E2E Smoke Test Results

**Date**: [ISO 8601 timestamp]
**Target**: [endpoint URL]
**Duration**: [total seconds]
**Status**: PASS | FAIL

## Test Results

| Test | Status | Duration |
|------|--------|----------|
| [test name] | PASS/FAIL | [ms] |

## Environment

- Pi Host: [hostname/IP]
- PiOrchestrator version: [if available]
- Browser: Chromium [version]
- Playwright: [version]
```

## No API Contracts

This feature does not introduce new API endpoints. It consumes existing RPC and REST endpoints documented in Feature 064 (post-deploy validation) and the API-TYPE-CONTRACTS.md.

### Consumed Endpoints (read-only)

| Service | Method | Purpose |
|---------|--------|---------|
| SessionService | ListSessions | Verify session list loads |
| SessionService | GetSession | Verify session detail loads |
| EvidenceService | GetSessionEvidence | Verify evidence data loads |
| CameraService | ListCameras | Verify camera list loads |
| CameraService | GetCamera | Verify camera detail loads |
| REST | GET /api/system/info | System health check |
| REST | GET /api/wifi/status | WiFi connectivity check |
| REST | GET /api/dashboard/door/status | Door status check |
