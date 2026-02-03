# Implementation Plan: PiOrchestrator Diagnostics Integration

**Branch**: `042-diagnostics-integration` | **Date**: 2026-02-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/042-diagnostics-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate PiOrchestrator's diagnostics API endpoints into PiDashboard UI for camera health monitoring, evidence capture, and session management. Following existing patterns from Feature 034 (camera integration) and Feature 037 (API resilience) for consistent UX and error handling.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: N/A (API-driven, no local persistence)
**Testing**: Vitest (unit/component/integration), Playwright (E2E), MSW 2.x (mocking)
**Target Platform**: Web (modern browsers), responsive for Pi touchscreen
**Project Type**: web (React SPA)
**Performance Goals**: <100ms UI response, polling intervals ≥5s to avoid overwhelming Pi
**Constraints**: Must handle 404/503 gracefully per Feature 037 patterns, no blocking requests
**Scale/Scope**: 3 new API endpoints, ~5 new components, 3 new hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hexagonal Architecture (NON-NEGOTIABLE)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Domain types NO external deps | ✅ PASS | Types in `src/domain/types/diagnostics.ts` |
| Application hooks NO direct API calls | ✅ PASS | Hooks call `diagnosticsApi.*` methods |
| Infrastructure implements domain contracts | ✅ PASS | API clients in `src/infrastructure/api/` |
| Presentation via hooks only | ✅ PASS | Components use `useDiagnostics()`, etc. |
| No circular dependencies | ✅ PASS | Follows existing layer patterns |

### II. Contract-First API (NON-NEGOTIABLE)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Zod schema for each endpoint | ✅ PASS | Will create `diagnostics-schemas.ts` |
| Responses parsed through schemas | ✅ PASS | API client validates before returning |
| MSW handlers match schemas | ✅ PASS | Contract tests enforce this |
| Errors typed via centralized types | ✅ PASS | Uses `ApiError` from `client.ts` |

### III. Test Discipline (STRICTLY ENFORCED)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Contract tests for Zod schemas | ✅ PASS | `tests/integration/contracts/diagnostics.contract.test.ts` |
| Component tests with data-testid | ✅ PASS | All new components tested |
| Hook tests with MSW | ✅ PASS | `tests/integration/hooks/useDiagnostics.test.tsx` |
| E2E for critical flows | ✅ PASS | `tests/e2e/diagnostics.spec.ts` |

### IV. Simplicity & YAGNI (MANDATORY)

| Requirement | Status | Notes |
|-------------|--------|-------|
| No speculative features | ✅ PASS | Only implementing requested endpoints |
| No premature abstractions | ✅ PASS | Following existing patterns |
| Delete unused code | ✅ PASS | No stubs or placeholders |

**Pre-Phase 0 Gate: ✅ PASSED**

## Project Structure

### Documentation (this feature)

```text
specs/042-diagnostics-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI snippets)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Following existing hexagonal architecture

src/
├── domain/types/
│   └── diagnostics.ts           # NEW: Domain types for diagnostics
├── application/hooks/
│   ├── useDiagnostics.ts        # NEW: Camera diagnostics hook
│   ├── useEvidence.ts           # NEW: Evidence capture hook
│   └── useSessions.ts           # NEW: Session management hook
├── infrastructure/api/
│   ├── diagnostics-schemas.ts   # NEW: Zod schemas
│   ├── diagnostics.ts           # NEW: API client methods
│   ├── evidence.ts              # NEW: Evidence API client
│   └── sessions.ts              # NEW: Sessions API client
└── presentation/components/
    └── diagnostics/             # NEW: UI components
        ├── DiagnosticsPanel.tsx
        ├── EvidenceCapture.tsx
        └── SessionDetail.tsx

tests/
├── unit/api/
│   ├── diagnostics.test.ts      # NEW: API client unit tests
│   ├── evidence.test.ts         # NEW
│   └── sessions.test.ts         # NEW
├── component/diagnostics/       # NEW: Component tests
├── integration/
│   ├── contracts/diagnostics.contract.test.ts  # NEW
│   └── hooks/
│       ├── useDiagnostics.test.tsx  # NEW
│       ├── useEvidence.test.tsx     # NEW
│       └── useSessions.test.tsx     # NEW
├── mocks/diagnostics/           # NEW: MSW fixtures
└── e2e/diagnostics.spec.ts      # NEW: E2E tests
```

**Structure Decision**: Follows existing hexagonal architecture with dedicated files per concern. Diagnostics UI components grouped in `presentation/components/diagnostics/` directory.

## Complexity Tracking

> No violations to justify. Design follows existing patterns with minimal complexity.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |

---

## Post-Design Constitution Re-Check

*Gate evaluated after Phase 1 design completion.*

### I. Hexagonal Architecture - POST-DESIGN

| Requirement | Status | Verification |
|-------------|--------|--------------|
| Domain types NO external deps | ✅ PASS | `data-model.md` defines pure TS interfaces |
| Application hooks NO direct API calls | ✅ PASS | Hooks use `diagnosticsApi.*` per quickstart.md |
| Infrastructure implements domain contracts | ✅ PASS | OpenAPI contract in `contracts/camera-diagnostics.yaml` |
| Presentation via hooks only | ✅ PASS | Component examples use hooks per quickstart.md |

### II. Contract-First API - POST-DESIGN

| Requirement | Status | Verification |
|-------------|--------|--------------|
| Zod schema for each endpoint | ✅ PASS | `data-model.md` defines all schema mappings |
| API contract documented | ✅ PASS | `contracts/camera-diagnostics.yaml` has full OpenAPI spec |
| Schema matches Go JSON tags | ✅ PASS | `research.md` confirms snake_case field names |

### III. Test Discipline - POST-DESIGN

| Requirement | Status | Verification |
|-------------|--------|--------------|
| Test file locations defined | ✅ PASS | Project structure specifies all test paths |
| MSW handlers planned | ✅ PASS | `quickstart.md` documents mock handler patterns |
| E2E coverage planned | ✅ PASS | `tests/e2e/diagnostics.spec.ts` in structure |

### IV. Simplicity & YAGNI - POST-DESIGN

| Requirement | Status | Verification |
|-------------|--------|--------------|
| No speculative features | ✅ PASS | Only 3 endpoints, 5 components as scoped |
| Reuses existing patterns | ✅ PASS | `research.md` confirms Feature 034/037 reuse |
| No premature abstractions | ✅ PASS | Direct API calls, no extra layers |

**Post-Phase 1 Gate: ✅ PASSED**

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Plan | `specs/042-diagnostics-integration/plan.md` | ✅ Complete |
| Research | `specs/042-diagnostics-integration/research.md` | ✅ Complete |
| Data Model | `specs/042-diagnostics-integration/data-model.md` | ✅ Complete |
| API Contract | `specs/042-diagnostics-integration/contracts/camera-diagnostics.yaml` | ✅ Complete |
| Quickstart | `specs/042-diagnostics-integration/quickstart.md` | ✅ Complete |
| Agent Context | `CLAUDE.md` | ✅ Updated |

## Next Steps

Run `/speckit.tasks` to generate the implementation task list.
