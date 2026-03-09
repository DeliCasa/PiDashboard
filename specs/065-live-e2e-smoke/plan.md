# Implementation Plan: Live E2E Smoke Tests

**Branch**: `065-live-e2e-smoke` | **Date**: 2026-03-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/065-live-e2e-smoke/spec.md`

## Summary

Run existing E2E smoke tests against the live PiOrchestrator stack to validate sessions, evidence, and camera RPC flows work end-to-end. Create a new `live-rpc-smoke.spec.ts` that exercises the same RPC flows as `rpc-smoke.spec.ts` but against real endpoints (without mocks). Widen the `live-pi` Playwright project match pattern to include the new file. Collect screenshots and a RESULTS.md summary as the "PASS evidence bundle" under `specs/065-live-e2e-smoke/evidence/`.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: Playwright 1.57.0, @connectrpc/connect-web ^2.1.x, @delicasa/wire 0.5.0
**Storage**: Filesystem (evidence artifacts in specs directory)
**Testing**: Playwright E2E (live-pi project), single worker
**Target Platform**: NixOS dev machine → Raspberry Pi (PiOrchestrator on port 8082)
**Project Type**: Web application (E2E test addition only)
**Performance Goals**: Full smoke suite completes in < 5 minutes
**Constraints**: Single Playwright worker (resource constraints), pre-flight checks to skip unavailable endpoints
**Scale/Scope**: 1 new test file (~80-120 lines), 1 config change, evidence collection script/manual step

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | N/A | No application code changes — E2E tests only |
| II. Contract-First API | PASS | Tests consume existing RPC endpoints; no new schemas |
| III. Test Discipline | PASS | New tests follow existing live-smoke pattern; resource constraints honored (single worker) |
| III.A Resource Constraints | PASS | `live-pi` project inherits worker limits from config |
| IV. Simplicity & YAGNI | PASS | Minimal changes: 1 new test file, 1 config tweak, evidence collection |

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | N/A | No src/ changes |
| II. Contract-First API | PASS | No new API contracts; existing RPC endpoints tested read-only |
| III. Test Discipline | PASS | Pre-flight checks skip tests when endpoints unavailable; screenshots on every test |
| IV. Simplicity & YAGNI | PASS | No abstractions; straightforward test file following established pattern |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/065-live-e2e-smoke/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: evidence bundle structure
├── quickstart.md        # Phase 1: how to run
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── evidence/            # Test artifacts (created during execution)
    ├── RESULTS.md       # Human-readable pass/fail summary
    ├── screenshots/     # Playwright screenshots (committed)
    └── traces/          # Playwright traces (gitignored)
```

### Source Code (repository root)

```text
tests/e2e/
├── live-smoke.spec.ts        # Existing: basic live Pi tests (Feature 044)
├── live-rpc-smoke.spec.ts    # NEW: live RPC smoke tests (sessions, evidence, cameras)
├── operations.spec.ts        # Existing: mock-based operations tests (unchanged)
├── rpc-smoke.spec.ts         # Existing: mock-based RPC smoke tests (unchanged)
└── fixtures/
    └── test-base.ts          # Existing: fixtures (unchanged)

playwright.config.ts          # MODIFIED: widen live-pi testMatch pattern
.gitignore                    # MODIFIED: exclude evidence/traces/
```

**Structure Decision**: Minimal footprint — one new test file in the existing `tests/e2e/` directory following the `live-*.spec.ts` naming convention established by Feature 044. No new directories in `src/`.

## Design Decisions

### D1: New test file vs modifying existing tests

**Choice**: New `live-rpc-smoke.spec.ts` file.

**Why**: `operations.spec.ts` and `rpc-smoke.spec.ts` are structurally coupled to the `mockedPage` fixture. Modifying the fixture to conditionally skip mocking would risk breaking 130+ existing E2E tests. A dedicated live test file follows the established `live-smoke.spec.ts` pattern and keeps concerns separated.

### D2: Test structure

The new `live-rpc-smoke.spec.ts` will:

1. Use standard `page` fixture (no mocks)
2. Pre-flight check each RPC endpoint; skip if unavailable (404/503)
3. Navigate to Operations tab and verify:
   - Session list renders with real data
   - Camera list renders with real data
   - Session detail drill-down works (if sessions exist)
4. Take screenshots at each verification point
5. Assert no unhandled console errors

### D3: Evidence collection

**Manual step after test run**:
1. Playwright generates screenshots in `test-results/` directory
2. Copy relevant screenshots to `specs/065-live-e2e-smoke/evidence/screenshots/`
3. Write `RESULTS.md` with test results summary
4. Commit screenshots and RESULTS.md; gitignore traces

### D4: Playwright config changes

1. Widen `live-pi` project's `testMatch` from `**/live-smoke.spec.ts` to `**/live-*.spec.ts`.
2. Add new `live-rpc` project (enabled by `LIVE_RPC=1`) that uses the main Vite config with proxy so `/rpc` routes to Pi:8081 and `/api` routes to Pi:8082.

**Discovery during implementation**: Port 8082 (PiOrchestrator config UI) does NOT proxy `/rpc/` to port 8081. The Vite dev server handles this proxy. So live RPC tests must use the Vite dev server (not direct Pi access), requiring a separate `LIVE_RPC=1` mode with the main `vite.config.ts`.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `tests/e2e/live-rpc-smoke.spec.ts` | CREATE | Live RPC smoke tests for sessions, evidence, cameras |
| `playwright.config.ts` | MODIFY | Widen `live-pi` testMatch to `**/live-*.spec.ts` |
| `.gitignore` | MODIFY | Add `specs/*/evidence/traces/` exclusion |
| `specs/065-live-e2e-smoke/evidence/RESULTS.md` | CREATE | Test results summary (after test run) |
| `specs/065-live-e2e-smoke/evidence/screenshots/` | CREATE | Screenshot artifacts (after test run) |

## Complexity Tracking

No constitution violations — table not needed.
