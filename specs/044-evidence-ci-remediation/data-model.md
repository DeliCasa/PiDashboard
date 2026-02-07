# Data Model: Evidence UI & CI Remediation

**Feature**: 044-evidence-ci-remediation
**Date**: 2026-02-04
**Status**: Reference (existing types)

## Overview

This feature uses **existing data models** from the codebase. No new entities are required. This document serves as a reference to the relevant types and their locations.

---

## Core Entities

### Evidence

**Location**: `src/domain/types/camera-diagnostics.ts`

```typescript
/**
 * Evidence capture from an ESP32-CAM device
 * Represents a single captured image with metadata
 */
interface CapturedEvidence {
  id: string;                    // Unique evidence identifier
  camera_id: string;             // Source camera (device_id pattern: espcam-XXXXXX)
  session_id: string | null;     // Associated monitoring session (optional)
  captured_at: string;           // RFC3339 timestamp
  image_base64: string;          // JPEG image data (base64 encoded)
  thumbnail_url?: string;        // Presigned S3 URL for thumbnail
  full_url?: string;             // Presigned S3 URL for full image
  expires_at?: string;           // URL expiration timestamp
  size_bytes?: number;           // Image size in bytes
  content_type: string;          // MIME type (image/jpeg)
}
```

**Zod Schema**: `src/infrastructure/api/diagnostics-schemas.ts`
```typescript
export const CapturedEvidenceSchema = z.object({
  id: z.string(),
  camera_id: z.string().regex(CAMERA_ID_PATTERN),
  session_id: z.string().nullable(),
  captured_at: z.string(),
  image_base64: z.string(),
  thumbnail_url: z.string().optional(),
  full_url: z.string().optional(),
  expires_at: z.string().optional(),
  size_bytes: z.number().optional(),
  content_type: z.string(),
});
```

---

### Session

**Location**: `src/infrastructure/api/diagnostics-schemas.ts`

```typescript
/**
 * Monitoring session with evidence captures
 */
interface Session {
  id: string;                    // Session identifier
  delivery_id?: string;          // Associated delivery (optional)
  started_at: string;            // RFC3339 start timestamp
  ended_at?: string;             // RFC3339 end timestamp (null if active)
  status: SessionStatus;         // 'active' | 'completed' | 'cancelled'
  capture_count: number;         // Number of evidence captures
  last_capture_at?: string;      // Most recent capture timestamp
}

type SessionStatus = 'active' | 'completed' | 'cancelled';
```

**Zod Schema**:
```typescript
export const SessionStatusSchema = z.enum(['active', 'completed', 'cancelled']);

export const SessionSchema = z.object({
  id: z.string(),
  delivery_id: z.string().optional(),
  started_at: z.string(),
  ended_at: z.string().optional(),
  status: SessionStatusSchema,
  capture_count: z.number(),
  last_capture_at: z.string().optional(),
});
```

**Extended Type** (with computed field):
```typescript
interface SessionWithStale extends Session {
  is_stale: boolean;  // Computed: last_capture_at > 5 minutes ago
}
```

---

### Container

**Location**: `src/domain/types/containers.ts`

```typescript
/**
 * Logical grouping for cameras
 * ID is opaque - never assume semantic meaning
 */
interface Container {
  /** Opaque container ID (UUID or similar) - never assume semantic meaning */
  id: string;
  label?: string;                // Human-readable name (max 100 chars)
  description?: string;          // Optional description
  created_at: string;            // RFC3339 timestamp
  updated_at: string;            // RFC3339 timestamp
}

interface ContainerDetail extends Container {
  cameras: CameraAssignment[];   // Assigned cameras (0-4)
  camera_count: number;          // Total assigned (0-4)
  online_count: number;          // Currently online cameras
}

/** Camera position in container (1-4) */
type CameraPosition = 1 | 2 | 3 | 4;

interface CameraAssignment {
  device_id: string;             // Camera identifier (MAC address)
  position: CameraPosition;      // Slot position (1-4)
  assigned_at: string;           // RFC3339 assignment timestamp
  status?: CameraStatus;         // Denormalized camera status
  name?: string;                 // Denormalized camera name
}
```

**Zod Schema**: `src/infrastructure/api/v1-containers-schemas.ts`

---

### PresignedUrl

**Location**: `src/infrastructure/api/diagnostics-schemas.ts`

```typescript
/**
 * Response from URL refresh endpoint
 */
interface PresignResponse {
  url: string;                   // Fresh presigned URL
  expires_at: string;            // New expiration timestamp
}
```

**Zod Schema**:
```typescript
export const PresignResponseSchema = z.object({
  url: z.string().url(),
  expires_at: z.string(),
});
```

---

## Entity Relationships

```
┌─────────────────┐       ┌─────────────────┐
│    Container    │       │     Session     │
│─────────────────│       │─────────────────│
│ id (opaque)     │       │ id              │
│ label           │       │ status          │
│ description     │       │ capture_count   │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ has 0-4                 │ has 0-n
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│CameraAssignment │       │ CapturedEvidence│
│─────────────────│       │─────────────────│
│ device_id       │◄──────│ camera_id       │
│ position (1-4)  │       │ session_id      │
│ status          │       │ image_base64    │
└─────────────────┘       │ thumbnail_url   │
                          │ expires_at      │
                          └─────────────────┘
```

---

## API Contracts Reference

All API contracts are defined in existing schema files. No new endpoints are added by this feature.

### Evidence Endpoints

| Endpoint | Method | Request | Response | Schema File |
|----------|--------|---------|----------|-------------|
| `/v1/cameras/{id}/evidence` | POST | `CaptureEvidenceRequest` | `CapturedEvidence` | `diagnostics-schemas.ts` |
| `/dashboard/diagnostics/sessions/{id}/evidence` | GET | Query params | `EvidenceListResponse` | `diagnostics-schemas.ts` |
| `/dashboard/diagnostics/images/presign` | GET | Query params | `PresignResponse` | `diagnostics-schemas.ts` |

### Session Endpoints

| Endpoint | Method | Request | Response | Schema File |
|----------|--------|---------|----------|-------------|
| `/dashboard/diagnostics/sessions` | GET | Query params | `SessionListResponse` | `diagnostics-schemas.ts` |
| `/dashboard/diagnostics/sessions/{id}` | GET | - | `Session` | `diagnostics-schemas.ts` |

### Container Endpoints

| Endpoint | Method | Request | Response | Schema File |
|----------|--------|---------|----------|-------------|
| `/v1/containers` | GET | - | `ContainerListResponse` | `v1-containers-schemas.ts` |
| `/v1/containers/{id}` | GET | - | `ContainerDetail` | `v1-containers-schemas.ts` |
| `/v1/containers` | POST | `CreateContainerRequest` | `Container` | `v1-containers-schemas.ts` |
| `/v1/containers/{id}` | PATCH | `UpdateContainerRequest` | `Container` | `v1-containers-schemas.ts` |
| `/v1/containers/{id}` | DELETE | - | - | - |
| `/v1/containers/{id}/cameras` | POST | `AssignCameraRequest` | `ContainerDetail` | `v1-containers-schemas.ts` |
| `/v1/containers/{id}/cameras/{position}` | DELETE | - | `ContainerDetail` | `v1-containers-schemas.ts` |

---

## Validation Rules

### Evidence Validation
- `camera_id` must match pattern `^espcam-[0-9a-f]{6}$`
- `captured_at` must be valid RFC3339 timestamp
- `image_base64` must be valid base64-encoded JPEG
- `expires_at` determines URL freshness (15-minute default TTL)

### Session Validation
- `status` must be one of: `active`, `completed`, `cancelled`
- `capture_count` must be non-negative integer
- `is_stale` computed as: `last_capture_at` > 5 minutes ago

### Container Validation
- `id` treated as opaque string (no format validation)
- `label` max length: 100 characters
- `cameras` array max length: 4
- `position` must be 1, 2, 3, or 4

---

## State Transitions

### Session Status
```
       start
         │
         ▼
    ┌─────────┐
    │  active │──────► captured evidence
    └────┬────┘
         │
    end/cancel
         │
    ┌────┴────┐
    ▼         ▼
completed  cancelled
```

### Evidence URL Lifecycle
```
    capture
       │
       ▼
  fresh URL ──────► expired (>15 min)
       │                  │
       │                  │ refresh
       │                  ▼
       └────────── fresh URL
```

---

## File Locations Summary

| Entity | Domain Type | Zod Schema | API Client | Hook |
|--------|-------------|------------|------------|------|
| Evidence | `camera-diagnostics.ts` | `diagnostics-schemas.ts` | `evidence.ts` | `useEvidence.ts` |
| Session | `diagnostics-schemas.ts` | Same | `sessions.ts` | `useSessions.ts` |
| Container | `containers.ts` | `v1-containers-schemas.ts` | `v1-containers.ts` | `useContainers.ts` |
