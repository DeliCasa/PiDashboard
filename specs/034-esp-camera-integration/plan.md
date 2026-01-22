# Implementation Plan: ESP Camera Integration via PiOrchestrator

**Branch**: `034-esp-camera-integration` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-esp-camera-integration/spec.md`

## Summary

Migrate PiDashboard camera functionality from the deprecated `/dashboard/cameras` endpoints to the V1 Cameras API (`/api/v1/cameras/*`). This includes enhancing the existing camera list, adding a camera detail view, implementing base64 JPEG capture with download, adding reboot confirmation dialogs, and creating a diagnostics page for debugging.

**Key change**: The capture endpoint now returns base64 JPEG data directly instead of a URL, requiring UI updates to render inline images and support downloads.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zustand 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: N/A (API-driven, no local persistence for this feature)
**Testing**: Vitest (unit/integration), Playwright (E2E), MSW (API mocking)
**Target Platform**: Web browser (served from PiOrchestrator on port 8082)
**Project Type**: Single-page web application (frontend only)
**Performance Goals**: Camera list loads < 5s, capture completes < 30s, image downloads < 2s
**Constraints**: < 1MB image payloads typical, 10s polling interval, pause polling when tab hidden
**Scale/Scope**: 1-10 cameras typical, single user dashboard

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file contains template placeholders. Applying general software engineering best practices:

### Pre-Design Check (Phase 0)

| Gate | Status | Notes |
|------|--------|-------|
| No over-engineering | PASS | Extends existing camera infrastructure; no new abstractions |
| Test coverage | PASS | Will add unit tests for new hooks, E2E for capture flow |
| Type safety | PASS | Using existing Zod schemas and TypeScript interfaces |
| Error handling | PASS | Leveraging existing error infrastructure (V1ApiError, ApiError) |
| Accessibility | PENDING | Will verify modal dialogs and buttons meet WCAG 2.1 AA |

### Post-Design Check (Phase 1)

| Gate | Status | Notes |
|------|--------|-------|
| No over-engineering | PASS | Data model uses existing entity patterns; no new abstractions added |
| Test coverage | PASS | Test files mapped in project structure; Zod schemas provide runtime validation |
| Type safety | PASS | Full Zod schemas defined in data-model.md; OpenAPI contract in contracts/ |
| Error handling | PASS | Camera-specific error codes defined (CAMERA_OFFLINE, etc.) with retryable flags |
| Accessibility | PASS | Using Radix UI Dialog/AlertDialog primitives which handle a11y; will verify in E2E |
| API Contract | PASS | OpenAPI 3.1 spec created at contracts/v1-cameras-api.yaml |
| Documentation | PASS | quickstart.md provides developer onboarding; research.md captures decisions |

## Project Structure

### Documentation (this feature)

```text
specs/034-esp-camera-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI for V1 Cameras API)
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/types/
│   ├── entities.ts            # Camera, CameraHealth, CameraDiagnostics (existing)
│   └── api.ts                 # CaptureResponse update (base64 field)
├── infrastructure/api/
│   ├── cameras.ts             # Migrate to V1 endpoints
│   └── v1-cameras.ts          # NEW: V1 cameras API client
├── application/hooks/
│   ├── useCameras.ts          # Update for V1 API
│   ├── useCamera.ts           # NEW: Single camera detail hook
│   └── useCameraCapture.ts    # NEW: Capture mutation with base64 handling
├── presentation/components/
│   └── cameras/
│       ├── CameraSection.tsx  # UPDATE: Use new hooks
│       ├── CameraCard.tsx     # UPDATE: Add View button
│       ├── CameraDetail.tsx   # NEW: Camera detail view
│       ├── CaptureModal.tsx   # NEW: Capture modal with download
│       ├── CapturePreview.tsx # UPDATE: Handle base64 images
│       ├── RebootDialog.tsx   # NEW: Confirmation dialog
│       └── DiagnosticsView.tsx # NEW: Raw JSON diagnostics
└── lib/
    └── download.ts            # NEW: Base64 to blob download helper

tests/
├── unit/
│   └── api/
│       └── v1-cameras.test.ts # V1 client tests
├── component/
│   └── cameras/
│       ├── CameraDetail.test.tsx
│       ├── CaptureModal.test.tsx
│       └── DiagnosticsView.test.tsx
└── e2e/
    └── cameras.spec.ts        # Full camera workflow E2E
```

**Structure Decision**: Extends existing single-page web application structure. New components follow established patterns in `src/presentation/components/`. API clients follow hexagonal architecture pattern with infrastructure/api layer.

## Complexity Tracking

> No constitution violations requiring justification. Feature extends existing patterns.

## Key Implementation Decisions

### 1. API Migration Strategy

The existing `camerasApi` uses `/dashboard/cameras` endpoints. Options:
- **Option A**: Update existing `cameras.ts` to use V1 routes (breaking change during transition)
- **Option B**: Create new `v1-cameras.ts` alongside existing (parallel support)
- **Option C**: Add V1 support to existing client with feature flag

**Decision**: Option B - Create `v1-cameras.ts` with clean V1 implementation. The existing `cameras.ts` can be deprecated and removed after migration verification.

### 2. Base64 Image Handling

V1 capture returns base64 JPEG directly instead of URL. Considerations:
- Image rendering: `<img src="data:image/jpeg;base64,..." />`
- Download: Convert base64 to Blob, create object URL, trigger download
- Memory: Large images (~500KB-1MB) handled by browser garbage collection

**Decision**: Create `src/lib/download.ts` utility for base64-to-blob conversion and download triggering.

### 3. Camera Detail Navigation

Options for detail view:
- **Option A**: Expand card inline (no navigation)
- **Option B**: Modal dialog (current pattern for capture preview)
- **Option C**: Slide-over panel
- **Option D**: Dedicated route/page

**Decision**: Option B - Modal dialog. Consistent with existing `CapturePreview` pattern, doesn't require routing changes. Detail modal opens from "View" button on `CameraCard`.

### 4. Polling Pause on Tab Hidden

Browser tab visibility detection:
- Use `document.hidden` and `visibilitychange` event
- TanStack Query has built-in `refetchOnWindowFocus` but no pause option
- Need custom hook to pause refetchInterval when tab hidden

**Decision**: Create `useDocumentVisibility` hook that returns `isVisible` state based on `document.hidden`. Pass to `refetchInterval` option in useCameras.

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PiOrchestrator V1 endpoints not ready | Medium | High | Verify endpoints exist before implementation; use MSW mocks |
| Base64 images too large | Low | Medium | Add loading states; consider virtualized rendering for diagnostics |
| Breaking existing camera functionality | Medium | High | Keep old API client until V1 verified; add E2E tests first |
| Accessibility regressions | Medium | Medium | Use Radix UI primitives; run axe-core in E2E tests |
