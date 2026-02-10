# Implementation Plan: ID Taxonomy Consistency in UI & Documentation

**Branch**: `050-id-taxonomy-ui-docs` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/050-id-taxonomy-ui-docs/spec.md`

## Summary

Make the ID taxonomy consistent across UI components, test fixtures, and documentation. All opaque identifiers displayed in the UI get explicit field labels ("Container ID:", "Session ID:", etc.). Test fixtures replace semantic container IDs (`kitchen-fridge-001`) with UUID-format strings. Documentation is verified clean (no changes needed — previous features already addressed this).

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (no data model changes)
**Testing**: Vitest 3.2.4 (unit/component/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Web (Raspberry Pi dashboard served from PiOrchestrator)
**Project Type**: Web application (React SPA)
**Performance Goals**: N/A (text label additions have zero performance impact)
**Constraints**: VITEST_MAX_WORKERS=1 for CI; no API changes
**Scale/Scope**: 12 UI component edits, 4 test fixture files (~16 string replacements), 0 doc changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | Changes are presentation-layer only (UI labels). No layer boundary violations. |
| II. Contract-First API | PASS | No API changes. No schema changes. Test fixture data changes remain valid per existing schemas. |
| II.A Zod Schema Conventions | PASS | No schema modifications. |
| II.B Enum Synchronization | PASS | No enum changes. |
| III. Test Discipline | PASS | Existing tests updated with new fixture IDs. No test coverage reduction. Resource constraints maintained. |
| III.A Contract Testing | PASS | Contract test T046 intentionally preserved; other fixture IDs become UUIDs. |
| IV. Simplicity & YAGNI | PASS | Inline label prefixes — no new components, no abstractions, no utilities. |

**Post-Phase 1 Re-check**: PASS — no violations introduced during design.

## Project Structure

### Documentation (this feature)

```text
specs/050-id-taxonomy-ui-docs/
├── plan.md              # This file
├── research.md          # Phase 0 output — audit of all ID references
├── data-model.md        # Phase 1 output — entity analysis (no changes needed)
├── quickstart.md        # Phase 1 output — verification guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (files modified by this feature)

```text
src/presentation/components/
├── containers/
│   ├── ContainerPicker.tsx       # Add "Container ID:" label
│   ├── ContainerCard.tsx         # Add "Container ID:" label
│   ├── ContainerDetail.tsx       # Add "Container ID:" label (2 locations)
│   ├── EditContainerDialog.tsx   # Add "Container ID:" label
│   ├── PositionSlot.tsx          # Add "Device ID:" label
│   └── AssignCameraDialog.tsx    # Add "Camera ID:" label
├── cameras/
│   ├── CameraCard.tsx            # Add "Camera ID:" label
│   └── CameraDetail.tsx          # Add "Camera ID:" label
└── inventory/
    ├── InventoryRunList.tsx       # Add "Session ID:" visible label
    └── InventoryRunDetail.tsx     # Add "Container ID:" label (2 locations)

tests/
├── e2e/
│   ├── fixtures/mock-routes.ts   # Replace 9× kitchen-fridge-001 → UUID
│   ├── accessibility.spec.ts     # Replace 2× kitchen-fridge-001 → UUID
│   └── inventory-delta.spec.ts   # Replace 1× kitchen-fridge-001 → UUID
└── component/
    └── allowlist/
        └── AllowlistEntryForm.test.tsx  # Replace 4× container-001 → UUID
```

**Structure Decision**: Existing hexagonal architecture. All UI changes in `src/presentation/components/`. All test changes in `tests/`. No new files created.

## Implementation Phases

### Phase 1: Test Fixture Cleanup (P3 — foundational, do first to avoid test breakage)

Replace semantic container IDs in test fixtures with UUID-format strings.

**Standard UUID for test fixtures**: `550e8400-e29b-41d4-a716-446655440001`

| File | Occurrences | Find | Replace |
|------|-------------|------|---------|
| tests/e2e/fixtures/mock-routes.ts | 9 | `kitchen-fridge-001` | `550e8400-e29b-41d4-a716-446655440001` |
| tests/e2e/accessibility.spec.ts | 2 | `kitchen-fridge-001` | `550e8400-e29b-41d4-a716-446655440001` |
| tests/e2e/inventory-delta.spec.ts | 1 | `kitchen-fridge-001` | `550e8400-e29b-41d4-a716-446655440001` |
| tests/component/allowlist/AllowlistEntryForm.test.tsx | 4 | `container-001` | `550e8400-e29b-41d4-a716-446655440001` |

**Intentionally preserved**: `containers.contract.test.ts` line 147 — T046 opaque acceptance test.

**Verification**: `VITEST_MAX_WORKERS=1 npm test && PLAYWRIGHT_WORKERS=1 npm run test:e2e`

### Phase 2: UI Label Additions (P2 — core deliverable)

Add explicit type labels before every opaque ID display. Use the existing pattern from `InventoryAuditTrail.tsx`:

```tsx
// Pattern: label in muted text, ID in monospace
<span className="text-muted-foreground">Container ID: </span>
<span className="font-mono text-xs text-muted-foreground">{truncateId(id)}</span>
```

**Container components** (5 locations):

| Component | File | Lines | Label Text |
|-----------|------|-------|-----------|
| ContainerPicker | ContainerPicker.tsx | 134-138 | "Container ID: " |
| ContainerCard | ContainerCard.tsx | 55-57 | "Container ID: " |
| ContainerDetail (header) | ContainerDetail.tsx | 160 | "Container ID: " |
| ContainerDetail (card) | ContainerDetail.tsx | 188-195 | "Container ID: " |
| EditContainerDialog | EditContainerDialog.tsx | 76-78 | "Container ID: " |

**Camera/device components** (3 locations):

| Component | File | Lines | Label Text |
|-----------|------|-------|-----------|
| PositionSlot | PositionSlot.tsx | 114-116 | "Device ID: " |
| AssignCameraDialog | AssignCameraDialog.tsx | 150-152 | "Camera ID: " |
| CameraCard | CameraCard.tsx | 101-104 | "Camera ID: " |
| CameraDetail | CameraDetail.tsx | 188 | "Camera ID: " |

**Inventory components** (3 locations):

| Component | File | Lines | Label Text |
|-----------|------|-------|-----------|
| InventoryRunList | InventoryRunList.tsx | 162-179 | "Session ID: " |
| InventoryRunDetail (pending) | InventoryRunDetail.tsx | 122-124 | "Container ID: " |
| InventoryRunDetail (main) | InventoryRunDetail.tsx | 188-195 | "Container ID: " |

**Verification**: `npm run lint && VITEST_MAX_WORKERS=1 npm test`

### Phase 3: Component Test Updates (follows Phase 2)

Update existing component tests to assert the new label text is rendered. For each component test file, add or update assertions to check for the label prefix string.

**Verification**: `VITEST_MAX_WORKERS=1 npm test`

### Phase 4: Final Verification

1. `npm run build` — TypeScript + Vite build passes
2. `npm run lint` — Zero ESLint errors
3. `VITEST_MAX_WORKERS=1 npm test` — All unit/component/integration tests pass
4. `PLAYWRIGHT_WORKERS=1 npm run test:e2e` — All E2E tests pass
5. `grep -r "kitchen-fridge-001" src/ tests/e2e/ tests/component/` — Only T046 contract test result
6. Visual audit of running dev server — all ID fields have visible labels

## Complexity Tracking

No constitution violations. No complexity tracking needed.
