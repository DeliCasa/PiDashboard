# Tasks: Wire vNEXT Integration & Test Hardening

**Input**: Design documents from `/specs/063-wire-vnext-integration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — FR-005 explicitly requires a transport unit test (US3).

**Organization**: Tasks grouped by user story. US2 and US3 can run in parallel (different files).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify baseline and confirm prerequisites

- [x] T001 Run full test suite to establish regression baseline (`VITEST_MAX_WORKERS=1 npm test`). Expected: 128 files, 2692 passed, 2 skipped
- [x] T002 Verify `@delicasa/wire@0.4.0` is installed and `@delicasa/wire/testing` exports resolve: run `node -e "require('@delicasa/wire/testing')"` from project root
- [x] T003 Verify `npx tsc --noEmit` passes with zero errors for wire package imports

**Checkpoint**: Baseline established — all prerequisites confirmed

---

## Phase 2: US1 — RPC Client Uses Canonical Wire Package Descriptors (Priority: P1)

**Goal**: Confirm all wire package imports resolve correctly and the transport AbortSignal fix is documented as the canonical approach.

**Independent Test**: `npx tsc --noEmit` passes; `npm run build` succeeds.

### Implementation for US1

- [x] T004 [US1] Improve the AbortSignal fix comment in `src/infrastructure/rpc/transport.ts` (lines 42-51): document that this is the CANONICAL approach for jsdom/MSW compatibility, reference this feature (063), and note that no global test-setup patches should be added
- [x] T005 [US1] Verify the four service client imports in `src/infrastructure/rpc/clients.ts` resolve correctly against `@delicasa/wire/gen/delicasa/device/v1/*_service_pb` — no code changes expected, just confirm via `npx tsc --noEmit`
- [x] T006 [US1] Verify the adapter imports in `src/infrastructure/rpc/adapters/camera-adapter.ts`, `session-adapter.ts`, and `evidence-adapter.ts` resolve correctly against `@delicasa/wire/gen/delicasa/device/v1/*_pb` — no code changes expected

**Checkpoint**: Wire imports verified, transport fix documented

---

## Phase 3: US2 — Centralized Protobuf-Safe Test Fixtures (Priority: P2)

**Goal**: Replace all hand-crafted proto-JSON converter functions in `tests/mocks/handlers/rpc.ts` with `@delicasa/wire/testing` factory functions. Preserve external handler factory API signatures.

**Independent Test**: Run `VITEST_MAX_WORKERS=1 npx vitest run tests/integration/hooks/useSessions.test.tsx tests/integration/hooks/useEvidence.test.tsx tests/integration/hooks/useCameras.test.ts` — all pass.

### Implementation for US2

- [x] T007 [US2] Remove the `sessionToProto()` converter function from `tests/mocks/handlers/rpc.ts` and replace its usage in `createRpcSessionHandlers()` with `makeOperationSession()` and `makeListSessionsResponse()` from `@delicasa/wire/testing`. The `ListSessions` handler should use `makeListSessionsResponse({ sessions: sessions.map(s => makeOperationSession({ sessionId: s.id, containerId: s.container_id, status: SESSION_STATUS_MAP[s.status], startedAt: s.started_at, elapsedSeconds: s.elapsed_seconds, totalCaptures: s.total_captures, successfulCaptures: s.successful_captures, failedCaptures: s.failed_captures, hasBeforeOpen: s.has_before_open, hasAfterClose: s.has_after_close, pairComplete: s.pair_complete })) })`. The `GetSession` handler should use `makeGetSessionResponse({ session: makeOperationSession({...}) })`
- [x] T008 [US2] Remove the `captureToProto()` converter function from `tests/mocks/handlers/rpc.ts` and replace its usage in `createRpcEvidenceHandlers()` with `makeEvidenceCapture()`, `makeEvidencePair()`, `makeGetSessionEvidenceResponse()`, and `makeGetEvidencePairResponse()` from `@delicasa/wire/testing`. Map domain capture fields to factory overrides (e.g., `evidenceId` from `capture.evidence_id`, `captureTag` from `CAPTURE_TAG_MAP`, `capturedAt` from `capture.created_at`)
- [x] T009 [US2] Remove the `cameraToProto()` converter function from `tests/mocks/handlers/rpc.ts` and replace its usage in `createRpcCameraHandlers()` with `makeCamera()`, `makeListCamerasResponse()`, and `makeGetCameraResponse()` from `@delicasa/wire/testing`. Map domain camera fields to factory overrides (e.g., `deviceId` from `camera.id`, `status` from `CAMERA_STATUS_MAP`, health sub-object via `makeCameraHealth()`)
- [x] T010 [US2] Remove the enum mapping constants (`SESSION_STATUS_TO_PROTO`, `CAPTURE_TAG_MAP`, `CAPTURE_STATUS_MAP`, `CAMERA_STATUS_MAP`) if they are no longer needed after T007-T009 — or simplify them to only the values the handler factories reference. Clean up any unused imports (REST-era type imports from `@/infrastructure/api/diagnostics-schemas` and `@/infrastructure/api/v1-cameras-schemas` that are no longer referenced)
- [x] T011 [US2] Update the `rpcErrorHandlers` presets in `tests/mocks/handlers/rpc.ts` to use `makeListSessionsResponse({ sessions: [], totalCount: 0 })` for `sessionsEmpty` and `makeGetSessionEvidenceResponse({ captures: [], totalCaptures: 0, successfulCaptures: 0, failedCaptures: 0 })` for `evidenceEmpty` — verify Connect error responses (codes 5, 14) remain unchanged
- [x] T012 [US2] Run session integration tests: `VITEST_MAX_WORKERS=1 npx vitest run tests/integration/hooks/useSessions.test.tsx` — all must pass
- [x] T013 [US2] Run evidence integration tests: `VITEST_MAX_WORKERS=1 npx vitest run tests/integration/hooks/useEvidence.test.tsx` — all must pass
- [x] T014 [US2] Run camera integration tests: `VITEST_MAX_WORKERS=1 npx vitest run tests/integration/hooks/useCameras.test.ts` — all must pass

**Checkpoint**: All RPC mock handlers use wire factories, integration tests pass

---

## Phase 4: US3 — Transport Wrapper Unit Test (Priority: P2)

**Goal**: Create a dedicated unit test for the transport module's custom fetch wrapper, covering AbortSignal stripping, passthrough when no signal, and late-bound `globalThis.fetch`.

**Independent Test**: `VITEST_MAX_WORKERS=1 npx vitest run tests/unit/rpc/transport.test.ts` — all pass.

### Implementation for US3

- [x] T015 [P] [US3] Create `tests/unit/rpc/transport.test.ts` with 3 test cases: (1) "strips AbortSignal from fetch init when present" — mock `globalThis.fetch`, call transport's fetch wrapper with `{ signal: new AbortController().signal, headers: {...} }`, verify the mock was called WITHOUT `signal` in init but WITH `headers` preserved; (2) "passes init through unmodified when no signal" — call fetch wrapper with `{ headers: {...} }` (no signal), verify mock was called with identical init; (3) "late-binds to globalThis.fetch for MSW interception" — replace `globalThis.fetch` AFTER transport module loads, make a request, verify the NEW fetch was called (not the original). Import the transport's `fetch` wrapper; if it's not exported separately, test via the `createConnectTransport` config by extracting the fetch option or testing indirectly through an MSW handler

**Checkpoint**: Transport unit test exists and passes

---

## Phase 5: US5 — Cleanup of Experimental Patches (Priority: P3)

**Goal**: Audit test setup files and confirm no global fetch/AbortSignal patches exist. Document the canonical approach.

**Independent Test**: Grep test setup files for `AbortSignal`, `fetch`, and `signal` patches — none found.

### Implementation for US5

- [x] T016 [P] [US5] Audit `tests/setup/vitest.setup.ts` for any `fetch`, `AbortSignal`, or `signal` patches or polyfills — confirm none exist. If any are found, remove them (the transport-level fix in `transport.ts` is the sole mechanism)
- [x] T017 [P] [US5] Audit `tests/setup/test-utils.tsx` and `vitest.config.ts` for any global fetch or signal patches — confirm none exist
- [x] T018 [US5] Verify the comment added in T004 clearly states the transport-level fix is canonical and no global patches should be added

**Checkpoint**: Audit complete, no patches found, approach documented

---

## Phase 6: US4 + Polish — Full Regression & Deliverables (Priority: P1)

**Goal**: Verify zero test regressions across the full suite. Produce handoff document. Pass lint and build.

**Independent Test**: `VITEST_MAX_WORKERS=1 npm test` — 128+ files pass, 2692+ tests pass, 0 new failures.

### Regression Validation (US4)

- [x] T019 [US4] Run full test suite: `VITEST_MAX_WORKERS=1 npm test` — verify 128+ files pass, 2692+ tests pass (including the new transport test), 2 skipped (pre-existing), zero new failures
- [x] T020 [US4] Run ESLint: `npm run lint` — zero errors
- [x] T021 [US4] Run type check: `npx tsc --noEmit` — zero errors
- [x] T022 [US4] Run production build: `npm run build` — succeeds

### Deliverables

- [x] T023 Create handoff document at `specs/063-wire-vnext-integration/handoff.md` summarizing: (1) wire package v0.4.0 integration approach; (2) AbortSignal transport fix is canonical; (3) wire factory functions replace hand-crafted proto-JSON; (4) no tsconfig changes needed; (5) test baseline maintained; (6) handler factory API signatures preserved for diagnostics/cameras handler composition

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 — verify/document
- **US2 (Phase 3)**: Depends on Phase 2 — main implementation
- **US3 (Phase 4)**: Depends on Phase 2 — can run IN PARALLEL with US2 (different files)
- **US5 (Phase 5)**: Depends on Phase 2 — can run IN PARALLEL with US2 and US3
- **US4 + Polish (Phase 6)**: Depends on Phases 3, 4, 5 complete — final validation gate

### User Story Dependencies

- **US1 (P1)**: No implementation dependencies — verification only
- **US2 (P2)**: Depends on US1 (confirms imports work before modifying handlers)
- **US3 (P2)**: Independent of US2 — creates new file `tests/unit/rpc/transport.test.ts`
- **US4 (P1)**: Depends on US2 and US3 — validates full regression after all changes
- **US5 (P3)**: Independent — audit task, can run anytime after US1

### Parallel Opportunities

- **T015** (US3) can run in parallel with **T007-T014** (US2) — different files
- **T016-T017** (US5) can run in parallel with **T007-T014** (US2) — read-only audit
- **T019-T022** (US4) must wait for all implementation tasks (T004-T018)

---

## Parallel Example: US2 + US3 + US5

```bash
# These three user stories can execute in parallel after Phase 2:

# Agent A: US2 — Migrate RPC handlers
Task T007: Replace sessionToProto with wire factories in tests/mocks/handlers/rpc.ts
Task T008: Replace captureToProto with wire factories in tests/mocks/handlers/rpc.ts
Task T009: Replace cameraToProto with wire factories in tests/mocks/handlers/rpc.ts
Task T010: Clean up unused imports/constants in tests/mocks/handlers/rpc.ts
Task T011: Update error handler presets in tests/mocks/handlers/rpc.ts
Task T012-T014: Run integration tests

# Agent B: US3 — Transport unit test (different file)
Task T015: Create tests/unit/rpc/transport.test.ts

# Agent C: US5 — Audit (read-only)
Task T016: Audit tests/setup/vitest.setup.ts
Task T017: Audit tests/setup/test-utils.tsx and vitest.config.ts
Task T018: Verify transport comment
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (verify baseline)
2. Complete Phase 2: US1 (verify imports, document transport fix)
3. Complete Phase 3: US2 (migrate handlers to wire factories)
4. **STOP and VALIDATE**: Run integration tests for sessions, evidence, cameras
5. This delivers the primary value: canonical, non-brittle test fixtures

### Incremental Delivery

1. Phase 1 + Phase 2 → Imports verified, transport documented
2. Phase 3 (US2) → Wire factories in handlers → Test independently (MVP!)
3. Phase 4 (US3) → Transport unit test → Test independently
4. Phase 5 (US5) → Audit complete
5. Phase 6 (US4 + Polish) → Full regression + handoff → Ship

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US2 is the main implementation work (~80% of effort) — all in `tests/mocks/handlers/rpc.ts`
- US3 creates a single new file — low risk, independent
- US5 is read-only audit — no code changes expected (research confirmed no patches exist)
- The handler factory API signatures (`createRpcSessionHandlers`, `createRpcEvidenceHandlers`, `createRpcCameraHandlers`) MUST be preserved — only internal implementation changes
- Composition in `tests/mocks/handlers/diagnostics.ts` and `tests/mocks/v1-cameras-handlers.ts` is NOT modified
- Test baseline: 128 files, 2692 passed, 2 skipped
