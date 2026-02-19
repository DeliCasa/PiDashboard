# Research: Live Operations Viewer

**Feature**: 057-live-ops-viewer
**Date**: 2026-02-18

## Key Findings

### Decision 1: Build Strategy — Compose Existing Infrastructure vs Build New

**Decision**: Compose and enhance existing infrastructure. The codebase already has ~90% of the required API clients, schemas, hooks, and UI components. This feature creates an operator-focused view by reorganizing and enhancing what exists.

**Rationale**: All four core APIs (sessions, evidence, camera diagnostics, inventory delta) have complete Zod-validated clients, React Query hooks, and basic UI components. Building from scratch would violate YAGNI and duplicate ~3,000 LOC of battle-tested code.

**Alternatives considered**:
- Full rebuild with new API layer: Rejected — wastes existing contract tests and hook logic
- Simple tab reorg only: Rejected — doesn't address enhanced correlation IDs, failure display, or camera health dashboard

### Decision 2: UI Placement — New Tab vs Enhanced Existing Tab

**Decision**: Create a new "Operations" top-level tab that composes existing components into an operator-first layout. Keep the existing DEV/Diagnostics tab for raw debugging.

**Rationale**: The existing diagnostics tab is developer-focused (raw JSON, individual panels). Operators need a unified view: sessions list → session detail → evidence + delta. Separate concerns: operators use "Operations", developers use "DEV".

**Alternatives considered**:
- Enhance existing Diagnostics tab: Rejected — mixing operator and developer workflows makes both worse
- Subtabs within existing Cameras tab: Rejected — sessions/evidence are not camera-specific

### Decision 3: Session Status Schema Gap — Handle `failed` Status

**Decision**: Map existing statuses to operator-friendly display. Current backend has `active | completed | cancelled`. Show `cancelled` as the error/failure state since it represents abnormal termination. If backend adds `failed` status later, extend the badge config.

**Rationale**: The spec requires showing "failed" sessions, but the current schema only has `cancelled`. Rather than adding a frontend-only status (violates enum sync rules), we display `cancelled` with error styling and rely on the `error_message` field from inventory analysis metadata for failure reasons.

**Alternatives considered**:
- Add `failed` to frontend enum: Rejected — violates Constitution II.B (PiOrchestrator-first enum rule)
- Request backend schema change: Out of scope — this feature is PiDashboard-only

### Decision 4: Correlation ID Source

**Decision**: Use multiple correlation sources displayed together: session ID, delivery ID (from session), and request_id (from V1 API responses). All are copyable.

**Rationale**: No single "correlation ID" field exists in the session schema. The combination of session_id + delivery_id + request_id gives operators enough context to search logs across PiOrchestrator and BridgeServer. The `getLastRequestId()` helper already exists in the inventory API.

**Alternatives considered**:
- Request a dedicated correlation_id field: Rejected — requires backend changes and handoff
- Only show session_id: Insufficient — operators need delivery_id for BridgeServer log correlation

### Decision 5: Camera Health Dashboard Layout

**Decision**: Card grid layout with one card per camera showing status badge, last_seen, connection quality, and capture count. Expandable for diagnostics details.

**Rationale**: Operators need to see all cameras at a glance. The existing CameraDetail modal is too heavy for a dashboard view (358 lines, one camera at a time). A card grid matches the SessionCard pattern already in use.

**Alternatives considered**:
- Table layout: Rejected — less scannable for quick status checks
- Reuse existing camera list: Partially — the camera list exists but lacks health-focused display

### Decision 6: Evidence Before/After Display Strategy

**Decision**: Reuse `InventoryEvidencePanel` component (which already does side-by-side before/after with overlays) when inventory delta data is available. For raw evidence without inventory analysis, show the flat grid from `EvidencePanel`.

**Rationale**: The before/after comparison is already implemented with overlay support in `InventoryEvidencePanel` (210 lines). No need to rebuild this. When a session has inventory analysis, the evidence panel is richer; when it doesn't, the flat evidence grid is appropriate.

**Alternatives considered**:
- Build new before/after component: Rejected — duplicates InventoryEvidencePanel
- Always show flat grid: Rejected — loses the side-by-side comparison value

### Decision 7: Raw Evidence Object Key Access

**Decision**: Add an expandable "Debug Info" section to the evidence preview modal showing the object key (extracted from presigned URL path) and a direct link. Follow the RunDebugInfo pattern with copy-to-clipboard.

**Rationale**: The presigned URL contains the object key in its path. Parsing it client-side avoids a new API endpoint. The RunDebugInfo component pattern (120 lines) provides a proven UX for this type of debug metadata.

**Alternatives considered**:
- New API endpoint for object metadata: Rejected — over-engineering for P3 story
- Always-visible key display: Rejected — clutters the UI for the 95% case

## Existing Infrastructure Inventory

### Fully Reusable (No Changes)
| Component | File | LOC |
|-----------|------|-----|
| Sessions API client | `infrastructure/api/sessions.ts` | ~80 |
| Evidence API client | `infrastructure/api/evidence.ts` | ~150 |
| Camera Diagnostics API | `infrastructure/api/camera-diagnostics.ts` | ~100 |
| Inventory Delta API | `infrastructure/api/inventory-delta.ts` | ~200 |
| All Zod schemas | `infrastructure/api/*-schemas.ts` | ~400 |
| useSessions hook | `application/hooks/useSessions.ts` | ~60 |
| useSessionEvidence hook | `application/hooks/useEvidence.ts` | ~120 |
| useCameraDiagnostics hooks | `application/hooks/useCameraDiagnostics.ts` | ~80 |
| useInventoryDelta hooks | `application/hooks/useInventoryDelta.ts` | ~200 |
| EvidenceThumbnail | `presentation/components/diagnostics/EvidenceThumbnail.tsx` | 94 |
| EvidencePreviewModal | `presentation/components/diagnostics/EvidencePreviewModal.tsx` | 139 |
| SessionStatusTimeline | `presentation/components/inventory/SessionStatusTimeline.tsx` | 93 |
| InventoryEvidencePanel | `presentation/components/inventory/InventoryEvidencePanel.tsx` | 210 |
| InventoryDeltaTable | `presentation/components/inventory/InventoryDeltaTable.tsx` | 158 |
| ConnectionQualityBadge | `presentation/components/diagnostics/ConnectionQualityBadge.tsx` | 97 |
| ErrorDisplay | `presentation/components/common/ErrorDisplay.tsx` | 649 |
| RunDebugInfo pattern | `presentation/components/inventory/RunDebugInfo.tsx` | 120 |
| diagnostics-utils | `lib/diagnostics-utils.ts` | 81 |
| Query key factory | `lib/queryClient.ts` | ~100 |

### Needs Enhancement
| Component | Change | Reason |
|-----------|--------|--------|
| SessionCard | Add failure reason display, correlation ID row | Spec FR-005 |
| EvidencePreviewModal | Add raw object key section | Spec FR-010 |

### New Components Needed
| Component | Purpose | Estimated LOC |
|-----------|---------|---------------|
| OperationsView | Top-level tab layout with sessions + health | ~80 |
| SessionListView | Enhanced session list with status filter tabs | ~120 |
| SessionDetailView | Drill-down combining evidence, delta, debug info | ~200 |
| CameraHealthDashboard | Card grid of all cameras with health summary | ~150 |
| CameraHealthCard | Single camera card with status, last_seen, diagnostics | ~100 |

**Total estimated new code: ~650 LOC**
**Total estimated modifications: ~60 LOC**
