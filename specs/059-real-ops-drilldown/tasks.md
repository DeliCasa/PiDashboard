# Tasks: Real Ops Drilldown

**Input**: Design documents from `/specs/059-real-ops-drilldown/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — constitution mandates test updates; spec requests minimal tests against real endpoints.

**Organization**: Tasks grouped by user story. Foundational schema/API work is shared infrastructure that blocks all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational — Schema Reconciliation

**Purpose**: Update Zod schemas and domain types to match PiOrchestrator's actual V1 response shapes. ALL user stories depend on this phase.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Rewrite session Zod schemas in `src/infrastructure/api/diagnostics-schemas.ts`: replace `SessionSchema` (field renames: `id`→`session_id`, `delivery_id`→`container_id`, `capture_count`→`total_captures`; add `successful_captures`, `failed_captures`, `has_before_open`, `has_after_close`, `pair_complete`, `elapsed_seconds`; remove `last_capture_at`), update `SessionStatusSchema` enum from `active|completed|cancelled` to `active|complete|partial|failed`, add `LastErrorSchema` (fields: `phase`, `failure_reason`, `device_id`, `occurred_at`, `correlation_id?`), update `SessionListResponseSchema` to match V1 envelope (`data.sessions[]` + `data.total` + `data.queried_at`), remove old `SessionDetailResponseSchema`
- [x] T002 Rewrite evidence Zod schemas in `src/infrastructure/api/diagnostics-schemas.ts`: replace `EvidenceCaptureSchema` with `CaptureEntrySchema` (fields: `evidence_id`, `capture_tag`, `status`, `failure_reason?`, `device_id`, `container_id`, `session_id`, `created_at`, `image_data?`, `content_type?`, `image_size_bytes?`, `object_key?`, `upload_status?`, `upload_error?`), add enums `CaptureTagSchema` (`BEFORE_OPEN|AFTER_OPEN|BEFORE_CLOSE|AFTER_CLOSE`), `CaptureStatusSchema` (`captured|failed|timeout`), `UploadStatusSchema` (`uploaded|failed|unverified`), add `EvidenceSummarySchema`, replace `EvidenceListResponseSchema` with `SessionEvidenceResponseSchema` (V1 envelope: `data.captures[]` + `data.summary`), remove `PresignResponseSchema`
- [x] T003 Add evidence pair schema in `src/infrastructure/api/diagnostics-schemas.ts`: add `PairStatusSchema` (`complete|incomplete|missing`), `CaptureSlotSchema` (extends `CaptureEntrySchema` + optional `missing_reason`, `failure_detail`, `captured_at`), `EvidencePairSchema` (`contract_version`, `session_id`, `container_id`, `pair_status`, `before: CaptureSlotSchema.nullable()`, `after: CaptureSlotSchema.nullable()`, `queried_at`, `retry_after_seconds?`), `EvidencePairResponseSchema` (V1 envelope)
- [x] T004 Update domain TypeScript interfaces in `src/domain/types/diagnostics.ts`: update `Session` interface to match new schema fields, add `LastError` type, replace `EvidenceCapture` with `CaptureEntry` type, add `EvidencePair` type, add `EvidenceSummary` type, update `SessionStatus` union type, update `SessionWithStale` to derive `is_stale` from `elapsed_seconds > 300` instead of `last_capture_at`
- [x] T005 [P] Create PiOrchestrator-format mock data fixtures in `tests/integration/mocks/diagnostics-mocks.ts`: session variants for all 4 statuses (active, complete, partial, failed — failed includes `last_error` with `correlation_id`), capture entry variants (captured with `image_data`, captured with `object_key` only, failed with `failure_reason`, timeout), evidence pair variants (complete, incomplete, missing), full V1 response envelopes for sessions list and evidence list

**Checkpoint**: Zod schemas compile and match data-model.md. Mock data passes schema validation. All downstream code will have TypeScript errors (expected — fixed in Phase 2+).

---

## Phase 2: Foundational — API Client & Hook Updates

**Purpose**: Update API clients to call V1 endpoints and hooks to consume new data shapes.

**CRITICAL**: Blocks all UI work.

- [x] T006 Update sessions API client in `src/infrastructure/api/sessions.ts`: change endpoint URL from `/dashboard/diagnostics/sessions` to `/v1/diagnostics/sessions`, update response parsing to use `SessionListResponseSchema` (extract `data.sessions`), update `listSessions()` to remove `status` query param (V1 endpoint doesn't support it — filter client-side), update `getSession()` to filter from list by `session_id` (no detail endpoint exists), update stale derivation to use `elapsed_seconds > 300` instead of `last_capture_at` comparison
- [x] T007 Update evidence API client in `src/infrastructure/api/evidence.ts`: change `listSessionEvidence()` URL from `/dashboard/diagnostics/sessions/{id}/evidence` to `/v1/sessions/{id}/evidence`, update response parsing to use `SessionEvidenceResponseSchema` (extract `data.captures`), remove `refreshPresignedUrl()` method entirely (no presigned URL endpoint), remove `isUrlExpired()` and `getFreshUrl()` helpers, add `getImageSrc(capture: CaptureEntry): string` helper that returns `data:image/jpeg;base64,{image_data}` when `image_data` present, or `''` (empty) as fallback, add `getEvidencePair(sessionId)` method calling `GET /v1/sessions/{id}/evidence/pair` with `EvidencePairResponseSchema` validation
- [x] T008 Update sessions hook in `src/application/hooks/useSessions.ts`: update type imports from `Session`/`SessionWithStale` to new schema-derived types, update `useSessions()` to accept `status` filter and apply client-side filtering (filter `data` array by status before returning), update stale derivation — `is_stale` is `true` when `status === 'active' && elapsed_seconds > 300`
- [x] T009 Update evidence hook in `src/application/hooks/useEvidence.ts`: update `useSessionEvidence()` return type from `EvidenceCapture[]` to `CaptureEntry[]`, remove `useRefreshPresignedUrl()` hook entirely, add `useEvidencePair(sessionId, options)` hook calling `evidenceApi.getEvidencePair()` with 10s polling, keep `useInvalidateEvidence()` and `useEvidenceCapture()` with updated type references, keep `useEvidenceDownload()` but update to handle base64 images from `image_data` field instead of URL-based download

- [x] T009b [P] Add MSW-backed hook integration tests in `tests/integration/hooks/`: add test for `useSessions()` verifying client-side status filtering and stale derivation from `elapsed_seconds`, add test for `useSessionEvidence()` verifying `CaptureEntry[]` return shape, add test for `useEvidencePair()` verifying complete/incomplete pair handling, use MSW handlers from T012/T018 fixtures, follow existing hook test patterns in `tests/integration/hooks/`

**Checkpoint**: API clients call V1 URLs. Hooks return new data shapes. Hook integration tests pass with MSW. TypeScript compiles. Component-level errors remain (fixed in Phases 3-5).

---

## Phase 3: User Story 1 — Live Session List (Priority: P1)

**Goal**: Operator sees real sessions from PiOrchestrator with status filtering and stale detection.

**Independent Test**: Open Operations tab → session list shows real sessions with correct status badges, capture counts, and stale indicators.

### Implementation for User Story 1

- [x] T010 [US1] Update SessionListView in `src/presentation/components/operations/SessionListView.tsx`: update status tabs from 3 (All/Active/Completed/Failed) to 5 (All/Active/Complete/Partial/Failed) with correct status values, update field references (`id`→`session_id`, `delivery_id`→`container_id`, `capture_count`→`total_captures`), update status badge colors (complete=green, partial=amber, failed=red, active=blue), display `container_id` instead of `delivery_id` label, show `successful_captures`/`total_captures` ratio in capture count display
- [x] T011 [US1] Update session card/row rendering in `src/presentation/components/operations/SessionListView.tsx`: add stale indicator based on `is_stale` flag (yellow "Stale" badge for active sessions with `elapsed_seconds > 300`), show `elapsed_seconds` as human-readable duration, display `pair_complete` status as a small icon/badge, ensure `session_id` and `container_id` displayed in `font-mono text-xs text-muted-foreground` per project convention
- [x] T012 [US1] Update MSW handlers for session list in test mock files: add handler for `GET /api/v1/diagnostics/sessions` returning V1-format response envelope with mock sessions from T005 fixtures, remove old `/dashboard/diagnostics/sessions` handler, ensure handler returns all 4 status variants
- [x] T013 [US1] Update SessionListView component tests: update field name references in assertions, add test for "Partial" tab filtering, update status badge assertions for new enum values, verify stale indicator renders for active sessions with `elapsed_seconds > 300`

**Checkpoint**: Session list renders with real data shapes. All 5 status tabs work. Stale detection uses `elapsed_seconds`. Tests pass.

---

## Phase 4: User Story 2 — Session Detail with Evidence Images (Priority: P1)

**Goal**: Operator drills into a session, sees metadata and evidence images rendered from base64 data.

**Independent Test**: Click session → detail view shows timestamps, IDs, and evidence images load as base64 inline without any MinIO LAN requests.

### Implementation for User Story 2

- [x] T014 [US2] Update SessionDetailView in `src/presentation/components/operations/SessionDetailView.tsx`: update metadata display to use `session_id`, `container_id`, `started_at`, show capture summary (`successful_captures`/`total_captures`, `pair_complete` status), display `elapsed_seconds` as duration, update status badge to match new enum values
- [x] T015 [US2] Update EvidencePanel in `src/presentation/components/diagnostics/EvidencePanel.tsx`: update to consume `CaptureEntry[]` instead of `EvidenceCapture[]`, display `capture_tag` as badge on each thumbnail (map `BEFORE_OPEN`→"Before Open", `AFTER_CLOSE`→"After Close", etc.), filter to show only `status === 'captured'` entries (hide failed/timeout in image grid), show failed/timeout captures as separate list with `failure_reason`, remove container-scoped camera filtering (use `device_id` from captures instead of camera registry)
- [x] T016 [US2] Update EvidenceThumbnail in `src/presentation/components/diagnostics/EvidenceThumbnail.tsx`: replace presigned URL `<img src={thumbnail_url}>` with base64 `<img src="data:image/jpeg;base64,${image_data}">`, remove auto-refresh-on-failure logic (no presigned URL refresh needed), when `image_data` is absent but `object_key` present: show "Stored in S3" placeholder with object key in monospace, when neither `image_data` nor `object_key`: show "Image not available" placeholder, update metadata overlay to show `device_id` (was `camera_id`) and `created_at` (was `captured_at`)
- [x] T017 [US2] Update EvidencePreviewModal in `src/presentation/components/diagnostics/EvidencePreviewModal.tsx`: update full-size image to use `data:image/jpeg;base64,${image_data}`, update download handler to create blob from base64 `image_data` field, update filename generation to use `device_id` and `created_at` fields, show `capture_tag` and `evidence_id` in modal header
- [x] T018 [US2] Update MSW handlers for evidence endpoints in test mock files: add handler for `GET /api/v1/sessions/:sessionId/evidence` returning V1-format response with captures array and summary, add handler for `GET /api/v1/sessions/:sessionId/evidence/pair` returning evidence pair response, remove old `/dashboard/diagnostics/sessions/:id/evidence` and `/dashboard/diagnostics/images/presign` handlers
- [x] T019 [US2] Update evidence component tests: update EvidencePanel tests to assert base64 image rendering (check `img[src^="data:image/jpeg;base64"]`), update EvidenceThumbnail tests for base64 src instead of presigned URL, add test for "Stored in S3" placeholder when `image_data` absent, add test for capture tag badge rendering, remove presigned URL refresh tests

**Checkpoint**: Session detail shows evidence images from base64 data. No presigned URL logic remains. Capture tags displayed. Download works from base64.

---

## Phase 5: User Story 3 — Failure Diagnostics (Priority: P2)

**Goal**: Operator sees actionable failure information for failed sessions with copy-to-clipboard IDs.

**Independent Test**: Open a failed session → see failure reason, phase, correlation ID. Copy session_id to clipboard → toast confirmation.

### Implementation for User Story 3

- [x] T020 [US3] Add last_error display to SessionDetailView in `src/presentation/components/operations/SessionDetailView.tsx`: when `last_error` is present, render a prominent error block showing `failure_reason`, `phase` (BEFORE_OPEN/AFTER_CLOSE), `device_id` of the failing camera, `occurred_at` timestamp, and `correlation_id` (if present) with copy-to-clipboard button, style with destructive/red variant for visibility
- [x] T021 [US3] Update copy-to-clipboard in SessionDetailView: ensure `session_id` copy works (was `id`), add `container_id` copy (was `delivery_id`), add `correlation_id` copy from `last_error.correlation_id`, verify toast confirmation appears via `sonner` toast.success(), all IDs displayed in `font-mono text-xs text-muted-foreground`
- [x] T022 [US3] Add failed capture list to EvidencePanel in `src/presentation/components/diagnostics/EvidencePanel.tsx`: below the image grid, show a separate section for captures with `status === 'failed'` or `status === 'timeout'`, display `failure_reason`, `device_id`, `capture_tag`, and `created_at` for each failed capture, use amber styling for timeout, red for failed
- [x] T023 [US3] Update mock data and tests for failure scenarios: add mock session with `last_error` containing all fields including `correlation_id`, add component test verifying last_error block renders for failed sessions, add test for copy-to-clipboard on `correlation_id`, add test for failed capture list in EvidencePanel

**Checkpoint**: Failed sessions show actionable error info. All IDs copyable. Failed captures listed with reasons.

---

## Phase 6: User Story 4 — DEV Validation Workflow (Priority: P2)

**Goal**: Developer can follow a documented procedure to validate end-to-end against real PiOrchestrator.

**Independent Test**: Follow quickstart.md steps → real session visible with evidence images → zero console errors.

### Implementation for User Story 4

- [x] T024 [US4] Verify camera diagnostics compatibility and subsystem isolation in `src/presentation/components/operations/CameraHealthDashboard.tsx` and `src/presentation/components/operations/CameraHealthCard.tsx`: confirm V1 camera diagnostics endpoint (`/api/v1/dashboard/diagnostics/cameras`) response shape matches existing `CameraDiagnosticsSchema`, update field references if PiOrchestrator returns `device_id` instead of `camera_id`, verify health metrics display (rssi, capture_success_rate, total/failed captures); also verify that `SubsystemErrorBoundary` wraps all updated components (SessionListView, SessionDetailView, EvidencePanel, CameraHealthDashboard) so a crash in one does not affect others (FR-004)
- [x] T025 [US4] Update quickstart.md validation procedure in `specs/059-real-ops-drilldown/quickstart.md`: add curl commands using actual V1 endpoint URLs, add step-by-step browser validation (open Operations tab, verify session list, click session, verify images, check Network tab for no MinIO requests, check Console for no errors), add troubleshooting section for common issues (404 = endpoint not on port 8082, empty image_data = need image proxy)
- [x] T026 [US4] Generate PiOrchestrator handoff document: create handoff via `/handoff-generate` requesting (1) session/evidence V1 endpoints exposed on config UI port 8082 without API key, (2) image proxy endpoint `GET /api/v1/evidence/image?key={object_key}` for S3-stored images, (3) optional session detail endpoint

**Checkpoint**: Validation procedure documented. Handoff generated. Camera health verified compatible.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Contract tests, lint, build verification, E2E test updates.

- [x] T027 [P] Add contract tests for new schemas in `tests/integration/contracts/diagnostics.contract.test.ts`: validate `SessionDiagnosticEntrySchema` against all mock variants, validate `CaptureEntrySchema` against all capture variants (captured/failed/timeout, with/without image_data), validate `EvidencePairSchema` against complete/incomplete/missing variants, validate `LastErrorSchema`, assert invalid data is rejected (wrong status values, missing required fields)
- [x] T028 [P] Update E2E test assertions in `tests/e2e/operations.spec.ts`: update session list assertions for new field names and status values, update evidence panel assertions for base64 images instead of presigned URLs, add assertion for capture tag badges, update mock route responses to V1 format
- [x] T029 Run lint and build verification: execute `npm run lint` — fix any ESLint errors from renamed fields or removed imports, execute `npm run build` — verify TypeScript compilation succeeds with zero errors, verify no unused imports from removed presigned URL logic
- [x] T030 Run full test suite: execute `VITEST_MAX_WORKERS=1 npm test` — all unit, component, integration, and contract tests pass, verify zero TypeScript `any` types introduced, verify all mock data passes Zod schema validation

**Checkpoint**: All tests pass. Lint clean. Build succeeds. Ready for DEV validation against real PiOrchestrator.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Schema Reconciliation)**: No dependencies — start immediately. **BLOCKS ALL other phases.**
- **Phase 2 (API Client & Hook Updates)**: Depends on Phase 1 completion. **BLOCKS all UI phases.**
- **Phase 3 (US1 - Session List)**: Depends on Phase 2 completion.
- **Phase 4 (US2 - Evidence Images)**: Depends on Phase 2 completion. Can run in parallel with Phase 3.
- **Phase 5 (US3 - Failure Diagnostics)**: Depends on Phase 3 (session list) and Phase 4 (evidence panel) since it adds to both.
- **Phase 6 (US4 - DEV Validation)**: Depends on Phases 3-5 (needs working UI to validate).
- **Phase 7 (Polish)**: Depends on Phases 3-5 (needs all UI changes for comprehensive test updates).

### User Story Dependencies

- **US1 (Session List)**: Independent after Phase 2.
- **US2 (Evidence Images)**: Independent after Phase 2. Can run parallel with US1.
- **US3 (Failure Diagnostics)**: Depends on US1 + US2 (extends SessionDetailView and EvidencePanel).
- **US4 (DEV Validation)**: Depends on US1 + US2 + US3 (validates full feature).

### Within Each User Story

- Implementation tasks within a story are sequential (each builds on the previous).
- Test updates can start after corresponding implementation task completes.
- MSW handler updates should precede component test updates.

### Parallel Opportunities

**Phase 1 parallelism**:
```
T001 (session schemas) → T002 (evidence schemas) → T003 (pair schema) [sequential — same file]
T004 (domain types) ‖ T005 (mock data) [parallel — different files, after T001-T003]
```

**Phase 2 parallelism**:
```
T006 (sessions API) ‖ T007 (evidence API) [parallel — different files]
T008 (sessions hook) [after T006]
T009 (evidence hook) [after T007]
```

**Phase 3 + Phase 4 parallelism**:
```
US1 (T010-T013) ‖ US2 (T014-T019) [parallel — different component files]
```

**Phase 7 parallelism**:
```
T027 (contract tests) ‖ T028 (E2E tests) [parallel — different test files]
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Schema Reconciliation (T001-T005)
2. Complete Phase 2: API Client & Hook Updates (T006-T009)
3. Complete Phase 3: US1 Session List (T010-T013)
4. Complete Phase 4: US2 Evidence Images (T014-T019)
5. **STOP and VALIDATE**: Sessions list and evidence images work with new schemas
6. Deploy/demo — operator can view real sessions and evidence

### Incremental Delivery

1. Phases 1-2 → Foundation ready (schemas + API clients aligned)
2. + US1 → Session list works (MVP entry point)
3. + US2 → Evidence images render (core value delivered)
4. + US3 → Failure diagnostics visible (operational depth)
5. + US4 → Validated against real Pi (deployment confidence)
6. + Polish → Tests green, lint clean, E2E updated

---

## Notes

- All schema changes in T001-T003 are in the same file (`diagnostics-schemas.ts`) — must be sequential
- T005 (mock data) can start after T003 since it needs all schemas defined
- The presigned URL logic is being **removed**, not replaced — base64 inline is simpler
- Image proxy endpoint (for S3-stored images >24h) requires PiOrchestrator handoff (T026) — not blocking for MVP since recent images have base64 data
- Camera diagnostics (T024) is a verification task — if the existing schema matches, no code changes needed
- Total: 31 tasks across 7 phases (T009b added for hook integration tests per constitution III mandate)
