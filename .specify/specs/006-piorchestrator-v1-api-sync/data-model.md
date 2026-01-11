# Data Model: PiOrchestrator V1 API Sync

> **Feature**: 006-piorchestrator-v1-api-sync  
> **Created**: 2026-01-11  
> **Status**: Complete

---

## Overview

This document defines the new TypeScript types required for V1 API integration, including response envelopes, batch provisioning entities, and SSE event types.

---

## 1. V1 Response Envelopes

### V1SuccessResponse

Generic wrapper for successful V1 API responses.

```typescript
interface V1SuccessResponse<T> {
  success: true;
  data: T;
  correlation_id: string;  // UUID for request tracing
  timestamp: string;       // ISO8601/RFC3339
}
```

### V1ErrorResponse

Structured error response with retry guidance.

```typescript
interface V1ErrorResponse {
  success: false;
  error: V1Error;
  correlation_id: string;
  timestamp: string;
}

interface V1Error {
  code: string;              // Machine-readable error code
  message: string;           // Human-readable message from backend
  retryable: boolean;        // Should client retry?
  retry_after_seconds?: number;  // Wait time before retry
  details?: string;          // Additional context
}
```

### V1Response (Union)

Combined type for response handling.

```typescript
type V1Response<T> = V1SuccessResponse<T> | V1ErrorResponse;
```

---

## 2. Error Codes

### ErrorCode Enum

All known error codes from PiOrchestrator.

```typescript
type ErrorCode =
  // Session Errors
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_ALREADY_ACTIVE'
  | 'SESSION_ALREADY_CLOSED'
  | 'SESSION_NOT_RECOVERABLE'
  // Device Errors
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_NOT_IN_ALLOWLIST'
  | 'DEVICE_ALREADY_PROVISIONING'
  | 'DEVICE_INVALID_STATE'
  | 'MAX_RETRIES_EXCEEDED'
  // Auth Errors
  | 'TOTP_INVALID'
  | 'TOTP_EXPIRED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  // Communication Errors
  | 'DEVICE_UNREACHABLE'
  | 'DEVICE_REJECTED'
  | 'DEVICE_TIMEOUT'
  | 'CIRCUIT_OPEN'
  | 'VERIFICATION_TIMEOUT'
  // Infrastructure Errors
  | 'NETWORK_ERROR'
  | 'MQTT_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  // Validation Errors
  | 'VALIDATION_FAILED'
  | 'INVALID_REQUEST'
  | 'MISSING_PARAMETER';
```

---

## 3. Batch Provisioning Entities

### BatchProvisioningSession

Represents a batch provisioning session lifecycle.

```typescript
interface BatchProvisioningSession {
  id: string;                    // Format: sess_xxxxx
  state: SessionState;
  target_ssid: string;           // WiFi network being provisioned to
  created_at: string;            // ISO8601
  updated_at: string;            // ISO8601
  expires_at?: string;           // ISO8601, if set
  device_count: number;          // Total discovered devices
  provisioned_count: number;     // Successfully provisioned
  verified_count: number;        // Verified on target network
  failed_count: number;          // Failed devices
  config?: SessionConfig;        // Custom timeouts
}

type SessionState = 
  | 'discovering'   // Scanning for devices
  | 'active'        // Ready for provisioning
  | 'paused'        // Temporarily stopped
  | 'closing'       // Cleanup in progress
  | 'closed';       // Session ended
```

### SessionConfig

Optional timeout configuration.

```typescript
interface SessionConfig {
  discovery_timeout_seconds?: number;      // Default: 60
  provisioning_timeout_seconds?: number;   // Default: 120
  verification_timeout_seconds?: number;   // Default: 90
}
```

### ProvisioningCandidate

Device discovered during batch provisioning.

```typescript
interface ProvisioningCandidate {
  mac: string;                   // Primary key, format: AA:BB:CC:DD:EE:FF
  ip: string;                    // IP on onboarding network
  state: CandidateState;
  rssi: number;                  // Signal strength (negative dBm)
  firmware_version: string;
  discovered_at: string;         // ISO8601
  provisioned_at?: string;       // ISO8601, when provisioned
  verified_at?: string;          // ISO8601, when verified
  error_message?: string;        // Last error if failed
  retry_count: number;           // Number of retry attempts
  container_id?: string;         // Assigned container
  in_allowlist: boolean;         // Whether in allowlist
}

type CandidateState =
  | 'discovered'     // Found on network
  | 'provisioning'   // Currently being provisioned
  | 'provisioned'    // Credentials sent
  | 'verifying'      // Waiting for verification
  | 'verified'       // Successfully online
  | 'failed';        // Provisioning failed
```

### DeviceAllowlistEntry

Approved device for provisioning.

```typescript
interface DeviceAllowlistEntry {
  mac: string;                   // Format: AA:BB:CC:DD:EE:FF
  description?: string;          // Human-readable label
  container_id?: string;         // Assigned container
  added_at: string;              // ISO8601
  used: boolean;                 // Has been provisioned
  used_at?: string;              // ISO8601, when used
}
```

### NetworkStatus

Status of the onboarding network.

```typescript
interface NetworkStatus {
  ssid: string;                  // "DelicasaOnboard"
  is_active: boolean;
  connected_devices: number;
}
```

---

## 4. SSE Event Types

### SSEEventEnvelope

Versioned wrapper for all SSE events.

```typescript
interface SSEEventEnvelope<T> {
  version: '1.0';
  type: SSEEventType;
  timestamp: string;             // ISO8601
  session_id?: string;
  payload: T;
}

type SSEEventType =
  | 'connection.established'
  | 'connection.heartbeat'
  | 'session.status'
  | 'device.state_changed'
  | 'network.status_changed';
```

### Event Payloads

```typescript
// connection.established
interface ConnectionEstablishedPayload {
  message: string;
}

// connection.heartbeat
type HeartbeatPayload = null;

// session.status
interface SessionStatusPayload {
  session: BatchProvisioningSession;
}

// device.state_changed
interface DeviceStateChangedPayload {
  mac: string;
  previous_state: CandidateState;
  new_state: CandidateState;
  progress?: number;             // 0-100
  error?: string;
}

// network.status_changed
interface NetworkStatusChangedPayload {
  ssid: string;
  is_active: boolean;
  connected_devices: number;
}
```

---

## 5. WebSocket Monitoring Types

### MonitoringData

Real-time system metrics from WebSocket.

```typescript
interface MonitoringData {
  timestamp: string;
  system_health: SystemHealth;
  security_metrics: SecurityMetrics;
  service_status: ServiceStatus;
  network_metrics: NetworkMetrics;
  camera_status: Record<string, CameraStatus>;
  alerts_count: number;
  connected_clients: number;
}

interface SystemHealth {
  cpu_usage: number;             // 0-100%
  memory_usage: number;          // 0-100%
  disk_usage: number;            // 0-100%
  temperature: number;           // Celsius
  uptime: string;
  load_average: string;
}

interface SecurityMetrics {
  failed_ssh_attempts: number;
  last_security_check: string;
  certificate_expiry: string;
  mqtt_secure_connections: number;
  encryption_level: string;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface ServiceStatus {
  mqtt_connected: boolean;
  mqtt_secure: boolean;
  api_responding: boolean;
  database_connected: boolean;
  last_health_check: string;
  service_uptime: string;
}

interface NetworkMetrics {
  active_connections: number;
  bytes_received: number;
  bytes_sent: number;
  packet_loss: number;
  latency: number;
}
```

### WebSocket Messages

```typescript
type WebSocketMessage =
  | { type: 'initial_data'; data: MonitoringData }
  | { type: 'monitoring_update'; data: Partial<MonitoringData> }
  | { type: 'ping' }
  | { type: 'pong' };
```

---

## 6. API Request Types

### StartSessionRequest

```typescript
interface StartSessionRequest {
  target_ssid: string;           // Required - WiFi network
  target_password: string;       // Required - WiFi password
  config?: SessionConfig;        // Optional - custom timeouts
}
```

### AllowlistEntryRequest

```typescript
interface AllowlistEntryRequest {
  mac: string;                   // Required - format: AA:BB:CC:DD:EE:FF
  description?: string;          // Optional - human label
  container_id?: string;         // Optional - assigned container
}
```

---

## 7. API Response Types

### StartSessionData

```typescript
interface StartSessionData {
  session: BatchProvisioningSession;
  message: string;
}
```

### SessionData

```typescript
interface SessionData {
  session: BatchProvisioningSession;
  devices?: ProvisioningCandidate[];
  timeout_remaining?: string;
  network_status?: NetworkStatus;
}
```

### DevicesData

```typescript
interface DevicesData {
  devices: ProvisioningCandidate[];
}
```

### AllowlistData

```typescript
interface AllowlistData {
  entries: DeviceAllowlistEntry[];
}
```

### RecoverableSessionsData

```typescript
interface RecoverableSessionsData {
  sessions: BatchProvisioningSession[];
}
```

---

## 8. File Locations

### New Files

| File | Purpose |
|------|---------|
| `src/domain/types/provisioning.ts` | Batch provisioning entities |
| `src/domain/types/v1-api.ts` | V1 response envelope types |
| `src/domain/types/websocket.ts` | WebSocket monitoring types |

### Modified Files

| File | Change |
|------|--------|
| `src/domain/types/entities.ts` | Add re-exports |
| `src/domain/types/api.ts` | Add V1 request/response types |

---

## 9. Zod Schema Additions

### V1 Envelope Schemas

```typescript
// src/infrastructure/api/schemas.ts

export const V1ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  retry_after_seconds: z.number().optional(),
  details: z.string().optional(),
});

export const V1SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    correlation_id: z.string(),
    timestamp: z.string(),
  });

export const V1ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: V1ErrorSchema,
  correlation_id: z.string(),
  timestamp: z.string(),
});
```

### Provisioning Schemas

```typescript
export const SessionConfigSchema = z.object({
  discovery_timeout_seconds: z.number().optional(),
  provisioning_timeout_seconds: z.number().optional(),
  verification_timeout_seconds: z.number().optional(),
});

export const BatchProvisioningSessionSchema = z.object({
  id: z.string(),
  state: z.enum(['discovering', 'active', 'paused', 'closing', 'closed']),
  target_ssid: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  expires_at: z.string().optional(),
  device_count: z.number(),
  provisioned_count: z.number(),
  verified_count: z.number(),
  failed_count: z.number(),
  config: SessionConfigSchema.optional(),
});

export const CandidateStateSchema = z.enum([
  'discovered',
  'provisioning',
  'provisioned',
  'verifying',
  'verified',
  'failed',
]);

export const ProvisioningCandidateSchema = z.object({
  mac: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
  ip: z.string(),
  state: CandidateStateSchema,
  rssi: z.number(),
  firmware_version: z.string(),
  discovered_at: z.string(),
  provisioned_at: z.string().optional(),
  verified_at: z.string().optional(),
  error_message: z.string().optional(),
  retry_count: z.number(),
  container_id: z.string().optional(),
  in_allowlist: z.boolean(),
});

export const DeviceAllowlistEntrySchema = z.object({
  mac: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
  description: z.string().optional(),
  container_id: z.string().optional(),
  added_at: z.string(),
  used: z.boolean(),
  used_at: z.string().optional(),
});
```

### SSE Event Schemas

```typescript
export const SSEEventEnvelopeSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    version: z.literal('1.0'),
    type: z.string(),
    timestamp: z.string(),
    session_id: z.string().optional(),
    payload: payloadSchema,
  });

export const DeviceStateChangedSchema = z.object({
  mac: z.string(),
  previous_state: CandidateStateSchema,
  new_state: CandidateStateSchema,
  progress: z.number().optional(),
  error: z.string().optional(),
});
```
