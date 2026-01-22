---
handoff_id: "035-camera-diagnostics-api"
direction: outgoing
from_repo: PiDashboard
to_repo: PiOrchestrator
created_at: "2026-01-20T16:09:00Z"
status: new
related_prs: []
related_commits: []
requires:
  - type: api
    description: "Implement /api/dashboard/cameras/diagnostics endpoint"
  - type: api
    description: "Return extended camera health and diagnostic data"
acceptance:
  - "GET /api/dashboard/cameras/diagnostics returns JSON array"
  - "Response includes per-camera diagnostics with heap, wifi_rssi, uptime"
  - "Response includes connection quality metrics"
  - "Endpoint returns 200 even when no cameras registered (empty array)"
verification:
  - "curl -s http://localhost:8082/api/dashboard/cameras/diagnostics returns JSON"
  - "Response validates against DiagnosticsListResponseSchema"
risks:
  - "ESP-CAM devices may not report all diagnostic fields"
  - "Extended polling may increase device memory pressure"
notes: "Dashboard currently falls back from V1 to legacy endpoint, both return HTML 404"
---

# Handoff: Camera Diagnostics API Endpoint

**Date**: 2026-01-20
**Source**: PiDashboard Feature 034 (ESP Camera Integration)
**Target Project**: PiOrchestrator
**Priority**: Medium - Debugging feature, not blocking core functionality

## Executive Summary

The PiDashboard includes a camera diagnostics view (Feature 034) that displays raw JSON diagnostic data for debugging ESP-CAM devices. The dashboard attempts to call `/api/v1/cameras/diagnostics` then falls back to `/api/dashboard/cameras/diagnostics`, but **neither endpoint exists** on PiOrchestrator.

## Current Behavior

### Dashboard Request Flow
1. Dashboard calls `GET /api/v1/cameras/diagnostics`
2. Backend returns HTML (SPA fallback = 404)
3. Dashboard falls back to `GET /api/dashboard/cameras/diagnostics`
4. Backend returns HTML (SPA fallback = 404)
5. Dashboard shows "Failed to load diagnostics" error

### Console Output
```
[V1 Cameras] V1 diagnostics failed, falling back to legacy endpoint: HTMLFallbackError: Expected JSON but received HTML from /v1/cameras/diagnostics
```

### Verification
```bash
# Camera list works:
$ curl -s http://localhost:8082/api/dashboard/cameras | jq .
{
  "cameras": [
    {
      "device_id": "espcam-b0f7f1",
      "status": "error",
      "health": {"heap": 127700, "wifi_rssi": -47, "uptime": 10},
      "last_seen": "2026-01-20T16:07:57.267816124Z"
    }
  ],
  "count": 1,
  "success": true
}

# Diagnostics endpoint missing:
$ curl -s http://localhost:8082/api/dashboard/cameras/diagnostics | head -1
<!doctype html>
```

## Required Implementation

### Endpoint: GET /api/dashboard/cameras/diagnostics

**Purpose**: Return extended diagnostic information for all cameras, including health metrics, connection quality, and error history.

### Expected Response Schema

```typescript
// Array of CameraDiagnostics objects
interface CameraDiagnostics {
  // Base camera fields (same as /cameras response)
  id: string;           // or device_id
  name: string;
  status: 'online' | 'offline' | 'error' | 'initializing';
  lastSeen: string;     // ISO timestamp
  health?: {
    heap: number;       // Free heap in bytes
    wifi_rssi: number;  // WiFi signal strength dBm
    uptime: number;     // Uptime in seconds
  };
  ip_address?: string;
  mac_address?: string;

  // Extended diagnostics (new fields)
  diagnostics?: {
    connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
    error_count: number;
    last_error?: string;
    last_error_time?: string;
    firmware_version?: string;
    resolution?: string;  // e.g., "1280x720"
    frame_rate?: number;
    avg_capture_time_ms?: number;
  };
}
```

### Suggested Implementation (Go)

```go
// internal/api/handlers/camera_dashboard.go

func (h *CameraDashboardHandler) HandleListCameraDiagnostics(c *gin.Context) {
    cameras := camera.GetActiveCameras()

    diagnostics := make([]CameraDiagnosticResponse, 0, len(cameras))
    for _, cam := range cameras {
        diag := CameraDiagnosticResponse{
            DeviceID:    cam.DeviceID,
            Name:        cam.Name,
            Status:      cam.Status,
            LastSeen:    cam.LastSeen,
            Health:      cam.Health,
            IPAddress:   cam.IPAddress,
            MACAddress:  cam.MACAddress,
            Diagnostics: buildDiagnostics(cam),
        }
        diagnostics = append(diagnostics, diag)
    }

    c.JSON(http.StatusOK, diagnostics)
}

func buildDiagnostics(cam *Camera) *DiagnosticsDetail {
    // Calculate connection quality based on RSSI
    quality := "unknown"
    if cam.Health != nil {
        rssi := cam.Health.WifiRSSI
        switch {
        case rssi >= -50:
            quality = "excellent"
        case rssi >= -60:
            quality = "good"
        case rssi >= -70:
            quality = "fair"
        default:
            quality = "poor"
        }
    }

    return &DiagnosticsDetail{
        ConnectionQuality: quality,
        ErrorCount:        cam.ErrorCount,
        LastError:         cam.LastError,
        FirmwareVersion:   cam.FirmwareVersion,
    }
}
```

### Router Registration

```go
// Add alongside existing camera routes
dashboardGroup := router.Group("/api/dashboard")
{
    dashboardGroup.GET("/cameras", h.HandleListCameras)
    dashboardGroup.GET("/cameras/diagnostics", h.HandleListCameraDiagnostics)  // NEW
    dashboardGroup.GET("/cameras/:id/capture", h.HandleCapture)
    dashboardGroup.POST("/cameras/:id/reboot", h.HandleReboot)
}
```

## Minimal Implementation (MVP)

If extended diagnostics aren't tracked yet, return the same data as `/cameras` but as an array:

```go
func (h *CameraDashboardHandler) HandleListCameraDiagnostics(c *gin.Context) {
    cameras := camera.GetActiveCameras()

    // MVP: Return cameras array with existing health data
    // Dashboard will display what's available
    response := make([]map[string]interface{}, 0, len(cameras))
    for _, cam := range cameras {
        response = append(response, map[string]interface{}{
            "device_id":   cam.DeviceID,
            "id":          cam.DeviceID,
            "name":        cam.Name,
            "status":      cam.Status,
            "last_seen":   cam.LastSeen,
            "health":      cam.Health,
            "ip_address":  cam.IPAddress,
            "mac_address": cam.MACAddress,
            // diagnostics field can be nil/omitted for MVP
        })
    }

    c.JSON(http.StatusOK, response)
}
```

## Testing Checklist

After implementing:
- [ ] `curl http://localhost:8082/api/dashboard/cameras/diagnostics` returns JSON
- [ ] Response is an array (even if empty)
- [ ] Each item includes at least: id/device_id, name, status, health
- [ ] Dashboard diagnostics view shows data instead of error
- [ ] Console no longer shows HTMLFallbackError for diagnostics

## Files to Modify

### PiOrchestrator
| File | Change |
|------|--------|
| `internal/api/handlers/camera_dashboard.go` | Add `HandleListCameraDiagnostics` handler |
| `internal/api/router.go` | Register `/api/dashboard/cameras/diagnostics` route |

### PiDashboard (No changes needed)
The dashboard already handles this endpoint correctly - it just needs the backend to return JSON.

## Related Files (Dashboard)

| File | Purpose |
|------|---------|
| `src/infrastructure/api/v1-cameras.ts` | API client with fallback logic |
| `src/presentation/components/cameras/DiagnosticsView.tsx` | UI that displays diagnostics |
| `src/application/hooks/useCameras.ts` | `useCameraDiagnostics` hook |

## Contact

- **Feature**: 034-esp-camera-integration
- **Dashboard Branch**: `034-esp-camera-integration`
- **Reported Error**: HTMLFallbackError on `/v1/cameras/diagnostics` and `/dashboard/cameras/diagnostics`
