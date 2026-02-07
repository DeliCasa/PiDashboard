# Dashboard Section State Machine

Each dashboard tab implements a consistent state model derived from React Query's loading lifecycle. This document defines the expected states, their UI requirements, and the `data-testid` attributes used for automated testing.

## State Definitions

| State | React Query Condition | UI Requirement |
| ----- | -------------------- | -------------- |
| `loading` | `isLoading === true` | Show spinner or skeleton; NEVER show empty-state text |
| `success` | `isSuccess && data.length > 0` | Show populated data display |
| `empty` | `isSuccess && (data.length === 0 \|\| data === null)` | Show empty-state message with context |
| `error` | `isError && !isFeatureUnavailable(error)` | Show error alert with Retry button |
| `unavailable` | `isError && isFeatureUnavailable(error)` | Show "unavailable" text, stop polling |

## Critical Invariant

> A section MUST NEVER display empty-state text while in the loading state.

The state check order is: **loading -> error -> empty -> success**. This ordering prevents premature display of messages such as "No cameras connected" while data is still being fetched. Every section component must evaluate conditions in this sequence:

```
if (isLoading) → show spinner
else if (isError) → show error or unavailable
else if (isSuccess && isEmpty) → show empty state
else if (isSuccess && hasData) → show data
```

Violating this order leads to flicker where empty-state text briefly appears before data loads, which is both a UX defect and a source of flaky tests.

---

## Per-Section Contracts

### 1. Overview (Default Tab)

**Component:** Composite — SystemStatus + WiFiSection + CameraSection + DoorSection

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useSystemMonitor()` | `/api/system/info` | 5s |
| `useWifiStatus()` | `/api/wifi/status` | 10s |
| `useCameras()` | `/api/v1/cameras` | 10s (visibility-aware) |
| `useDoorStatus()` | `/api/door/status` | 2s |

Each sub-section transitions independently. The Overview tab renders all four sections simultaneously.

---

### 2. System Section

**Component:** `SystemStatus.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useSystemMonitor()` | `/api/system/info` | 5s |
| — | `/ws/monitor` | WebSocket (fallback) |
| `useAdaptiveThresholds()` | Local state | — |

- **loading**: `[data-testid="system-loading"]` — SystemStatusSkeleton
- **success**: `[data-testid="system-status"]` — 4 MetricCard components (CPU, Memory, Disk, Temperature) + Uptime
- **empty**: N/A (system info always has data)
- **error**: `[data-testid="system-error"]` — disconnected icon + Retry button (`system-retry-button`)
- **unavailable**: N/A (core functionality)

---

### 3. WiFi Section

**Component:** `WiFiSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useWifiStatus()` | `/api/wifi/status` | 10s |
| `useWifiScan()` | `/api/wifi/scan` | Manual trigger |
| `useWifiNetworks()` | `/api/wifi/scan` | staleTime: Infinity |
| `useWifiConnect()` | `/api/wifi/connect` | Mutation |
| `useWifiDisconnect()` | `/api/wifi/disconnect` | Mutation |

- **loading**: "Loading status..." text in ConnectionStatus
- **success**: NetworkList with available networks + connection status badge
- **empty**: "No networks found. Click Scan to search."
- **error**: Silent (no error UI displayed)
- **unavailable**: Silent degradation via `isFeatureUnavailable()`, polling stops. No console errors.

---

### 4. Devices Section

**Component:** `DeviceSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useDevices()` | `/api/devices` | 30s staleTime |
| `useDeviceScan()` | `/api/devices/scan` | Mutation (10s duration) |
| `useProvisionDevice()` | `/api/devices/{addr}/provision` | Mutation |

- **loading**: "Loading devices..." with spinner
- **success**: Device list grid with provision buttons
- **empty**: "No devices discovered. Click Scan to search."
- **error**: Error state with retry button
- **unavailable**: Browser Bluetooth warning shown on non-Chrome/Edge

---

### 5. Camera Section

**Component:** `CameraSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useCameras()` | `/api/v1/cameras` | 10s (pauses when tab hidden) |
| `useCaptureTest()` | `/api/v1/cameras/{id}/capture` | Mutation |
| `useRebootCamera()` | `/api/v1/cameras/{id}/reboot` | Mutation |
| `useCameraDiagnostics()` | `/api/v1/cameras/diagnostics` | 30s staleTime |

- **loading**: `[data-testid="camera-loading"]` — centered spinner with text
- **success**: `[data-testid="camera-grid"]` — grid of CameraCard components with status badges
- **empty**: `[data-testid="camera-empty"]` — "No cameras connected" message
- **error**: `[data-testid="camera-error"]` — AlertCircle + error message + Retry button
- **unavailable**: 404/503 stops polling and retries silently (Feature 045)

**Detail view testids:** `camera-detail-loading`, `camera-detail-content`, `camera-detail-not-found`, `camera-detail-error`

**Visibility-aware polling:** Cameras pause polling when browser tab is hidden (via `useDocumentVisibility`) and resume when the tab becomes visible again.

**Legacy fallback:** `v1CamerasApi.list()` catches V1 API errors and falls back to `/api/dashboard/cameras`. Both endpoints must be handled for 404/503 graceful degradation.

---

### 6. Container Section

**Component:** `ContainerSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useContainers()` | `/api/v1/containers` | 30s |
| `useContainer(id)` | `/api/v1/containers/{id}` | 10s staleTime |
| `useCreateContainer()` | `POST /api/v1/containers` | Mutation |
| `useUpdateContainer()` | `PUT /api/v1/containers/{id}` | Mutation |
| `useDeleteContainer()` | `DELETE /api/v1/containers/{id}` | Mutation |
| `useAssignCamera()` | `POST /api/v1/containers/{id}/cameras` | Mutation |
| `useUnassignCamera()` | `DELETE /api/v1/containers/{id}/cameras/{deviceId}` | Mutation |

- **loading**: `[data-testid="containers-loading"]` — "Loading containers..." spinner
- **success**: `[data-testid="containers-grid"]` — container cards with `container-card-{id}`
- **empty**: `[data-testid="containers-empty"]` — empty state with "Create Container" button
- **error**: `[data-testid="containers-error"]` — error with retry button
- **unavailable**: 404/503 stops polling and retries silently (Feature 045)

**Container ID display:** All IDs rendered in `font-mono text-xs text-muted-foreground`. IDs are opaque strings (UUID, semantic, numeric) — never parsed semantically.

**CRUD dialogs:** `create-container-dialog`, `edit-container-dialog`, `delete-container-dialog`, `assign-camera-dialog`

---

### 7. Door Section

**Component:** `DoorSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useDoorStatus()` | `/api/door/status` | 2s (retry: 1) |
| `useOpenDoor()` | `/api/door/open` | Mutation |
| `useCloseDoor()` | `/api/door/close` | Mutation |
| `useDoorHistory(20)` | `/api/door/history` | 10s staleTime |

- **loading**: `[data-testid="door-controls-loading"]` — centered spinner
- **success**: `[data-testid="door-controls"]` — state display + control buttons + history
- **empty**: N/A (door always has state when available)
- **error**: `[data-testid="door-controls-error"]` — "Door Control Unavailable" message
- **unavailable**: Handled via error state (implicit `isFeatureUnavailable`)

---

### 8. Logs Section

**Component:** `LogSection.tsx`

| Hook | Endpoint | Transport |
|------|----------|-----------|
| `useLogStream(level)` | `/api/v1/dashboard/logs` | SSE (EventSource) |
| `useExportDiagnostics()` | `/api/dashboard/export` | Mutation |

- **connecting**: Connection indicator showing "Connecting..."
- **connected**: LogStream with filtered log entries (max 500)
- **disconnected**: "Connection lost. Reconnecting..." with exponential backoff (max 3 attempts)
- **error**: Shows after max reconnect attempts
- **empty**: "No logs yet" (implicit)

---

### 9. Network Section

**Component:** `NetworkSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useTailscaleStatus()` | `/api/network/tailscale` | 30s |
| `useMqttStatus()` | `/api/network/mqtt` | 10s |
| `useBridgeServerStatus()` | `/api/network/bridgeserver` | 10s |
| `usePing()` | `/api/network/ping` | Mutation |

Each service card transitions independently:
- **loading**: Skeleton card
- **connected**: Green status indicator with details (IP, hostname, latency)
- **disconnected**: Gray/red status indicator
- **error**: Error indicator per card

---

### 10. Config Section

**Component:** `ConfigSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useConfig()` | `/api/config` | 60s staleTime (manual refresh) |
| `useUpdateConfig()` | `/api/config/{key}` | Mutation (optimistic update) |
| `useResetConfig()` | `/api/config/{key}/reset` | Mutation |

- **loading**: Skeleton loaders for 5 entries
- **success**: Config sections grouped by category (System, MQTT, WiFi, Hardware, Monitoring)
- **empty**: "No configuration entries found"
- **error**: Alert with retry button

---

### 11. Diagnostics Section (DEV)

**Component:** `DiagnosticsSection.tsx`

| Hook | Endpoint | Polling |
|------|----------|---------|
| `useHealthChecks()` | `/api/diagnostics/health` | 5s |
| `useRefreshHealthChecks()` | Manual trigger | — |
| `useSessions()` | `/api/v1/dashboard/sessions` | — |
| `useSessionEvidence()` | `/api/v1/dashboard/sessions/{id}/evidence` | — |

- **loading**: Three skeleton cards
- **checking**: `[data-testid="overall-health-badge"]` — "Checking..." badge
- **healthy**: Green badge "All Systems Healthy"
- **degraded**: Yellow badge "Degraded"
- **unhealthy**: Red badge "Issues Detected"
- **error**: Error state with retry button

**Tab trigger:** `[data-testid="tab-diagnostics"]`
**Section:** `[data-testid="diagnostics-section"]`
**Service cards:** `[data-testid="service-health-card-{serviceName}"]` (bridgeserver, piorchestrator, minio)
**Sessions:** `[data-testid="sessions-panel"]`
**Refresh:** `[data-testid="refresh-health"]`

---

### 12. Evidence (Integrated)

Evidence capture is not a standalone tab. It is integrated into Camera Detail and Diagnostics Sessions.

| Hook | Endpoint | Transport |
|------|----------|-----------|
| `useEvidenceCapture()` | `POST /api/v1/dashboard/evidence` | Mutation |
| `useSessionEvidence(sessionId)` | `/api/v1/dashboard/sessions/{id}/evidence` | Query |
| `useInvalidateEvidence()` | Cache invalidation | — |

---

## data-testid Reference

| Section | loading | success | empty | error |
|---------|---------|---------|-------|-------|
| Camera | `camera-loading` | `camera-grid` | `camera-empty` | `camera-error` |
| Container | `containers-loading` | `containers-grid` | `containers-empty` | `containers-error` |
| System | `system-loading` | `system-status` | — | `system-error` |
| Door | `door-controls-loading` | `door-controls` | — | `door-controls-error` |
| Diagnostics | — | `diagnostics-section` | — | — |
| WiFi | — | — | — | — |
| Logs | — | — | — | — |

WiFi and Logs sections use text-based indicators rather than `data-testid` attributes. Their states are verified by checking for specific text content in tests.

---

## Transport Mechanisms

| Transport | Tabs | Behavior |
|-----------|------|----------|
| REST Polling | System (5s), WiFi (10s), Cameras (10s), Containers (30s), Door (2s), Network (10-30s), Diagnostics (5s) | Automatic with configurable interval |
| WebSocket | System (fallback) | `/ws/monitor` with polling fallback |
| SSE (EventSource) | Logs | `/api/v1/dashboard/logs` with reconnect backoff |
| Manual/Mutation | Config, Devices, Evidence | User-triggered actions |

---

## `isFeatureUnavailable()` Usage

The following sections use the `isFeatureUnavailable()` helper to gracefully degrade when PiOrchestrator does not support the feature (HTTP 404) or when the service is down (HTTP 503):

- **WiFi** — `/api/wifi/status`
- **Cameras** — `/api/v1/cameras` (added in Feature 045)
- **Containers** — `/api/v1/containers` (added in Feature 045)

When a section is determined to be unavailable:

- Polling stops automatically to prevent repeated failed requests and console noise.
- React Query retries stop (`retry` returns `false` when `isFeatureUnavailable` is true).
- The UI displays a static "unavailable" indicator instead of an error with a Retry button.
- No error toasts or alerts are shown to the user.

Implementation pattern (in each hook):
```typescript
retry: (failureCount, error) => {
  if (isFeatureUnavailable(error)) return false;
  return failureCount < 2;
},
refetchInterval: (query) => {
  if (query.state.error && isFeatureUnavailable(query.state.error)) return false;
  return POLLING_INTERVAL;
},
```

This approach ensures that optional features (such as WiFi management on devices without wireless hardware, cameras when no ESP32 cameras are provisioned, or containers when the V1 container API is unavailable) fail silently rather than presenting alarming error states. Core tabs (System, Door, Config, Logs, Network, Devices) are unaffected by V1 endpoint failures.
