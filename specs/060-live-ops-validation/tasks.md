# Tasks: Live Ops Validation

**Input**: Design documents from `/specs/060-live-ops-validation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Predecessor**: Feature 059 (Real Ops Drilldown) — all 31 tasks complete. This feature fixes wiring issues and validates against live infrastructure.

**Tests**: Included — existing tests must continue passing after fixes. No new test files created; existing test data is corrected.

**Organization**: Tasks grouped into foundational fixes (blocking), per-user-story validation probes, and polish. Code changes are concentrated in Phase 1 (test fixture and schema fixes). Phases 2-5 are validation tasks that probe live endpoints and verify rendering paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational — Fix Status Enum Mismatches

**Purpose**: Correct all references to invalid V1 session status values (`'completed'` → `'complete'`, `'cancelled'` → `'failed'`) across E2E tests, mock fixtures, legacy schemas, and domain types. ALL user story validation depends on these fixes passing.

**CRITICAL**: No validation work can begin until this phase is complete and all tests pass.

- [x] T001 [P] Fix invalid session status values in `tests/e2e/operations.spec.ts`: change line 37 `status: 'completed'` → `status: 'complete'`, change line 50 `status: 'cancelled'` → `status: 'failed'`, update any test assertions that reference the old status text (e.g., tab labels, badge text matching `'Completed'` or `'Cancelled'`)
- [x] T002 [P] Fix legacy session mock variants in `tests/mocks/diagnostics/fixtures.ts`: update `mockSessionDetailVariants.completed` (line 178-184) to use `status: 'complete' as const` and rename the key from `completed` to `complete`, update `mockSessionDetailVariants.cancelled` (line 185-190) to use `status: 'failed' as const` and rename the key from `cancelled` to `failed`, verify `mockSessionDetail` base object field names match current usage (note: this file uses legacy `SessionDetail` type with `id`/`delivery_id`/`capture_count` — these are consumed by the legacy MSW handler)
- [x] T003 [P] Update legacy `SessionStatusSchema` in `src/infrastructure/api/camera-diagnostics-schemas.ts`: change line 45-49 from `z.enum(['active', 'completed', 'cancelled'])` to `z.enum(['active', 'complete', 'partial', 'failed'])` to match V1 schema in `diagnostics-schemas.ts` line 108
- [x] T004 [P] Update legacy `SessionStatus` type in `src/domain/types/camera-diagnostics.ts`: change line 33 from `'active' | 'completed' | 'cancelled'` to `'active' | 'complete' | 'partial' | 'failed'` to match V1 enum values
- [x] T005 Update legacy MSW handler and contract tests for new status values: in `tests/mocks/handlers/camera-diagnostics.ts` verify `getSessionDetailHandler` (line 132-155) still works with updated `mockSessionDetailVariants` keys; in `tests/integration/contracts/camera-diagnostics.contract.test.ts` update any assertions that reference `'completed'` or `'cancelled'` status values to use `'complete'`/`'failed'`
- [x] T006 Run unit, component, integration, and contract tests: execute `VITEST_MAX_WORKERS=1 npm test` — all tests must pass with zero failures after status enum fixes, verify no TypeScript compilation errors from changed enum values

**Checkpoint**: All test fixtures use valid V1 status values. Legacy and V1 schemas are aligned. Full test suite passes.

---

## Phase 2: User Story 1 — Live Session List Validation (Priority: P1)

**Goal**: Verify that the session list renders real sessions from live PiOrchestrator. Probe the endpoint and confirm the dashboard's API client can parse the response.

**Independent Test**: Open Operations tab against live PiOrchestrator → sessions appear with correct metadata.

### Implementation for User Story 1

- [x] T007 [US1] Probe PiOrchestrator session endpoint availability: run `ssh pi "curl -s -o /dev/null -w '%{http_code}' http://localhost:8082/api/v1/diagnostics/sessions"` — if 404, the endpoint is not on port 8082 (expected per research.md; proceed to T013 handoff); if 200, run `ssh pi "curl -s http://localhost:8082/api/v1/diagnostics/sessions | python3 -m json.tool | head -50"` and verify the response contains `data.sessions[]` array with `session_id`, `container_id`, `status` fields matching V1 schema
- [x] T008 [US1] Validate session list rendering with live data: start dev server (`npm run dev`) with SSH tunnel (`ssh -L 8082:localhost:8082 pi`), open `http://localhost:5173` in browser, navigate to Operations tab, verify sessions load — document result in `specs/060-live-ops-validation/artifacts/validation-log.md` noting: number of sessions returned, status values observed, whether stale indicator appears for active sessions, whether status filter tabs work; if endpoint returns 404, document graceful degradation behavior (FR-008)

**Checkpoint**: Session list endpoint probed. Rendering behavior documented. If 404, handoff is the blocker (T013).

---

## Phase 3: User Story 2 — Evidence Image Validation (Priority: P1)

**Goal**: Verify evidence images render from base64 inline data without MinIO LAN requests. Confirm the evidence API path works end-to-end.

**Independent Test**: Drill into a session with captures → images render visually → browser Network tab shows no MinIO addresses.

### Implementation for User Story 2

- [x] T009 [US2] Probe PiOrchestrator evidence endpoint: if T007 found sessions, pick a `session_id` with captures and run `ssh pi "curl -s http://localhost:8082/api/v1/sessions/{session_id}/evidence | python3 -m json.tool | head -80"` — verify response contains `data.captures[]` with `evidence_id`, `capture_tag`, `status`, and check if `image_data` field is present (base64 string) for at least one capture; also probe pair endpoint: `ssh pi "curl -s http://localhost:8082/api/v1/sessions/{session_id}/evidence/pair | python3 -m json.tool"`
- [x] T010 [US2] Validate evidence image rendering: with dev server running, click a session that has captures, verify thumbnails render (base64 images show as `<img src="data:image/jpeg;base64,...">`), check browser Network tab for zero requests to `192.168.10.x` or `192.168.1.x:9000`, verify clicking a thumbnail opens the preview modal with Download button — document result in `specs/060-live-ops-validation/artifacts/validation-log.md`; if evidence endpoint returns 404, document graceful degradation

**Checkpoint**: Evidence images validated or gap documented. No MinIO LAN requests confirmed.

---

## Phase 4: User Story 3 — Camera Health Validation (Priority: P2)

**Goal**: Verify camera health renders from live PiOrchestrator camera diagnostics endpoint (already on port 8082).

**Independent Test**: Operations tab shows camera health cards with device IDs, status, and health metrics.

### Implementation for User Story 3

- [x] T011 [US3] Probe camera diagnostics endpoint: run `ssh pi "curl -s http://localhost:8082/api/dashboard/diagnostics/cameras | python3 -m json.tool"` — this endpoint IS on port 8082 per research, verify response contains camera objects with `camera_id` (or `device_id`), `status`, `last_seen`, health metrics; document in validation-log.md
- [x] T012 [US3] Validate camera health rendering: with dev server running, verify camera health section on Operations tab shows camera cards with online/offline status, signal strength, capture count, last seen time — document result in `specs/060-live-ops-validation/artifacts/validation-log.md`

**Checkpoint**: Camera health validated against live data. Endpoint confirmed working on port 8082.

---

## Phase 5: User Story 4 — Failure Diagnostics Validation (Priority: P2)

**Goal**: Verify failed session detail shows actionable error information with copy-to-clipboard IDs.

**Independent Test**: Open a failed session → failure reason, phase, correlation ID visible → copy button works.

### Implementation for User Story 4

- [x] T013 [US4] Locate or create a failed session: check session list response from T007 for any session with `status: 'failed'` and `last_error` object; if none exists, document that failure diagnostics cannot be validated until a failed session occurs naturally or is triggered via PiOrchestrator; if found, verify `last_error` contains `failure_reason`, `phase`, `device_id`, and optionally `correlation_id`
- [x] T014 [US4] Validate failure diagnostics rendering: if a failed session exists, open its detail view, verify the error block displays prominently with failure reason and phase, verify copy-to-clipboard works for session_id, container_id, and correlation_id (toast confirmation appears), verify failed captures are listed separately from successful ones — document in `specs/060-live-ops-validation/artifacts/validation-log.md`

**Checkpoint**: Failure diagnostics validated or documented as pending failed session data.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Generate PiOrchestrator handoff (critical for V1 endpoints on port 8082), run full test/lint/build verification, and capture final validation artifacts.

- [x] T015 Generate PiOrchestrator handoff document via `/handoff-generate`: request (1) V1 session/evidence endpoints added to port 8082 config UI server without API key authentication — specifically `GET /api/v1/diagnostics/sessions`, `GET /api/v1/sessions/:sessionId`, `GET /api/v1/sessions/:sessionId/evidence`, `GET /api/v1/sessions/:sessionId/evidence/pair`; (2) note that image proxy/presign endpoints already exist on 8082; (3) reference the route registration location `PiOrchestrator/cmd/server/main.go:setupConfigWebRoutes` around line 750
- [x] T016 [P] Run lint and build verification: execute `npm run lint` — fix any ESLint errors; execute `npm run build` — verify TypeScript compilation with zero errors; verify no unused imports from enum value changes
- [x] T017 [P] Run E2E tests: execute `PLAYWRIGHT_WORKERS=1 npm run test:e2e` — all E2E tests must pass with updated mock data status values; if any tests fail due to status text assertions (e.g., matching "Completed" tab label vs "Complete"), update the assertions
- [x] T018 Create validation artifacts directory and summary: create `specs/060-live-ops-validation/artifacts/` directory, write `validation-log.md` consolidating all probe and rendering results from T007-T014, note which user stories are fully validated vs blocked by PiOrchestrator handoff

**Checkpoint**: All tests pass. Lint clean. Build succeeds. Handoff generated. Validation artifacts captured. Ready for PiOrchestrator endpoint addition.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational Fixes)**: No dependencies — start immediately. **BLOCKS ALL validation phases.**
- **Phase 2 (US1 - Sessions)**: Depends on Phase 1 completion.
- **Phase 3 (US2 - Evidence)**: Depends on Phase 2 (needs session_id from list to probe evidence).
- **Phase 4 (US3 - Camera Health)**: Depends on Phase 1 completion. Can run in parallel with Phase 2.
- **Phase 5 (US4 - Failure Diagnostics)**: Depends on Phase 2 (needs session data to find failed sessions).
- **Phase 6 (Polish)**: Can start T015 (handoff) after Phase 1. T016-T017 depend on Phase 1. T018 depends on Phases 2-5.

### User Story Dependencies

- **US1 (Session List)**: Independent after Phase 1 fixes.
- **US2 (Evidence Images)**: Depends on US1 (needs a session_id to probe).
- **US3 (Camera Health)**: Independent after Phase 1 fixes. Can run parallel with US1.
- **US4 (Failure Diagnostics)**: Depends on US1 (needs to find a failed session in the list).

### Within Each User Story

- Probe task runs first (endpoint availability check)
- Rendering validation runs second (requires dev server + browser)
- Results documented in validation-log.md

### Parallel Opportunities

**Phase 1 parallelism**:
```
T001 (E2E test fix) ‖ T002 (mock fixture fix) ‖ T003 (schema fix) ‖ T004 (type fix) [all parallel — different files]
T005 (handler + contract test fix) [after T002-T004 — reads updated files]
T006 (run tests) [after T001-T005 — validates all fixes]
```

**Phase 2 + Phase 4 parallelism** (after Phase 1):
```
US1 (T007-T008) ‖ US3 (T011-T012) [parallel — independent endpoints]
```

**Phase 6 parallelism**:
```
T015 (handoff) ‖ T016 (lint/build) ‖ T017 (E2E tests) [parallel — independent tasks]
```

---

## Implementation Strategy

### MVP First (Phase 1 + US1)

1. Complete Phase 1: Fix all status enum mismatches (T001-T006)
2. Complete Phase 2: Probe and validate live session list (T007-T008)
3. **STOP and VALIDATE**: Sessions render with live data OR 404 documented
4. Generate handoff if 404 (T015)

### Incremental Delivery

1. Phase 1 → All test fixtures and schemas aligned to V1
2. + US1 → Session list validated against live PiOrchestrator
3. + US2 → Evidence images validated (base64 inline, no MinIO LAN requests)
4. + US3 → Camera health validated (already working on 8082)
5. + US4 → Failure diagnostics validated (if failed session exists)
6. + Polish → Handoff generated, tests green, artifacts captured

### Expected Outcome

If V1 endpoints are NOT on port 8082 (per research.md):
- Phase 1 fixes all test data → tests pass
- US1-US2-US4 probes return 404 → graceful degradation confirmed (FR-008)
- US3 (camera health) validates successfully (endpoint IS on 8082)
- Handoff generated requesting PiOrchestrator changes
- Feature is "validated as far as PiDashboard wiring allows"

If V1 endpoints ARE on port 8082 (if PiOrchestrator updated):
- All user stories validate fully with live data
- Screenshots captured showing real sessions and evidence images
- Zero console errors, zero MinIO LAN requests confirmed

---

## Notes

- All 4 parallel tasks in Phase 1 (T001-T004) touch different files — true parallelism
- T007-T014 validation tasks use SSH to probe live Pi endpoints — requires Pi network access
- If PiOrchestrator doesn't have V1 endpoints on 8082, the handoff (T015) becomes the critical deliverable
- Camera health (US3) is the only user story that can be fully validated without PiOrchestrator changes
- Legacy `SessionDetail` type in `camera-diagnostics.ts` uses old field names (`id`, `delivery_id`, `capture_count`) — this is consumed only by the legacy MSW handler, not by current V1 code paths
- Total: 18 tasks across 6 phases
