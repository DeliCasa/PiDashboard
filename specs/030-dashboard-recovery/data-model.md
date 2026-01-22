# Data Model: Dashboard Recovery + ESP Visibility

**Feature**: 030-dashboard-recovery
**Date**: 2026-01-12

## Overview

This feature enhances existing data structures to improve error observability. No new database entities are introduced; changes are to in-memory error and state models.

## Enhanced Entities

### APIError (Enhanced)

Existing `ApiError` class enhanced with additional fields for debugging.

| Field | Type | Description |
|-------|------|-------------|
| status | number | HTTP status code |
| message | string | Error message from backend |
| code | string? | Machine-readable error code |
| details | Record<string, unknown>? | Additional error context |
| **endpoint** | string | NEW: The API endpoint that failed |
| **requestId** | string? | NEW: X-Request-Id from response headers |
| **contentType** | string? | NEW: Content-Type of response (for HTML detection) |
| **timestamp** | Date | NEW: When the error occurred |

### HTMLFallbackError (New)

Specialized error for when API returns HTML instead of JSON.

| Field | Type | Description |
|-------|------|-------------|
| endpoint | string | The endpoint that returned HTML |
| expectedContentType | string | Expected: `application/json` |
| actualContentType | string | Actual content-type received |
| hint | string | "API route hitting SPA fallback - endpoint may not be registered" |

### ConnectionState (Existing, Documented)

UI state for API connectivity.

| Value | Description | UI Indicator |
|-------|-------------|--------------|
| connected | API responding normally | Green dot |
| error | API returned error | Red dot |
| reconnecting | Retrying after failure | Yellow dot, spinner |
| disconnected | No connection | Gray dot |

### DeviceListState (New)

Explicit states for device list UI.

| Value | Description | UI |
|-------|-------------|-----|
| loading | Initial fetch in progress | Spinner |
| empty | Fetch succeeded, no devices | "No devices found" + Scan CTA |
| populated | Fetch succeeded, has devices | Device table |
| error | Fetch failed | Error banner with retry |

### DebugInfo (New)

Copyable debug information for support.

| Field | Type | Description |
|-------|------|-------------|
| endpoint | string | Failed endpoint path |
| status | number? | HTTP status code |
| code | string? | Error code |
| requestId | string? | Request ID from `X-Request-Id` header |
| timestamp | string | ISO timestamp |
| userAgent | string | Browser user agent |
| origin | string | window.location.origin |

## State Transitions

### Device List State Machine

```
┌─────────────┐
│   loading   │──────────────────────────┐
└──────┬──────┘                          │
       │                                  │
   ┌───▼───┐                              │
   │success│                              │
   └───┬───┘                              │
       │                                  │
 ┌─────┴─────┐                            │
 │           │                            │
┌▼─────┐ ┌───▼────┐                 ┌─────▼────┐
│empty │ │populated│                 │  error   │
└──┬───┘ └────┬───┘                 └────┬─────┘
   │          │                          │
   │    ┌─────▼─────┐              ┌─────▼─────┐
   └───►│  refetch  │◄─────────────│   retry   │
        └───────────┘              └───────────┘
```

### Error Display State Machine

```
┌──────────────┐
│   no error   │
└──────┬───────┘
       │ error occurs
       ▼
┌──────────────┐
│   showing    │────────► dismiss ────► no error
└──────┬───────┘
       │ retryable && retryAfterSeconds
       ▼
┌──────────────┐
│  countdown   │────────► 0 ─────────► auto retry
└──────────────┘
```

## Validation Rules

### APIError Validation

- `status` must be a valid HTTP status code (100-599)
- `endpoint` must start with `/`
- `timestamp` must be a valid Date

### DebugInfo Validation

- `timestamp` must be ISO 8601 format
- `endpoint` must be present
- All fields are sanitized (no PII)

## Relationships

```
APIError
    │
    ├── has-one DebugInfo (computed)
    │
    └── extends-to HTMLFallbackError (specialized)

DeviceListState
    │
    └── references APIError (when state = error)

ConnectionState
    │
    └── updated-by APIError occurrence
```

## Existing Types Reference

These existing types remain unchanged:

- `Device` - ESP32 device entity
- `V1ApiError` - V1 API error with correlation ID
- `NetworkError` - Network connectivity error
- `TimeoutError` - Request timeout error

## Migration Notes

No database migrations required. All changes are to in-memory TypeScript types.

Backwards compatibility:
- New fields on APIError are optional
- HTMLFallbackError is a new error type (won't break existing catches)
- DeviceListState is a new UI-only enum
