# Research: 051 — Live E2E Inventory Delta Display

**Date**: 2026-02-15 (updated from 2026-02-12 original audit)

## Research Summary

Phase 0 research uncovered **three critical contract mismatches** between PiDashboard's Zod schemas and BridgeServer's actual implementation. These must be resolved before the E2E verification can succeed with real data.

## Findings

### 1. Status Enum Mismatch (CRITICAL)

**Decision**: PiDashboard's `AnalysisStatusSchema` must be aligned with BridgeServer's actual enum values, with a display-mapping layer to present user-friendly labels.

**Rationale**: PiDashboard currently defines statuses that don't match BridgeServer's `InventoryAnalysisStatus` enum. Real API responses would fail Zod validation.

**BridgeServer actual values** (source: `BridgeServer/src/domain/entities/inventory-analysis.entity.ts:14-20`):
```
pending, processing, done, needs_review, error
```

**PiDashboard current values** (source: `PiDashboard/src/infrastructure/api/inventory-delta-schemas.ts:15-21`):
```
pending, completed, needs_review, approved, failed
```

**Mapping**:
| BridgeServer | PiDashboard (current) | Display Label | Notes |
|---|---|---|---|
| `pending` | `pending` | "Queued" | Match |
| `processing` | — (missing) | "Running" | Must add |
| `done` | `completed` (wrong) | "Completed" | Must rename |
| `needs_review` | `needs_review` | "Needs Review" | Match |
| `error` | `failed` (wrong) | "Failed" | Must rename |
| — | `approved` (wrong) | "Approved" | Not a BridgeServer status |

**The `approved` status**: BridgeServer uses `done` after a review is submitted. "Approved" is a derived client-side display state (when status is `done` AND a review record exists). PiDashboard must derive this from `done` + non-null review field.

**User request for `queued`/`running`**: Maps to BridgeServer's `pending`/`processing` — the feature request aligns with actual backend behavior, just using different names. PiDashboard should use BridgeServer's values in the schema and map to display labels.

**Alternatives considered**:
- Accept both old and new values in Zod schema: Rejected — creates ambiguity, violates contract-first principle
- Keep PiDashboard values and transform in API proxy: Rejected — PiOrchestrator doesn't transform inventory responses
- Use BridgeServer values directly with display mapping: **Selected** — clean, matches contract-first principle

### 2. `correlation_id` Field (NOT AVAILABLE)

**Decision**: `correlation_id` is NOT present in BridgeServer's `inventoryAnalysisRuns` schema. It only exists on the `commands` and `cameraImages` tables. The PiDashboard should display `run_id` as the primary tracing identifier instead.

**Rationale**: Code inspection of BridgeServer's database schema (`drizzle/schema.ts:1172-1241`) confirms no `correlation_id` column on `inventory_analysis_runs`. The field exists on `commands` (line 426) and `cameraImages` (line 1155) but not inventory analysis.

**Impact on spec**:
- FR-003 ("every displayed run MUST surface a correlation ID") must be revised
- The `run_id` (prefixed `iar_` in BridgeServer, UUIDv7) serves as a sufficient tracing identifier
- If `correlation_id` is added to BridgeServer in the future, PiDashboard should accept it as optional

**Alternatives considered**:
- Add `correlation_id` to BridgeServer schema: Out of scope for PiDashboard feature
- Use `session_id` as correlation: Less specific; a session may have multiple runs
- Display `run_id` as primary tracing ID: **Selected** — available now, unique per analysis

### 3. Missing Paginated Runs Endpoint

**Decision**: `GET /v1/containers/:containerId/inventory/runs` does NOT exist in BridgeServer. Only `findLatestByContainerId` (singular) is implemented.

**Rationale**: BridgeServer route inspection (`src/interfaces/http/inventory-analysis.routes.ts`) shows only 4 endpoints:
- `GET /v1/sessions/:sessionId/inventory-delta` (line 44)
- `GET /v1/containers/:containerId/inventory/latest` (line 83)
- `POST /v1/inventory/:runId/review` (line 125)
- `GET /v1/inventory/stats` (line 212)

The PiDashboard's `useInventoryRuns` hook and `InventoryRunList` component call an endpoint that doesn't exist.

**Impact**: The run list currently works only with mocked data in tests. Against a real backend, it would receive a 404. The hook's `isFeatureUnavailable()` handler would gracefully show "service unavailable", but no data would display.

**Alternatives considered**:
- Request BridgeServer team to add the endpoint: Valid but out of scope
- Use `/latest` endpoint only and remove run list: Loses functionality
- Keep the run list UI, accept 404 graceful degradation, document as backend dependency: **Selected** — the UI is ready; once BridgeServer adds the endpoint, it will work

### 4. Evidence Structure (Compatible)

**Decision**: No changes needed. BridgeServer stores evidence as ID arrays but the API response layer resolves them to URLs.

**Rationale**: PiDashboard expects `evidence.before_image_url` and `evidence.after_image_url`. BridgeServer's route handlers (`inventory-analysis.routes.ts`) resolve evidence IDs to signed URLs in the response DTO before returning. The Zod schema is compatible.

### 5. `rationale` Field (Available but Not Displayed)

**Decision**: The `rationale` field on `DeltaEntry` is available in the schema and test fixtures but is NOT rendered in `InventoryDeltaTable`. It should be displayed as a tooltip or subtitle.

**Rationale**: Code inspection of `InventoryDeltaTable.tsx` confirms the field is typed (`DeltaEntry.rationale?: string`) but the rendering logic at line 98-135 does not use it.

**Implementation approach**: Add a small subtitle below the item name showing the rationale text when present. Keep it unobtrusive (secondary text color, smaller font).

## Revised Status Mapping for Implementation

```
BridgeServer value → Zod enum value → Display label → Badge variant → Terminal?
─────────────────────────────────────────────────────────────────────────────────
pending           → pending          → "Queued"        → secondary    → No
processing        → processing       → "Running"       → secondary    → No
done              → done             → "Completed"     → default      → Yes
done + review     → done             → "Approved"      → default      → Yes (derived)
needs_review      → needs_review     → "Needs Review"  → outline      → No
error             → error            → "Failed"        → destructive  → Yes
```

## Constitution Implications

- **II.B Enum Synchronization**: BridgeServer defines the enum values FIRST. PiDashboard must align to `pending`, `processing`, `done`, `needs_review`, `error`.
- **II.A Zod Schema Conventions**: Field names must match Go/BridgeServer JSON tags (snake_case).
- **II.D Breaking Change Response**: The status enum change from `completed/approved/failed` to `done/error` is a breaking change to PiDashboard's own schema. All fixtures, tests, and UI components must be updated.
