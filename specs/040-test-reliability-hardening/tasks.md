# Tasks: Test Reliability & Hardening

**Input**: Design documents from `/specs/040-test-reliability-hardening/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Existing tests are restored by this feature (12 failing → 0). No new test creation requested.

**Organization**: Tasks are grouped by user story. US1 is the MVP — creating one file unblocks 12 test files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No project initialization needed — this is an existing codebase. Phase skipped.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Read existing schemas and fixture patterns to understand the data shapes needed for US1.

- [x] T001 Read Zod schemas in `src/infrastructure/api/diagnostics-schemas.ts` to understand SessionSchema, EvidenceCaptureSchema, and response envelope shapes
- [x] T002 Read existing fixture pattern in `tests/fixtures/provisioning.fixture.ts` to follow the same export convention
- [x] T003 Read `tests/mocks/handlers/diagnostics.ts` to identify all imports from `../diagnostics/session-fixtures` and understand how fixtures are consumed
- [x] T004 Read `tests/mocks/diagnostics/index.ts` to verify the re-export barrel already references `session-fixtures`

**Checkpoint**: Understanding of all 11 required exports, their shapes, and their consumers is confirmed before writing code.

---

## Phase 3: User Story 1 — Developer Runs Tests Reliably (Priority: P1) MVP

**Goal**: Create the missing `session-fixtures.ts` file, unblocking all 12 failing test files.

**Independent Test**: Run `npm test` — all 81 test files pass with 0 failures.

### Implementation for User Story 1

- [x] T005 [US1] Create `tests/mocks/diagnostics/session-fixtures.ts` with 3 session fixtures: `activeSessionRecent` (active, `last_capture_at` ~1 min ago), `activeSessionStale` (active, `last_capture_at` ~10 min ago), `completedSession` (status completed) — all must pass `SessionSchema.safeParse()`. Use relative timestamps via `Date.now()` per design decision D1.
- [x] T006 [US1] Add 2 evidence fixtures to `tests/mocks/diagnostics/session-fixtures.ts`: `validEvidenceCapture` (all fields including `size_bytes` and `content_type`) and `minimalEvidenceCapture` (required fields only) — `camera_id` must match `/^espcam-[0-9a-f]{6}$/i`, all must pass `EvidenceCaptureSchema.safeParse()`
- [x] T007 [US1] Add 3 session API response envelopes to `tests/mocks/diagnostics/session-fixtures.ts`: `sessionListApiResponse` (V1 envelope with 3 sessions in `data.sessions`), `sessionListEmptyApiResponse` (empty `data.sessions: []`), `sessionDetailApiResponse` (single session in `data`) — all must include `success: true`, `correlation_id`, `timestamp`
- [x] T008 [US1] Add 3 evidence API response envelopes to `tests/mocks/diagnostics/session-fixtures.ts`: `evidenceListApiResponse` (V1 envelope with 3 evidence items in `data.evidence`), `evidenceListEmptyApiResponse` (empty `data.evidence: []`), `presignApiResponse` (V1 envelope with `data.url` + `data.expires_at`) — all must include `success: true`, `correlation_id`, `timestamp`
- [x] T009 [US1] Verify `tests/mocks/diagnostics/index.ts` re-exports from `./session-fixtures` — add the re-export line if missing
- [x] T010 [US1] Run `npm test` and verify all 81 test files pass with 0 failures — if any test fails for reasons other than the fixture file, investigate and fix

**Checkpoint**: `npm test` passes with 0 failures. All 12 previously-failing test files now succeed. MVP complete.

---

## Phase 4: User Story 2 — Handoff Sentinel Passes Clean (Priority: P2)

**Goal**: Add YAML frontmatter to 7 handoff files and fix 1 template, eliminating all 8 sentinel errors.

**Independent Test**: Run `npm run handoff:detect` — 0 errors reported.

### Implementation for User Story 2

- [x] T011 [P] [US2] Add YAML frontmatter to `docs/HANDOFF_028_API_COMPAT_COMPLETE.md` — prepend `---` block with `handoff_id: "028-api-compat-complete"`, `direction: "incoming"`, `from_repo: "PiOrchestrator"`, `to_repo: "PiDashboard"`, `created_at: "2026-01-11T00:00:00Z"`, `status: "done"`, and empty arrays for `related_prs`, `related_commits`, `requires`, `acceptance`, `verification`, `risks`, `notes: ""`
- [x] T012 [P] [US2] Add YAML frontmatter to `docs/HANDOFF_029_ROUTE_NORMALIZATION.md` — prepend `---` block with `handoff_id: "029-route-normalization"`, `direction: "outgoing"`, `from_repo: "PiDashboard"`, `to_repo: "PiOrchestrator"`, `created_at: "2026-01-12T00:00:00Z"`, `status: "new"`, and empty arrays for remaining fields
- [x] T013 [P] [US2] Add YAML frontmatter to `docs/HANDOFF_030_DASHBOARD_RECOVERY.md` — prepend `---` block with `handoff_id: "030-dashboard-recovery"`, `direction: "outgoing"`, `from_repo: "PiDashboard"`, `to_repo: "PiOrchestrator"`, `created_at: "2026-01-12T00:00:00Z"`, `status: "done"`, and empty arrays for remaining fields
- [x] T014 [P] [US2] Add YAML frontmatter to `docs/HANDOFF_030_RECOVERY_COMPLETE.md` — prepend `---` block with `handoff_id: "030-recovery-complete"`, `direction: "outgoing"`, `from_repo: "PiDashboard"`, `to_repo: "PiOrchestrator"`, `created_at: "2026-01-12T00:00:00Z"`, `status: "done"`, and empty arrays for remaining fields
- [x] T015 [P] [US2] Add YAML frontmatter to `docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md` — prepend `---` block with `handoff_id: "027-piorchestrator-integration"`, `direction: "incoming"`, `from_repo: "PiOrchestrator"`, `to_repo: "PiDashboard"`, `created_at: "2026-01-11T00:00:00Z"`, `status: "acknowledged"`, and empty arrays for remaining fields
- [x] T016 [P] [US2] Add YAML frontmatter to `docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md` — prepend `---` block with `handoff_id: "031-logs-v1-sse"`, `direction: "incoming"`, `from_repo: "PiOrchestrator"`, `to_repo: "PiDashboard"`, `created_at: "2026-01-13T00:00:00Z"`, `status: "new"`, and empty arrays for remaining fields
- [x] T017 [P] [US2] Add YAML frontmatter to `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` — prepend `---` block with `handoff_id: "035-auto-onboard-api"`, `direction: "incoming"`, `from_repo: "PiOrchestrator"`, `to_repo: "PiDashboard"`, `created_at: "2026-01-22T00:00:00Z"`, `status: "new"`, and empty arrays for remaining fields
- [x] T018 [P] [US2] Fix `specs/032-handoff-sentinel/contracts/handoff-template.md` — change `handoff_id: "NNN-slug"` to `handoff_id: "000-template-example"` so it passes the `^\d{3}-[a-z][a-z0-9-]*$` validation pattern
- [x] T019 [US2] Run `npm run handoff:detect` and verify 0 errors — if any file still fails, check the frontmatter matches the schema at `specs/032-handoff-sentinel/contracts/handoff-schema.yaml`

**Checkpoint**: `npm run handoff:detect` reports 0 errors. Sentinel no longer pollutes `predev`/`pretest` hooks.

---

## Phase 5: User Story 3 — Clean Lint Output (Priority: P3)

**Goal**: Fix 10 lint errors in handoff scripts by removing unused imports/variables and prefixing intentionally unused parameters.

**Independent Test**: Run `npm run lint` — 0 errors in handoff script files and diagnostics type files.

### Implementation for User Story 3

- [x] T020 [P] [US3] Fix `.claude/scripts/handoff/state.ts` — change `catch (err)` to `catch (_err)` at lines 36 and 54
- [x] T021 [P] [US3] Fix `.claude/scripts/handoff/utils.ts` — remove `DetectionSummary` from the import statement at line 19, and remove `summary` from the destructuring at line 181 (change `{ pending, newSinceLastRun, errors, summary }` to `{ pending, newSinceLastRun, errors }`)
- [x] T022 [P] [US3] Fix `.claude/scripts/handoff/validate.ts` — remove `VALID_REPOS` from the import statement at line 13 (keep `ErrorCode` and `VALID_TRANSITIONS`)
- [x] T023 [P] [US3] Fix `.claude/scripts/handoff/consume.ts` — change `options` to `_options` at lines 234 and 360, and change `{ stdout }` to `{ stdout: _stdout }` at line 422
- [x] T024 [P] [US3] Fix `.claude/scripts/handoff/extract.ts` — remove `Requirement` from the import at line 6, and remove `RequirementSource` from the import at line 10
- [x] T025 [US3] Run `npm run lint` and verify handoff scripts and diagnostics files produce 0 errors — the remaining 6 errors (shadcn/ui + allowlist) are out of scope per design decision D3

**Checkpoint**: `npm run lint` shows 0 errors for all `.claude/scripts/handoff/*.ts` files.

---

## Phase 6: User Story 5 — Dashboard State Machine Documentation (Priority: P5)

**Goal**: Create `docs/dashboard_states.md` documenting the 5-state model for each dashboard section.

**Independent Test**: Verify the document exists and covers all 5 sections with all 5 states.

### Implementation for User Story 5

- [x] T026 [US5] Create `docs/dashboard_states.md` documenting the dashboard state machine — include a section for each of the 5 dashboard sections (Camera, WiFi, Door, System, Logs) with their 5 states (loading, success, empty, error, unavailable), the critical invariant (never show empty during loading), the state check order (`loading → error → empty → success`), the `data-testid` reference table per section from `contracts/dashboard-states.contract.md`, and the `isFeatureUnavailable()` usage in WiFi

**Checkpoint**: `docs/dashboard_states.md` exists and accurately describes all section state machines.

---

## Phase 7: User Story 4 — UI State Handling Verification (Priority: P4)

**Goal**: Verify existing UI components match the documented state machine. No code changes expected per research R5 audit.

**Independent Test**: Review component source against `docs/dashboard_states.md` and confirm alignment.

### Implementation for User Story 4

- [x] T027 [US4] Audit `src/presentation/components/cameras/CameraSection.tsx` — verify it checks `isLoading` before rendering empty state, and confirm `data-testid` attributes match `contracts/dashboard-states.contract.md` (camera-loading, camera-grid, camera-empty, camera-error)
- [x] T028 [US4] Audit `src/presentation/components/wifi/WiFiSection.tsx` and related hooks — verify `isFeatureUnavailable()` is used for 404/503 responses and polling stops on unavailable status
- [x] T029 [US4] Audit `src/presentation/components/door/DoorControls.tsx` — verify error state shows "Door Control Unavailable" and loading state shows spinner, confirm `data-testid` attributes (door-controls-loading, door-controls, door-controls-error)
- [x] T030 [US4] Audit `src/presentation/components/system/SystemStatus.tsx` — verify skeleton loading state, error state with retry button, confirm `data-testid` attributes (system-loading, system-status, system-error)

**Checkpoint**: All 4 major UI sections confirmed to implement the documented state machine correctly. No code changes needed (per research audit).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all user stories.

- [x] T031 Run `npm test` to verify all tests still pass after all changes
- [x] T032 Run `npm run build` to verify TypeScript compilation succeeds
- [x] T033 Run `npm run lint` to verify lint output for in-scope files
- [x] T034 Run `npm run handoff:detect` to verify sentinel passes clean
- [x] T035 Review all changes for adherence to constitution principles (hexagonal architecture, contract-first API, test discipline, simplicity/YAGNI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — existing codebase
- **Foundational (Phase 2)**: No dependencies — read-only context gathering
- **US1 (Phase 3)**: Depends on Phase 2 context. BLOCKS nothing — other stories are independent.
- **US2 (Phase 4)**: Independent — no dependencies on US1
- **US3 (Phase 5)**: Independent — no dependencies on US1 or US2
- **US5 (Phase 6)**: Independent — documentation only, references research.md
- **US4 (Phase 7)**: Depends on US5 (needs docs/dashboard_states.md to audit against)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent. MVP. Unblocks 12 test files.
- **US2 (P2)**: Independent. Can run in parallel with US1.
- **US3 (P3)**: Independent. Can run in parallel with US1 and US2.
- **US5 (P5)**: Independent. Can run in parallel with US1, US2, US3.
- **US4 (P4)**: Depends on US5 (audit needs the state machine doc as reference).

### Within Each User Story

- US1: T005–T008 are sequential (same file), T009 depends on T005–T008, T010 depends on T009
- US2: T011–T018 are all [P] parallel (different files), T019 depends on T011–T018
- US3: T020–T024 are all [P] parallel (different files), T025 depends on T020–T024
- US5: T026 is a single task
- US4: T027–T030 are all [P] parallel (different files, read-only audit)

### Parallel Opportunities

- **Maximum parallelism**: US1 + US2 + US3 + US5 can all start simultaneously after Phase 2
- **Within US2**: All 8 frontmatter tasks (T011–T018) can be done in parallel
- **Within US3**: All 5 lint fix tasks (T020–T024) can be done in parallel
- **Within US4**: All 4 audit tasks (T027–T030) can be done in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all 8 frontmatter tasks in parallel (different files):
Task: T011 "Add frontmatter to docs/HANDOFF_028_API_COMPAT_COMPLETE.md"
Task: T012 "Add frontmatter to docs/HANDOFF_029_ROUTE_NORMALIZATION.md"
Task: T013 "Add frontmatter to docs/HANDOFF_030_DASHBOARD_RECOVERY.md"
Task: T014 "Add frontmatter to docs/HANDOFF_030_RECOVERY_COMPLETE.md"
Task: T015 "Add frontmatter to docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md"
Task: T016 "Add frontmatter to docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md"
Task: T017 "Add frontmatter to docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md"
Task: T018 "Fix specs/032-handoff-sentinel/contracts/handoff-template.md"

# Then verify:
Task: T019 "Run npm run handoff:detect and verify 0 errors"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Read schemas and patterns (context gathering)
2. Complete Phase 3: Create `session-fixtures.ts` with 11 exports
3. **STOP and VALIDATE**: `npm test` — all 81 files pass
4. This single file creation unblocks 12 test files (~300+ tests)

### Incremental Delivery

1. US1 → `npm test` passes → MVP done
2. US2 → `npm run handoff:detect` passes → sentinel clean
3. US3 → `npm run lint` clean for scope → lint noise eliminated
4. US5 → `docs/dashboard_states.md` created → state machine documented
5. US4 → audit confirms UI matches docs → hardening verified
6. Polish → all verification commands pass → feature complete

### Parallel Team Strategy

With 4 agents/developers after Phase 2:
- Agent A: US1 (session-fixtures.ts — same file, sequential)
- Agent B: US2 (8 handoff files — parallel edits)
- Agent C: US3 (5 lint fixes — parallel edits)
- Agent D: US5 (dashboard_states.md — single doc)
- Then: Agent D does US4 audit after US5 completes
- Finally: Any agent runs Polish verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new tests are created — this feature restores 12 existing test files
- US1 is the critical path: 1 new file unblocks 300+ tests
- US2 tasks are high-parallelism: 8 independent file edits
- US3 tasks are high-parallelism: 5 independent file edits
- US4 is read-only audit: confirms existing code matches documentation
- The AbortSignal workaround (research R2) requires no code changes — it's already in place
