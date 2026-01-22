# Data Model: API Compatibility Integration (028)

**Feature**: 001-api-compat-integration
**Date**: 2026-01-11
**Source**: Extracted from existing TypeScript types in `src/domain/types/`

## Overview

This document captures the data model for the 028 API compatibility integration. These types already exist in the codebase; this serves as reference documentation.

---

## V1 API Response Envelope

All V1 API responses follow a standard envelope structure.

### V1Response<T>

```typescript
interface V1Response<T> {
  success: boolean;
  data?: T;                    // Present when success=true
  error?: V1Error;             // Present when success=false
  correlation_id: string;      // UUID for request tracing
  timestamp: string;           // ISO8601 timestamp
}
```

**Relationships**: Wraps all V1 API responses. Either `data` or `error` is present based on `success`.

### V1Error

```typescript
interface V1Error {
  code: string;                // Machine-readable error code (e.g., "VALIDATION_FAILED")
  message: string;             // Human-readable error message
  retryable: boolean;          // Whether client should retry
  retry_after_seconds?: number; // Wait time before retry (if retryable)
  details?: string;            // Additional error context
}
```

**Validation Rules**:
- `code` must be a known error code from the registry
- `retry_after_seconds` is only meaningful when `retryable=true`

---

## Provisioning Entities

### DeviceAllowlistEntry

```typescript
interface DeviceAllowlistEntry {
  mac: string;                 // MAC address (format: AA:BB:CC:DD:EE:FF)
  description?: string;        // Human-readable device name
  container_id?: string;       // Associated container ID
  added_at: string;            // ISO8601 timestamp
  used: boolean;               // Whether device has been provisioned
}
```

**Validation Rules**:
- `mac` must be valid MAC address format
- `added_at` must be valid ISO8601

### BatchProvisioningSession

```typescript
interface BatchProvisioningSession {
  id: string;                  // UUID
  state: SessionState;         // Current session state
  network_interface: string;   // Network interface being used
  created_at: string;          // ISO8601 timestamp
  updated_at: string;          // ISO8601 timestamp
  device_count: number;        // Total devices discovered
  provisioned_count: number;   // Devices successfully provisioned
  failed_count: number;        // Devices that failed provisioning
}

type SessionState = 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
```

**State Transitions**:
- `active` → `paused` (user pause)
- `active` → `completed` (all devices provisioned)
- `active` → `failed` (unrecoverable error)
- `active` → `cancelled` (user cancel)
- `paused` → `active` (user resume)

### SessionDevice

```typescript
interface SessionDevice {
  mac: string;                 // Device MAC address
  name?: string;               // Device advertised name
  state: DeviceState;          // Current provisioning state
  rssi?: number;               // Signal strength (dBm)
  error_message?: string;      // Last error if any
  retry_count: number;         // Number of retry attempts
  discovered_at: string;       // ISO8601 timestamp
  provisioned_at?: string;     // ISO8601 timestamp (if successful)
}

type DeviceState =
  | 'discovered'
  | 'connecting'
  | 'provisioning'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'skipped';
```

**Validation Rules**:
- `retry_count` >= 0
- `provisioned_at` only set when `state='verified'`

---

## List Response Wrappers

### AllowlistData

```typescript
interface AllowlistData {
  entries: DeviceAllowlistEntry[];  // Always array, never null
  count?: number;                   // Total count (optional)
}
```

**Normalization**: API guarantees `entries` is `[]` not `null`. Frontend adds defensive `ensureArray()` for legacy compatibility.

### RecoverableSessionsData

```typescript
interface RecoverableSessionsData {
  sessions: BatchProvisioningSession[];  // Always array, never null
}
```

**Normalization**: Same defensive pattern as AllowlistData.

### DevicesData

```typescript
interface DevicesData {
  devices: SessionDevice[];  // Always array, never null
  count?: number;
}
```

**Normalization**: Same defensive pattern.

---

## SSE Event Types

### SSEEvent

```typescript
interface SSEEvent {
  version: string;            // Event format version (e.g., "1.0")
  type: EventType;            // Event type identifier
  timestamp: string;          // ISO8601 timestamp
  session_id?: string;        // Associated session (if any)
  payload: unknown;           // Event-specific payload
}

type EventType =
  | 'connection.established'
  | 'device.discovered'
  | 'device.state_changed'
  | 'session.state_changed'
  | 'error';
```

---

## Normalization Utilities

### ensureArray<T>

```typescript
function ensureArray<T>(value: T[] | null | undefined | unknown): T[]
```

**Purpose**: Guarantees return value is always an array, handling:
- `null` → `[]`
- `undefined` → `[]`
- Non-array objects → `[]`
- Valid arrays → unchanged

### ensureObject<T>

```typescript
function ensureObject<T extends Record<string, unknown>>(
  value: T | null | undefined | unknown
): T | null
```

**Purpose**: Guarantees return value is a proper object or null.

---

## Entity Relationship Diagram

```
V1Response<T>
    │
    ├── success=true ─→ data: T
    │                      │
    │                      ├── AllowlistData
    │                      │       └── entries: DeviceAllowlistEntry[]
    │                      │
    │                      ├── RecoverableSessionsData
    │                      │       └── sessions: BatchProvisioningSession[]
    │                      │
    │                      └── DevicesData
    │                              └── devices: SessionDevice[]
    │
    └── success=false ─→ error: V1Error
```

---

## Source Files

| Type | Location |
|------|----------|
| V1Response, V1Error | `src/domain/types/v1-api.ts` |
| DeviceAllowlistEntry | `src/domain/types/provisioning.ts` |
| BatchProvisioningSession | `src/domain/types/provisioning.ts` |
| SessionDevice | `src/domain/types/provisioning.ts` |
| Normalization utilities | `src/lib/normalize.ts` |
