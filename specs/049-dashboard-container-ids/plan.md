# Implementation Plan: Dashboard Container IDs

**Branch**: `049-dashboard-container-ids` | **Date**: 2026-02-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/049-dashboard-container-ids/spec.md`

## Summary

This feature validates that all hardcoded "fridge-1" references have been removed from the PiDashboard codebase and that the UI properly fetches container lists (UUID + label) from `/api/v1/containers`, stores selected UUID in state, and uses it in all API calls. **Research confirms all functional requirements are already satisfied** by Features 043, 046, 047, and 048. Only two optional cosmetic cleanup tasks remain.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, Zustand 5.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: localStorage (active container selection via Zustand persist, Feature 046)
**Testing**: Vitest 3.2.4, Playwright 1.57.0, MSW 2.x
**Target Platform**: Web (modern browsers), Raspberry Pi display
**Project Type**: Single web application (React SPA)
**Performance Goals**: Container picker loads within 3s; inventory queries scoped by UUID complete within 3s
**Constraints**: Graceful degradation on 404/503 (feature unavailable). Resource-limited test execution.
**Scale/Scope**: 0 new components, 0 new API endpoints. 2 optional cosmetic file edits.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | No new code required. Existing implementation follows hexagonal layers: domain types in `domain/types/containers.ts`, hooks in `application/hooks/useContainers.ts`, API client in `infrastructure/api/v1-containers.ts`, picker in `presentation/components/containers/ContainerPicker.tsx`. No cross-layer violations. |
| II. Contract-First API | PASS | Container API responses validated via Zod schemas in `v1-containers-schemas.ts`. Contract tests exist at `tests/integration/contracts/containers.contract.test.ts`. All mock data passes schema validation. |
| III. Test Discipline | PASS | Container infrastructure has 200+ tests across unit, component, integration, and E2E layers. Contract tests validate opaque ID handling including non-UUID formats. Resource constraints enforced via `VITEST_MAX_WORKERS` and `PLAYWRIGHT_WORKERS`. |
| IV. Simplicity & YAGNI | PASS | No new abstractions, utilities, or features introduced. The two optional tasks are cosmetic documentation/test edits. |

## Project Structure

### Documentation (this feature)

```text
specs/049-dashboard-container-ids/
├── spec.md              # Feature specification (verified complete)
├── plan.md              # This file
├── research.md          # Codebase scan results — all RQs resolved
├── quickstart.md        # Developer reference
└── tasks.md             # 2 optional cosmetic tasks + 7 verification checks
```

### Source Code (repository root)

No source code changes required. All implementation exists in prior features:

```text
src/
├── domain/types/
│   └── containers.ts              # Container: { id: string (opaque), label?: string, ... }
├── application/
│   ├── hooks/
│   │   ├── useContainers.ts       # useContainers(), useContainerCameras(), etc.
│   │   └── useInventoryDelta.ts   # useInventoryRuns(containerId), useSessionDelta(), etc.
│   └── stores/
│       └── activeContainer.ts     # Zustand: activeContainerId (string | null)
├── infrastructure/api/
│   ├── v1-containers.ts           # API client: /api/v1/containers CRUD
│   ├── v1-containers-schemas.ts   # Zod schemas for container responses
│   ├── inventory-delta.ts         # API client: container-scoped inventory endpoints
│   └── inventory-delta-schemas.ts # Zod schemas for inventory responses
└── presentation/components/
    ├── containers/
    │   └── ContainerPicker.tsx     # Header dropdown: label + truncated UUID
    └── inventory/
        ├── InventorySection.tsx    # Scoped by activeContainerId
        ├── InventoryRunList.tsx    # Run list for active container
        └── InventoryRunDetail.tsx  # Resolves container label via useContainers()
```

## Complexity Tracking

No constitution violations — table not applicable.

## Implementation Status

| Task | File | Status |
|------|------|--------|
| Container picker from API | `ContainerPicker.tsx` | Complete (Feature 046) |
| UUID in Zustand + localStorage | `activeContainer.ts` | Complete (Feature 046) |
| UUID in all API calls | `v1-containers.ts`, `inventory-delta.ts` | Complete (Features 043, 047) |
| Label-first display | `ContainerPicker.tsx`, `InventoryRunDetail.tsx` | Complete (Features 046, 048) |
| No "fridge-1" in src/ | Entire `src/` directory | Verified (0 matches) |
| Handoff doc cosmetic fix | `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` | Optional (T001) |
| E2E fixture ID normalization | `tests/e2e/fixtures/mock-routes.ts` + related | Optional (T002) |

## Key Design Decisions

### D1: No New Implementation Required

**Decision**: Feature 049 is a verification-only feature. All functional requirements were implemented across Features 043-048.

**Rationale**: Codebase search confirms zero "fridge-1" in `src/`. The container picker, UUID state management, label display, and container-scoped API queries are all in place and tested. Creating new code would violate Constitution IV (YAGNI).

### D2: Test Fixture ID `kitchen-fridge-001` Retained

**Decision**: Keep the semantic-looking test fixture ID `kitchen-fridge-001` rather than normalizing to UUID format.

**Rationale**: The contract test at `tests/integration/contracts/containers.contract.test.ts:147` explicitly validates that non-UUID formats are accepted. Having mixed ID formats in tests (UUIDs + synthetic strings) actively proves the system treats IDs as opaque. Normalizing would reduce test coverage breadth.

**Alternatives considered**:
- Replace all test IDs with UUIDs (rejected: reduces format diversity in tests, doesn't improve correctness)
- Add both formats side-by-side (rejected: increases test fixture complexity for no functional benefit)

### D3: Handoff Doc Update is Cosmetic

**Decision**: The `fridge-1` reference in `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md:388` is a PiOrchestrator environment variable example. Updating it to a UUID is purely cosmetic.

**Rationale**: Handoff documents are historical records of cross-repo communication. The example value is for illustration only and does not affect any runtime behavior.

## API Endpoints

No new endpoints. All container and inventory endpoints are already implemented:

| Endpoint | Method | Source | Status |
|----------|--------|--------|--------|
| `/v1/containers` | GET | Feature 043 | Existing |
| `/v1/containers/{id}` | GET | Feature 043 | Existing |
| `/v1/containers/{containerId}/inventory/latest` | GET | Feature 047 | Existing |
| `/v1/containers/{containerId}/inventory/runs` | GET | Feature 047 | Existing |
| `/v1/sessions/{sessionId}/inventory-delta` | GET | Feature 047 | Existing |
| `/v1/inventory/{runId}/review` | POST | Feature 048 | Existing |

## Dependencies

| Dependency | Status | Impact |
|------------|--------|--------|
| Feature 043 (Container Identity UI) | Merged | Provides container CRUD API client |
| Feature 046 (Opaque Container Identity) | Merged | Provides ContainerPicker, activeContainer store |
| Feature 047 (Inventory Delta Viewer) | Merged | Provides container-scoped inventory hooks |
| Feature 048 (Inventory Review) | In progress (current branch) | Provides label resolution in detail views |

## Post-Design Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | No new code. Existing layers verified correct. |
| II. Contract-First API | PASS | All API responses validated via Zod. Contract tests exist. |
| III. Test Discipline | PASS | 200+ tests cover container infrastructure. No gaps found. |
| IV. Simplicity & YAGNI | PASS | Zero new abstractions. Two optional cosmetic tasks only. |
