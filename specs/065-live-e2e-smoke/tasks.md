# Tasks: Live E2E Smoke Tests

**Input**: Design documents from `/specs/065-live-e2e-smoke/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted. The feature itself IS a test execution task.

**Organization**: Tasks are grouped by user story. US3 (config) is a prerequisite for US1 (run tests), which is a prerequisite for US2 (evidence collection). Sequential execution required.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare evidence directory structure and version control exclusions

- [x] T001 Add `specs/*/evidence/traces/` exclusion to `.gitignore`
- [x] T002 Create evidence directory structure at `specs/065-live-e2e-smoke/evidence/screenshots/` (empty `.gitkeep`)

---

## Phase 2: User Story 3 - Configure Test Environment for Live Endpoints (Priority: P2)

**Goal**: Widen the `live-pi` Playwright project to match all `live-*.spec.ts` files and verify existing `LIVE_PI_URL` env var support works for the new test.

**Independent Test**: Run `npx playwright test --list --project=live-pi` and confirm both `live-smoke.spec.ts` and `live-rpc-smoke.spec.ts` are listed when `LIVE_PI_URL` is set.

### Implementation for User Story 3

- [x] T003 [US3] Widen `live-pi` project `testMatch` from `**/live-smoke.spec.ts` to `**/live-*.spec.ts` in `playwright.config.ts`
- [x] T004 [US3] Verify existing mock-based E2E tests still pass with no env override: run `npx playwright test --project=chromium` (regression check)

**Checkpoint**: `live-pi` project matches all `live-*.spec.ts` files. Default mock-based tests unaffected.

---

## Phase 3: User Story 1 - Run E2E Smoke Suite Against Live Stack (Priority: P1) 🎯 MVP

**Goal**: Create `live-rpc-smoke.spec.ts` with RPC flow tests (sessions, evidence, cameras) that run against real endpoints using pre-flight checks, then execute against the live Pi.

**Independent Test**: `LIVE_PI_URL=http://localhost:8082 npx playwright test live-rpc-smoke.spec.ts --project=live-pi` completes with all tests passing.

### Implementation for User Story 1

- [x] T005 [US1] Create `tests/e2e/live-rpc-smoke.spec.ts` with pre-flight endpoint checks and RPC smoke tests for sessions, cameras, and evidence flows (following `tests/e2e/live-smoke.spec.ts` pattern)
- [x] T006 [US1] Establish SSH tunnel to Pi (`ssh -L 8082:localhost:8082 pi`) and verify PiOrchestrator is accessible at `http://localhost:8082/api/system/info`
- [x] T007 [US1] Run full live-rpc test suite: `LIVE_RPC=1 VITE_PI_HOST=localhost npx playwright test --project=live-rpc` — 5 passed, 2 skipped (no sessions on Pi)
- [x] T008 [US1] Run existing live-smoke tests alongside — 9 passed, 3 pre-existing failures (stale API expectations in Feature 044)

**Checkpoint**: All live RPC smoke tests pass against the real PiOrchestrator. Screenshots generated in `test-results/`.

---

## Phase 4: User Story 2 - Publish PASS Evidence Bundle (Priority: P1)

**Goal**: Collect test artifacts (screenshots, results summary) into the evidence directory and create the RESULTS.md summary document.

**Independent Test**: `specs/065-live-e2e-smoke/evidence/RESULTS.md` exists, states "PASS", includes timestamp, endpoint URL, and per-test results. Screenshots directory contains PNG files.

### Implementation for User Story 2

- [x] T009 [US2] Copy Playwright screenshots from `test-results/` to `specs/065-live-e2e-smoke/evidence/screenshots/`
- [x] T010 [US2] Create `specs/065-live-e2e-smoke/evidence/RESULTS.md` with test suite name, pass/fail per test, timestamp, target endpoint URL, and total execution time
- [x] T011 [US2] Verify evidence bundle completeness: RESULTS.md states "PASS", screenshots exist, traces excluded from git

**Checkpoint**: Evidence bundle is complete and ready to commit. RESULTS.md clearly states "PiDashboard LIVE E2E PASS".

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T012 Run default mock-based E2E suite (`npm run test:e2e`) to confirm no regressions from config change — 18/18 pass
- [x] T013 Run `npm run lint` and `npm run build` to verify no lint/build errors — 0 errors, build OK
- [x] T014 Validate quickstart.md instructions match actual execution steps in `specs/065-live-e2e-smoke/quickstart.md` — updated to reflect LIVE_RPC=1 approach

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **US3 Config (Phase 2)**: Depends on Setup — BLOCKS US1 (tests need config to match new file)
- **US1 Run Tests (Phase 3)**: Depends on US3 — BLOCKS US2 (evidence needs test results)
- **US2 Evidence (Phase 4)**: Depends on US1 — requires test artifacts to exist
- **Polish (Phase 5)**: Depends on US3 completion (regression check)

### User Story Dependencies

- **User Story 3 (P2 — executed first)**: Foundational config change. Must complete before US1.
- **User Story 1 (P1)**: Core test execution. Depends on US3. Must complete before US2.
- **User Story 2 (P1)**: Evidence collection. Depends on US1 test run producing artifacts.

### Within Each User Story

- Config changes before test execution
- Test execution before evidence collection
- Evidence collection before polish

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T012, T013, T014 can run in parallel (independent validation checks)
- No cross-story parallelism — US3 → US1 → US2 is strictly sequential

---

## Parallel Example: Phase 1 Setup

```bash
# These two tasks touch different files and can run simultaneously:
Task T001: "Add traces exclusion to .gitignore"
Task T002: "Create evidence directory with .gitkeep"
```

## Parallel Example: Phase 5 Polish

```bash
# These three validation tasks are independent:
Task T012: "Run mock-based E2E suite for regression check"
Task T013: "Run lint and build checks"
Task T014: "Validate quickstart.md accuracy"
```

---

## Implementation Strategy

### MVP First (US3 + US1)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: US3 Config (T003-T004)
3. Complete Phase 3: US1 Test Execution (T005-T008)
4. **STOP and VALIDATE**: All live tests pass, screenshots generated
5. This is the MVP — live E2E validation is proven

### Full Delivery (add US2)

1. Complete MVP above
2. Complete Phase 4: US2 Evidence (T009-T011)
3. Complete Phase 5: Polish (T012-T014)
4. Commit evidence bundle — "PiDashboard LIVE E2E PASS" proven

---

## Notes

- US3 is listed as P2 in the spec but must execute first because it's a config prerequisite for US1
- The SSH tunnel (T006) is a manual prerequisite — not a code task, but required for test execution
- Evidence collection (T009-T010) is a manual/scripted step after Playwright runs
- Total scope: 1 new file, 1 config change, 1 gitignore change, evidence artifacts
