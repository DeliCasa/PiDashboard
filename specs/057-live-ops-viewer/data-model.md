# Data Model: Live Operations Viewer

**Feature**: 057-live-ops-viewer
**Date**: 2026-02-18

## Entities

All entities below already exist in the codebase as Zod schemas. This document describes the logical data model from the operator's perspective and maps to existing schema locations.

### Session

Represents a single operational cycle from capture request through completion.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique session identifier (opaque) |
| delivery_id | string | no | External delivery reference (BridgeServer) |
| started_at | string (ISO 8601) | yes | When the session began |
| status | enum | yes | `active`, `completed`, `cancelled` |
| capture_count | number | yes | Total evidence captures in session |
| last_capture_at | string (ISO 8601) | no | Most recent capture timestamp |
| is_stale | boolean | no | Derived client-side (>5 min since last capture while active) |

**Schema location**: `src/infrastructure/api/diagnostics-schemas.ts` → `SessionSchema`

**Relationships**:
- Session 1 → N Evidence Captures
- Session 1 → 0..1 Inventory Analysis Run

**State transitions**: `active` → `completed` | `cancelled`

**Operator display mapping**:
- `active` → Blue "Active" badge
- `completed` → Green "Completed" badge
- `cancelled` → Red "Failed" badge (operator sees failure, not cancellation)
- `active + is_stale` → Yellow "Stale" warning

---

### Evidence Capture

An image captured by a camera during a session.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique evidence identifier |
| session_id | string | yes | Parent session |
| captured_at | string (ISO 8601) | yes | When the image was taken |
| camera_id | string | yes | Capturing camera (format: `espcam-XXXXXX`) |
| thumbnail_url | string | yes | Presigned URL for thumbnail |
| full_url | string | yes | Presigned URL for full-size image |
| expires_at | string (ISO 8601) | yes | When presigned URLs expire |
| size_bytes | number | no | File size in bytes |
| content_type | string | no | MIME type (e.g., `image/jpeg`) |

**Schema location**: `src/infrastructure/api/diagnostics-schemas.ts` → `EvidenceCaptureSchema`

**Relationships**:
- Evidence Capture N → 1 Session
- Evidence Capture N → 1 Camera

**URL lifecycle**: URLs expire → auto-refresh via `useRefreshPresignedUrl()` → new URLs fetched from `/dashboard/diagnostics/images/presign`

---

### Camera Diagnostics

Health and performance data for a physical camera device.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| camera_id | string | yes | Camera identifier (format: `espcam-XXXXXX`) |
| name | string | yes | Human-readable camera name |
| status | enum | yes | `online`, `offline`, `error`, `rebooting`, `discovered`, `pairing`, `connecting` |
| last_seen | string (ISO 8601) | yes | Last communication timestamp |
| ip_address | string | no | Network IP |
| mac_address | string | no | Hardware MAC address |
| health.heap | number | no | Free heap memory (bytes) |
| health.wifi_rssi | number | no | WiFi signal strength (dBm) |
| health.uptime | number | no | Seconds since last reboot |
| diagnostics.connection_quality | enum | no | `excellent`, `good`, `fair`, `poor` |
| diagnostics.error_count | number | no | Cumulative errors |
| diagnostics.last_error | string | no | Most recent error message |
| diagnostics.last_error_time | string | no | When last error occurred |
| diagnostics.firmware_version | string | no | Current firmware |
| diagnostics.avg_capture_time_ms | number | no | Average capture duration |

**Schema location**: `src/infrastructure/api/camera-diagnostics-schemas.ts` → `CameraDiagnosticsSchema`

**Relationships**:
- Camera 1 → N Evidence Captures
- Camera N → 1 Container (via assignment)

**Derived fields**:
- `connection_quality` derived from `wifi_rssi`: ≥-50 excellent, ≥-60 good, ≥-70 fair, <-70 poor

---

### Inventory Analysis Run

The computed inventory difference from before/after evidence analysis.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| run_id | string | yes | Unique run identifier |
| session_id | string | yes | Source session |
| container_id | string | yes | Target container |
| status | enum | yes | `pending`, `processing`, `done`, `needs_review`, `error` |
| delta | DeltaEntry[] | no | Normalized item changes |
| evidence.before_image_url | string | no | Before capture URL |
| evidence.after_image_url | string | no | After capture URL |
| metadata.error_message | string | no | Error details (for `error` status) |
| metadata.processing_time_ms | number | no | Analysis duration |
| metadata.created_at | string | yes | Run creation timestamp |
| metadata.completed_at | string | no | Run completion timestamp |
| review | Review | no | Operator review data |

**Schema location**: `src/infrastructure/api/inventory-delta-schemas.ts` → `InventoryAnalysisRunSchema`

**Relationships**:
- Inventory Run 1 → 1 Session
- Inventory Run 1 → 1 Container
- Inventory Run 1 → 0..1 Review

**State transitions**: `pending` → `processing` → `done` | `needs_review` | `error`

---

## Correlation ID Strategy

No single correlation ID exists. Operators use a combination of identifiers to trace across systems:

| ID | Source | Used For |
|----|--------|----------|
| session_id | Session entity | Trace across all services |
| delivery_id | Session entity | Trace in BridgeServer |
| run_id | Inventory Run entity | Trace in analysis pipeline |
| request_id | V1 API response headers | Trace specific API requests |

All IDs displayed in `font-mono text-xs text-muted-foreground` with click-to-copy.

## No Schema Changes Required

All Zod schemas are already defined and validated. This feature composes existing data — no new fields, endpoints, or schema modifications are needed in the PiDashboard.
