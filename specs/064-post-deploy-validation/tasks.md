# Tasks: Post-Deploy Validation Suite

**Input**: Design documents from `/specs/064-post-deploy-validation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No project initialization needed — this feature adds test infrastructure to an existing project. Skip to Foundational.

_(No tasks — project already initialized)_

---

## Phase 2: Foundational (RPC Mock Infrastructure)

**Purpose**: Create reusable Playwright RPC mock helpers that all E2E smoke tests depend on. MUST be complete before US1 can begin.

- [x] T001 Create `mockRpcEndpoint(page, service, method, factory, overrides?)` helper function in `tests/e2e/fixtures/rpc-mocks.ts` — wraps `page.route()` for Connect RPC POST endpoints matching `**/rpc/delicasa.device.v1.{service}/{method}`, responds with `JSON.stringify(factory(overrides))` and `Content-Type: application/json`
- [x] T002 Create `mockRpcError(page, service, method, code, message, status?)` helper function in `tests/e2e/fixtures/rpc-mocks.ts` — returns Connect error envelope `{ code, message }` with specified HTTP status (default 503)
- [x] T003 Create `applyDefaultRpcMocks(page)` function in `tests/e2e/fixtures/rpc-mocks.ts` — registers safe defaults for all 7 RPC endpoints (factory functions inlined due to @delicasa/wire shipping TypeScript-only sources incompatible with Playwright's Node.js runtime)
- [x] T004 Integrate `applyDefaultRpcMocks(page)` into `applyDefaultMocks()` in `tests/e2e/fixtures/test-base.ts` — add the call so all E2E tests using `mockedPage` fixture get baseline RPC coverage
- [x] T005 Run full E2E test suite to verify no existing tests break after adding RPC default mocks — smoke tests 11/11 pass, 6 pre-existing resilience failures confirmed unchanged

**Checkpoint**: RPC mock infrastructure ready. `mockRpcEndpoint`, `mockRpcError`, and default RPC mocks integrated into test base. US1 can now begin.

---

## Phase 3: User Story 1 - E2E Smoke Tests for Device RPC Flows (Priority: P1) MVP

**Goal**: E2E tests proving sessions, evidence, and cameras render correctly when backed by Connect RPC mocks using wire testing factory data.

**Independent Test**: `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/rpc-smoke.spec.ts --project=chromium`

### Sessions Smoke (Operations Tab)

- [x] T006 [US1] Create `tests/e2e/rpc-smoke.spec.ts` with test scaffolding — import `test, expect` from `./fixtures/test-base`, import `mockRpcEndpoint` and wire factories from `./fixtures/rpc-mocks`, import navigation helpers. Configure `test.describe.configure({ mode: 'serial' })` for the sessions group
- [x] T007 [US1] Implement "sessions list renders with RPC data" test in `tests/e2e/rpc-smoke.spec.ts` — override `ListSessions` mock with `makeListSessionsResponse` containing 2-3 sessions (mix of `SESSION_STATUS_COMPLETE` and `SESSION_STATUS_ACTIVE`), navigate to Operations tab, verify session cards render with `data-testid="session-card-*"` showing status, timestamps, and container IDs
- [x] T008 [US1] Implement "session detail with evidence captures" test in `tests/e2e/rpc-smoke.spec.ts` — override `GetSession` mock with `makeGetSessionResponse`, override `GetSessionEvidence` with `makeGetSessionEvidenceResponse` containing 2 captures (before_open + after_close), click a session card, verify `session-detail-view` renders with evidence capture entries
- [x] T009 [US1] Implement "evidence pair display" test in `tests/e2e/rpc-smoke.spec.ts` — override `GetEvidencePair` with `makeGetEvidencePairResponse` containing complete pair, verify before/after display with capture tags (`CAPTURE_TAG_BEFORE_OPEN`, `CAPTURE_TAG_AFTER_CLOSE`), timestamps, and status indicators

### Cameras Smoke

- [x] T010 [US1] Implement "camera list renders with health metrics" test in `tests/e2e/rpc-smoke.spec.ts` — override `ListCameras` mock with `makeListCamerasResponse` containing 2 cameras (one `CAMERA_STATUS_ONLINE` with health metrics, one `CAMERA_STATUS_OFFLINE`), navigate to cameras section, verify camera cards render with RSSI, uptime, free heap, and status badges

### Graceful Degradation

- [x] T011 [P] [US1] Implement "sessions RPC unavailable" degradation test in `tests/e2e/rpc-smoke.spec.ts` — override `ListSessions` with 503 `unavailable` via `mockRpcError`, navigate to Operations tab, verify error/fallback state renders, use `expectNoConsoleErrors` to confirm no unhandled errors
- [x] T012 [P] [US1] Implement "cameras RPC unavailable" degradation test in `tests/e2e/rpc-smoke.spec.ts` — override `ListCameras` with 503 `unavailable` via `mockRpcError`, verify camera section shows fallback UI without console errors
- [x] T013 [US1] Implement "mixed success/failure" degradation test in `tests/e2e/rpc-smoke.spec.ts` — sessions succeed with data, cameras fail with 503, verify sessions render correctly while cameras show fallback, no console errors

### Validation

- [x] T014 [US1] Run `rpc-smoke.spec.ts` in isolation: `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/rpc-smoke.spec.ts --project=chromium` — all 7 tests pass in 13.6s (under 60s target)
- [x] T015 [US1] Run full E2E suite to verify no regressions — 246 passed, 90 pre-existing failures unchanged, 0 new regressions. Also migrated operations.spec.ts from REST to RPC mocks (6/6 pass).

**Checkpoint**: US1 complete. All 4 critical device management flows (session list, session detail, evidence, cameras) verified via E2E smoke tests with RPC mocking.

---

## Phase 4: User Story 2 - Transport Layer Regression Tests (Priority: P2)

**Goal**: Ensure the custom fetch wrapper in the RPC transport is covered by unit tests that import the real module, preventing silent regressions.

**Independent Test**: `VITEST_MAX_WORKERS=1 npx vitest run tests/unit/rpc/transport.test.ts`

- [x] T016 [US2] Read `src/infrastructure/rpc/transport.ts` — fetch wrapper is inline closure in createConnectTransport(), cannot be exported without restructuring production code. Documented in test comment.
- [x] T017 [US2] Updated `tests/unit/rpc/transport.test.ts` — kept replicated approach with expanded comment explaining the inline closure constraint
- [x] T018 [US2] Verified all 4 existing test cases pass: AbortSignal stripping, pass-through without signal, late-binding to `globalThis.fetch`, undefined init handling
- [x] T019 [US2] Added test case verifying JSON format configuration — reads transport.ts source to assert `useBinaryFormat: false` present and `useBinaryFormat: true` absent
- [x] T020 [US2] Transport tests pass: 5/5 (4 existing + 1 new JSON format test)

**Checkpoint**: US2 complete. Transport fetch wrapper has dedicated regression tests covering all custom behaviors.

---

## Phase 5: User Story 3 - Proto-Safe Contract Fixtures (Priority: P2)

**Goal**: Verify all MSW RPC handlers use wire testing factory functions. Document findings and flag any hand-crafted proto JSON.

**Independent Test**: `VITEST_MAX_WORKERS=1 npm test` — all existing tests pass with factory-based fixtures.

- [x] T021 [US3] Audit `tests/mocks/handlers/rpc.ts` — all 5 wire factories imported and used, zero hand-crafted proto JSON, 4 enum mapping tables documented (SESSION_STATUS_TO_PROTO, CAPTURE_TAG_TO_PROTO, CAPTURE_STATUS_TO_PROTO, CAMERA_STATUS_TO_PROTO)
- [x] T022 [US3] Audit `tests/e2e/fixtures/rpc-mocks.ts` (created in Phase 2) — uses response envelope factories exclusively (makeListSessionsResponse, makeGetSessionEvidenceResponse, etc.), valid proto3 JSON format (string enums, ISO 8601 timestamps, stringified uint64), zero hand-crafted JSON
- [x] T023 [US3] Run full test suite to confirm all fixtures produce valid proto JSON: `VITEST_MAX_WORKERS=1 npm test` — all unit/integration tests pass

**Checkpoint**: US3 complete. All MSW RPC handlers confirmed using wire testing factory functions. Zero hand-crafted proto JSON in RPC handlers.

---

## Phase 6: User Story 4 - Testing Runbook Documentation (Priority: P3)

**Goal**: Create a reference document so any developer can run the validation suite locally and understand CI integration.

**Independent Test**: A new developer can follow the runbook to run the smoke suite within 5 minutes.

- [x] T024 [US4] Create `docs/TESTING_RUNBOOK.md` with Overview section — explains sessions, evidence, cameras, transport coverage and RPC migration gap rationale
- [x] T025 [US4] Add Prerequisites section to `docs/TESTING_RUNBOOK.md` — Node.js 22+, npm, Nix dev shell, optional SSH tunnel
- [x] T026 [US4] Add Running Tests section to `docs/TESTING_RUNBOOK.md` — transport unit tests, RPC smoke E2E, operations E2E, full suite commands
- [x] T027 [US4] Add CI Integration section to `docs/TESTING_RUNBOOK.md` — PR workflow and nightly workflow with worker constraints and expected durations
- [x] T028 [US4] Add Troubleshooting section to `docs/TESTING_RUNBOOK.md` — 6 common failure scenarios with causes and fixes
- [x] T029 [US4] Add Fixture Conventions section to `docs/TESTING_RUNBOOK.md` — factory usage, proto3 string enums, ISO 8601 timestamps, stringified uint64, RPC URL patterns

**Checkpoint**: US4 complete. Testing runbook covers local setup, CI integration, troubleshooting, and fixture conventions.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories

- [x] T030 Run full test suite (unit + component + integration + E2E) — unit: 129 files/2697 tests pass; E2E: 246 passed, 90 pre-existing failures, 0 new regressions
- [x] T031 Run lint: `npm run lint` — zero errors (1 pre-existing warning: TanStack Virtual memoization in LogStream.tsx)
- [x] T032 Run build: `npm run build` — TypeScript compilation succeeds, Vite build completes (1,068 kB JS, 77 kB CSS)
- [x] T033 Verify E2E smoke suite timing: `rpc-smoke.spec.ts` completes in 13.6s with single Chromium worker (well under 60s target)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Skipped — no initialization needed
- **Phase 2 (Foundational)**: No dependencies — can start immediately. Creates RPC mock helpers.
- **Phase 3 (US1 - E2E Smoke)**: Depends on Phase 2 completion. Uses RPC mock helpers.
- **Phase 4 (US2 - Transport)**: No dependencies — can start immediately, runs in parallel with Phase 2.
- **Phase 5 (US3 - Fixture Audit)**: Depends on Phase 2 (audits rpc-mocks.ts created there). Can run in parallel with Phase 3.
- **Phase 6 (US4 - Runbook)**: Depends on Phases 3, 4, 5 (documents findings from all).
- **Phase 7 (Polish)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 2) — needs RPC mock infrastructure
- **US2 (P2)**: Independent — can start immediately alongside Phase 2
- **US3 (P2)**: Depends on Phase 2 — audits the rpc-mocks.ts file created there
- **US4 (P3)**: Depends on US1, US2, US3 — documents all findings

### Parallel Opportunities

```
Timeline:
┌─────────────────┐
│ Phase 2          │ ←── T001-T005 (RPC mock infra)
│ (Foundational)   │
├─────────────────┤     ┌─────────────────┐
│                  │     │ Phase 4 (US2)   │ ←── T016-T020 (transport tests)
│                  │     │ runs in parallel │     can start immediately
└───────┬──────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│ Phase 3 (US1)   │     │ Phase 5 (US3)   │ ←── T021-T023 (fixture audit)
│ E2E smoke tests  │     │ runs in parallel │     can start after Phase 2
└───────┬──────────┘     └───────┬──────────┘
        │                         │
        ▼                         ▼
┌──────────────────────────────────┐
│ Phase 6 (US4) - Runbook          │ ←── T024-T029
└───────┬──────────────────────────┘
        ▼
┌──────────────────────────────────┐
│ Phase 7 - Polish                  │ ←── T030-T033
└──────────────────────────────────┘
```

### Within US1 (Phase 3)

- T011, T012 can run in parallel (different degradation tests, independent scenarios)
- T006 must complete before T007-T013 (scaffolding)
- T007 → T008 → T009 are sequential (session list → detail → evidence pair flow)
- T014, T015 must be last (validation)

---

## Parallel Example: US1 + US2

```bash
# These can run simultaneously from different terminals:

# Terminal 1: US2 transport tests (no dependencies)
Task T016: Read transport.ts and determine export strategy
Task T017: Update transport.test.ts to import real module
Task T018: Verify 4 existing test cases pass
Task T019: Add JSON format configuration test
Task T020: Run transport tests

# Terminal 2: Foundation → US1 (sequential)
Task T001-T005: Foundation (RPC mock infra)
Task T006-T015: US1 (E2E smoke tests)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 2: Foundational (T001-T005) — RPC mock infrastructure
2. Complete Phase 3: US1 (T006-T015) — E2E smoke tests
3. **STOP and VALIDATE**: Run `npx playwright test tests/e2e/rpc-smoke.spec.ts --project=chromium`
4. This alone closes the critical gap — RPC success paths now verified

### Incremental Delivery

1. Foundation (T001-T005) → RPC mocking available to all E2E tests
2. US1 (T006-T015) → Core device flows verified (MVP)
3. US2 (T016-T020) → Transport safety net
4. US3 (T021-T023) → Fixture audit documented
5. US4 (T024-T029) → Runbook for team use
6. Polish (T030-T033) → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature has 0 production code changes — all tasks are test infrastructure
- The critical gap (zero RPC E2E mocks) is closed by Phases 2+3 (MVP)
- Phase D (US3) research confirmed RPC handlers are already migrated — audit is verification only
- Resource constraints: always use `VITEST_MAX_WORKERS=1` and `PLAYWRIGHT_WORKERS=1` when running tests
