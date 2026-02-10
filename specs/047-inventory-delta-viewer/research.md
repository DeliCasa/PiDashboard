# Research: Inventory Delta Viewer & Human Review Workflow

**Feature**: 047-inventory-delta-viewer
**Date**: 2026-02-09

## Research Questions & Findings

### RQ-1: What API endpoints will PiDashboard consume for inventory delta data?

**Decision**: PiDashboard consumes three BridgeServer endpoints proxied through PiOrchestrator at `/api/v1/inventory/*`.

**Rationale**: BridgeServer feature 031 (vision-inventory-delta) defines the canonical API surface. PiOrchestrator already proxies BridgeServer requests for other features (cameras, containers). The three endpoints map to our spec's user stories:

| PiDashboard Need | BridgeServer Endpoint (via PiOrchestrator proxy) |
|------------------|--------------------------------------------------|
| Latest delta for container | `GET /api/v1/containers/:id/inventory/latest` |
| Session delta detail | `GET /api/v1/sessions/:id/inventory-delta` |
| Submit review | `POST /api/v1/inventory/:runId/review` |

**Alternatives considered**:
- Direct BridgeServer calls (rejected: violates PiOrchestrator gateway pattern)
- Polling BridgeServer stock-analysis endpoints (rejected: those are single-image analysis, not session deltas)

### RQ-2: What is the response shape for inventory delta data?

**Decision**: Use PiOrchestrator V1 API envelope with BridgeServer's domain-specific data payload.

**Response envelope** (from `PiOrchestrator/internal/api/response/envelope.go`):
```json
{
  "success": true,
  "data": { /* domain payload */ },
  "error": { "code": "...", "message": "...", "retryable": false },
  "timestamp": "2026-02-09T12:00:00Z",
  "request_id": "uuid"
}
```

**Domain payload for session delta** (derived from BridgeServer spec 031 entities):
```json
{
  "run_id": "uuid",
  "session_id": "uuid",
  "container_id": "uuid",
  "status": "completed",
  "items_before": [
    { "name": "Coca-Cola 330ml", "sku": "CC330", "quantity": 5, "confidence": 0.95, "bounding_box": { "x": 10, "y": 20, "width": 50, "height": 80 } }
  ],
  "items_after": [
    { "name": "Coca-Cola 330ml", "sku": "CC330", "quantity": 3, "confidence": 0.92, "bounding_box": { "x": 10, "y": 20, "width": 50, "height": 80 } }
  ],
  "delta": [
    { "name": "Coca-Cola 330ml", "sku": "CC330", "before_count": 5, "after_count": 3, "change": -2, "confidence": 0.92, "rationale": "Two cans removed from shelf" }
  ],
  "evidence": {
    "before_image_url": "https://...",
    "after_image_url": "https://...",
    "overlays": { /* optional bounding box data */ }
  },
  "review": null,
  "metadata": {
    "provider": "openai",
    "processing_time_ms": 4200,
    "model_version": "gpt-4o-2024-08-06",
    "created_at": "2026-02-09T11:59:00Z",
    "completed_at": "2026-02-09T11:59:04Z"
  }
}
```

**Rationale**: Payload shape mirrors BridgeServer `InventoryAnalysisRun` + `InventoryDelta` + `InventorySnapshot` entities from spec 031. Field names use snake_case per PiOrchestrator Go JSON conventions (constitution rule II.A).

### RQ-3: How should the Inventory tab integrate with existing navigation?

**Decision**: Add a new top-level tab "Inventory" between Containers and Door tabs, scoped to the active container.

**Rationale**:
- Inventory is a first-class operational concern, not a sub-feature of Containers or Diagnostics.
- Container scoping follows the established pattern from feature 046 (ContainerPicker + useActiveContainerId).
- Placing it after Containers in tab order makes sense: operators select a container, then check its inventory.
- Uses `ClipboardList` icon from lucide-react (inventory/checklist metaphor).

**Alternatives considered**:
- Sub-tab within Containers (rejected: Containers tab manages container CRUD; inventory is read + review, different concern)
- Within Diagnostics (rejected: Diagnostics is a dev-only panel, inventory is operator-facing)

### RQ-4: How should confidence scores be displayed?

**Decision**: Numeric confidence (0-1) from backend mapped to three visual tiers with color-coded badges.

| Range | Label | Color | Meaning |
|-------|-------|-------|---------|
| >= 0.8 | High | Green | Likely accurate, auto-approve candidate |
| 0.5 - 0.79 | Medium | Yellow/amber | Review recommended |
| < 0.5 | Low | Red | Manual verification needed |

**Rationale**: BridgeServer returns numeric confidence per-item (0-1 float). Three tiers match the analysis status lifecycle (DONE = high confidence, NEEDS_REVIEW = medium/low). Operators don't need exact percentages; actionable categories reduce cognitive load.

**Alternatives considered**:
- Show raw percentage (rejected: too granular for operator use)
- Binary high/low (rejected: loses the "worth checking" middle tier)

### RQ-5: How should the review form handle corrections?

**Decision**: Inline editing on the delta table with add/remove row buttons and a review summary dialog before submission.

**Rationale**:
- Inline editing minimizes context switching (operator sees delta and edits in same view).
- Add row / remove row for missed items and false positives.
- Confirmation dialog before POST prevents accidental submissions.
- Review payload shape (from BridgeServer spec 031 FR-007 and FR-019):

```json
POST /api/v1/inventory/:runId/review
{
  "action": "approve" | "override",
  "corrections": [
    { "name": "Coca-Cola 330ml", "sku": "CC330", "corrected_count": 4, "original_count": 3 },
    { "name": "New Item", "sku": null, "corrected_count": 1, "original_count": 0, "added": true }
  ],
  "notes": "Operator note explaining corrections"
}
```

**Alternatives considered**:
- Separate edit page (rejected: breaks flow, operator loses context of evidence images)
- Modal form (rejected: too constrained for variable-length corrections)

### RQ-6: How should before/after images be displayed?

**Decision**: Side-by-side layout on desktop (2-column grid), stacked on mobile. Optional overlay toggle for bounding boxes rendered as CSS-positioned divs over the images.

**Rationale**:
- Side-by-side is the natural comparison layout (matches spec FR-003).
- Responsive stacking on mobile avoids horizontal scroll.
- Bounding box overlays use positioned `<div>` elements over a relative-positioned image container, matching the `bounding_box: { x, y, width, height }` data from BridgeServer.
- Click-to-expand follows existing EvidencePreviewModal pattern.

**Alternatives considered**:
- Image diff/slider (rejected: over-engineered for MVP, images may differ in angle/lighting)
- Canvas-based overlay (rejected: CSS positioning is simpler and more accessible)

### RQ-7: What polling strategy for delta data?

**Decision**: 15-second polling for the latest delta when status is "pending", visibility-aware (pause when tab hidden). No polling once status is "completed", "approved", or "failed".

**Rationale**:
- Analysis takes up to 30 seconds (BridgeServer SC-001), so 15-second polling catches completion promptly.
- Visibility-aware polling follows the established pattern from camera hooks.
- Terminal statuses (completed/approved/failed) don't change, so polling stops.

### RQ-8: What error codes should the dashboard handle?

**Decision**: Extend the error message registry with inventory-specific codes.

| Error Code | User Message | Retryable |
|------------|-------------|-----------|
| `INVENTORY_NOT_FOUND` | "No inventory analysis found for this session." | No |
| `INVENTORY_PENDING` | "Analysis is still in progress. Please wait." | Yes (auto-poll) |
| `INVENTORY_FAILED` | "Inventory analysis failed. Check evidence images." | No |
| `REVIEW_CONFLICT` | "This session has already been reviewed." | No |
| `REVIEW_INVALID` | "Review data is invalid. Check corrections." | No |

**Rationale**: Maps to BridgeServer analysis status lifecycle and PiOrchestrator bridge error codes.

## Dependencies

| Dependency | Status | Impact |
|------------|--------|--------|
| BridgeServer 031-vision-inventory-delta | Draft | Backend endpoints must exist before real integration; MSW mocks enable frontend development in parallel |
| PiOrchestrator proxy routes for `/v1/inventory/*` | Not started | Proxy must forward to BridgeServer; follows existing bridge handler pattern |
| Evidence image presigned URLs | Existing | Reuse evidence infrastructure from feature 034 |
| Container identity (046) | Merged | Provides container scoping via useActiveContainerId |
