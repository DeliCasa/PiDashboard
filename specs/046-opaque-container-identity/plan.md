# Implementation Plan: Opaque Container Identity & Container-Scoped Views

**Branch**: `046-opaque-container-identity` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/046-opaque-container-identity/spec.md`

## Summary

Add a global container picker to the dashboard header that persists selection in localStorage and scopes camera/evidence views to the active container's assigned cameras. Audit and fix any remaining hardcoded semantic container IDs (one placeholder in AllowlistEntryForm). All container IDs remain opaque strings — displayed in monospace, never parsed.

No new API endpoints. All filtering is client-side using existing Feature 043 container data + Feature 034 camera data.

## Technical Context

**Language/Version**: TypeScript ~5.9.3 + React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zustand 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: localStorage (active container selection), React Query cache (server state)
**Testing**: Vitest 3.2.4 (unit/component/integration), Playwright 1.57.0 (E2E), MSW 2.x (API mocking)
**Target Platform**: Web (Chromium primary, Firefox secondary)
**Project Type**: Single web application (SPA)
**Performance Goals**: Container switch scopes views in < 2 seconds, no full page reload
**Constraints**: VITEST_MAX_WORKERS=1 for CI, 50% CPU for local tests
**Scale/Scope**: ~4 containers, ~20 cameras, ~100 evidence entries per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Store in `application/stores/`, picker in `presentation/components/`, hooks in `application/hooks/`. No layer violations. |
| II. Contract-First API | PASS | No new API endpoints. Reuses existing validated schemas from Features 043 and 034. |
| III. Test Discipline | PASS | Plan includes unit tests for store, component tests for picker, integration tests for derived hook, E2E for scoping flow. Resource constraints observed. |
| IV. Simplicity & YAGNI | PASS | Client-side filtering avoids backend changes. Zustand store is ~30 lines. No premature abstractions. |

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | `activeContainer.ts` store is pure client state in application layer. `ContainerPicker.tsx` consumes hooks only. `useContainerCameras()` derives from existing hooks. |
| II. Contract-First API | PASS | No schema changes. Cross-referencing `ContainerDetail.cameras[].device_id` with `Camera.id` uses existing validated types. |
| III. Test Discipline | PASS | Store: unit test. Picker: component test with mocked hooks. Derived hook: MSW-backed integration test. E2E: container selection + camera scoping. |
| IV. Simplicity & YAGNI | PASS | No new abstractions beyond what's needed. Derived hook follows existing `useUnassignedCameras()` pattern exactly. |

**Gate result**: PASS — no violations. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/046-opaque-container-identity/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Data model and state transitions
├── quickstart.md        # Developer quickstart guide
├── contracts/           # API contract notes (no new endpoints)
│   └── README.md
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── application/
│   ├── hooks/
│   │   └── useContainers.ts          # MODIFIED: add useContainerCameras() derived hook
│   └── stores/
│       └── activeContainer.ts        # NEW: Zustand store for active container selection
├── presentation/
│   └── components/
│       ├── containers/
│       │   └── ContainerPicker.tsx    # NEW: Header dropdown picker component
│       ├── cameras/
│       │   └── CameraSection.tsx      # MODIFIED: use scoped camera list
│       ├── diagnostics/
│       │   └── EvidencePanel.tsx       # MODIFIED: filter by container cameras (if applicable)
│       └── allowlist/
│           └── AllowlistEntryForm.tsx  # MODIFIED: update placeholder text
├── App.tsx                            # MODIFIED: add ContainerPicker to header

tests/
├── unit/
│   └── stores/
│       └── activeContainer.test.ts    # NEW: Zustand store unit tests
├── component/
│   └── containers/
│       └── ContainerPicker.test.tsx   # NEW: Picker component tests
├── integration/
│   └── hooks/
│       └── useContainerCameras.test.ts # NEW: Derived hook integration tests
└── e2e/
    └── container-scoping.spec.ts      # NEW: E2E container selection + camera scoping
```

**Structure Decision**: Follows existing hexagonal architecture. New files placed in established directories following existing naming conventions. No new directories created except `tests/unit/stores/` if it doesn't exist.

## Design Pattern Standards

### State Management

| Concern | Pattern | File |
|---------|---------|------|
| Active container (client state) | Zustand store + persist | `activeContainer.ts` |
| Container list (server state) | TanStack React Query | `useContainers.ts` (existing) |
| Camera list (server state) | TanStack React Query | `useCameras.ts` (existing) |
| Scoped cameras (derived) | Computed from above two | `useContainerCameras()` |

### Component Design

**ContainerPicker** follows existing patterns:
- Functional component with explicit props interface
- Consumes data via application hooks only (`useContainers`, `useActiveContainer`)
- Uses shadcn/ui `Select` primitive (same as `AssignCameraDialog`)
- Label-first display with monospace ID secondary (same as `ContainerCard`)
- Graceful degradation when API unavailable

### Stale Selection Reconciliation

The picker component validates selection on each container data update:

```
containers data arrives →
  if activeContainerId in containers → keep selection
  if activeContainerId not in containers → auto-select first container
  if no containers → clear selection (null)
```

This runs via a `useEffect` that watches `containers` data, keeping the logic in the presentation layer where it belongs (user-facing reconciliation).

## Quality Gates

### Pre-Commit

- [ ] TypeScript compilation passes (`npm run build`)
- [ ] ESLint passes with 0 errors (`npm run lint`)
- [ ] All tests pass (`VITEST_MAX_WORKERS=1 npm test`)
- [ ] No `any` types in new code
- [ ] No hardcoded semantic container IDs

### PR Gates

- [ ] Unit tests for Zustand store (selection, persistence, stale handling)
- [ ] Component tests for ContainerPicker (render, selection, empty state, error state)
- [ ] Integration tests for useContainerCameras (filtering, fallback)
- [ ] E2E test for container selection → camera scoping flow
- [ ] Coverage thresholds met (65%+)
- [ ] Bundle size check passes
- [ ] Lint clean

### Acceptance

- [ ] SC-001: Container switch scopes cameras in < 2s
- [ ] SC-002: Zero hardcoded semantic container defaults in production code
- [ ] SC-003: Selection persists across browser sessions
- [ ] SC-004: Graceful degradation when no containers available
- [ ] SC-005: DEV validation against live PiOrchestrator
