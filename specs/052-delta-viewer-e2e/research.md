# Research: 052-delta-viewer-e2e

**Phase**: 0 — Outline & Research
**Date**: 2026-02-16

## R1: Delta Format Mismatch — Flat vs. Categorized

**Decision**: Add a `CategorizedDeltaSchema` to PiDashboard and update the `delta` field on `InventoryAnalysisRunSchema` to accept either format via `z.union()`. Add an adapter function that normalizes categorized deltas into the existing `DeltaEntry[]` display format for the table component.

**Rationale**: BridgeServer returns two delta shapes:
- **v1.0 (flat)**: `DeltaItem[]` with `{ name, change, before_count, after_count, confidence, reason, sku }` — maps closely to PiDashboard's existing `DeltaEntry`.
- **v2.0 (categorized)**: `{ added: AddedItem[], removed: RemovedItem[], changed_qty: ChangedQtyItem[], unknown: UnknownItem[] }` — a grouped format from Feature 065.

PiDashboard currently only has the flat `DeltaEntrySchema`. The `delta` field typed as `z.array(DeltaEntrySchema).nullable().optional()` will reject categorized responses.

**Alternatives considered**:
- Only support flat format → rejected: BridgeServer is migrating to categorized; would break on v2.0 responses.
- Replace flat with categorized only → rejected: backward-incompatible; existing runs use flat format.
- Accept `z.unknown()` for delta → rejected: defeats contract-first principle.

**Resolution**: Use `z.union([z.array(DeltaEntrySchema), CategorizedDeltaSchema])` for the `delta` field. Add a `normalizeDelta()` function in the infrastructure layer that converts categorized to flat `DeltaEntry[]` for display.

---

## R2: Field Name Mismatches — BridgeServer vs. PiDashboard

**Decision**: Document the known field name mismatches as the "contract alignment gap" and add golden fixtures that represent the *actual BridgeServer response shape* alongside the *PiDashboard-expected shape*. Contract tests validate both.

**Rationale**: BridgeServer (TypeScript) uses camelCase in some fields, while PiDashboard schemas assume snake_case (from PiOrchestrator Go JSON tags). Key mismatches identified:

| Field | BridgeServer | PiDashboard Schema | Gap |
|-------|--------------|-------------------|-----|
| Run ID | `id` | `run_id` | Name |
| Session ID | `sessionId` | `session_id` | Case |
| Created timestamp | `createdAt` | `created_at` (metadata) | Case + nesting |
| Completed timestamp | `completedAt` | `completed_at` (metadata) | Case + nesting |
| Reviewer ID | `reviewerId` | `reviewer_id` | Case |
| Review timestamp | `createdAt` | `reviewed_at` | Name + case |
| Items | `count` | `quantity` | Name |
| Bounding boxes | `bounding_boxes: number[][]` | `bounding_box: BoundingBox` | Name + type |
| Delta rationale | `reason` | `rationale` | Name |
| Overall confidence | `overall_confidence` | (not present) | Missing |
| Error code | `error_code` | (not present) | Missing |
| Correlation ID | `correlation_id` | (not present) | Missing |
| CV diff metadata | `cv_diff_metadata` | (not present) | Missing |

**Resolution**: PiOrchestrator is expected to normalize BridgeServer responses into snake_case Go structs, which PiDashboard then consumes. Since PiOrchestrator doesn't yet have inventory routes registered, the golden fixture should represent the *expected PiOrchestrator output shape* (snake_case, matching current PiDashboard schemas). A separate "BridgeServer raw" fixture documents the upstream shape for future PiOrchestrator implementation.

---

## R3: PiOrchestrator Proxy Gap

**Decision**: Acknowledge that PiOrchestrator does not yet proxy inventory delta endpoints. Golden fixtures represent the expected PiOrchestrator-normalized response. The contract test suite also includes a "raw BridgeServer" fixture section documenting what PiOrchestrator will need to transform.

**Rationale**: Research found zero inventory routes in PiOrchestrator's router. PiDashboard calls `/api/v1/containers/{id}/inventory/latest` etc., which the Vite proxy forwards to port 8082. In production, PiOrchestrator must proxy these to BridgeServer and normalize the response.

**Alternatives considered**:
- Test against raw BridgeServer shape → rejected: PiDashboard's schemas expect PiOrchestrator-normalized snake_case.
- Block until PiOrchestrator implements proxy → rejected: out of scope (spec says no backend changes).

**Resolution**: Golden fixtures use the PiDashboard-expected shape. The "API contract snapshot" doc explicitly lists the transformation PiOrchestrator must perform, creating a handoff-ready reference.

---

## R4: Golden Fixture Testing Pattern

**Decision**: Add a dedicated golden fixture file (`tests/mocks/inventory-delta-golden.ts`) containing canonical BridgeServer response shapes, alongside the existing fixtures. New contract tests validate that PiDashboard's schemas parse the golden fixtures successfully. Strict mode (`z.strict()`) is used in golden tests to catch extra fields.

**Rationale**: Existing contract tests (Feature 047 T009) validate that *mock fixtures* match *PiDashboard schemas*. This catches fixture drift but not upstream contract drift. Golden fixtures represent what the *real backend actually returns*, creating a two-layer validation:
1. Existing tests: mock fixtures → PiDashboard schemas (catches mock drift)
2. Golden tests: BridgeServer-shaped fixtures → PiDashboard schemas (catches contract drift)

**Alternatives considered**:
- Use OpenAPI spec file → rejected: BridgeServer's OpenAPI spec may not be current; Zod validation is more precise.
- Snapshot testing → rejected: too brittle; any response change (timestamps, IDs) breaks snapshots.
- JSON Schema comparison → rejected: duplicates Zod schemas; maintenance burden.

**Resolution**: Golden fixtures are hand-curated from real BridgeServer responses with deterministic values. The test file is named `inventory-delta-golden.contract.test.ts` in the contracts directory.

---

## R5: E2E Test Architecture

**Decision**: Add one deterministic E2E test that exercises the full flow: select container → see run list → click run → view delta table → verify per-item data. Uses MSW route mocking (existing pattern from Feature 048 E2E).

**Rationale**: The existing E2E suite (`tests/e2e/inventory-delta.spec.ts`) already covers run list, detail, session lookup, and review flows. The new test specifically validates that a golden fixture response renders with exact, deterministic values — proving the end-to-end data path from API response to rendered pixels.

**Alternatives considered**:
- Test against real PiOrchestrator → rejected: flaky, depends on hardware availability.
- Browser-level screenshot comparison → rejected: too brittle for CI.

**Resolution**: One focused E2E test file (`tests/e2e/inventory-delta-golden.spec.ts`) with a single golden fixture MSW handler. Assertions verify exact text content: item names, counts, change values, confidence badges.
