# Implementation Plan: Inventory Delta Viewer E2E Verification

**Branch**: `052-delta-viewer-e2e` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/052-delta-viewer-e2e/spec.md`

## Summary

Harden the existing Inventory Delta Viewer (Features 047, 048) with dual delta format support (flat v1.0 + categorized v2.0), golden fixture contract tests to catch BridgeServer schema drift, and a deterministic E2E test proving the full viewer flow renders correctly. No new UI components — this feature extends schemas, adds an adapter layer, and builds the test harness.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; active container via localStorage/Zustand from Feature 046)
**Testing**: Vitest 3.2.4 (VITEST_MAX_WORKERS=1), MSW 2.x, Playwright 1.57.0 (PLAYWRIGHT_WORKERS=1)
**Target Platform**: Web (React SPA embedded in PiOrchestrator on Raspberry Pi, port 8082)
**Project Type**: Web (frontend SPA)
**Performance Goals**: <3s delta load, loading feedback within 200ms
**Constraints**: No backend changes; 50% CPU max for test workers; PiOrchestrator inventory routes not yet implemented (MSW mocks only)
**Scale/Scope**: ~4 new files, ~4 modified files, ~10 new tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Adapter in infrastructure/, schemas in infrastructure/api/, hooks in application/. No layer violations. |
| II. Contract-First API | PASS | Feature is specifically about strengthening contract validation. New schemas use Zod; golden fixtures validate against schemas. |
| II.A Zod Conventions | PASS | New schemas follow `{Entity}Schema` naming. snake_case fields. Types via `z.infer<>`. |
| II.B Enum Synchronization | PASS | AnalysisStatus enum unchanged. No new enums added ahead of PiOrchestrator. |
| II.C API Integration Workflow | PASS | No new endpoints. Extending existing schema + adding contract tests. |
| III. Test Discipline | PASS | Golden contract tests, component tests for categorized format, E2E golden test. Resource constraints enforced. |
| III.A Contract Testing | PASS | Dedicated golden contract test file with strict schema validation. |
| IV. Simplicity & YAGNI | PASS | No new components. Adapter is minimal (single function). Golden fixtures are static data. |

### Post-Design Gate

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | `normalizeDelta()` lives in infrastructure/api/ (adapter layer). Components unchanged — they consume `DeltaEntry[]` from hooks. |
| II. Contract-First API | PASS | `z.union([flat, categorized])` validates delta field. Golden fixtures add second validation layer. |
| III. Test Discipline | PASS | 3 test categories: golden contract (unit), component (categorized rendering), E2E (deterministic flow). |
| IV. Simplicity & YAGNI | PASS | No abstractions beyond `normalizeDelta()`. No component changes. Minimal schema additions. |

## Project Structure

### Documentation (this feature)

```text
specs/052-delta-viewer-e2e/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: entity design
├── quickstart.md        # Phase 1: implementation guide
├── contracts/
│   └── api-contract-snapshot.md   # Phase 1: BridgeServer contract reference
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── types/
│       └── inventory.ts                    # MODIFY: re-export new CategorizedDelta types
├── infrastructure/
│   └── api/
│       ├── inventory-delta-schemas.ts      # MODIFY: add CategorizedDelta schemas, update union
│       └── inventory-delta-adapter.ts      # NEW: normalizeDelta() function
└── application/
    └── hooks/
        └── useInventoryDelta.ts            # MODIFY: normalize delta in hooks

tests/
├── mocks/
│   ├── inventory-delta-fixtures.ts         # MODIFY: add categorized delta variants
│   └── inventory-delta-golden.ts           # NEW: golden BridgeServer fixtures
├── integration/
│   └── contracts/
│       ├── inventory-delta.contract.test.ts           # EXISTING (unchanged)
│       └── inventory-delta-golden.contract.test.ts    # NEW: golden fixture validation
└── e2e/
    └── inventory-delta-golden.spec.ts      # NEW: deterministic E2E test
```

**Structure Decision**: Follows existing hexagonal architecture. No new directories. Adapter function is a single file in the infrastructure layer. Golden fixtures are in the existing mocks directory.

## Design Pattern Standards

### Delta Normalization Pattern

The `normalizeDelta()` adapter converts BridgeServer's dual-format delta into the flat `DeltaEntry[]` that `InventoryDeltaTable` already renders:

```
API Response (delta field)
  ├── Array? → Already flat DeltaEntry[] → pass through
  ├── Object with "added"? → CategorizedDelta → normalizeDelta() → DeltaEntry[]
  └── null? → No delta → components handle null
```

**Location**: `src/infrastructure/api/inventory-delta-adapter.ts`
**Called from**: `useSessionDelta` and `useLatestInventory` hooks (post-fetch normalization)
**Why not in component**: Keeps presentation layer consuming a single type (`DeltaEntry[]`), per Hexagonal Architecture principle.

### Golden Fixture Pattern

Two-layer test validation:

```
Layer 1 (existing): Mock fixtures ──► PiDashboard schemas
  Catches: mock data drift from schema changes

Layer 2 (new):      Golden fixtures ──► PiDashboard schemas (strict mode)
  Catches: upstream BridgeServer contract drift
```

Golden fixtures use `z.strict()` wrapper in tests to fail on unknown fields — ensuring PiDashboard schemas don't silently accept extra data.

### Delta Union Schema Pattern

```
InventoryAnalysisRunSchema.delta:
  z.union([
    z.array(DeltaEntrySchema),      // Format A: flat (v1.0)
    CategorizedDeltaSchema,          // Format B: categorized (v2.0+)
  ]).nullable().optional()
```

Zod discriminates at parse time: arrays → Format A, objects with `added` key → Format B.
