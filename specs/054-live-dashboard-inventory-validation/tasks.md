# Tasks: Live Dashboard Inventory Validation

**Input**: Design documents from `/specs/054-live-dashboard-inventory-validation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Organization**: Tasks are grouped by user story. This is a test infrastructure + documentation feature — zero production code changes. All new files are in `tests/e2e/`, `docs/runbooks/`, `.github/workflows/`, and `playwright.config.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify baseline and confirm existing patterns

- [x] T001 Run existing test suite to confirm baseline passes: `VITEST_MAX_WORKERS=1 npm test` — verify 0 failures — 2495 passed, 0 failures
- [x] T002 [P] Run existing E2E smoke to confirm baseline: `PLAYWRIGHT_WORKERS=1 npx playwright test --project=chromium tests/e2e/smoke.spec.ts` — verify passes — 11 passed
- [x] T003 [P] Verify existing `live-smoke.spec.ts` SKIP pattern by running `npx playwright test --project=chromium tests/e2e/live-smoke.spec.ts` without `LIVE_PI_URL` — confirm all tests SKIP with 0 failures — 15 skipped, 0 failures

**Checkpoint**: Baseline green, existing live-test pattern confirmed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Preflight utility and Playwright config that MUST be complete before any live test can be written

**CRITICAL**: No live E2E test work (Phases 3-5) can begin until this phase is complete

- [x] T004 Create `tests/e2e/fixtures/live-preflight.ts` — export `checkLiveBackend(baseUrl: string): Promise<PreflightResult>` function per data-model.md `PreflightResult` interface:
  - Fetch `GET {baseUrl}/api/v1/containers` with 5s timeout
  - On connection error → `{ canRun: false, skipReason: 'Backend unreachable at {baseUrl}', containerIds: [], baseUrl }`
  - On 404 → `{ canRun: false, skipReason: 'Containers API not available (404)', ... }`
  - On 503 → `{ canRun: false, skipReason: 'Backend returned 503 — service unavailable', ... }`
  - On 200 + empty containers → `{ canRun: false, skipReason: 'No containers found', ... }`
  - On 200 + containers: fetch `GET {baseUrl}/api/v1/containers/{firstId}/inventory/latest`
  - If inventory 404 → `{ canRun: false, skipReason: 'No inventory data for container {id}', ... }`
  - If inventory 200 + `review === null` → set `reviewableContainerId`
  - Return `{ canRun: true, containerIds: [...], baseUrl, reviewableContainerId? }`
  - Support `LIVE_TEST_CONTAINER_ID` env var override for container selection (R6)
- [x] T005 Update `playwright.config.ts` — add `live-inventory` project following existing `live-pi` pattern (D4, R3):
  - Read `const liveE2E = process.env.LIVE_E2E === '1'`
  - Read `const liveBaseUrl = process.env.LIVE_BASE_URL || 'https://raspberrypi.tail345cd5.ts.net'`
  - Conditionally add project: `...(liveE2E ? [{ name: 'live-inventory', testMatch: '**/live-inventory-correction.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: liveBaseUrl }, timeout: 60000 }] : [])`
  - Set `trace: 'on'`, `screenshot: 'on'`, `actionTimeout: 15000`, `navigationTimeout: 30000` (FR-009)
  - Ensure `webServer` is disabled when `liveE2E` is true (no local dev server for live tests)

**Checkpoint**: Preflight utility and Playwright project ready — live test file can now be created

---

## Phase 3: User Story 1 — Live Correction Workflow Smoke (Priority: P1)

**Goal**: Targeted live tests proving the inventory correction workflow works against real BridgeServer data

**Independent Test**: `LIVE_E2E=1 LIVE_BASE_URL=https://raspberrypi.tail345cd5.ts.net PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory`

- [x] T006 [US1] Create `tests/e2e/live-inventory-correction.spec.ts` with test scaffold (D1):
  - Import `checkLiveBackend` from `./fixtures/live-preflight`
  - Declare `LIVE_E2E = process.env.LIVE_E2E === '1'` and `LIVE_BASE_URL` with default
  - `test.describe('Live Inventory Correction Workflow')` block
  - In `test.beforeAll()`: skip if `!LIVE_E2E` with reason "LIVE_E2E not enabled" (FR-005, R1)
  - In `test.beforeAll()`: call `checkLiveBackend(LIVE_BASE_URL)` — `test.skip(!result.canRun, result.skipReason)` (FR-003, FR-004)
  - Store `preflight` result for use by tests (container IDs, reviewable container)
  - Helper function `navigateToInventory(page)`: click Inventory tab, wait for content
  - Helper function `selectContainer(page, containerId)`: navigate to container in Containers tab, click it, return to Inventory tab
- [x] T007 [US1] Add "live: view latest delta" test using `test.step()` for structured reporting (R2, FR-006):
  - `test.step('Navigate to Inventory tab')`: click Inventory tab, wait for panel
  - `test.step('Select container')`: use preflight `containerIds[0]` or `LIVE_TEST_CONTAINER_ID`
  - `test.step('Verify delta table renders')`: wait for `[data-testid="inventory-delta-table"]` or status indicator
  - `test.step('Verify delta entries')`: check at least one row with item name and count visible
  - Capture screenshot: `await page.screenshot({ path: 'test-results/live-delta-view.png' })` (FR-008)
- [x] T008 [US1] Add "live: submit correction" test (FR-006):
  - `test.step('Navigate to reviewable delta')`: use preflight `reviewableContainerId` — `test.skip(!reviewableContainerId, 'No reviewable delta available')`
  - `test.step('Enter edit mode')`: click edit/review button
  - `test.step('Modify count')`: change one item count
  - `test.step('Add note')`: type "Live validation test correction — {timestamp}" in notes field
  - Capture screenshot: `live-correction-edit.png`
  - `test.step('Submit via confirmation dialog')`: click submit, confirm dialog, wait for response
  - Capture screenshot: `live-correction-submit.png`
  - `test.step('Verify audit trail')`: wait for audit trail section, verify correction details visible
  - Capture screenshot: `live-correction-audit.png`
  - Handle 409 conflict: if submission returns conflict UI, SKIP with "Delta already reviewed — re-run with fresh data" (R7)
- [x] T009 [US1] Add "live: approve as-is" test (FR-007):
  - Navigate to a reviewable delta (different from T008 if possible, else SKIP)
  - `test.step('Click Approve')`: click approve button
  - `test.step('Verify audit trail')`: wait for audit trail showing "Approved"
  - Capture screenshot: `live-approve-audit.png`
  - Handle 409: SKIP gracefully if already reviewed
- [x] T010 [US1] Add "live: inventory tab connectivity" smoke test:
  - Navigate to Inventory tab
  - Verify the tab renders without console errors (no error banners, no blank screen)
  - Verify container list or delta view is shown (not an error state)
  - Capture screenshot: `live-inventory-tab.png`
  - This test has no data mutation — always runs when preflight passes

**Checkpoint**: Core live correction workflow validated — view delta, submit correction, approve, verify audit trail

---

## Phase 4: User Story 2 — Preflight Checks with Deterministic Skip (Priority: P1)

**Goal**: All failure modes produce SKIP with explicit reasons, never misleading failures

**Independent Test**: `LIVE_E2E=1 LIVE_BASE_URL=http://localhost:9999 PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory` — all tests SKIP

- [x] T011 [US2] Verify SKIP when `LIVE_E2E` is not set — 6 skipped, 0 failures — run `npx playwright test --project=chromium tests/e2e/live-inventory-correction.spec.ts` without any LIVE env vars:
  - Confirm all tests report "skipped" in Playwright output
  - Confirm zero failures
  - Confirm skip reason contains "LIVE_E2E not enabled"
- [x] T012 [US2] Verify SKIP when backend is unreachable — 6 skipped, 0 failures — run `LIVE_E2E=1 LIVE_BASE_URL=http://localhost:9999 npx playwright test --project=chromium tests/e2e/live-inventory-correction.spec.ts`:
  - Confirm all tests report "skipped"
  - Confirm skip reason contains "Backend unreachable"
  - Confirm zero failures, zero network timeout hangs
- [x] T013 [US2] Add "live: preflight health report" diagnostic test to `tests/e2e/live-inventory-correction.spec.ts`:
  - Always runs when `LIVE_E2E=1` (first test in describe block)
  - Calls `checkLiveBackend()` and logs result: base URL, container count, reviewable status
  - If `canRun=true`: passes with diagnostic info in test output
  - If `canRun=false`: SKIPs with specific `skipReason` from preflight
  - Provides clear diagnostic in Playwright HTML report for debugging

**Checkpoint**: All preflight failure modes produce clean SKIP — zero misleading failures

---

## Phase 5: User Story 3 — CI Isolation and Artifact Capture (Priority: P1)

**Goal**: Default CI never runs live tests; opt-in job captures artifacts

**Independent Test**: Run default CI workflow — verify zero live-test executions. Then run with `LIVE_E2E=1` — verify artifact upload.

- [x] T014 [US3] Update `.github/workflows/test.yml` — extend `workflow_dispatch` trigger with inputs (R4):
  - Add `inputs.run_live` (boolean, default: false, description: "Run live inventory E2E tests")
  - Add `inputs.live_base_url` (string, default: "https://raspberrypi.tail345cd5.ts.net", description: "Live deployment URL")
  - Preserve existing `workflow_dispatch: {}` manual trigger capability
- [x] T015 [US3] Add `live-e2e` job to `.github/workflows/test.yml` (FR-011):
  - Condition: `if: ${{ github.event.inputs.run_live == 'true' }}`
  - Uses Nix shell (same pattern as `e2e-smoke` job): `cachix/install-nix-action@v31`, magic nix cache, npm ci
  - Run command: `LIVE_E2E=1 LIVE_BASE_URL=${{ github.event.inputs.live_base_url }} nix develop --command npx playwright test --project=live-inventory`
  - Timeout: 10 minutes
  - Upload artifacts (always): `playwright-report/` as `playwright-report-live`, `test-results/` as `test-results-live`
  - Upload traces on failure: `test-results/**/*.zip`, `test-results/**/*.png`, `test-results/**/*.webm`
  - Do NOT add to `test-summary` `needs` list — live job failures don't block PR merges (FR-010)
- [x] T016 [US3] Verify default CI isolation (FR-010):
  - Confirm live test file (`live-inventory-correction.spec.ts`) is NOT listed in `e2e-smoke` job's explicit test file list
  - Confirm the `live-e2e` job only runs when `github.event.inputs.run_live == 'true'`
  - Confirm existing `test-summary` job does NOT include `live-e2e` in its `needs` list
  - Run `npx playwright test --project=chromium tests/e2e/live-inventory-correction.spec.ts` to verify all SKIP, 0 failures

**Checkpoint**: CI isolation confirmed — live tests never flake default CI; opt-in job wired with artifact capture

---

## Phase 6: User Story 4 — Operator Deploy Validation Checklist (Priority: P2)

**Goal**: One-page runbook for post-deploy validation

**Independent Test**: A non-developer can follow the runbook and validate a deployment in under 5 minutes

- [x] T017 [US4] Create `docs/runbooks/live-validation-inventory.md` (FR-012) with sections:
  - **Prerequisites**: Node.js 22+, Playwright installed (`npm ci`), network access to deployment
  - **Environment Variables**: table of `LIVE_E2E`, `LIVE_BASE_URL`, `LIVE_TEST_CONTAINER_ID` with descriptions and defaults
  - **Quick Automated Validation** (< 1 min): exact command: `LIVE_E2E=1 LIVE_BASE_URL=<url> PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory`
  - **Interpreting Results**: table mapping PASS/SKIP/FAIL to meaning and action
  - **Manual Walkthrough** (< 5 min): numbered steps with expected screens:
    1. Open dashboard URL in browser
    2. Navigate to Inventory tab
    3. Select a container — verify delta table loads
    4. View delta entries — verify items, counts, confidence scores
    5. Submit a test correction — edit one count, add note, confirm
    6. Verify audit trail shows correction
    7. Check for error states — verify no blank screens or raw error dumps
  - **Troubleshooting**: table of failure modes → actions:
    - "Backend unreachable" → check service status, SSH to Pi, verify Tailscale
    - "No containers found" → verify BridgeServer container registration
    - "No inventory data" → trigger analysis scan, check BridgeServer logs
    - "Delta already reviewed" → need fresh analysis data
    - "Schema validation error" → PiDashboard/BridgeServer version mismatch
  - **Data Safety Note**: live tests submit real corrections — use a designated test container
  - **Pass/Fail Checklist**: markdown checkboxes for each validation step

**Checkpoint**: Operator can validate a deployment without developer assistance

---

## Phase 7: User Story 5 — UI Error Messaging Verification (Priority: P2)

**Goal**: Verify the UI surfaces backend failures with operator-grade messaging

**Independent Test**: Review existing deterministic E2E error state tests + add a live smoke check

**Note**: Most error states are already tested by Feature 053's deterministic E2E tests. This phase verifies coverage and adds a live check.

- [x] T018 [US5] Verify existing E2E error state coverage — review these files for inventory error scenarios (FR-013, FR-014):
  - `tests/e2e/inventory-correction-flow.spec.ts` — check for 503 service unavailable test, pending state test
  - `tests/e2e/inventory-delta-golden.spec.ts` — check for error state rendering
  - `tests/e2e/inventory-delta.spec.ts` — check for error scenarios
  - Document findings: list each error state and its test file:line reference
  - If gaps found: document them in HANDOFF for a future feature (out of scope to implement new UI)
- [x] T019 [P] [US5] Add "live: no hidden errors" test to `tests/e2e/live-inventory-correction.spec.ts`:
  - Runs when `LIVE_E2E=1` and backend is reachable (no errors injected — happy path)
  - Navigate to Inventory tab — verify no error banners or raw error text visible
  - Wait for content to load — verify loading state transitions to content (not stuck spinner)
  - Check console for errors: collect `page.on('console', ...)` errors during navigation
  - Verify zero unexpected console errors (allowlist known non-critical warnings)
  - Capture screenshot: `live-no-errors.png`

**Checkpoint**: Error messaging verified via existing deterministic tests + live happy-path clean check

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and verification

- [x] T020 Run full deterministic test suite: `VITEST_MAX_WORKERS=1 npm test` — 2495 passed, 0 failures
- [x] T021 [P] Run lint: `npm run lint` — 0 errors, 1 pre-existing warning
- [x] T022 [P] Run build: `npm run build` — success (4.82s)
- [x] T023 Run deterministic E2E smoke: `PLAYWRIGHT_WORKERS=1 npx playwright test --project=chromium tests/e2e/smoke.spec.ts` — 11 passed
- [x] T024 Verify live test SKIP behavior (final check): `npx playwright test --project=chromium tests/e2e/live-inventory-correction.spec.ts` — 6 skipped, 0 failures
- [x] T025 Verify FR coverage — confirm each FR-001 through FR-014 has at least one test or documented verification:
  - FR-001 (LIVE_E2E flag): T006, T011
  - FR-002 (LIVE_BASE_URL): T005, T006
  - FR-003 (preflight): T004, T013
  - FR-004 (SKIP reasons): T011, T012
  - FR-005 (SKIP when not set): T011
  - FR-006 (correction workflow): T007, T008
  - FR-007 (approve as-is): T009
  - FR-008 (screenshots): T007-T010
  - FR-009 (traces on failure): T005 (config)
  - FR-010 (CI isolation): T016
  - FR-011 (CI live job): T014, T015
  - FR-012 (runbook): T017
  - FR-013 (error messaging): T018, T019
  - FR-014 (loading timeouts): T018

**Checkpoint**: Feature 054 complete — deterministic CI unaffected, live suite ready, runbook delivered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all live test work (Phases 3-5)
- **US1 Live Tests (Phase 3)**: Depends on Phase 2 (preflight utility + config + test scaffold)
- **US2 Skip Behavior (Phase 4)**: Depends on Phase 3 (test file must exist with tests to verify skip behavior)
- **US3 CI Integration (Phase 5)**: Depends on Phase 3 (test file must exist for CI job to reference)
- **US4 Runbook (Phase 6)**: Depends on Phase 3 (references test commands and expected behavior)
- **US5 Error Verification (Phase 7)**: Can start after Phase 1 (T018 is review only); T019 depends on Phase 3
- **Polish (Phase 8)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Live Tests)**: Depends on Foundational (Phase 2) — core deliverable
- **US2 (Skip Behavior)**: Depends on US1 (tests must exist to verify skip behavior)
- **US3 (CI)**: Depends on US1 (test file must exist) — can run in parallel with US2
- **US4 (Runbook)**: Depends on US1 (references test commands) — can run in parallel with US2/US3
- **US5 (Error Messaging)**: T018 is independent; T019 depends on US1

### Parallel Opportunities

After Phase 2 completes, US2/US3/US4/US5 can partially overlap:

```
Phase 1 (Setup)
  |
Phase 2 (Foundational) ← BLOCKS everything
  |
Phase 3 (US1 — Live Tests) ← core deliverable
  |
  +--- Phase 4 (US2 — Skip Verification)
  +--- Phase 5 (US3 — CI Integration)     ← can run in parallel
  +--- Phase 6 (US4 — Runbook)            ← can run in parallel
  +--- Phase 7 (US5 — Error Verification) ← T018 independent, T019 after Phase 3
  |
Phase 8 (Polish) ← depends on all
```

Within each phase, tasks marked [P] can run in parallel.

### Parallel Example: After Phase 3

```bash
# These can all proceed in parallel (different files):
Task: T011 [US2] — verify SKIP without LIVE_E2E (terminal command)
Task: T014 [US3] — update test.yml (different file from spec)
Task: T017 [US4] — create runbook (docs/ directory)
Task: T018 [US5] — review existing error coverage (read-only)
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001-T003) — verify baseline
2. Complete Phase 2: Foundational (T004-T005) — preflight + config
3. Complete Phase 3: US1 Live Tests (T006-T010) — core workflow tests
4. Complete Phase 4: US2 Skip Behavior (T011-T013) — verify graceful degradation
5. **STOP and VALIDATE**: Run with and without `LIVE_E2E=1`:
   - Without: all tests SKIP, 0 failures
   - With (if backend available): tests pass with screenshots captured
   - This covers FR-001 through FR-009

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US1 live tests → core validation capability (MVP!)
3. US2 skip verification → confidence in graceful degradation
4. US3 CI integration → automated execution with artifacts
5. US4 runbook → operator documentation
6. US5 error verification → production confidence
7. Polish → final validation and FR traceability

---

## Notes

- All tasks create test infrastructure or documentation — zero production code changes
- Live tests target a real deployment — correction tests modify data (R7)
- The `LIVE_TEST_CONTAINER_ID` env var is optional — preflight picks first container if not set (R6)
- Existing `LIVE_PI_URL` for `live-smoke.spec.ts` is unrelated and preserved as-is (D3)
- Resource constraints: `PLAYWRIGHT_WORKERS=1` for live tests (sequential, predictable)
- Screenshots use descriptive filenames (`live-delta-view.png`, etc.) for easy artifact identification (R2)
- `test.step()` used in live tests for structured HTML report output (R2)
- Handle 409 REVIEW_CONFLICT gracefully with SKIP + reason — tests are idempotent (R7)
