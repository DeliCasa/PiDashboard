# Research: Handoff Sentinel Normalization

**Feature**: 041-handoff-normalization
**Date**: 2026-02-02

## R1: Current Sentinel Detection Behavior

**Decision**: The sentinel filters differently based on direction — incoming `new` handoffs show warnings, outgoing `new` handoffs are tracked but only shown in verbose mode.

**Rationale**: The detection logic in `detect.ts` lines 79-85 filters for:
- Incoming handoffs TO PiDashboard (all statuses except done/acknowledged)
- Outgoing handoffs FROM PiDashboard with pending status

In normal mode, only incoming pending handoffs surface as actionable warnings. This means the 2 warnings we see (`031-logs-v1-sse` and `035-auto-onboard-api`) are the only noise in normal dev workflow.

**Alternatives considered**: None — this is an investigation of existing behavior, not a design decision.

## R2: Status Audit — Which Handoffs Need Updates

**Decision**: Update 2 handoff files, keep 9 unchanged.

**Audit Results**:

| Handoff ID | Current | New Status | Rationale |
|-----------|---------|------------|-----------|
| `031-logs-v1-sse` | `new` | `done` | SSE logs fully implemented in `src/infrastructure/api/logs.ts` |
| `035-auto-onboard-api` | `new` | `acknowledged` | Informational documentation received, no blocking action |
| `029-route-normalization` | `new` | Keep `new` | Genuine outgoing request awaiting PiOrchestrator |
| `031-backend-gaps` | `new` | Keep `new` | 4/5 issues still pending PiOrchestrator |
| `035-camera-diagnostics-api` | `new` | Keep `new` | Genuine outgoing request awaiting PiOrchestrator |
| `000-template-example` | `new` | `done` | Template file should be marked done to avoid noise |
| `040-frontmatter-contract` | `done` | Keep `done` | Already correct |
| `028-api-compat-complete` | `done` | Keep `done` | Already correct |
| `030-dashboard-recovery` | `done` | Keep `done` | Already correct |
| `030-recovery-complete` | `done` | Keep `done` | Already correct |
| `027-piorchestrator-integration` | `acknowledged` | Keep `acknowledged` | Already correct |

**Rationale**: Only the 2 incoming handoffs with `new` status need updating since they are the source of the warning output. The template file (`000-template-example`) also needs fixing as it shows `new` in verbose mode. The 3 outgoing `new` handoffs are legitimate pending requests and should stay as-is.

**Alternatives considered**:
- Mark all outgoing `new` as `acknowledged` — rejected because they represent real work requests for PiOrchestrator
- Mark `031-backend-gaps` as `in_progress` — considered but the work is happening in PiOrchestrator repo, not here

## R3: Sentinel Warning Elimination Path

**Decision**: Updating the 2 incoming handoffs to non-pending statuses will eliminate all sentinel warnings in normal mode.

**Rationale**:
- Normal mode output: 2 warnings (`031-logs-v1-sse`, `035-auto-onboard-api`)
- Both are incoming with `new` status
- Changing to `done` and `acknowledged` respectively removes them from pending filter
- Outgoing `new` handoffs don't show in normal mode (only verbose)
- The template `000-template-example` shows as `new` in verbose but not in normal mode

**Post-fix expected state**:
- `npm run handoff:detect` → no output (no pending incoming handoffs)
- `npm run handoff:detect --quiet` → exit 0, no output
- `npm run handoff:detect --verbose` → shows all 11 with correct statuses, 3 outgoing still `new`

## R4: Test Suite Impact

**Decision**: Handoff file status changes are markdown-only edits with no code impact on tests.

**Rationale**:
- No test files import or reference handoff markdown files
- The handoff sentinel scripts are separate from the test infrastructure
- Contract tests validate API schemas, not handoff documents
- The `.handoff-state.json` will be regenerated on next detection run

**Alternatives considered**: None — this is a straightforward data change with no code coupling.
