# Tasks: MSW Hook Test Stabilization

**Input**: Design documents from `/specs/039-msw-hook-tests/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Tests are the primary deliverable of this feature — all tasks involve fixing or creating test infrastructure.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Fix broken imports and restore the ability for all test files to load

- [X] T001 Update the broken `session-recovery` import in `src/application/hooks/useRecoverableSessions.ts` — change `import { sessionRecoveryApi } from '@/infrastructure/api/session-recovery'` to import from the consolidated `src/infrastructure/api/sessions.ts`. Verify the `sessionsApi` exports in `sessions.ts` cover the methods used by the hook (list recoverable sessions, resume session, discard session). Adjust method names or add missing methods to `sessions.ts` if needed
- [X] T002 Verify `src/App.tsx` has no direct import of `session-recovery` (confirmed: it does not — cascade is transitive via `useRecoverableSessions`). No code changes needed in App.tsx
- [X] T003 Run `npm test -- --run` to confirm the 13 previously-broken test files now load successfully (no `Failed to resolve import` errors)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create missing fixture files and fix shared mock infrastructure that blocks multiple test suites

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `tests/mocks/diagnostics/session-fixtures.ts` with all required exports conforming to Zod schemas in `src/infrastructure/api/diagnostics-schemas.ts`. Required exports: `activeSessionRecent` (Session with recent `last_capture_at`), `activeSessionStale` (Session with `last_capture_at` > 5 min ago), `completedSession`, `cancelledSession` individual fixtures; `sessionListApiResponse` (SessionListResponseSchema — 3 sessions), `sessionListEmptyApiResponse` (empty variant), `sessionDetailApiResponse` (SessionDetailResponseSchema — active session), `evidenceListApiResponse` (EvidenceListResponseSchema — 2 captures with camera IDs matching `/^espcam-[0-9a-f]{6}$/i`), `evidenceListEmptyApiResponse` (empty variant), `presignApiResponse` (PresignResponseSchema — valid URL with `expires_at`). See `data-model.md` for entity shapes
- [X] T005 Fix V1 cameras MSW handler envelope format in `tests/mocks/v1-cameras-handlers.ts` line 142-148 — wrap the `HttpResponse.json()` response in a V1 envelope: `{ success: true, data: { cameras: state.cameras, count: state.cameras.length } }` to match what `v1CamerasApi.list()` expects in `src/infrastructure/api/v1-cameras.ts:159-166`
- [X] T006 Run `npm test -- --run tests/unit/api/v1-cameras.test.ts` to confirm the 3 V1 cameras tests now pass

**Checkpoint**: All shared mock infrastructure is correct — fixture files exist, handler formats match API clients

---

## Phase 3: User Story 1 — Developer Runs Hook Integration Tests (Priority: P1) MVP

**Goal**: All hook integration tests pass reliably — 100% pass rate across 5 consecutive `npm test` runs

**Independent Test**: Run `npm test -- --run` and verify 0 failures, then run it 4 more times to confirm no flakiness

### Implementation for User Story 1

- [X] T007 [US1] Fix door contract test mock data in `tests/integration/contracts/door.contract.test.ts` — update `validDoorStatus` to match `DoorStatusSchema` in `src/infrastructure/api/schemas.ts:255-261` (camelCase fields: `id`, `state`, `lockState`, `relayPin`, `lastCommand`). Update all door status variants (`closedLocked`, `openUnlocked`, error states, minimal status) to include required fields `id` (string) and `relayPin` (number), and use `lockState` instead of `lock_state`. Note: DoorStatusSchema validates post-transform data — see plan.md Complexity Tracking CT-001 for constitution II.A exception justification
- [X] T008 [US1] Run `npm test -- --run tests/integration/contracts/door.contract.test.ts` to confirm all 4 door contract tests pass
- [X] T009 [US1] Verify diagnostics handler imports resolve correctly — run `npm test -- --run tests/integration/hooks/useDiagnostics.test.tsx tests/integration/hooks/useSessions.test.tsx tests/integration/hooks/useEvidence.test.tsx` to confirm all diagnostics hook tests pass with the new session fixtures from T004
- [X] T010 [US1] Verify diagnostics unit API tests pass — run `npm test -- --run tests/unit/api/diagnostics.test.ts tests/unit/api/sessions.test.ts tests/unit/api/evidence.test.ts` to confirm all unit tests using session fixtures load and pass
- [X] T011 [US1] Verify diagnostics contract tests pass — run `npm test -- --run tests/integration/contracts/diagnostics.contract.test.ts` to confirm schema validation against session fixture data passes
- [X] T012 [US1] Run full test suite: `npm test -- --run` — verify 0 failures across all 81+ test files, 1482+ tests. This implicitly validates FR-001 (MSW server start), FR-002 (handler reset), FR-003 (fresh QueryClient), FR-004 (server close), and FR-005 (handler route coverage)
- [X] T013 [US1] Run test suite 4 additional times (`for i in {1..4}; do npm test -- --run; done`) to validate no flakiness — all 5 runs must show 0 failures (SC-001)

**Checkpoint**: All tests pass reliably. US1 is the MVP — this alone unblocks CI/CD.

---

## Phase 4: User Story 2 — Developer Adds New Hook Tests (Priority: P2)

**Goal**: Documented patterns and reusable test utilities enable new developers to write hook tests confidently

**Independent Test**: Follow the documented patterns in `quickstart.md` to understand MSW handler creation, test wrapper setup, async assertions, and error state testing

### Implementation for User Story 2

- [X] T014 [US2] Review and validate `specs/039-msw-hook-tests/quickstart.md` against the actual test infrastructure — verify all code examples use correct import paths (`tests/setup/test-utils.tsx`, `tests/integration/mocks/server.ts`), correct function signatures (`createTestQueryClient()`, `createWrapper()`), and correct MSW v2 API (`http.get`, `HttpResponse.json`, `delay`)
- [X] T015 [US2] Verify the error handler preset pattern is available for all major features — confirm that `tests/integration/mocks/handlers.ts` exports `errorHandlers` (legacy), `v1ErrorHandlers` (V1 API), and `diagnosticsErrorHandlers` (diagnostics) objects, and that they cover the common error scenarios (404, 500, network failure) documented in quickstart.md (FR-008)
- [X] T016 [US2] Verify the test utilities in `tests/setup/test-utils.tsx` export all documented functions: `createTestQueryClient()`, `createWrapper()`, `AllProviders`, `renderWithProviders()`, and re-exports from `@testing-library/react` (FR-007)

**Checkpoint**: Test patterns are documented and validated — new developers can follow quickstart.md to write hook tests

---

## Phase 5: User Story 3 — Developer Reviews Lint-Clean Code (Priority: P3)

**Goal**: Zero lint errors in all test files touched by this feature

**Independent Test**: Run `npm run lint` and verify zero errors in diagnostics test files

### Implementation for User Story 3

- [X] T017 [P] [US3] Fix unused import `within` in `tests/component/diagnostics/ServiceHealthCard.test.tsx`
- [X] T018 [P] [US3] Fix unused imports (`waitFor`, `allServicesUnhealthy`) in `tests/component/diagnostics/DiagnosticsSection.test.tsx` and replace all `as any` type casts (11 instances) with properly typed mock return values using `ReturnType<typeof hookFn>` or partial mock objects matching the hook's return type
- [X] T019 [P] [US3] Fix unused import (`waitFor`) in `tests/component/diagnostics/EvidencePanel.test.tsx` and replace all `as any` type casts (8 instances) with properly typed mock return values
- [X] T020 [P] [US3] Fix unused import (`waitFor`) in `tests/component/diagnostics/SessionsPanel.test.tsx` and replace all `as any` type casts (14 instances) with properly typed mock return values
- [X] T021 [P] [US3] Fix unused import (`diagnosticsErrorHandlers`) in `tests/integration/hooks/useDiagnostics.test.tsx`
- [X] T022 [P] [US3] Fix unused type import (`ContractValidationResult`) in `tests/integration/contracts/diagnostics.contract.test.ts`
- [X] T023 [P] [US3] Fix unused variable (`initialTime`) in `tests/e2e/diagnostics.spec.ts`
- [X] T024 [US3] Run `npm run lint` and verify zero errors in all files modified by T017-T023 (SC-002)

**Checkpoint**: All in-scope test files are lint-clean

---

## Phase 6: User Story 4 — CI Pipeline Validates Observability Panels (Priority: P3)

**Goal**: E2E tests validate that observability panels (Feature 038) render and display data correctly

**Independent Test**: Run `npx playwright test tests/e2e/diagnostics.spec.ts --project=chromium` and verify passes

### Implementation for User Story 4

- [X] T025 [US4] Verify E2E diagnostics test in `tests/e2e/diagnostics.spec.ts` runs successfully with Playwright — run `npx playwright test tests/e2e/diagnostics.spec.ts --project=chromium` and confirm panels render without errors (FR-014)
- [X] T026 [US4] If E2E tests fail, investigate and fix mock route setup in `tests/e2e/fixtures/` to ensure diagnostics API endpoints return valid responses matching the session fixtures created in T004

**Checkpoint**: E2E tests for observability panels pass in CI pipeline (SC-006)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [X] T027 Run `npm run build` to verify TypeScript compilation succeeds with all changes
- [X] T028 Run `npm run lint` to verify zero errors across all modified files (not just diagnostics)
- [X] T029 Run full test suite one final time: `npm test -- --run` and confirm total test count is ≥1482 with 0 failures
- [X] T030 Verify test suite execution time has not increased by more than 10% from baseline (SC-004) — compare `npm test -- --run` timing before and after changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. FIXES: broken import cascade (13 test files)
- **Foundational (Phase 2)**: Depends on Phase 1. FIXES: missing fixtures + handler envelope format
- **US1 (Phase 3)**: Depends on Phase 2. FIXES: door contract tests + validates all tests pass
- **US2 (Phase 4)**: Depends on Phase 2. Can run in parallel with US1
- **US3 (Phase 5)**: Depends on Phase 2. Can run in parallel with US1/US2 (different files)
- **US4 (Phase 6)**: Depends on Phase 2 (session fixtures). Can run in parallel with US1/US2/US3
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 — fixes test failures directly
- **US2 (P2)**: Depends on Phase 2 — validates documentation against real infrastructure
- **US3 (P3)**: Depends on Phase 2 — lint fixes are independent per-file
- **US4 (P3)**: Depends on Phase 2 — E2E tests need session fixtures

### Within Each Phase

- T001 → T002 → T003 (sequential: fix import → verify → validate)
- T004 and T005 can run in parallel (different files)
- T007, T009, T010, T011 can run in parallel after Phase 2 (different test files)
- T017-T023 can ALL run in parallel (different files, all marked [P])

### Parallel Opportunities

```
Phase 2:    T004 ─┬─ T006
            T005 ─┘

Phase 3:    T007 ─┬─ T008
            T009  │
            T010  ├─ T012 ─── T013
            T011 ─┘

Phase 5:    T017 ┬
            T018 │
            T019 ├── T024
            T020 │
            T021 │
            T022 │
            T023 ┘
```

---

## Parallel Example: User Story 3 (Lint Cleanup)

```bash
# All lint fixes can run in parallel (different files):
Task: "Fix unused import in tests/component/diagnostics/ServiceHealthCard.test.tsx"
Task: "Fix unused imports + replace as any in tests/component/diagnostics/DiagnosticsSection.test.tsx"
Task: "Fix unused import + replace as any in tests/component/diagnostics/EvidencePanel.test.tsx"
Task: "Fix unused import + replace as any in tests/component/diagnostics/SessionsPanel.test.tsx"
Task: "Fix unused import in tests/integration/hooks/useDiagnostics.test.tsx"
Task: "Fix unused type import in tests/integration/contracts/diagnostics.contract.test.ts"
Task: "Fix unused variable in tests/e2e/diagnostics.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (fix broken import) → 13 test files unblocked
2. Complete Phase 2: Foundational (session fixtures + handler envelope) → all mocks correct
3. Complete Phase 3: User Story 1 (door contract + validation runs) → 0 test failures
4. **STOP and VALIDATE**: `npm test -- --run` shows 0 failures
5. This alone unblocks CI/CD and restores developer confidence

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (broken imports fixed, fixtures created)
2. + US1 → All tests pass (MVP!)
3. + US2 → Documentation validated
4. + US3 → Lint-clean test files
5. + US4 → E2E validation for observability panels
6. + Polish → Final validation, timing check

### Parallel Team Strategy

With multiple developers after Phase 2 completion:
- Developer A: US1 (test validation — sequential by nature)
- Developer B: US3 (lint fixes — highly parallel, 7 independent files)
- Developer C: US4 (E2E validation)
- Developer D: US2 (documentation review)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature is primarily a **fix** feature — most tasks are corrections, not new code
- The only new file created is `tests/mocks/diagnostics/session-fixtures.ts` (T004)
- Total: 30 tasks (3 setup, 3 foundational, 7 US1, 3 US2, 8 US3, 2 US4, 4 polish)
- Parallel opportunities: T004+T005, T007+T009+T010+T011, T017-T023 (7 concurrent)
- MVP scope: Phases 1-3 (T001-T013) — fixes all test failures
