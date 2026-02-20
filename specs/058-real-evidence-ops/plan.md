# Implementation Plan: Real Evidence Ops

**Branch**: `058-real-evidence-ops` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/058-real-evidence-ops/spec.md`

## Summary

Harden the existing PiDashboard operations UI (Features 055-057) to work reliably against real DEV data — sessions from PiOrchestrator, evidence images from MinIO — with production-grade error handling. No new UI screens are needed; the work is focused on: (1) wiring presigned URL auto-refresh on image load failure, (2) adding subsystem failure isolation via error boundaries, (3) replacing generic error messages with actionable context-specific messages, (4) adding debug panels for inventory evidence with MinIO object key display, and (5) generating a backend handoff for the image proxy endpoint needed for Tailscale Funnel access.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; PiOrchestrator + MinIO handle persistence)
**Testing**: Vitest 3.2.4 (unit/component/integration), Playwright 1.57.0 (E2E), MSW 2.x (API mocking)
**Target Platform**: Browser (Chromium/Firefox), served from Raspberry Pi
**Project Type**: Web (frontend-only; backend changes handled via handoff)
**Performance Goals**: Evidence thumbnails render within 3s on LAN; expired URL refresh within 2s; UI responsive with up to 50 thumbnails
**Constraints**: Must work from LAN, Tailscale VPN, and Tailscale Funnel network contexts; resource-constrained Pi (arm64)
**Scale/Scope**: Single operator; ~10-50 sessions; ~1-50 evidence captures per session; 2-4 cameras

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Hexagonal Architecture | PASS | All changes follow existing layer boundaries: presentation (error boundaries, image states), infrastructure (fix `getFreshUrl`), application (hooks unchanged). No new cross-layer violations. |
| II. Contract-First API | PASS | No new Zod schemas required — all existing schemas are sufficient. Object keys derived client-side from existing URL fields. |
| III. Test Discipline | PASS | All modified components will have updated tests. Error boundary tests, image auto-refresh tests, and actionable error message tests. MSW handlers already exist for all consumed endpoints. |
| IV. Simplicity & YAGNI | PASS | No new abstractions beyond a small `useImageWithRefresh` pattern. Reuses existing `extractObjectKey()`, `refreshPresignedUrl()`, `isFeatureUnavailable()`. No speculative features. |

### Post-Design Check

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Hexagonal Architecture | PASS | `SubsystemErrorBoundary` is a presentation-layer component. Image refresh logic stays in infrastructure (`evidence.ts`) called via application hooks. Debug panel is presentation-only. |
| II. Contract-First API | PASS | No schema changes. Presign endpoint consumption follows existing validated pattern. |
| III. Test Discipline | PASS | New tests: error boundary isolation (component), image auto-refresh (component + unit), actionable error messages (component), debug panel (component). Contract tests unchanged. |
| IV. Simplicity & YAGNI | PASS | No new abstractions. Error boundary is a thin wrapper around React's `ErrorBoundary`. Image refresh reuses existing API. Debug panel reuses existing `extractObjectKey()` and copy pattern. |

## Project Structure

### Documentation (this feature)

```text
specs/058-real-evidence-ops/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: entity model
├── quickstart.md        # Phase 1: dev setup guide
├── contracts/           # Phase 1: API contracts
│   └── existing-endpoints.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/types/                          # No changes
├── application/hooks/
│   └── useEvidence.ts                     # No hook changes (refresh already available)
├── infrastructure/api/
│   └── evidence.ts                        # FIX: getFreshUrl() to actually call refresh
├── presentation/components/
│   ├── common/
│   │   └── SubsystemErrorBoundary.tsx     # NEW: reusable error boundary with retry
│   ├── operations/
│   │   ├── OperationsView.tsx             # MODIFY: wrap subsystems in error boundaries
│   │   ├── SessionListView.tsx            # MODIFY: add isFeatureUnavailable(), actionable errors
│   │   └── SessionDetailView.tsx          # MODIFY: isolate delta vs session errors
│   ├── diagnostics/
│   │   ├── EvidenceThumbnail.tsx           # MODIFY: add auto-refresh on error
│   │   └── EvidencePreviewModal.tsx        # MODIFY: add auto-refresh on error
│   └── inventory/
│       └── InventoryEvidencePanel.tsx      # MODIFY: add auto-refresh + debug panel

tests/
├── component/
│   ├── common/
│   │   └── SubsystemErrorBoundary.test.tsx  # NEW
│   ├── operations/
│   │   ├── OperationsView.test.tsx          # MODIFY: test subsystem isolation
│   │   ├── SessionListView.test.tsx         # MODIFY: test feature unavailable, actionable errors
│   │   └── SessionDetailView.test.tsx       # MODIFY: test delta isolation
│   ├── diagnostics/
│   │   ├── EvidenceThumbnail.test.tsx       # MODIFY: test auto-refresh
│   │   └── EvidencePreviewModal.test.tsx    # MODIFY: test auto-refresh
│   └── inventory/
│       └── InventoryEvidencePanel.test.tsx   # MODIFY: test auto-refresh + debug panel
├── unit/api/
│   └── evidence.test.ts                     # MODIFY: test fixed getFreshUrl()
└── e2e/
    └── real-evidence-ops.spec.ts            # NEW: E2E for error states and image loading
```

**Structure Decision**: Frontend-only web application following existing hexagonal architecture. One new presentation component (`SubsystemErrorBoundary`), modifications to 6 existing components, 1 infrastructure fix, and corresponding tests. No new domain types, hooks, or API clients.

## Implementation Phases

### Phase A: Infrastructure Fix — `getFreshUrl()` (FR-003)

Fix the known gap in `evidence.ts` where `getFreshUrl()` checks expiration but doesn't actually refresh.

**File**: `src/infrastructure/api/evidence.ts`
**Change**: Make `getFreshUrl()` call `refreshPresignedUrl()` when the URL is expired, returning the fresh URL.

**Tests**: Update `tests/unit/api/evidence.test.ts` to verify `getFreshUrl()` calls refresh and returns new URL.

### Phase B: Subsystem Error Boundaries (FR-005, FR-007)

Create `SubsystemErrorBoundary` and apply it to isolate failures.

**New file**: `src/presentation/components/common/SubsystemErrorBoundary.tsx`
- React error boundary with: subsystem name, actionable error message, retry button
- `onReset` callback to retry (re-mount children)
- Minimal styling consistent with existing error states

**Modified files**:
- `OperationsView.tsx`: Wrap `SessionListView` and `CameraHealthDashboard` in separate error boundaries
- `SessionDetailView.tsx`: Wrap evidence/delta section in error boundary, separate from session metadata

**Tests**: Render each subsystem with a throwing child and verify the other subsystem still renders.

### Phase C: Feature Unavailability & Actionable Errors (FR-007, FR-008)

Add `isFeatureUnavailable()` checks and replace generic errors with actionable messages.

**Modified files**:
- `SessionListView.tsx`: Check `isFeatureUnavailable(error)` for graceful 404/503 handling; replace "Failed to load sessions" with "Unable to load sessions — PiOrchestrator may be unreachable. Check the service status or retry."
- `SessionDetailView.tsx`: Add delta-specific error display ("Delta data unavailable") when `deltaError` occurs but session loads
- `EvidencePanel.tsx`: Check `isFeatureUnavailable(error)` for graceful handling

**Tests**: Mock 404/503 responses and verify graceful degradation UI appears instead of error UI.

### Phase D: Image Auto-Refresh on Error (FR-003, FR-004, FR-010)

Wire presigned URL refresh into image error handlers.

**Modified files**:
- `EvidenceThumbnail.tsx`: On `<img>` `onError` → extract object key → call `refreshPresignedUrl()` → update src → retry once. Show loading skeleton during refresh, permanent error with "Retry" button if refresh fails.
- `EvidencePreviewModal.tsx`: Same pattern for full-resolution image.
- `InventoryEvidencePanel.tsx`: Same pattern for before/after images, using `extractObjectKey()` on `before_image_url`/`after_image_url`.

**State machine per image**: `loading → loaded | error → refreshing → loaded | failed`

**Tests**: Mock image load failure → verify refresh is called → verify retry with new URL → verify permanent error state if refresh fails.

### Phase E: Debug Panel for Inventory Evidence (FR-006)

Add collapsible debug section to `InventoryEvidencePanel` showing MinIO object keys.

**Modified file**: `InventoryEvidencePanel.tsx`
- Add collapsible "Debug Info" section (matching `EvidencePreviewModal` pattern)
- Display `extractObjectKey(before_image_url)` and `extractObjectKey(after_image_url)` in monospace
- Copy-to-clipboard button with toast feedback
- Only render when URLs are available

**Tests**: Render with mock evidence URLs → verify object keys displayed → verify copy button works.

### Phase F: E2E Tests

Create E2E test suite for the error handling and image loading flows.

**New file**: `tests/e2e/real-evidence-ops.spec.ts`
- Test: Operations tab loads with mocked sessions (smoke)
- Test: Session detail loads evidence thumbnails
- Test: Image load failure shows error placeholder with retry
- Test: Sessions API 404 shows graceful degradation
- Test: Camera health loads independently of session errors
- Test: Evidence debug panel shows object keys

### Phase G: Backend Handoff

Generate handoff document for PiOrchestrator image proxy endpoint.

**Action**: Create handoff document via `/handoff-generate` specifying:
- Image proxy endpoint requirement
- Context-aware URL generation
- Expected response format (stream bytes, proper headers)

## Complexity Tracking

> No constitution violations. All changes follow existing patterns.

| Aspect | Approach | Justification |
| ------ | -------- | ------------- |
| SubsystemErrorBoundary | New component | React error boundaries cannot be hooks; a small class component wrapper is the standard React pattern. Reused across 3 locations. |
| Image state machine | Component-local state | 5 states per image (loading/loaded/error/refreshing/failed). Kept in component state, not Zustand, per YAGNI — no other component needs this state. |
| Object key extraction | Client-side URL parsing | Avoids requiring backend API changes. Uses existing `extractObjectKey()` helper. If backend adds explicit `object_key` field later, frontend can consume it as progressive enhancement. |
