# Implementation Plan: Dashboard Resilience & E2E Coverage

**Branch**: `045-dashboard-resilience-e2e` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/045-dashboard-resilience-e2e/spec.md`

## Summary

Add graceful degradation (`isFeatureUnavailable()`) to containers and cameras hooks, extend E2E mock infrastructure to cover all 12 dashboard tabs, write Playwright E2E tests for operator-critical flows and graceful degradation, extend live Pi smoke tests for newer features, and generate dashboard state documentation.

**Key Insight**: Most infrastructure already exists (Feature 037 `isFeatureUnavailable`, Feature 044 contract tests, existing E2E fixtures). This feature fills specific gaps — no new components or API endpoints are needed.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, Playwright 1.57.0
**Storage**: N/A (API-driven, PiOrchestrator backend handles persistence)
**Testing**: Vitest 3.2.4 (unit/integration), Playwright 1.57.0 (E2E), MSW 2.x (mocks)
**Target Platform**: Modern browsers (Chrome, Firefox), served from Raspberry Pi
**Project Type**: Web (React SPA with Vite 7)
**Performance Goals**: Tab navigation < 1s, E2E suite < 60s
**Constraints**: Single-threaded test execution in CI (VITEST_MAX_WORKERS=1, PLAYWRIGHT_WORKERS=1)
**Scale/Scope**: 12 tabs, 2094+ existing tests, 18 existing E2E spec files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Hook changes stay in application layer. E2E tests are external. |
| II. Contract-First API | PASS | No new schemas needed. Existing Zod schemas used for mock validation. |
| III. Test Discipline | PASS | Adding E2E coverage — directly serves this principle. |
| III.A Contract Testing | PASS | Existing contract tests remain. E2E mocks conform to same schemas. |
| III.B Resource Constraints | PASS | PLAYWRIGHT_WORKERS=1 in CI. |
| IV. Simplicity & YAGNI | PASS | Minimal code changes (10-15 lines per hook). No new abstractions. |

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | `isFeatureUnavailable()` imported from infrastructure layer to application layer — correct direction. |
| II. Contract-First API | PASS | E2E mocks use V1 API response wrapper format. |
| III. Test Discipline | PASS | Adding 3+ E2E spec files, extending live smoke, adding dashboard states doc. |
| IV. Simplicity & YAGNI | PASS | No new components, no new state management patterns. Reuse existing `isFeatureUnavailable()`. |

## Project Structure

### Documentation (this feature)

```text
specs/045-dashboard-resilience-e2e/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (COMPLETE)
├── data-model.md        # Phase 1 output (COMPLETE)
├── quickstart.md        # Phase 1 output (COMPLETE)
├── contracts/           # Phase 1 output (references existing)
│   └── README.md        # Points to existing schema files
└── tasks.md             # Phase 2 output (pending /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── application/
│   └── hooks/
│       ├── useContainers.ts    # MODIFIED: Add retry/refetchInterval with isFeatureUnavailable
│       └── useCameras.ts       # MODIFIED: Add retry/refetchInterval with isFeatureUnavailable
└── infrastructure/
    └── api/
        └── client.ts           # EXISTING: isFeatureUnavailable() — no changes

tests/
├── e2e/
│   ├── fixtures/
│   │   └── mock-routes.ts      # MODIFIED: Add container, diagnostics, session mocks
│   ├── v1-graceful-degradation.spec.ts  # NEW: Graceful degradation E2E
│   ├── live-smoke.spec.ts      # MODIFIED: Add Cameras, Containers, Diagnostics tests
│   ├── containers.spec.ts      # EXISTING: Already has inline mocks (no changes)
│   └── diagnostics.spec.ts     # EXISTING: Already has inline mocks (no changes)
├── component/
│   ├── hooks/
│   │   ├── useContainers.test.ts  # NEW or MODIFIED: Test graceful degradation
│   │   └── useCameras.test.ts     # NEW or MODIFIED: Test graceful degradation
│   └── ...
└── ...

docs/
└── dashboard_states.md         # NEW: State machine per tab
```

**Structure Decision**: Single frontend project with hexagonal architecture. No new layers or directories added — all changes fit existing patterns.

## Implementation Progress

### Phase 0 (Research) — COMPLETE

All research items resolved (see research.md):
- R1: Containers/cameras hooks lack `isFeatureUnavailable()` — fix approach defined
- R2: E2E mock coverage audit — extend mock-routes.ts, don't refactor existing
- R3: Non-UUID container IDs — already works, verify with E2E
- R4: Live smoke pattern — pre-flight check + test.skip()
- R5: Dashboard states doc — manual curation

### Phase 1 (Design) — COMPLETE

- data-model.md: References existing types, documents new "Feature Unavailable" state
- contracts/: No new API contracts — references existing schemas
- quickstart.md: Step-by-step implementation guide

## Complexity Tracking

> No Constitution violations. All implementations use existing patterns.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| Hook graceful degradation | Low | 10-15 lines per hook, copy pattern from useWifi |
| E2E mock extensions | Low | Add methods to existing MockAPI class |
| New E2E spec files | Medium | New test files but following established patterns |
| Live smoke extensions | Low | Add tests to existing file |
| Dashboard states doc | Low | Documentation only |

## Risk Assessment

### Low Risk
- Hook changes (well-established pattern from useWifi)
- E2E mock data additions (extends existing infrastructure)
- Dashboard states documentation (no code impact)

### Medium Risk
- E2E test flakiness (Playwright tests can be timing-sensitive)
- Live smoke tests against real Pi (depends on network and PiOrchestrator state)

### Mitigations
- E2E tests use `waitForSelector` and explicit timeouts
- Live smoke tests skip gracefully when endpoints unavailable
- All changes are additive — no existing tests modified

## Generated Artifacts

| Artifact | Status | Location |
|----------|--------|----------|
| spec.md | Complete | `specs/045-dashboard-resilience-e2e/spec.md` |
| research.md | Complete | `specs/045-dashboard-resilience-e2e/research.md` |
| data-model.md | Complete | `specs/045-dashboard-resilience-e2e/data-model.md` |
| quickstart.md | Complete | `specs/045-dashboard-resilience-e2e/quickstart.md` |
| contracts/ | Complete | References existing schemas |
| tasks.md | Pending | Run `/speckit.tasks` to generate |
