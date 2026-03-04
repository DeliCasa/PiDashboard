# Data Model: PiOrchestrator Connect RPC Client Migration

**Feature**: 062-piorch-grpc-client
**Date**: 2026-03-03

## Entity Overview

This feature does not introduce new data entities. It changes the **transport layer** for existing entities from REST to Connect RPC. The entities below describe the proto-generated types that replace hand-maintained TypeScript interfaces.

## Proto-Generated Types (from @delicasa/wire)

### Camera (CameraService)

**Source**: `delicasa.device.v1.Camera`

| Field | Proto Type | TS Type | Notes |
|-------|-----------|---------|-------|
| deviceId | string | string | Primary key |
| name | string | string | Display name |
| status | CameraStatus | enum (number) | ONLINE=1, OFFLINE=2, IDLE=3, ERROR=4, REBOOTING=5, DISCOVERED=6, PAIRING=7, CONNECTING=8 |
| containerId | string | string | Associated container |
| position | int32 | number | Slot position (1-4) |
| lastSeen | Timestamp | Date | Proto Timestamp → JS Date |
| health | CameraHealth | object | Nested message |
| ipAddress | string | string | |
| macAddress | string | string | |

**CameraHealth** (nested):

| Field | Proto Type | TS Type |
|-------|-----------|---------|
| wifiRssi | int32 | number |
| freeHeap | int64 | bigint |
| uptimeSeconds | int64 | bigint |
| firmwareVersion | string | string |
| resolution | string | string |
| lastCapture | Timestamp | Date |

### OperationSession (SessionService)

**Source**: `delicasa.device.v1.OperationSession`

| Field | Proto Type | TS Type | Notes |
|-------|-----------|---------|-------|
| sessionId | string | string | Primary key |
| containerId | string | string | |
| status | SessionStatus | enum (number) | ACTIVE=1, COMPLETE=2, PARTIAL=3, FAILED=4 |
| startedAt | Timestamp | Date | |
| elapsedSeconds | double | number | |
| totalCaptures | int32 | number | |
| successfulCaptures | int32 | number | |
| failedCaptures | int32 | number | |
| hasBeforeOpen | bool | boolean | |
| hasAfterClose | bool | boolean | |
| pairComplete | bool | boolean | |

### EvidenceCapture (EvidenceService)

**Source**: `delicasa.device.v1.EvidenceCapture`

| Field | Proto Type | TS Type | Notes |
|-------|-----------|---------|-------|
| evidenceId | string | string | Primary key |
| captureTag | CaptureTag | enum (number) | BEFORE_OPEN=1, AFTER_OPEN=2, BEFORE_CLOSE=3, AFTER_CLOSE=4 |
| status | CaptureStatus | enum (number) | CAPTURED=1, FAILED=2, TIMEOUT=3, PENDING=4 |
| cameraId | string | string | |
| capturedAt | Timestamp | Date | |
| contentType | string | string | e.g., "image/jpeg" |
| imageSizeBytes | int64 | bigint | |
| objectKey | string | string | S3/MinIO key |
| uploadStatus | string | string | String (not enum) — "uploaded"/"failed"/"unverified" |
| sessionId | string | string | |
| containerId | string | string | |

### EvidencePair (EvidenceService)

**Source**: `delicasa.device.v1.EvidencePair`

| Field | Proto Type | TS Type | Notes |
|-------|-----------|---------|-------|
| contractVersion | string | string | Always "v1" |
| sessionId | string | string | |
| containerId | string | string | |
| pairStatus | EvidencePairStatus | enum (number) | COMPLETE=1, INCOMPLETE=2, MISSING=3 |
| before | EvidenceCapture | object | Nullable |
| after | EvidenceCapture | object | Nullable |
| queriedAt | Timestamp | Date | |
| retryAfterSeconds | int32 | number | 0 if no retry needed |

### CaptureImageResponse (CaptureService)

**Source**: `delicasa.device.v1.CaptureImageResponse`

| Field | Proto Type | TS Type | Notes |
|-------|-----------|---------|-------|
| correlationId | string | string | |
| evidenceId | string | string | |
| cameraId | string | string | |
| capturedAt | Timestamp | Date | |
| contentType | string | string | |
| imageSizeBytes | int64 | bigint | |
| objectKey | string | string | S3 key (if uploaded) |
| imageData | bytes | Uint8Array | Raw JPEG (if no S3) |
| uploadStatus | UploadStatus | enum (number) | UPLOADED=1, FAILED=2, UNVERIFIED=3 |
| cached | bool | boolean | true if idempotency cache hit |

## Proto Enum Mappings

Proto enums use SCREAMING_CASE with prefix. The generated TypeScript uses numeric values. UI display requires mapping:

| Proto Enum Value | Numeric | UI Display String | Zod Equivalent |
|-----------------|---------|-------------------|----------------|
| CAMERA_STATUS_ONLINE | 1 | "online" | CameraStatusEnum |
| CAMERA_STATUS_OFFLINE | 2 | "offline" | CameraStatusEnum |
| SESSION_STATUS_ACTIVE | 1 | "active" | SessionStatusEnum |
| SESSION_STATUS_COMPLETE | 2 | "complete" | SessionStatusEnum |
| EVIDENCE_PAIR_STATUS_COMPLETE | 1 | "complete" | PairStatusEnum |
| CAPTURE_TAG_BEFORE_OPEN | 1 | "BEFORE_OPEN" | CaptureTagEnum |

**Adapter pattern**: Proto enum → lowercase string → existing UI components (which expect string enum values).

## Type Conversion Notes

1. **Timestamp fields**: Proto `google.protobuf.Timestamp` → `protobuf-es` converts to `{ seconds: bigint, nanos: number }`. Use `.toDate()` for JS Date or access `.seconds` directly.
2. **int64/bigint fields**: `freeHeap`, `uptimeSeconds`, `imageSizeBytes` are `bigint` in TypeScript. Convert to `Number()` for display (safe for values < 2^53).
3. **bytes fields**: `imageData` is `Uint8Array`. Convert to base64 for `<img src="data:image/jpeg;base64,...">` display.
4. **Enum fields**: Proto enums are numeric in TypeScript. Need mapping functions to convert to string values expected by UI components.

## Relationship to Existing Zod Schemas

The `@delicasa/wire/zod` schemas (`PiOrchCameraSchema`, `PiOrchSessionSchema`, `PiOrchEvidencePairSchema`) describe the **REST JSON response shapes** with snake_case fields. These remain useful for:
- Validating any remaining REST responses (non-migrated endpoints)
- As reference for the proto→domain adapter mapping
- Contract testing

For RPC-migrated endpoints, the proto-generated types ARE the contract — Zod validation happens at the presentation boundary on the adapted (domain) types, not on raw RPC responses.
