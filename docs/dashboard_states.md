# Dashboard Section State Machine

Each of the 5 dashboard sections -- Camera, WiFi, Door, System, and Logs -- implements a consistent 5-state model derived from React Query's loading lifecycle. This document defines the expected states, their UI requirements, and the `data-testid` attributes used for automated testing.

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

## Per-Section Contracts

### Camera Section

- **loading**: `[data-testid="camera-loading"]` -- centered spinner with text
- **success**: `[data-testid="camera-grid"]` -- grid of CameraCard components
- **empty**: `[data-testid="camera-empty"]` -- "No cameras connected" message
- **error**: `[data-testid="camera-error"]` -- AlertCircle + error message + Retry button
- **unavailable**: N/A (cameras are core functionality)

### WiFi Section

- **loading**: "Loading status..." text in ConnectionStatus
- **success**: NetworkList with available networks
- **empty**: "No networks found. Click Scan to search."
- **error**: Silent (no error UI displayed)
- **unavailable**: Silent degradation via `isFeatureUnavailable()`, polling stops

### Door Section

- **loading**: `[data-testid="door-controls-loading"]` -- centered spinner
- **success**: `[data-testid="door-controls"]` -- state display + control buttons
- **empty**: N/A (door always has state when available)
- **error**: `[data-testid="door-controls-error"]` -- "Door Control Unavailable" message
- **unavailable**: Handled via error state (implicit `isFeatureUnavailable`)

### System Section

- **loading**: `[data-testid="system-loading"]` -- SystemStatusSkeleton
- **success**: `[data-testid="system-status"]` -- 4 MetricCard components
- **empty**: N/A (system info always has data)
- **error**: `[data-testid="system-error"]` -- disconnected icon + Retry button
- **unavailable**: N/A (core functionality)

### Logs Section

- **loading**: Connection indicator showing "Connecting..."
- **success**: LogStream with filtered log entries
- **empty**: "No logs yet" (implicit)
- **error**: Connection error with reconnect option
- **unavailable**: N/A (core functionality)

## data-testid Reference

| Section | loading | success | empty | error |
|---------|---------|---------|-------|-------|
| Camera | `camera-loading` | `camera-grid` | `camera-empty` | `camera-error` |
| WiFi | -- | -- | -- | -- |
| Door | `door-controls-loading` | `door-controls` | -- | `door-controls-error` |
| System | `system-loading` | `system-status` | -- | `system-error` |
| Logs | -- | -- | -- | -- |

WiFi and Logs sections use text-based indicators rather than `data-testid` attributes. Their states are verified by checking for specific text content in tests.

## `isFeatureUnavailable()` Usage

The WiFi and Door sections use the `isFeatureUnavailable()` helper to gracefully degrade when PiOrchestrator does not support the feature (HTTP 404) or when the service is down (HTTP 503). This helper inspects the error response status code and returns `true` for these two cases.

When a section is determined to be unavailable:

- Polling stops automatically to prevent repeated failed requests and console noise.
- The UI displays a static "unavailable" indicator instead of an error with a Retry button.
- No error toasts or alerts are shown to the user.

This approach ensures that optional features (such as WiFi management on devices without wireless hardware, or door controls when no door controller is connected) fail silently rather than presenting alarming error states.
