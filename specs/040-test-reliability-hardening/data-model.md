# Data Model: Test Reliability & Hardening

**Feature**: 040-test-reliability-hardening
**Date**: 2026-02-01

## Entity 1: Session (Mock Fixture)

Represents a diagnostics capture session tracked by PiOrchestrator.

| Field | Type | Required | Constraints |
| ----- | ---- | -------- | ----------- |
| `id` | string | Yes | Non-empty, e.g. `sess-12345` |
| `delivery_id` | string | No | Optional delivery reference |
| `started_at` | string (ISO 8601) | Yes | RFC3339 timestamp |
| `status` | enum | Yes | `active`, `completed`, `cancelled` |
| `capture_count` | integer | Yes | >= 0 |
| `last_capture_at` | string (ISO 8601) | No | RFC3339 timestamp, absent if no captures |

**Derived Properties** (computed in application layer):
- `is_stale`: boolean — `true` when `last_capture_at` is older than 5 minutes (STALE_THRESHOLD_MS = 300,000ms)

**Variants** (for testing):
- `activeSessionRecent` — active, `last_capture_at` ~1 min ago, `is_stale: false`
- `activeSessionStale` — active, `last_capture_at` ~10 min ago, `is_stale: true`
- `completedSession` — status `completed`, has captures

---

## Entity 2: EvidenceCapture (Mock Fixture)

Represents a captured image from an ESP camera during a diagnostics session.

| Field | Type | Required | Constraints |
| ----- | ---- | -------- | ----------- |
| `id` | string | Yes | Min length 1 |
| `session_id` | string | Yes | Min length 1 |
| `captured_at` | string (ISO 8601) | Yes | RFC3339 timestamp |
| `camera_id` | string | Yes | Pattern: `/^espcam-[0-9a-f]{6}$/i` |
| `thumbnail_url` | string (URL) | Yes | Valid URL |
| `full_url` | string (URL) | Yes | Valid URL |
| `expires_at` | string (ISO 8601) | Yes | RFC3339 timestamp |
| `size_bytes` | integer | No | Positive integer |
| `content_type` | string | No | MIME type, e.g. `image/jpeg` |

**Variants** (for testing):
- `validEvidenceCapture` — all fields populated including optionals
- `minimalEvidenceCapture` — required fields only

---

## Entity 3: Handoff Document (Frontmatter)

Represents the YAML frontmatter for cross-repo handoff tracking files.

| Field | Type | Required | Constraints |
| ----- | ---- | -------- | ----------- |
| `handoff_id` | string | Yes | Pattern: `^\d{3}-[a-z][a-z0-9-]*$` |
| `direction` | enum | Yes | `incoming`, `outgoing` |
| `from_repo` | string | Yes | Repository name |
| `to_repo` | string | Yes | Repository name |
| `created_at` | string (ISO 8601) | Yes | Date of creation |
| `status` | enum | Yes | `new`, `acknowledged`, `in_progress`, `done`, `blocked` |
| `related_prs` | string[] | Yes | May be empty array |
| `related_commits` | string[] | Yes | May be empty array |
| `requires` | object[] | Yes | Array of `{type, description}` |
| `acceptance` | string[] | Yes | Acceptance criteria |
| `verification` | string[] | Yes | Verification steps |
| `risks` | string[] | Yes | Known risks |
| `notes` | string | Yes | Free-form notes |

**State Transitions**:
```
new → acknowledged → in_progress → done
                                 → blocked → in_progress → done
```

**Validation Rules**:
- Outgoing handoffs: `from_repo` MUST be `"PiDashboard"`
- Incoming handoffs: `to_repo` MUST be `"PiDashboard"`
- `handoff_id` must be unique across all handoff files

---

## Entity 4: Dashboard Section State

Represents the UI state of a single dashboard section, determined by React Query status and API response content.

| State | Condition | UI Behavior |
| ----- | --------- | ----------- |
| `loading` | `isLoading === true` | Spinner or skeleton placeholder |
| `success` | `isSuccess === true && data has items` | Populated data display |
| `empty` | `isSuccess === true && data is empty/null` | Empty state message |
| `error` | `isError === true && !isFeatureUnavailable(error)` | Error alert with Retry button |
| `unavailable` | `isError === true && isFeatureUnavailable(error)` | Silent degradation, "unavailable" text |

**State Machine**:
```
[initial] → loading → success | empty | error | unavailable
success → loading (refetch) → success | empty | error
error → loading (retry) → success | empty | error
unavailable → (no automatic retry, manual refresh only)
```

**Per-Section Behavior**:

| Section | Loading | Success | Empty | Error | Unavailable |
| ------- | ------- | ------- | ----- | ----- | ----------- |
| Camera | `camera-loading` spinner | `camera-grid` | `camera-empty` "No cameras" | `camera-error` + Retry | N/A |
| WiFi | "Loading status..." | Network list | "No networks found" | Silent (no display) | `isFeatureUnavailable()` |
| Door | `door-controls-loading` | `door-controls` | N/A | `door-controls-error` | Via error prop |
| System | `system-loading` skeleton | `system-status` cards | N/A | `system-error` + Retry | N/A |
| Logs | Connection indicator | Log stream | "No logs yet" | Reconnect status | N/A |

---

## Relationships

```
Session 1──N EvidenceCapture     (session_id foreign key)
HandoffDocument ── standalone    (no FK, identified by handoff_id)
DashboardSectionState ── per UI section (runtime only, not persisted)
```
