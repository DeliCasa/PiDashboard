# Quickstart: Test Reliability & Hardening

**Feature**: 040-test-reliability-hardening
**Branch**: `040-test-reliability-hardening`

## Implementation Sequence

Execute tasks in this order. Each group can be done in parallel within the group.

### Group 1: Unblock Tests (P1)

**Goal**: Fix the 12 failing test files.

1. **Create `tests/mocks/diagnostics/session-fixtures.ts`**
   - Export all 11 named constants per `contracts/session-fixtures.contract.md`
   - Session fixtures must pass `SessionSchema` validation
   - Evidence fixtures must pass `EvidenceCaptureSchema` validation
   - Use relative timestamps for `activeSessionRecent` (< 5 min) and `activeSessionStale` (> 5 min)
   - Verify re-export exists in `tests/mocks/diagnostics/index.ts`

2. **Run `npm test`** — expect all 81 test files to pass

### Group 2: Fix Handoff Sentinel (P2)

**Goal**: Eliminate all 8 handoff sentinel errors.

1. **Add YAML frontmatter** to each of the 7 handoff files per `contracts/handoff-frontmatter.contract.md`
   - Prepend `---` block before existing markdown content
   - Use correct `handoff_id`, `direction`, `status` per contract table

2. **Fix template file** — change `handoff_id: "NNN-slug"` to `handoff_id: "000-template-example"` in `specs/032-handoff-sentinel/contracts/handoff-template.md`

3. **Run `npm run handoff:detect`** — expect 0 errors

### Group 3: Fix Lint Errors (P3)

**Goal**: Clean lint output for in-scope files.

1. **Fix handoff scripts** (5 files, 10 errors):
   - `state.ts`: `err` → `_err` (lines 36, 54)
   - `utils.ts`: Remove `DetectionSummary` import, remove `summary` destructure
   - `validate.ts`: Remove `VALID_REPOS` import
   - `consume.ts`: `options` → `_options` (lines 234, 360), `stdout` → `_stdout` (line 422)
   - `extract.ts`: Remove `Requirement` and `RequirementSource` imports

2. **Run `npm run lint`** — expect 0 errors in handoff scripts and diagnostics files

### Group 4: Dashboard State Documentation (P5)

**Goal**: Document the state machine for all dashboard sections.

1. **Create `docs/dashboard_states.md`** describing the 5-state model per section
   - Reference `contracts/dashboard-states.contract.md` for exact states
   - Include the critical invariant (never show empty during loading)
   - Add data-testid reference table

### Group 5: UI Hardening (P4) — Optional

**Goal**: Verify and fix any state handling issues discovered during documentation.

1. **Audit component state rendering** against documented state machine
2. **Add data-testid attributes** where missing (WiFi, Logs sections)
3. **Update integration tests** to verify loading → success transitions

## Verification Checklist

```bash
# After all changes:
npm test                    # All 81 files pass
npm run lint                # 0 errors in scope files
npm run handoff:detect      # 0 errors
npm run build               # TypeScript compiles clean
```

## Key Files to Touch

| File | Action |
| ---- | ------ |
| `tests/mocks/diagnostics/session-fixtures.ts` | CREATE — 11 exports |
| `docs/HANDOFF_028_API_COMPAT_COMPLETE.md` | EDIT — add frontmatter |
| `docs/HANDOFF_029_ROUTE_NORMALIZATION.md` | EDIT — add frontmatter |
| `docs/HANDOFF_030_DASHBOARD_RECOVERY.md` | EDIT — add frontmatter |
| `docs/HANDOFF_030_RECOVERY_COMPLETE.md` | EDIT — add frontmatter |
| `docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md` | EDIT — add frontmatter |
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md` | EDIT — add frontmatter |
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` | EDIT — add frontmatter |
| `specs/032-handoff-sentinel/contracts/handoff-template.md` | EDIT — fix handoff_id |
| `.claude/scripts/handoff/state.ts` | EDIT — `_err` prefix |
| `.claude/scripts/handoff/utils.ts` | EDIT — remove unused |
| `.claude/scripts/handoff/validate.ts` | EDIT — remove unused |
| `.claude/scripts/handoff/consume.ts` | EDIT — `_options`, `_stdout` |
| `.claude/scripts/handoff/extract.ts` | EDIT — remove unused imports |
| `docs/dashboard_states.md` | CREATE — state machine doc |
