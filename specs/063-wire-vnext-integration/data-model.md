# Data Model: Wire vNEXT Integration & Test Hardening

**Feature**: 063-wire-vnext-integration
**Date**: 2026-03-06

## Overview

This feature does not introduce new data entities. It aligns the test infrastructure with the existing protobuf-generated types from `@delicasa/wire` v0.4.0. The entities below document the proto-JSON shape that wire factory functions produce and that MSW handlers must return.

## Proto-JSON Entities (Wire Package Output)

### Camera (proto: `delicasa.device.v1.Camera`)

| Field | Type | Proto-JSON | Notes |
|-------|------|-----------|-------|
| deviceId | string | camelCase | Maps to domain `camera.id` |
| name | string | camelCase | Display name |
| status | string | `CAMERA_STATUS_*` | Screaming-snake enum |
| containerId | string | camelCase | Associated container |
| position | number | number | Physical position |
| lastSeen | string | ISO 8601 | Absent if never seen |
| health | object | nested | CameraHealth sub-object |
| ipAddress | string | camelCase | LAN IP |
| macAddress | string | camelCase | MAC address |

### CameraHealth (proto: `delicasa.device.v1.CameraHealth`)

| Field | Type | Proto-JSON | Notes |
|-------|------|-----------|-------|
| wifiRssi | number | number | Signal strength dBm |
| freeHeap | string | string | int64 encoded as string |
| uptimeSeconds | string | string | int64 encoded as string |
| firmwareVersion | string | string | Version string |
| resolution | string | string | e.g. "1600x1200" |
| lastCapture | string | ISO 8601 | Absent if no captures |

### OperationSession (proto: `delicasa.device.v1.OperationSession`)

| Field | Type | Proto-JSON | Notes |
|-------|------|-----------|-------|
| sessionId | string | camelCase | Maps to domain `session.id` |
| containerId | string | camelCase | Associated container |
| status | string | `SESSION_STATUS_*` | Screaming-snake enum |
| startedAt | string | ISO 8601 | Session start time |
| elapsedSeconds | number | number | Duration |
| totalCaptures | number | number | Total capture count |
| successfulCaptures | number | number | Successful captures |
| failedCaptures | number | number | Failed captures |
| hasBeforeOpen | boolean | boolean | Has before-open capture |
| hasAfterClose | boolean | boolean | Has after-close capture |
| pairComplete | boolean | boolean | Evidence pair complete |

### EvidenceCapture (proto: `delicasa.device.v1.EvidenceCapture`)

| Field | Type | Proto-JSON | Notes |
|-------|------|-----------|-------|
| evidenceId | string | camelCase | Maps to domain `capture.evidence_id` |
| captureTag | string | `CAPTURE_TAG_*` | Screaming-snake enum |
| status | string | `CAPTURE_STATUS_*` | Screaming-snake enum |
| cameraId | string | camelCase | Source camera |
| capturedAt | string | ISO 8601 | Capture timestamp |
| contentType | string | string | MIME type |
| imageSizeBytes | string | string | int64 encoded as string |
| objectKey | string | string | Storage path |
| uploadStatus | string | lowercase | Bare "uploaded" (not enum prefix) |
| sessionId | string | camelCase | Parent session |
| containerId | string | camelCase | Associated container |

### EvidencePair (proto: `delicasa.device.v1.EvidencePair`)

| Field | Type | Proto-JSON | Notes |
|-------|------|-----------|-------|
| contractVersion | string | string | Always "v1" |
| sessionId | string | camelCase | Parent session |
| containerId | string | camelCase | Associated container |
| pairStatus | string | `EVIDENCE_PAIR_STATUS_*` | Screaming-snake enum |
| before | object | nested | EvidenceCapture (absent if missing) |
| after | object | nested | EvidenceCapture (absent if missing) |
| queriedAt | string | ISO 8601 | Query timestamp |
| retryAfterSeconds | number | number | 0 if complete |

## Enum Value Mappings

| Proto Enum | Values |
|-----------|--------|
| CameraStatus | `CAMERA_STATUS_ONLINE`, `CAMERA_STATUS_OFFLINE`, `CAMERA_STATUS_IDLE`, `CAMERA_STATUS_ERROR`, `CAMERA_STATUS_REBOOTING`, `CAMERA_STATUS_DISCOVERED`, `CAMERA_STATUS_PAIRING`, `CAMERA_STATUS_CONNECTING` |
| SessionStatus | `SESSION_STATUS_ACTIVE`, `SESSION_STATUS_COMPLETE`, `SESSION_STATUS_PARTIAL`, `SESSION_STATUS_FAILED` |
| CaptureTag | `CAPTURE_TAG_BEFORE_OPEN`, `CAPTURE_TAG_AFTER_CLOSE` |
| CaptureStatus | `CAPTURE_STATUS_CAPTURED`, `CAPTURE_STATUS_FAILED`, `CAPTURE_STATUS_TIMEOUT` |
| EvidencePairStatus | `EVIDENCE_PAIR_STATUS_COMPLETE`, `EVIDENCE_PAIR_STATUS_INCOMPLETE`, `EVIDENCE_PAIR_STATUS_MISSING` |

## State Transitions

No new state transitions. Existing adapter layer converts proto-JSON enums to domain lowercase strings (e.g., `SESSION_STATUS_ACTIVE` → `"active"`).
