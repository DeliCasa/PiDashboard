# Contract: Dashboard Section State Machine

**Verified by**: Integration hook tests + E2E resilience tests

## State Definitions

Each dashboard section MUST implement these 5 states:

| State | React Query Condition | UI Requirement |
| ----- | -------------------- | -------------- |
| `loading` | `isLoading === true` | Show spinner or skeleton; NEVER show empty-state text |
| `success` | `isSuccess && data.length > 0` | Show populated data display |
| `empty` | `isSuccess && (data.length === 0 \|\| data === null)` | Show empty-state message with context |
| `error` | `isError && !isFeatureUnavailable(error)` | Show error alert with Retry button |
| `unavailable` | `isError && isFeatureUnavailable(error)` | Show "unavailable" text, stop polling |

## Per-Section Contracts

### Camera Section
- **loading**: `[data-testid="camera-loading"]` — centered spinner with text
- **success**: `[data-testid="camera-grid"]` — grid of CameraCard components
- **empty**: `[data-testid="camera-empty"]` — "No cameras connected" message
- **error**: `[data-testid="camera-error"]` — AlertCircle + error message + Retry button
- **unavailable**: N/A (cameras are core functionality)

### WiFi Section
- **loading**: "Loading status..." text in ConnectionStatus
- **success**: NetworkList with available networks
- **empty**: "No networks found. Click Scan to search."
- **error**: Silent (no error UI displayed)
- **unavailable**: Silent degradation via `isFeatureUnavailable()`, polling stops

### Door Section
- **loading**: `[data-testid="door-controls-loading"]` — centered spinner
- **success**: `[data-testid="door-controls"]` — state display + control buttons
- **empty**: N/A (door always has state when available)
- **error**: `[data-testid="door-controls-error"]` — "Door Control Unavailable" message
- **unavailable**: Handled via error state (implicit `isFeatureUnavailable`)

### System Section
- **loading**: `[data-testid="system-loading"]` — SystemStatusSkeleton
- **success**: `[data-testid="system-status"]` — 4 MetricCard components
- **empty**: N/A (system info always has data)
- **error**: `[data-testid="system-error"]` — disconnected icon + Retry button
- **unavailable**: N/A (core functionality)

### Logs Section
- **loading**: Connection indicator showing "Connecting..."
- **success**: LogStream with filtered log entries
- **empty**: "No logs yet" (implicit)
- **error**: Connection error with reconnect option
- **unavailable**: N/A (core functionality)

## Critical Invariant

> A section MUST NEVER display empty-state text while in the loading state.

This means:
```
if (isLoading) → show spinner
else if (isError) → show error or unavailable
else if (isSuccess && isEmpty) → show empty state
else if (isSuccess && hasData) → show data
```

The check order loading → error → empty → success prevents premature "No cameras" messages.
