# Implementation Plan: Live Ops Validation

**Branch**: `060-live-ops-validation` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/060-live-ops-validation/spec.md`
**Predecessor**: Feature 059 (Real Ops Drilldown) — all 31 tasks complete

## Summary

Feature 059 built all schemas, API clients, hooks, and UI components for the operations drilldown. This feature validates that everything works end-to-end against live PiOrchestrator infrastructure, fixes discovered wiring issues (test fixture mismatches, legacy schema conflicts, port 8082 endpoint gaps), and produces validation artifacts confirming real session data and evidence images render correctly in the browser.

**Primary work areas**:
1. Fix invalid test fixture data (status enum mismatches)
2. Resolve conflicting legacy schema definitions
3. Generate PiOrchestrator handoff for V1 endpoints on port 8082
4. Validate against live infrastructure and capture screenshots
5. Ensure all existing tests pass after fixes

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
**Storage**: N/A (API-driven; PiOrchestrator + MinIO handle persistence)
**Testing**: Vitest 3.2.4, Playwright 1.57.0, MSW 2.x
**Target Platform**: Modern browsers (Chrome, Firefox) — served from PiOrchestrator port 8082
**Project Type**: Web (frontend SPA proxying to Go backend)
**Performance Goals**: Session list loads within 5 seconds on LAN; 10s polling interval
**Constraints**: No direct MinIO LAN requests from browser; graceful degradation on 404/503
**Scale/Scope**: ~20 sessions, ~10 cameras, single operator at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hexagonal Architecture — PASS

No architectural changes. All existing code follows hexagonal layers:
- Domain types in `src/domain/types/`
- Hooks in `src/application/hooks/`
- API clients in `src/infrastructure/api/`
- Components in `src/presentation/components/`

This feature only fixes test data and validates — no new layers or cross-layer violations.

### II. Contract-First API — PASS (with fixes)

**Issue found**: Two conflicting `SessionStatusSchema` definitions exist:
- `diagnostics-schemas.ts` (V1, current): `active | complete | partial | failed`
- `camera-diagnostics-schemas.ts` (legacy): `active | completed | cancelled`

Test fixtures reference the legacy schema. This violates II.A (field mapping rules) and II.B (enum synchronization).

**Fix**: Update legacy schema references and test fixtures to use V1 enum values.

### III. Test Discipline — PASS (with fixes)

**Issue found**: E2E test mock data uses invalid enum values (`'completed'`, `'cancelled'`) which would fail Zod schema validation.

**Fix**: Correct all mock data to use valid V1 status values. Run full test suite to confirm.

**Resource constraints**: All test runs use `VITEST_MAX_WORKERS=1` per constitution.

### IV. Simplicity & YAGNI — PASS

No new abstractions, no feature additions. Fixes are minimal and targeted.

### Post-Design Re-Check — PASS

No design changes from Phase 1. Data model is unchanged from Feature 059. Contracts document existing endpoints (no new endpoints created by PiDashboard).

## Project Structure

### Documentation (this feature)

```text
specs/060-live-ops-validation/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: endpoint availability, fixture issues
├── data-model.md        # Phase 1: existing entities documented
├── quickstart.md        # Phase 1: live validation procedure
├── contracts/           # Phase 1: API endpoint contracts
│   └── api-endpoints.md # Existing endpoint inventory
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── artifacts/           # Validation screenshots (produced during validation)
```

### Source Code (files to be modified)

```text
# Test fixture fixes
tests/e2e/operations.spec.ts              # Fix invalid status values
tests/mocks/diagnostics/fixtures.ts       # Fix legacy status values

# Legacy schema evaluation
src/infrastructure/api/camera-diagnostics-schemas.ts  # Evaluate legacy SessionStatusSchema
src/domain/types/camera-diagnostics.ts                # Update if schema changes

# Validation artifacts
specs/060-live-ops-validation/artifacts/   # Screenshots from live validation
```

**Structure Decision**: No new source files needed. This feature modifies existing test files and evaluates legacy schema files. The hexagonal structure is unchanged.

## Complexity Tracking

No constitution violations requiring justification. All changes are minimal fixes to existing code.
