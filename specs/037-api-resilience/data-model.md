# Data Model: API Resilience & UI Correctness

**Feature**: 037-api-resilience
**Date**: 2026-01-25
**Status**: Draft

## Overview

This feature enhances existing data handling patterns without introducing new entities. The focus is on:
1. Standardizing error representation across all API calls
2. Defining explicit UI state transitions
3. Tracking feature availability for optional endpoints

## Entities

### 1. APIError (Enhanced)

**Location**: `src/infrastructure/api/client.ts` (existing, enhance)

**Purpose**: Normalized error representation for all API failures.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | Machine-readable error code (e.g., "NETWORK_ERROR", "API_ERROR") |
| message | string | Yes | Human-readable error message |
| status | number | Yes | HTTP status code (0 for network errors) |
| retryable | boolean | Yes | Whether the error is transient and retry may help |
| endpoint | string | No | The API endpoint that failed |
| requestId | string | No | X-Request-Id header value for debugging |
| timestamp | Date | Yes | When the error occurred |

**State Transitions**:
```
Request → [Success] → Data returned
        → [Client Error 4xx] → APIError(retryable: false)
        → [Server Error 5xx] → APIError(retryable: true) → Retry up to 3 times
        → [Network Error] → APIError(retryable: true) → Retry up to 3 times
        → [Timeout] → APIError(retryable: true) → Retry up to 3 times
```

**Validation Rules**:
- `status` must be 0-599 (0 = network error, 1xx-5xx = HTTP)
- `retryable` must be false for 4xx errors
- `retryable` must be true for 5xx, network, timeout errors

---

### 2. LoadingState (Conceptual)

**Location**: Component-level (React Query state composition)

**Purpose**: Explicit enumeration of UI states for data fetching.

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| `idle` | Query not started | Initial render, no spinner |
| `loading` | `isLoading && !data` | Show loading spinner |
| `success` | `!isLoading && !isError && data` | Render data |
| `empty` | `!isLoading && !isError && (!data || data.length === 0)` | Show "no data" message |
| `error` | `isError` | Show error message + retry button |
| `stale` | `data && (Date.now() - dataUpdatedAt > 30000)` | Show data + staleness badge |

**State Transitions**:
```
idle → loading (query enabled)
loading → success (data received)
loading → empty (empty data received)
loading → error (request failed)
success → loading (refetch triggered)
success → stale (30s elapsed)
error → loading (retry clicked)
stale → success (refetch completed)
```

**Note**: This is not a Zod schema but a conceptual model for component state logic.

---

### 3. FeatureAvailability (New Concept)

**Location**: `src/infrastructure/api/feature-availability.ts` (new file)

**Purpose**: Track which optional API features are available on current PiOrchestrator instance.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| feature | string | Yes | Feature identifier (e.g., "wifi", "cameras", "door") |
| available | boolean | Yes | Whether the feature API is reachable |
| lastChecked | Date | Yes | When availability was last checked |
| errorCode | string | No | Last error code if unavailable |

**Detection Logic**:
```typescript
// Feature is unavailable if endpoint returns 404 or 503
function isFeatureUnavailable(error: unknown): boolean {
  return ApiError.isApiError(error) &&
         (error.status === 404 || error.status === 503);
}
```

**State Transitions**:
```
unknown → available (successful API call)
unknown → unavailable (404/503 received)
available → unavailable (subsequent 404/503)
unavailable → available (subsequent success)
```

**Features Tracked**:
| Feature | Required | Endpoints |
|---------|----------|-----------|
| cameras | Yes | `/api/v1/cameras/*` |
| door | Yes | `/api/dashboard/door/*` |
| system | Yes | `/api/system/*` |
| wifi | No | `/api/wifi/*` |

---

## Existing Entities (No Changes)

The following existing entities remain unchanged:

### Camera
- **Location**: `src/domain/types/entities.ts`
- **Relevance**: Camera list display is P1 priority; loading/empty/error states apply

### WifiNetwork
- **Location**: `src/infrastructure/api/schemas.ts`
- **Relevance**: WiFi features may be unavailable (404); graceful degradation

### DoorStatus
- **Location**: `src/infrastructure/api/schemas.ts`
- **Relevance**: Door status display; error handling applies

### SystemInfo
- **Location**: `src/infrastructure/api/schemas.ts`
- **Relevance**: System info display; error handling applies

---

## API Error Code Mapping

### HTTP Status to Error Code

| Status | Error Code | Retryable | User Message |
|--------|------------|-----------|--------------|
| 0 | `NETWORK_ERROR` | Yes | "Unable to connect. Check your network." |
| 400 | `BAD_REQUEST` | No | "Invalid request. Please try again." |
| 401 | `UNAUTHORIZED` | No | "Session expired. Please refresh." |
| 403 | `FORBIDDEN` | No | "Access denied." |
| 404 | `NOT_FOUND` | No | "Feature not available." |
| 408 | `TIMEOUT` | Yes | "Request timed out. Retrying..." |
| 500 | `SERVER_ERROR` | Yes | "Server error. Retrying..." |
| 502 | `BAD_GATEWAY` | Yes | "Service temporarily unavailable." |
| 503 | `SERVICE_UNAVAILABLE` | No* | "Feature not available on this device." |
| 504 | `GATEWAY_TIMEOUT` | Yes | "Server took too long to respond." |

*Note: 503 is not retried because it indicates the feature endpoint doesn't exist in this PiOrchestrator build.

---

## Relationships

```
┌─────────────────┐
│   Component     │
│ (Presentation)  │
└────────┬────────┘
         │ uses
         ▼
┌─────────────────┐     ┌─────────────────────┐
│  React Query    │────▶│   LoadingState      │
│   (Hook)        │     │ (idle/loading/...)  │
└────────┬────────┘     └─────────────────────┘
         │ calls
         ▼
┌─────────────────┐     ┌─────────────────────┐
│   API Client    │────▶│   APIError          │
│(Infrastructure) │     │ (on failure)        │
└────────┬────────┘     └─────────────────────┘
         │ checks
         ▼
┌─────────────────┐
│Feature Available│
│   (optional)    │
└─────────────────┘
```

---

## Implementation Notes

### 1. No New Zod Schemas Required
- Existing schemas in `src/infrastructure/api/schemas.ts` cover all API responses
- APIError is a class, not a schema (errors are thrown, not parsed)

### 2. LoadingState is Derived
- Not stored anywhere; computed from React Query state
- Components implement the state logic directly

### 3. FeatureAvailability is Lightweight
- Can be a simple object or React Query query result
- No persistence required; re-checked on app load

### 4. Backward Compatibility
- All changes enhance existing behavior
- No breaking changes to current API contracts
