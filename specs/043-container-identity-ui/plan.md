# Implementation Plan: Container Identity Model UI

**Branch**: `043-container-identity-ui` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/043-container-identity-ui/spec.md`

## Summary

This feature ensures the Container Management UI properly reflects the opaque identity model: displaying human-readable labels prominently while treating container IDs and device IDs as opaque identifiers. The implementation includes complete CRUD operations for containers, camera assignment/unassignment flows, and robust error handling. **Significant existing implementation exists** - this plan focuses on verification, testing, and documentation gaps.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: N/A (API-driven, PiOrchestrator backend handles persistence)
**Testing**: Vitest, React Testing Library, Playwright, MSW 2.x
**Target Platform**: Web browser (desktop/tablet, responsive)
**Project Type**: Frontend React application (SPA)
**Performance Goals**: Container list loads within 2 seconds, UI interactions feel instant
**Constraints**: Must integrate with existing V1 Cameras API, offline-capable (React Query caching)
**Scale/Scope**: ~10 containers max, 4 cameras per container

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Hexagonal Architecture | PASS | - Domain types: `src/domain/types/containers.ts` |
| | | - Application hooks: `src/application/hooks/useContainers.ts` |
| | | - Infrastructure API: `src/infrastructure/api/v1-containers.ts` |
| | | - Presentation components: `src/presentation/components/containers/` |
| II. Contract-First API | PASS | - Zod schemas: `src/infrastructure/api/v1-containers-schemas.ts` |
| | | - API client validates responses |
| | | - Error types in `errors.ts` |
| III. Test Discipline | **GAP** | - **No contract tests** for container schemas |
| | | - **No component tests** for container UI |
| | | - **No MSW handlers** for container endpoints |
| | | - No E2E tests for container flows |
| IV. Simplicity & YAGNI | PASS | - Minimal implementation focused on requirements |
| | | - No over-engineering detected |

### Constitution Violations Requiring Action

1. **Missing Contract Tests** (III) - Must add `tests/integration/contracts/containers.contract.test.ts`
2. **Missing Component Tests** (III) - Must add tests for all container components
3. **Missing MSW Handlers** (III) - Must add mock handlers for `/api/v1/containers/*`
4. **Missing Documentation** (SC-007) - Must create `docs/admin/container-management.md`

## Project Structure

### Documentation (this feature)

```text
specs/043-container-identity-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI)
└── checklists/
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
src/
├── domain/types/
│   └── containers.ts              # ✅ EXISTS - Container domain types
├── application/hooks/
│   └── useContainers.ts           # ✅ EXISTS - React Query hooks
├── infrastructure/api/
│   ├── v1-containers.ts           # ✅ EXISTS - API client
│   └── v1-containers-schemas.ts   # ✅ EXISTS - Zod schemas
└── presentation/components/containers/
    ├── ContainerSection.tsx       # ✅ EXISTS - Main view
    ├── ContainerCard.tsx          # ✅ EXISTS - List card
    ├── ContainerDetail.tsx        # ✅ EXISTS - Detail modal
    ├── CreateContainerDialog.tsx  # ✅ EXISTS - Create dialog
    ├── EditContainerDialog.tsx    # ✅ EXISTS - Edit dialog
    ├── AssignCameraDialog.tsx     # ✅ EXISTS - Assign dialog
    ├── PositionSlot.tsx           # ✅ EXISTS - Position slot
    ├── EmptyState.tsx             # ✅ EXISTS - Empty state
    └── index.ts                   # ✅ EXISTS - Exports

tests/
├── unit/api/
│   └── v1-containers.test.ts      # ❌ MISSING - API client tests
├── component/containers/
│   ├── ContainerCard.test.tsx     # ❌ MISSING - Card tests
│   ├── ContainerDetail.test.tsx   # ❌ MISSING - Detail tests
│   ├── PositionSlot.test.tsx      # ❌ MISSING - Slot tests
│   └── AssignCameraDialog.test.tsx# ❌ MISSING - Dialog tests
├── integration/
│   ├── contracts/
│   │   └── containers.contract.test.ts  # ❌ MISSING - Contract tests
│   └── hooks/
│       └── useContainers.test.ts  # ❌ MISSING - Hook tests
├── e2e/
│   └── containers.spec.ts         # ❌ MISSING - E2E tests
└── mocks/
    └── container-mocks.ts         # ❌ MISSING - Mock data

docs/admin/
└── container-management.md        # ❌ MISSING - Admin docs
```

**Structure Decision**: Follows existing hexagonal architecture with clear layer separation. All source files exist; the gap is in testing and documentation.

## Implementation Gap Analysis

### Existing Implementation Review

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Container types | `domain/types/containers.ts` | ✅ Complete | Properly defines opaque IDs |
| Zod schemas | `infrastructure/api/v1-containers-schemas.ts` | ✅ Complete | All entities validated |
| API client | `infrastructure/api/v1-containers.ts` | ✅ Complete | Full CRUD + assignment |
| React Query hooks | `application/hooks/useContainers.ts` | ✅ Complete | All hooks implemented |
| ContainerSection | `presentation/components/containers/` | ✅ Complete | Label-first display works |
| ContainerCard | - | ✅ Complete | Shows label prominently, ID secondary |
| ContainerDetail | - | ✅ Complete | 2x2 position grid |
| AssignCameraDialog | - | ✅ Complete | Camera + position selection |
| Query keys | `lib/queryClient.ts` | ✅ Complete | Container keys defined |

### Missing Deliverables

| Deliverable | Priority | Blocks |
|-------------|----------|--------|
| Contract tests | HIGH | CI compliance, PR merge |
| Component tests | HIGH | CI compliance, PR merge |
| MSW handlers | HIGH | Hook tests, E2E tests |
| Hook integration tests | MEDIUM | Full coverage |
| E2E tests | MEDIUM | Feature validation |
| Admin documentation | MEDIUM | SC-007 success criteria |

## Complexity Tracking

> **No violations to justify** - Implementation follows all Constitution principles except missing tests.

## Phase 2 Task Preview

The following tasks will be generated by `/speckit.tasks`:

1. **Create mock data fixtures** - `tests/mocks/container-mocks.ts`
2. **Add MSW handlers** - Container API mock handlers
3. **Contract tests** - Validate all Zod schemas
4. **API client unit tests** - v1-containers.ts coverage
5. **Component tests** - All 8 container components
6. **Hook integration tests** - useContainers.ts with MSW
7. **E2E tests** - Critical user flows
8. **Admin documentation** - `docs/admin/container-management.md`
9. **Verify label-first display** - Audit existing components
10. **Remove any "fridge-1" references** - Search and replace

## Next Steps

1. Run `/speckit.tasks` to generate detailed task list
2. Execute tasks in dependency order (mocks → tests → docs)
3. Run full test suite before PR
4. Update CLAUDE.md with container management info
