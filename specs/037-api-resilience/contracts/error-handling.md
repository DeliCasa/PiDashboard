# Contract: Error Handling Behavior

**Feature**: 037-api-resilience
**Date**: 2026-01-25
**Type**: Behavioral Contract (not API schema)

## Overview

This contract defines expected error handling behavior across the PiDashboard application.

## 1. HTTP Status Code Handling

### Required Behavior by Status Code

| Status | Category | Retry | Console Log | User Notification | UI State |
|--------|----------|-------|-------------|-------------------|----------|
| 200-299 | Success | N/A | No | No | Success |
| 400 | Bad Request | No | Yes (warn) | Toast | Error |
| 401 | Unauthorized | No | Yes (warn) | Toast + redirect | Error |
| 403 | Forbidden | No | Yes (warn) | Toast | Error |
| 404 | Not Found | No | No* | No* | Empty or Unavailable |
| 408 | Timeout | Yes (3x) | Yes (warn) | Toast after retries | Error |
| 429 | Rate Limited | Yes (with backoff) | Yes (warn) | Toast | Error |
| 500 | Server Error | Yes (3x) | Yes (error) | Toast after retries | Error |
| 502 | Bad Gateway | Yes (3x) | Yes (error) | Toast after retries | Error |
| 503 | Service Unavailable | No* | No* | No* | Unavailable |
| 504 | Gateway Timeout | Yes (3x) | Yes (error) | Toast after retries | Error |

*Note: 404 and 503 on optional endpoints (WiFi) are treated as "feature unavailable" - no errors logged.

### Retry Configuration

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,      // 1 second
  maxDelay: 10000,      // 10 seconds
  backoffMultiplier: 2, // Exponential backoff

  // Status codes that trigger retry
  retryableStatuses: [408, 429, 500, 502, 504],

  // Status codes that never retry
  nonRetryableStatuses: [400, 401, 403, 404, 503],
};
```

---

## 2. Network Error Handling

### Error Types and Behavior

| Error Type | Condition | Retry | Console Log | User Message |
|------------|-----------|-------|-------------|--------------|
| ConnectionFailed | `navigator.onLine === false` | Yes | Yes (warn) | "No internet connection" |
| ConnectionReset | TCP connection dropped | Yes | Yes (warn) | "Connection lost. Retrying..." |
| Timeout | No response within 10s | Yes | Yes (warn) | "Request timed out" |
| DNS Failure | Cannot resolve hostname | Yes | Yes (warn) | "Cannot reach server" |
| CORS Error | Cross-origin blocked | No | Yes (error) | "Configuration error" |

### Timeout Configuration

```typescript
const TIMEOUT_CONFIG = {
  default: 10000,       // 10 seconds for most requests
  capture: 30000,       // 30 seconds for camera capture
  upload: 60000,        // 60 seconds for file uploads
};
```

---

## 3. UI State Contracts

### Camera List States

| State | API Response | UI Behavior | Test ID |
|-------|--------------|-------------|---------|
| Loading | Pending | Spinner + "Loading cameras..." | `camera-loading` |
| Success | `{ cameras: [...] }` | Camera grid | `camera-grid` |
| Empty | `{ cameras: [] }` | "No cameras connected" message | `camera-empty` |
| Error | 500/502/network | Error message + Retry button | `camera-error` |
| Unavailable | 404/503 | "Camera feature not available" | `camera-unavailable` |

**Critical Rule**: "No cameras connected" MUST ONLY appear when API returns empty array, NEVER on error.

### WiFi Feature States

| State | API Response | UI Behavior | Test ID |
|-------|--------------|-------------|---------|
| Loading | Pending | Spinner | `wifi-loading` |
| Success | Networks list | Network list | `wifi-networks` |
| Empty | `{ networks: [] }` | "No networks found" | `wifi-empty` |
| Unavailable | 404/503 | Hide WiFi tab or show "Not available" | `wifi-unavailable` |
| Error | 500/502 | Error message (rare - usually unavailable) | `wifi-error` |

**Critical Rule**: WiFi 404/503 MUST NOT produce console errors or toast notifications.

### Door Status States

| State | API Response | UI Behavior | Test ID |
|-------|--------------|-------------|---------|
| Loading | Pending | Skeleton loader | `door-loading` |
| Open | `{ state: "open" }` | Open indicator | `door-open` |
| Closed | `{ state: "closed" }` | Closed indicator | `door-closed` |
| Locked | `{ state: "locked" }` | Locked indicator | `door-locked` |
| Error | 500/network | "Status unavailable" + last known state | `door-error` |

### System Info States

| State | API Response | UI Behavior | Test ID |
|-------|--------------|-------------|---------|
| Loading | Pending | Skeleton metrics | `system-loading` |
| Success | Metrics object | Metric cards | `system-metrics` |
| Error | 500/network | "Unable to load" + Retry | `system-error` |

---

## 4. Console Logging Contract

### Allowed Console Outputs

| Level | When | Format |
|-------|------|--------|
| `console.info` | Feature unavailable (404/503) | `[WiFi API] Scan endpoint not available` |
| `console.warn` | Zod validation warning | `[API Contract] Validation failed: ...` |
| `console.warn` | Retry attempt | `[API] Retry attempt 2/3 for /api/...` |
| `console.error` | Unrecoverable error | `[API] Request failed: ...` |

### Forbidden Console Outputs

| Condition | Forbidden Output |
|-----------|------------------|
| WiFi endpoint 404 | `console.error(...)` |
| Expected empty response | `console.error(...)` |
| Successful retry | `console.error(...)` for original failure |
| E2E test context | Any non-`[API Contract]` warnings |

---

## 5. E2E Test Contracts

### Mock Response Shapes

```typescript
// Success with cameras
{ cameras: [{ id: '...', name: '...', status: 'online', ... }] }

// Empty cameras
{ cameras: [] }

// Error response
{ status: 500, body: { error: 'Internal server error' } }

// Network abort
route.abort('connectionfailed')
```

### Required Test Coverage

| Scenario | Test File | Priority |
|----------|-----------|----------|
| Camera list with data | `cameras-resilience.spec.ts` | P1 |
| Camera list empty | `cameras-resilience.spec.ts` | P1 |
| Camera list error | `cameras-resilience.spec.ts` | P1 |
| WiFi 404 graceful | `wifi-degradation.spec.ts` | P2 |
| Door status error | `door-resilience.spec.ts` | P2 |
| System info error | `system-resilience.spec.ts` | P3 |
| Network offline | `resilience.spec.ts` | P2 |

### CI Artifact Requirements

| Artifact | Condition | Retention |
|----------|-----------|-----------|
| HTML Report | Always | 30 days |
| Trace files | On failure | 7 days |
| Video | On failure | 7 days |
| Screenshots | On failure | 7 days |

---

## 6. Acceptance Criteria Mapping

| Requirement | Contract Section | Verification |
|-------------|------------------|--------------|
| FR-004 (Error normalization) | §1 HTTP Status | Unit test |
| FR-005 (Loading/empty/error) | §3 Camera States | E2E test |
| FR-006 (No false "No cameras") | §3 Critical Rule | E2E test |
| FR-007 (WiFi 404 = unavailable) | §3 WiFi States | E2E test |
| FR-008 (No 404 console errors) | §4 Forbidden | E2E test |
| SC-001 (Cameras displayed) | §3 Camera Success | E2E test |
| SC-003 (Zero WiFi errors) | §4 Forbidden | E2E test |
