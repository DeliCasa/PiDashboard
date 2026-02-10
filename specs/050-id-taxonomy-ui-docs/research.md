# Research: 050 ID Taxonomy Consistency in UI & Documentation

**Date**: 2026-02-10
**Branch**: `050-id-taxonomy-ui-docs`

## Decision 1: UI Labeling Strategy

**Decision**: Add inline text labels (e.g., "Container ID:", "Session ID:") before opaque ID values, using a `<span>` with muted styling for the label and existing monospace styling for the ID value.

**Rationale**: The `InventoryAuditTrail.tsx` component already implements this pattern correctly with `"Reviewer: "` prefix. Extending this to all 12 unlabeled ID display locations is consistent and low-risk.

**Alternatives considered**:
- Tooltip-only labels: Rejected because tooltips are invisible by default and violate SC-002 ("at a glance").
- Restructured field layout with separate label rows: Rejected as over-engineering for this feature.
- Accessibility-only labels (aria-label): Rejected because sighted users also need the distinction.

## Decision 2: Test Fixture ID Format

**Decision**: Replace semantic container IDs (`kitchen-fridge-001`, `container-001`) with UUID-format strings (`550e8400-e29b-41d4-a716-446655440001`). Keep the `label` fields as human-friendly names (e.g., "Kitchen Fridge").

**Rationale**: Test fixtures serve as living documentation. Using UUIDs in fixtures reinforces the architectural principle that IDs are opaque. The `containers.contract.test.ts` test that explicitly validates non-UUID acceptance (T046) is kept unchanged since it's intentionally testing opaque handling.

**Alternatives considered**:
- Random UUIDs per test run: Rejected because deterministic test data is easier to debug.
- Short numeric IDs ("42", "1001"): Rejected because UUIDs better reflect production reality.

## Decision 3: Documentation Scope

**Decision**: No documentation files need content changes. The `docs/admin/container-management.md` already uses proper UUID examples and "Kitchen Fridge" as a label example. The handoff document already uses UUID format. Spec files that mention "fridge-1" do so as explicit anti-pattern references.

**Rationale**: The previous features (043, 046, 049) already cleaned up documentation. This feature's doc changes are limited to verifying completeness.

**Alternatives considered**:
- Rewriting all spec anti-pattern references to use different language: Rejected as revisionist and unhelpful.
- Creating a standalone ID taxonomy guide: Rejected per YAGNI; the container-management.md already covers this.

## Audit: UI Components Requiring Label Changes

| # | Component | File | Lines | ID Type | Change |
|---|-----------|------|-------|---------|--------|
| 1 | ContainerPicker | ContainerPicker.tsx | 134-138 | Container ID | Add "Container ID:" prefix |
| 2 | ContainerCard | ContainerCard.tsx | 55-57 | Container ID | Add "Container ID:" prefix |
| 3 | ContainerDetail (header) | ContainerDetail.tsx | 160 | Container ID | Add "Container ID:" prefix |
| 4 | ContainerDetail (card) | ContainerDetail.tsx | 188-195 | Container ID | Add "Container ID:" prefix |
| 5 | EditContainerDialog | EditContainerDialog.tsx | 76-78 | Container ID | Add "Container ID:" prefix |
| 6 | PositionSlot | PositionSlot.tsx | 114-116 | Device ID | Add "Device ID:" prefix |
| 7 | AssignCameraDialog | AssignCameraDialog.tsx | 150-152 | Camera ID | Add "Camera ID:" prefix |
| 8 | CameraCard | CameraCard.tsx | 101-104 | Camera ID | Add "Camera ID:" prefix |
| 9 | CameraDetail | CameraDetail.tsx | 188 | Camera ID | Add "Camera ID:" prefix |
| 10 | InventoryRunList | InventoryRunList.tsx | 162-179 | Session ID | Add "Session ID:" visible label |
| 11 | InventoryRunDetail (pending) | InventoryRunDetail.tsx | 122-124 | Container ID | Add "Container ID:" prefix |
| 12 | InventoryRunDetail (main) | InventoryRunDetail.tsx | 188-195 | Container ID | Add "Container ID:" prefix |

**Already compliant**: InventoryAuditTrail.tsx (line 60-63) — has "Reviewer: " label.

## Audit: Test Fixtures Requiring ID Changes

| # | File | Count | Current ID | Replacement |
|---|------|-------|-----------|-------------|
| 1 | tests/e2e/fixtures/mock-routes.ts | 9 | `kitchen-fridge-001` | `550e8400-e29b-41d4-a716-446655440001` |
| 2 | tests/e2e/accessibility.spec.ts | 2 | `kitchen-fridge-001` | `550e8400-e29b-41d4-a716-446655440001` |
| 3 | tests/e2e/inventory-delta.spec.ts | 1 | `kitchen-fridge-001` | `550e8400-e29b-41d4-a716-446655440001` |
| 4 | tests/component/allowlist/AllowlistEntryForm.test.tsx | 4 | `container-001` | `550e8400-e29b-41d4-a716-446655440001` |

**Intentionally kept**: `containers.contract.test.ts` line 147 (`kitchen-fridge-001`) — validates non-UUID acceptance per T046.
**Already compliant**: `EditContainerDialog.test.tsx` (`container-abc-123`), `activeContainer.test.ts` (`container-abc-123`) — clearly synthetic.

## Documentation Files — No Changes Needed

| File | Status | Reason |
|------|--------|--------|
| docs/admin/container-management.md | Clean | Uses UUID examples, labels properly |
| docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md | Clean | Uses UUID format |
| specs/046-*/spec.md | Clean | Anti-pattern references only |
| specs/048-*/spec.md | Clean | Anti-pattern references only |
| specs/049-*/spec.md | Clean | Verification spec |
