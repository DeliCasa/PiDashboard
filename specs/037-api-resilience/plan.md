# Implementation Plan: API Resilience & UI Correctness

**Branch**: `037-api-resilience` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-api-resilience/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Harden PiDashboard against PiOrchestrator API variability by ensuring correct UI state transitions (loading→success→empty vs loading→error), graceful degradation for optional WiFi endpoints, and comprehensive E2E test coverage with CI integration for trace/video artifacts on failure.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: N/A (API-driven, no local persistence for this feature)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web browser (Chrome, Firefox, Safari)
**Project Type**: Web SPA (React)
**Performance Goals**: All data views respond within 3 seconds; polling interval 10 seconds
**Constraints**: <10s API timeout; max 3 retries with exponential backoff; zero console errors for expected 404s
**Scale/Scope**: Single dashboard serving 1-5 concurrent operators; 3 critical flows (Cameras, Door, System)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Changes stay within existing layers: infrastructure/api (error handling), application/hooks (state), presentation/components (UI states) |
| II. Contract-First API | PASS | Existing Zod schemas will be reused; no new API endpoints, only hardening existing ones |
| II.A Zod Schema Conventions | PASS | No new schemas required; existing schemas are already snake_case |
| II.B Enum Synchronization | PASS | No new enums; existing CameraStatus enum is PiOrchestrator-first |
| II.C API Integration Workflow | PASS | Enhancing existing API clients, not adding new endpoints |
| II.D Breaking Change Response | N/A | No breaking changes, only resilience improvements |
| III. Test Discipline | PASS | Adding E2E tests for existing critical flows; expanding contract test coverage |
| III.A Contract Testing | PASS | Mock data already validates against schemas; will add error scenario tests |
| III.B Pre-Commit Commands | PASS | `npm test`, `npm run lint`, `npm run build` will be required |
| IV. Simplicity & YAGNI | PASS | No new abstractions; improving existing error handling with minimal changes |

**GATE RESULT**: ALL PASS - Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/037-api-resilience/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# PiDashboard - React SPA with Hexagonal Architecture
src/
├── domain/
│   └── types/
│       └── entities.ts              # Existing Camera, LoadingState types
├── application/
│   └── hooks/
│       ├── useCameras.ts            # MODIFY: Improve loading/error state handling
│       ├── useWifi.ts               # MODIFY: Graceful 404 handling
│       ├── useDoorStatus.ts         # VERIFY: Existing error handling
│       └── useSystemInfo.ts         # VERIFY: Existing error handling
├── infrastructure/
│   └── api/
│       ├── client.ts                # MODIFY: Centralize retry/timeout config
│       ├── wifi.ts                  # MODIFY: Suppress console errors on 404
│       ├── door.ts                  # VERIFY: Error normalization
│       └── system.ts                # VERIFY: Error normalization
└── presentation/
    └── components/
        └── cameras/
            ├── CameraList.tsx       # MODIFY: Distinct loading/empty/error states
            └── CameraCard.tsx       # VERIFY: Error state rendering

tests/
├── e2e/
│   ├── fixtures/
│   │   ├── test-base.ts             # MODIFY: Add error scenario helpers
│   │   └── mock-routes.ts           # MODIFY: Add error response mocks
│   ├── cameras-resilience.spec.ts   # NEW: Camera state transition tests
│   ├── wifi-degradation.spec.ts     # NEW: WiFi 404 degradation tests
│   ├── door-resilience.spec.ts      # NEW: Door error handling tests
│   └── system-resilience.spec.ts    # NEW: System info error handling tests
└── integration/
    └── hooks/
        ├── useCameras.test.ts       # MODIFY: Add error scenario tests
        └── useWifi.test.ts          # MODIFY: Add 404 handling tests

.github/
└── workflows/
    └── test.yml                     # MODIFY: Add E2E artifact upload on failure
```

**Structure Decision**: Enhancing existing hexagonal architecture with no new layers or abstractions. Changes are localized to:
1. Infrastructure: API error handling improvements
2. Application: Hook state management refinements
3. Presentation: UI state rendering corrections
4. Tests: E2E coverage expansion with CI integration

## Complexity Tracking

> No Constitution violations to justify. All changes follow existing patterns.

| Item | Decision | Rationale |
|------|----------|-----------|
| No new abstractions | Keep existing `ApiError`, `V1ApiError` | Existing error classes are sufficient |
| No new state management | Use React Query states | `isLoading`, `isError`, `data` already provide needed states |
| No new test framework | Extend Playwright fixtures | Existing `test-base.ts` and `mock-routes.ts` patterns work |

---

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Hexagonal Architecture | PASS | data-model.md confirms: APIError in infrastructure, LoadingState derived in hooks, UI states in presentation |
| II. Contract-First API | PASS | contracts/error-handling.md defines behavioral contracts, not new API schemas |
| II.A Zod Schema Conventions | PASS | No new Zod schemas added; existing schemas unchanged |
| II.B Enum Synchronization | PASS | No new enums; LoadingState is conceptual, not a Zod enum |
| II.C API Integration Workflow | PASS | No new endpoints; enhancing error handling in existing clients |
| II.D Breaking Change Response | N/A | No breaking changes |
| III. Test Discipline | PASS | contracts/e2e-test-fixtures.md defines comprehensive mock data and test scenarios |
| III.A Contract Testing | PASS | Test matrix covers all UI states: loading, success, empty, error, network failure |
| III.B Pre-Commit Commands | PASS | quickstart.md documents required validation commands |
| IV. Simplicity & YAGNI | PASS | No new files in src/ except potentially feature-availability.ts (optional, lightweight) |

**POST-DESIGN GATE RESULT**: ALL PASS - Ready for `/speckit.tasks` task generation.

---

## Phase 1 Artifacts Generated

| Artifact | Location | Purpose |
|----------|----------|---------|
| research.md | `specs/037-api-resilience/research.md` | Decisions on error handling, polling, testing patterns |
| data-model.md | `specs/037-api-resilience/data-model.md` | APIError, LoadingState, FeatureAvailability entities |
| error-handling.md | `specs/037-api-resilience/contracts/error-handling.md` | HTTP status mapping, UI state contracts |
| e2e-test-fixtures.md | `specs/037-api-resilience/contracts/e2e-test-fixtures.md` | Mock data schemas, route configurations |
| quickstart.md | `specs/037-api-resilience/quickstart.md` | Implementation guide for developers |

---

## Next Steps

1. Run `/speckit.tasks` to generate detailed implementation tasks
2. Implement tasks in priority order (P1 → P2 → P3)
3. Run validation suite before PR: `npm run lint && npm test && npm run build && npm run test:e2e`
