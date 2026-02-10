---
handoff_id: "035-auto-onboard-api"
direction: "incoming"
from_repo: "PiOrchestrator"
to_repo: "PiDashboard"
created_at: "2026-01-22T00:00:00Z"
status: "acknowledged"
related_prs: []
related_commits: []
requires: []
acceptance: []
verification: []
risks: []
notes: ""
---

# Handoff: Auto-Onboard ESP-CAM API (DEV MODE)

**ID**: HANDOFF-PIO-PID-20260122-002
**Date**: 2026-01-22
**From**: PiOrchestrator
**To**: PiDashboard
**Priority**: P2
**Status**: NEW
**Spec**: 032-dev-auto-onboard-espcam

## Summary

Documentation for the Auto-Onboard API endpoints that allow developers to automatically onboard ESP-CAM devices without manual pairing. This is a **DEV MODE ONLY** feature for rapid prototyping.

**Key Point**: Auto-onboarded devices automatically appear in `/api/v1/espcam/paired`. The Dashboard does NOT need to call the auto-onboard APIs to see devices - they appear automatically when onboarded.

## API Base URL

```
http://<pi-host>:8081/api/v1/onboarding/auto
```

## When to Use Which API

| Use Case | Endpoint | Notes |
|----------|----------|-------|
| Show all registered ESP-CAMs | `GET /api/v1/espcam/paired` | Includes auto-onboarded devices |
| Show only live/active cameras | `GET /api/v1/cameras` | Only ESPs sending MQTT status |
| Control auto-onboard toggle | `POST /api/v1/onboarding/auto/enable` | DEV MODE only |
| Check auto-onboard status | `GET /api/v1/onboarding/auto/status` | Shows config and metrics |
| View onboarding audit trail | `GET /api/v1/onboarding/auto/events` | For debugging |

## Auto-Onboard Endpoints

### 1. Get Auto-Onboard Status

**GET** `/api/v1/onboarding/auto/status`

Returns current toggle state, configuration, and metrics.

#### Response

```typescript
interface AutoOnboardStatus {
  enabled: boolean;
  mode: "off" | "dev";
  running?: boolean;
  config: {
    max_per_minute: number;
    burst_size: number;
    subnet_allowlist: string[];
    verification_timeout_sec: number;
  };
  metrics?: {
    attempts: number;
    success: number;
    failed: number;
    rejected_by_policy: number;
    already_onboarded: number;
    last_success_at?: string;
    last_failure_at?: string;
  };
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "mode": "dev",
    "running": true,
    "config": {
      "max_per_minute": 10,
      "burst_size": 5,
      "subnet_allowlist": ["192.168.10.0/24"],
      "verification_timeout_sec": 5
    },
    "metrics": {
      "attempts": 3,
      "success": 2,
      "failed": 1,
      "rejected_by_policy": 0,
      "already_onboarded": 0
    }
  },
  "timestamp": "2026-01-22T15:00:00Z"
}
```

---

### 2. Enable Auto-Onboard

**POST** `/api/v1/onboarding/auto/enable`

Enables automatic onboarding of ESP-CAM devices. Requires DEV mode.

#### Response

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "running": true,
    "message": "Auto-onboarding enabled"
  },
  "timestamp": "2026-01-22T15:00:00Z"
}
```

#### Error Response (Mode Not Allowed)

```json
{
  "success": false,
  "error": {
    "code": "ONBOARD_ENABLE_FAILED",
    "message": "auto-onboard mode must be 'dev' to enable",
    "retryable": false
  },
  "timestamp": "2026-01-22T15:00:00Z"
}
```

---

### 3. Disable Auto-Onboard (Kill Switch)

**POST** `/api/v1/onboarding/auto/disable`

**IMMEDIATELY** stops all auto-onboarding. Use this as a kill switch.

#### Response

```json
{
  "success": true,
  "data": {
    "enabled": false,
    "running": false,
    "message": "Auto-onboarding disabled"
  },
  "timestamp": "2026-01-22T15:00:00Z"
}
```

---

### 4. Get Audit Events

**GET** `/api/v1/onboarding/auto/events`

Returns paginated audit trail of onboarding attempts.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 50 | Max results (1-100) |
| `offset` | int | 0 | Pagination offset |
| `mac` | string | - | Filter by MAC address |
| `stage` | string | - | Filter by stage |
| `since` | string | - | ISO 8601 timestamp |

#### Response

```typescript
interface AuditEventsResponse {
  events: OnboardingAuditEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface OnboardingAuditEntry {
  id: number;
  mac_address: string;
  stage: "discovered" | "verified" | "registered" | "paired" | "failed" | "rejected_by_policy";
  outcome: "success" | "failure";
  error_code?: string;
  error_message?: string;
  device_id?: string;
  ip_address?: string;
  firmware_version?: string;
  container_id?: string;
  duration_ms?: number;
  timestamp: string;
}
```

---

### 5. Get Events by MAC

**GET** `/api/v1/onboarding/auto/events/:mac`

Returns audit trail for a specific device.

#### Example Request

```bash
curl http://192.168.1.124:8081/api/v1/onboarding/auto/events/AA:BB:CC:DD:EE:FF
```

---

### 6. Reset Metrics

**POST** `/api/v1/onboarding/auto/metrics/reset`

Resets all metrics counters to zero.

---

### 7. Cleanup Old Events

**POST** `/api/v1/onboarding/auto/events/cleanup`

Removes audit entries older than specified days.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | int | 90 | Retention period (1-365) |

---

## How Auto-Onboard Works

```
┌─────────────────────────────────────────────────────────────┐
│ ESP-CAM boots, connects to Pi AP (192.168.10.x)            │
│ ESP publishes to MQTT: camera/status/{mac}                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ PiOrchestrator Auto-Onboard Worker detects presence        │
│ 1. Policy check (enabled?, dev mode?, subnet?, rate limit?)│
│ 2. HTTP verify: GET http://{esp-ip}/status                  │
│ 3. Register device                                          │
│ 4. Pair to target container                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Device now appears in:                                       │
│ - GET /api/v1/espcam/paired                                 │
│ - GET /api/v1/cameras (if ESP sending MQTT status)          │
└─────────────────────────────────────────────────────────────┘
```

## Dashboard Integration Guide

### Showing All Registered Devices

Use `/api/v1/espcam/paired` - this includes:
- Manually paired devices
- Auto-onboarded devices
- Both online and offline devices

```typescript
const response = await fetch('/api/v1/espcam/paired');
const { data } = await response.json();
// data.cameras contains all registered ESP-CAMs
```

### Showing Device Status

The `status` field in `/api/v1/espcam/paired` response indicates:
- `online` - Device responding
- `offline` - Device not seen recently
- `pairing` - Device in pairing process
- `error` - Device has errors

### Auto-Onboard Toggle UI (Optional)

If you want to show auto-onboard controls in the dashboard:

```typescript
// Check if auto-onboard is available
const status = await fetch('/api/v1/onboarding/auto/status');
const { data } = await status.json();

if (data.mode === 'dev') {
  // Show toggle UI
  // Enable: POST /api/v1/onboarding/auto/enable
  // Disable: POST /api/v1/onboarding/auto/disable
}
```

## TypeScript Client Example

```typescript
// src/infrastructure/api/autoOnboard.ts

interface AutoOnboardStatus {
  enabled: boolean;
  mode: 'off' | 'dev';
  running?: boolean;
  config: {
    max_per_minute: number;
    burst_size: number;
    subnet_allowlist: string[];
    verification_timeout_sec: number;
  };
  metrics?: {
    attempts: number;
    success: number;
    failed: number;
    rejected_by_policy: number;
    already_onboarded: number;
  };
}

export const autoOnboardApi = {
  getStatus: async (): Promise<AutoOnboardStatus> => {
    const response = await fetch('/api/v1/onboarding/auto/status');
    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Failed to get status');
    }
    return json.data;
  },

  enable: async (): Promise<void> => {
    const response = await fetch('/api/v1/onboarding/auto/enable', {
      method: 'POST',
    });
    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Failed to enable');
    }
  },

  disable: async (): Promise<void> => {
    const response = await fetch('/api/v1/onboarding/auto/disable', {
      method: 'POST',
    });
    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Failed to disable');
    }
  },
};
```

## Testing Checklist

- [ ] `GET /api/v1/onboarding/auto/status` returns config and metrics
- [ ] `POST /api/v1/onboarding/auto/enable` enables when mode=dev
- [ ] `POST /api/v1/onboarding/auto/enable` returns error when mode=off
- [ ] `POST /api/v1/onboarding/auto/disable` immediately disables
- [ ] Auto-onboarded devices appear in `/api/v1/espcam/paired`
- [ ] Existing `/api/v1/cameras` and `/api/v1/espcam/*` endpoints work

## Configuration (Pi Side)

The Pi must have these environment variables set for auto-onboard:

```bash
AUTO_ONBOARD_ENABLED=true
AUTO_ONBOARD_MODE=dev
AUTO_ONBOARD_TARGET_CONTAINER=550e8400-e29b-41d4-a716-446655440000
AUTO_ONBOARD_MAX_PER_MINUTE=10
AUTO_ONBOARD_BURST_SIZE=5
AUTO_ONBOARD_SUBNET_ALLOWLIST=192.168.10.0/24
```

## Notes

- Auto-onboard is **DEV MODE ONLY** - do not use in production
- Devices are automatically paired to the configured target container
- Rate limiting prevents runaway onboarding (max 10/min by default)
- Only devices on the Pi AP subnet (192.168.10.0/24) are accepted
- Kill switch (`/disable`) takes effect immediately
