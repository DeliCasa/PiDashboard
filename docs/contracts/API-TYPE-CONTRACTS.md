# PiOrchestrator ↔ PiDashboard API Type Contracts

**Version**: 1.1.0
**Last Updated**: 2026-02-04
**Status**: ENFORCED

This document defines the **canonical type contracts** between PiOrchestrator (Go backend) and PiDashboard (TypeScript frontend). Both projects MUST adhere to these contracts.

## CRITICAL Rules

1. **PiOrchestrator is the source of truth** - Go structs define the canonical API response format
2. **PiDashboard MUST validate** - Zod schemas MUST match PiOrchestrator responses exactly
3. **API routes MUST return JSON** - Never HTML, even for 404 errors on `/api/*` paths
4. **Breaking changes require coordination** - Update both projects simultaneously

---

## CameraStatus Enum

**Source**: `PiOrchestrator/internal/domain/entities/camera.go` + `camera_device.go`

| Value | Description | Context |
|-------|-------------|---------|
| `online` | Camera actively communicating | Normal operation |
| `offline` | Camera not responding | Lost connection |
| `error` | Camera in error state | Has error_message |
| `discovered` | Found via mDNS, not paired | Pre-pairing |
| `pairing` | Token exchange in progress | During onboard |
| `connecting` | Joining WiFi network | During provision |
| `rebooting` | Camera rebooting (requested) | After reboot cmd |

**Go Definition**:
```go
type CameraStatus string

const (
    CameraStatusOnline     CameraStatus = "online"
    CameraStatusOffline    CameraStatus = "offline"
    CameraStatusError      CameraStatus = "error"
    CameraStatusDiscovered CameraStatus = "discovered"
    CameraStatusPairing    CameraStatus = "pairing"
    CameraStatusConnecting CameraStatus = "connecting"
)
```

**TypeScript Definition** (PiDashboard):
```typescript
export const CameraStatusSchema = z.enum([
  'online', 'offline', 'error', 'rebooting',
  'discovered', 'pairing', 'connecting',
]);
export type CameraStatus = z.infer<typeof CameraStatusSchema>;
```

---

## CameraDevice Entity

**Source**: `PiOrchestrator/internal/domain/entities/camera_device.go`
**Endpoint**: `GET /api/v1/espcam/paired`

**Go Struct**:
```go
type CameraDevice struct {
    MACAddress      string       `json:"mac_address"`
    ContainerID     string       `json:"container_id"`
    Position        int          `json:"position"`
    Status          CameraStatus `json:"status"`
    FirmwareVersion string       `json:"firmware_version"`
    SignalStrength  int          `json:"signal_strength"`
    LastImage       time.Time    `json:"last_image"`
    PairedAt        time.Time    `json:"paired_at"`
    LastSeen        time.Time    `json:"last_seen"`
    Name            string       `json:"name,omitempty"`
    ErrorMessage    string       `json:"error_message,omitempty"`
}
```

**TypeScript Schema** (PiDashboard):
```typescript
export const CameraDeviceSchema = z.object({
  mac_address: z.string(),
  container_id: z.string(),
  position: z.number().min(1).max(4),
  status: CameraStatusSchema,
  firmware_version: z.string(),
  signal_strength: z.number(),
  last_image: z.string(),
  paired_at: z.string(),
  last_seen: z.string(),
  name: z.string().optional(),
  error_message: z.string().optional(),
});
```

---

## API Response Envelope

**ALL** API responses use this envelope pattern:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  timestamp: string; // ISO 8601
}
```

**Example Success**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-01-22T15:00:00Z"
}
```

**Example Error**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Camera not found",
    "retryable": false
  },
  "timestamp": "2026-01-22T15:00:00Z"
}
```

---

## GET /api/v1/espcam/paired Response

**Response Type**: `ApiResponse<PairedCamerasData>`

```typescript
interface PairedCamerasData {
  cameras: CameraDevice[];
  total: number;
  online_count: number;
}
```

---

## Auto-Onboard Types

### AutoOnboardStatus

**Endpoint**: `GET /api/v1/onboarding/auto/status`

```typescript
interface AutoOnboardStatus {
  enabled: boolean;
  mode: "off" | "dev";
  running?: boolean;
  config: {
    max_per_minute: number;
    burst_size: number;
    subnet_allowlist: string[];
    verification_timeout_sec: number;
  };
  metrics?: {
    attempts: number;
    success: number;
    failed: number;
    rejected_by_policy: number;
    already_onboarded: number;
    last_success_at?: string;
    last_failure_at?: string;
  };
}
```

### OnboardingAuditEntry

**Endpoint**: `GET /api/v1/onboarding/auto/events`

```typescript
interface OnboardingAuditEntry {
  id: number;
  mac_address: string;
  stage: "discovered" | "verified" | "registered" | "paired" | "failed" | "rejected_by_policy";
  outcome: "success" | "failure";
  error_code?: string;
  error_message?: string;
  device_id?: string;
  ip_address?: string;
  firmware_version?: string;
  container_id?: string;
  duration_ms?: number;
  timestamp: string;
}
```

---

## Validation Rules

### PiOrchestrator (Go)
- JSON tags use `snake_case`
- Optional fields have `omitempty` tag
- Time fields are `time.Time` (serialized as ISO 8601)
- All API handlers use `response.Success()` or `response.Error()`

### PiDashboard (TypeScript)
- Zod schemas MUST match Go struct JSON tags exactly
- Use `.optional()` for `omitempty` fields
- Use `z.string()` for datetime fields (parse on use)
- Validate all API responses before use

---

## Adding New Types

1. **Define in PiOrchestrator** - Create Go struct with JSON tags
2. **Document in this file** - Add Go and TypeScript definitions
3. **Implement in PiDashboard** - Create Zod schema matching exactly
4. **Test contract** - Verify actual API response matches schema

---

## File Locations

| Project | Type Definitions |
|---------|------------------|
| PiOrchestrator | `internal/domain/entities/*.go` |
| PiDashboard | `src/infrastructure/api/*-schemas.ts` |
| PiDashboard | `src/domain/types/entities.ts` |

---

## Container Management Types

### CameraPosition

**Type**: Union literal `1 | 2 | 3 | 4`

Represents valid camera positions within a container (2x2 grid).

**TypeScript Definition** (PiDashboard):
```typescript
export const CameraPositionSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type CameraPosition = z.infer<typeof CameraPositionSchema>;
```

---

### Container Entity

**Source**: PiOrchestrator (expected)
**Endpoint**: `GET /api/v1/containers`

**TypeScript Schema** (PiDashboard):
```typescript
export const ContainerSchema = z.object({
  id: z.string().min(1),           // Opaque container ID (UUID-like)
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  created_at: z.string(),          // ISO 8601 timestamp
  updated_at: z.string(),          // ISO 8601 timestamp
});
export type Container = z.infer<typeof ContainerSchema>;
```

---

### CameraAssignment Entity

Represents a camera assigned to a container position.

**TypeScript Schema** (PiDashboard):
```typescript
export const CameraAssignmentSchema = z.object({
  device_id: z.string().min(1),    // Camera device ID (MAC address)
  position: CameraPositionSchema,   // Position 1-4
  assigned_at: z.string(),         // ISO 8601 timestamp
  status: CameraStatusSchema.optional(),  // Denormalized camera status
  name: z.string().optional(),     // Denormalized camera name
});
export type CameraAssignment = z.infer<typeof CameraAssignmentSchema>;
```

---

### ContainerDetail Entity

Container with full camera assignment details.

**TypeScript Schema** (PiDashboard):
```typescript
export const ContainerDetailSchema = ContainerSchema.extend({
  cameras: z.array(CameraAssignmentSchema),
  camera_count: z.number().min(0).max(4),
  online_count: z.number().min(0).max(4),
});
export type ContainerDetail = z.infer<typeof ContainerDetailSchema>;
```

---

### Container API Endpoints

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/v1/containers` | GET | - | `ApiResponse<ContainerListData>` |
| `/api/v1/containers` | POST | `CreateContainerRequest` | `ApiResponse<ContainerDetail>` |
| `/api/v1/containers/:id` | GET | - | `ApiResponse<ContainerDetail>` |
| `/api/v1/containers/:id` | PATCH | `UpdateContainerRequest` | `ApiResponse<ContainerDetail>` |
| `/api/v1/containers/:id` | DELETE | - | `ApiResponse<void>` |
| `/api/v1/containers/:id/cameras` | POST | `AssignCameraRequest` | `ApiResponse<CameraAssignment>` |
| `/api/v1/containers/:id/cameras/:device_id` | DELETE | - | `ApiResponse<void>` |
| `/api/v1/cameras/unassigned` | GET | - | `ApiResponse<CameraListData>` |

---

### Container Request Schemas

**CreateContainerRequest**:
```typescript
export const CreateContainerRequestSchema = z.object({
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});
```

**UpdateContainerRequest**:
```typescript
export const UpdateContainerRequestSchema = z.object({
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});
```

**AssignCameraRequest**:
```typescript
export const AssignCameraRequestSchema = z.object({
  device_id: z.string().min(1),
  position: CameraPositionSchema,
});
```

---

### Container Response Envelopes

**ContainerListData**:
```typescript
export const ContainerListDataSchema = z.object({
  containers: z.array(ContainerDetailSchema),
  total: z.number().nonnegative(),
});
```

---

### Container Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `CONTAINER_NOT_FOUND` | Container ID does not exist | No |
| `CONTAINER_HAS_CAMERAS` | Cannot delete container with assigned cameras | No |
| `POSITION_OCCUPIED` | Target position already has a camera | No |
| `CAMERA_ALREADY_ASSIGNED` | Camera assigned to another container | No |
| `INVALID_POSITION` | Position must be 1-4 | No |
| `VALIDATION_FAILED` | Request validation error | No |
| `INTERNAL_ERROR` | Server error | Yes |

**TypeScript Definition**:
```typescript
export const ContainerErrorCodeSchema = z.enum([
  'CONTAINER_NOT_FOUND',
  'CONTAINER_HAS_CAMERAS',
  'POSITION_OCCUPIED',
  'CAMERA_ALREADY_ASSIGNED',
  'INVALID_POSITION',
  'VALIDATION_FAILED',
  'INTERNAL_ERROR',
]);
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-02-04 | Added Container Management API types |
| 1.0.0 | 2026-01-22 | Initial contract documentation |
