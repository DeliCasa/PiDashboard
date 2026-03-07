# Implementation Plan: Wire vNEXT Integration & Test Hardening

**Branch**: `063-wire-vnext-integration` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/063-wire-vnext-integration/spec.md`

## Summary

Replace hand-crafted proto-JSON test fixtures with `@delicasa/wire/testing` factory functions, add a dedicated unit test for the Connect transport's AbortSignal compatibility shim, and verify the full test suite passes without regressions. The wire package v0.4.0 is already installed and its import paths resolve correctly — no tsconfig or dependency changes are needed.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: `@delicasa/wire@0.4.0` (local file link), `@connectrpc/connect-web ^2.1.x`, `@bufbuild/protobuf ^2.2.x`, TanStack React Query 5.x, MSW 2.x
**Storage**: N/A (test infrastructure only)
**Testing**: Vitest 3.2.4, MSW 2.8.0 (VITEST_MAX_WORKERS=1 for CI)
**Target Platform**: Browser (Vite 7 + React 19), jsdom for tests
**Project Type**: Single frontend project (hexagonal architecture)
**Performance Goals**: N/A (no runtime changes, test-only feature)
**Constraints**: Zero test regressions (baseline: 128 files, 2692 passed, 2 skipped)
**Scale/Scope**: ~3 files modified, ~1 file created, ~0 new dependencies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate (Phase 0)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | No layer boundary changes. Test infrastructure stays in `tests/`. Source changes limited to transport comment improvement. |
| II. Contract-First API | PASS | Wire factory functions produce proto-JSON matching the protobuf schema. MSW handlers return schema-valid data by construction. Adapters validate shape via TypeScript types. |
| II.A Zod Schema Conventions | N/A | No Zod schema changes. RPC layer uses protobuf descriptors, not Zod. |
| II.B Enum Synchronization | PASS | Wire factories use canonical proto enum values (e.g., `SESSION_STATUS_COMPLETE`). No new enum values introduced. |
| III. Test Discipline | PASS | Adding unit test for transport (increases coverage). Existing integration tests must pass. Resource constraints respected (VITEST_MAX_WORKERS=1). |
| IV. Simplicity & YAGNI | PASS | Replacing 3 manual converter functions with factory calls is a net reduction in code. No new abstractions beyond what the wire package provides. |

### Post-Design Gate (Phase 1)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | No changes to layer boundaries. |
| II. Contract-First API | PASS | Factory functions are the wire package's own contract implementation. |
| III. Test Discipline | PASS | Transport unit test adds coverage. Integration test baseline maintained. |
| IV. Simplicity & YAGNI | PASS | Net code reduction. Handler factory API signatures unchanged. |

## Project Structure

### Documentation (this feature)

```text
specs/063-wire-vnext-integration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technical research findings
├── data-model.md        # Phase 1: Proto-JSON entity reference
├── quickstart.md        # Phase 1: Development workflow guide
├── contracts/
│   └── rpc-handler-contract.md  # Handler factory interface contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
└── infrastructure/
    └── rpc/
        └── transport.ts          # MODIFY: improve AbortSignal fix comment

tests/
├── mocks/
│   └── handlers/
│       └── rpc.ts                # MODIFY: replace converters with wire factories
└── unit/
    └── rpc/
        └── transport.test.ts     # CREATE: transport fetch wrapper unit test

specs/063-wire-vnext-integration/
└── handoff.md                    # CREATE: handoff document
```

**Structure Decision**: Existing single-project hexagonal structure. No new directories beyond `tests/unit/rpc/` (follows existing `tests/unit/api/` pattern). All changes stay within existing architectural boundaries.

## Complexity Tracking

No constitution violations. No complexity justification needed.
