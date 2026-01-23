# Implementation Plan: Project Constitution

**Branch**: `036-project-constitution` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-project-constitution/spec.md`

## Summary

Establish and document the PiDashboard project constitution, formalizing API type contract rules, Zod schema conventions, testing requirements, and development workflow standards. This is a **documentation-focused feature** that codifies existing patterns and best practices into enforceable guidelines.

**Primary Deliverable**: Update and expand `.specify/memory/constitution.md` with detailed API contract rules, schema conventions, and developer checklists documented in the feature spec.

## Technical Context

**Language/Version**: TypeScript 5.7+, React 19.2.0
**Primary Dependencies**: Zod 3.x, TanStack React Query 5.x, Vitest, Playwright
**Storage**: N/A (documentation feature)
**Testing**: Vitest (unit/component/integration), Playwright (E2E)
**Target Platform**: Web (React SPA served by PiOrchestrator)
**Project Type**: Web frontend (React SPA)
**Performance Goals**: N/A (documentation feature)
**Constraints**: N/A (documentation feature)
**Scale/Scope**: Documentation updates only; no code changes required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Evaluation

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | COMPLIANT | Feature documents these rules; no code changes |
| II. Contract-First API | COMPLIANT | Feature formalizes contract-first rules |
| III. Test Discipline | COMPLIANT | Feature establishes test requirements |
| IV. Simplicity & YAGNI | COMPLIANT | Documentation only; minimal scope |

**Result**: All gates PASS. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/036-project-constitution/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal for docs feature)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

This feature is **documentation-only**. The primary deliverable is updating the constitution document:

```text
.specify/
└── memory/
    └── constitution.md    # PRIMARY TARGET: Expand with API contract rules

docs/
└── contracts/
    └── API-TYPE-CONTRACTS.md  # Reference document for contract rules
```

**Structure Decision**: No source code changes required. This feature updates governance documentation in `.specify/memory/` and potentially adds a contracts reference document in `docs/contracts/`.

## Complexity Tracking

> No violations. This feature is documentation-only with minimal complexity.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Post-Design Constitution Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | COMPLIANT | No code changes; documenting existing structure |
| II. Contract-First API | COMPLIANT | This feature enhances Section II with explicit rules |
| III. Test Discipline | COMPLIANT | Feature documents test requirements; no new tests needed |
| IV. Simplicity & YAGNI | COMPLIANT | Minimal scope: constitution amendment only |

**Result**: All gates PASS. Ready for `/speckit.tasks`.

---

## Generated Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| plan.md | `specs/036-project-constitution/plan.md` | Complete |
| research.md | `specs/036-project-constitution/research.md` | Complete |
| data-model.md | `specs/036-project-constitution/data-model.md` | Complete |
| quickstart.md | `specs/036-project-constitution/quickstart.md` | Complete |

---

## Implementation Summary

This feature requires updating `.specify/memory/constitution.md` with:

1. **Section II.A: API Type Contract Rules**
   - Zod schema naming conventions (`{Entity}Schema`)
   - Field name mapping (Go JSON tags → snake_case)
   - Timestamp handling (RFC3339 → `z.string()`)
   - Optional field handling (`omitempty` → `.optional()`)

2. **Section II.B: Enum Synchronization**
   - PiOrchestrator-first rule for enum additions
   - CameraStatus as canonical example

3. **Section III Enhancement: Contract Testing**
   - All schemas require contract tests
   - Mock data must pass validation
   - Location: `tests/integration/contracts/`

4. **Developer Checklist** (new section or appendix)
   - API integration workflow
   - Breaking change response procedure

---

## Next Steps

Run `/speckit.tasks` to generate the implementation task list.
