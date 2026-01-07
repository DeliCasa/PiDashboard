# Data Model: Pi Dashboard Frontend Integration with PiOrchestrator

> **Feature**: 002-pi-orchestrator-integration
> **Generated**: 2026-01-06

---

## Overview

This feature is **integration-only** - no new data models are required. The frontend (Feature 001) and backend (Feature 019) already define matching entities.

---

## Existing Entity Reference

### Frontend Entities (PiDashboard)

Located in `src/domain/types/entities.ts`:

| Entity | Purpose |
|--------|---------|
| SystemStatus | CPU, memory, disk, temp metrics |
| WiFiNetwork | Scanned network info |
| WiFiStatus | Current connection state |
| Device | ESP32 BLE device |
| Camera | ESP32-CAM status |
| CameraHealth | Camera diagnostics |
| Door | Door state and lock status |
| MQTTConfig | MQTT broker settings |
| LogEntry | Log stream entry |
| ConfigEntry | Configuration item |
| OfflineQueueEntry | Offline operation queue |
| AdaptiveThresholds | Health metric thresholds |
| TestingMode | Door testing mode state |

### Backend Entities (PiOrchestrator)

Located in `internal/domain/entities/`:

| Entity | Maps To (Frontend) |
|--------|-------------------|
| SystemInfo | SystemStatus |
| WiFiNetwork | WiFiNetwork |
| WiFiConnectionStatus | WiFiStatus |
| BLEDevice | Device |
| Camera | Camera |
| CameraDiagnostics | CameraHealth |
| DoorState | Door |
| MQTTConfiguration | MQTTConfig |
| LogEntry | LogEntry |
| Configuration | ConfigEntry |

---

## API Contract Verification

The frontend expects these API endpoints (defined in `src/infrastructure/api/`):

### System API
- `GET /api/system/info` → SystemStatus

### WiFi API
- `GET /api/wifi/status` → WiFiStatus
- `GET /api/wifi/scan` → WiFiNetwork[]
- `POST /api/wifi/connect` → WiFiStatus

### Device API
- `GET /api/devices` → Device[]
- `POST /api/devices/scan` → void (starts scan)
- `POST /api/devices/:address/provision` → Device

### Dashboard API
- `GET /api/dashboard/health` → SystemStatus (extended)
- `GET /api/dashboard/logs` → SSE stream of LogEntry
- `GET /api/dashboard/config` → ConfigEntry[]
- `GET /api/dashboard/tailscale/status` → TailscaleStatus

### Camera API
- `GET /cameras` → Camera[]
- `GET /cameras/diagnostics` → CameraHealth[]
- `POST /snapshot` → ImageData

### Door API
- `GET /open` → DoorResponse
- `GET /close` → DoorResponse

---

## Data Flow

```
┌─────────────────┐     HTTP/SSE      ┌──────────────────┐
│   Pi Dashboard  │ ◄──────────────── │  PiOrchestrator  │
│   (React SPA)   │                   │  (Go Backend)    │
└────────┬────────┘                   └────────┬─────────┘
         │                                     │
         │ Browser                             │ Hardware
         ▼                                     ▼
   ┌───────────┐                         ┌───────────┐
   │   User    │                         │ GPIO/BLE  │
   └───────────┘                         │ WiFi/MQTT │
                                         └───────────┘
```

---

## No Changes Required

Since this is an integration feature:
- ✅ Frontend entities already defined
- ✅ Backend entities already defined
- ✅ API contracts match (verified in research.md)
- ✅ No new data models needed
