# Implementation Plan: Test Reliability & Hardening

**Branch**: `040-test-reliability-hardening` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-test-reliability-hardening/spec.md`

## Summary

Stabilize the PiDashboard test suite by creating the missing `session-fixtures.ts` mock fixture file (unblocking 12 failing tests), adding YAML frontmatter to 7 handoff documents + fixing 1 template (eliminating 8 sentinel errors), resolving 10 lint errors in handoff scripts, and documenting the dashboard state machine. The technical approach is surgical: one new file, 14 file edits, and one new documentation file.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Vitest 3.2.4, MSW 2.8.0, Zod 3.x
**Storage**: N/A (mock fixtures are TypeScript files, handoff docs are Markdown)
**Testing**: Vitest (unit/integration), Playwright (E2E), MSW (API mocking)
**Target Platform**: Web (Vite 7 dev server + Raspberry Pi deployment)
**Project Type**: Web application (React SPA)
**Performance Goals**: N/A (infrastructure/hygiene feature)
**Constraints**: Must not break existing tests; must preserve IS_TEST_ENV AbortSignal workaround
**Scale/Scope**: 1 new file, 14 edited files, 1 new doc

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Hexagonal Architecture | PASS | No layer changes; mock fixtures are in tests/ (outside architecture layers) |
| II. Contract-First API | PASS | Session fixtures validated against Zod schemas via contract tests |
| III. Test Discipline | PASS | This feature directly improves test reliability (12 failing → 0) |
| IV. Simplicity & YAGNI | PASS | Creating the missing file is the minimal fix; no abstractions added |

### Post-Design Gate

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Hexagonal Architecture | PASS | No production code architecture changes |
| II. Contract-First API | PASS | All 11 fixture exports validated by diagnostics.contract.test.ts |
| II.A Zod Schema Conventions | PASS | Fixtures use snake_case fields matching Go JSON tags |
| II.B Enum Synchronization | PASS | Session status enum matches PiOrchestrator values |
| III. Test Discipline | PASS | All integration hook tests restored to passing |
| III.A Contract Testing | PASS | Contract tests validate fixture shapes against schemas |
| IV. Simplicity & YAGNI | PASS | Minimal changes — no new abstractions, no over-engineering |

## Project Structure

### Documentation (this feature)

```text
specs/040-test-reliability-hardening/
├── spec.md                                    # Feature specification
├── plan.md                                    # This file
├── research.md                                # Phase 0: RCA + decisions
├── data-model.md                              # Phase 1: Entity definitions
├── quickstart.md                              # Phase 1: Implementation guide
├── checklists/
│   └── requirements.md                        # Spec quality checklist
└── contracts/
    ├── session-fixtures.contract.md           # Fixture export contract
    ├── handoff-frontmatter.contract.md        # Handoff YAML contract
    └── dashboard-states.contract.md           # UI state machine contract
```

### Source Code (repository root)

```text
# Files to CREATE (2)
tests/mocks/diagnostics/session-fixtures.ts    # 11 mock fixture exports
docs/dashboard_states.md                       # State machine documentation

# Files to EDIT (14)
docs/HANDOFF_028_API_COMPAT_COMPLETE.md        # Add YAML frontmatter
docs/HANDOFF_029_ROUTE_NORMALIZATION.md        # Add YAML frontmatter
docs/HANDOFF_030_DASHBOARD_RECOVERY.md         # Add YAML frontmatter
docs/HANDOFF_030_RECOVERY_COMPLETE.md          # Add YAML frontmatter
docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md   # Add YAML frontmatter
docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md  # Add frontmatter
docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md  # Add frontmatter
specs/032-handoff-sentinel/contracts/handoff-template.md  # Fix handoff_id
.claude/scripts/handoff/state.ts               # Fix unused err → _err
.claude/scripts/handoff/utils.ts               # Remove unused imports/vars
.claude/scripts/handoff/validate.ts            # Remove unused import
.claude/scripts/handoff/consume.ts             # Fix unused params
.claude/scripts/handoff/extract.ts             # Remove unused imports
```

**Structure Decision**: No structural changes. All modifications fit within the existing hexagonal architecture and test organization.

## Design Decisions

### D1: Session Fixture Timestamps

**Decision**: Use relative timestamps computed from `Date.now()` at module load time.

**Rationale**: The `activeSessionRecent` fixture needs `last_capture_at` within 5 minutes of "now", and `activeSessionStale` needs it older than 5 minutes. Static ISO strings would drift and eventually cross the threshold, causing flaky tests.

**Implementation**:
```typescript
const now = Date.now();
const ONE_MINUTE = 60 * 1000;

export const activeSessionRecent = {
  // ...
  last_capture_at: new Date(now - 1 * ONE_MINUTE).toISOString(), // 1 min ago
};

export const activeSessionStale = {
  // ...
  last_capture_at: new Date(now - 10 * ONE_MINUTE).toISOString(), // 10 min ago
};
```

### D2: Handoff Template Fix

**Decision**: Change the template's `handoff_id` from `"NNN-slug"` to `"000-template-example"` rather than excluding it from scanning.

**Rationale**: Modifying the detection script introduces risk of breaking other validations. Using a valid placeholder is the simplest fix (YAGNI principle).

### D3: Lint Fix Scope

**Decision**: Fix only handoff scripts (10 errors). Exclude shadcn/ui components (badge.tsx, button.tsx) and allowlist form.

**Rationale**: shadcn/ui files are auto-generated and updating them would be overwritten on next `npx shadcn-ui@latest add`. The allowlist utility export is a separate concern.

### D4: Dashboard State Documentation

**Decision**: Create `docs/dashboard_states.md` documenting existing behavior, not prescribing changes.

**Rationale**: The audit found all 5 sections already handle states correctly. The loading-vs-empty invariant is already respected. Documentation captures this as a reference without requiring code changes for P4.

## Design Pattern Standards

### Mock Fixture Pattern

All mock fixtures follow the existing pattern from `tests/fixtures/provisioning.fixture.ts`:
- Named exports for individual entity instances
- Named exports for API response envelopes wrapping entity arrays
- Empty response variants for testing empty states
- All data validated by Zod schemas in contract tests

### Handoff Frontmatter Pattern

All handoff files follow the schema at `specs/032-handoff-sentinel/contracts/handoff-schema.yaml`:
- YAML frontmatter enclosed in `---` delimiters
- Placed at the very start of the file (before any markdown content)
- `handoff_id` follows `NNN-slug` pattern
- `status` reflects actual completion state

## Quality Gates

### Pre-Commit Gates

- [x] TypeScript compilation passes (`npm run build`)
- [x] ESLint passes for in-scope files (`npm run lint`)
- [x] All 81 test files pass (`npm test`)
- [x] Handoff sentinel reports 0 errors (`npm run handoff:detect`)

### PR Gates (CI)

- [x] All unit tests pass
- [x] All component tests pass
- [x] All integration tests pass (including restored 12 files)
- [x] Contract tests validate fixture shapes
- [x] Coverage thresholds met (70%+)
- [x] No TypeScript errors
- [x] No ESLint errors in scope files

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Session fixture shapes don't match schema | Low | High | Contract tests validate on every run |
| Handoff frontmatter has wrong field values | Low | Low | `npm run handoff:detect` catches immediately |
| Lint fixes break handoff script behavior | Very Low | Medium | Scripts have no automated tests, but changes are trivial (unused var prefixes) |
| AbortSignal workaround stops working | Low | High | Pinned to Vitest 3.x; workaround is conditional |
