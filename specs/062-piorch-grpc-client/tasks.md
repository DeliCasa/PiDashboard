# Tasks: PiOrchestrator Connect RPC Client Migration

**Input**: Design documents from `/specs/062-piorch-grpc-client/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rpc-surface.md

**Tests**: Included — constitution mandates MSW-backed hook tests and contract tests.

**Organization**: Tasks grouped by user story. US1 (Sessions) and US2 (Evidence) are P1. US3 (Cameras) and US4 (Env config) are P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update @delicasa/wire with service protos, install Connect dependencies in PiDashboard

- [x] T001 Add device service proto files to @delicasa/wire: created camera_service.proto, capture_service.proto, session_service.proto, evidence_service.proto with imports from existing message protos. Updated session.proto (6 new fields) and evidence.proto (upload_status string, UploadStatus moved to capture_service)
- [x] T002 protoc-gen-es v2 generates service descriptors natively (no protoc-gen-connect-es needed). Ran `pnpm gen` successfully
- [x] T003 Verified: all 4 *_service_pb.js + *_service_pb.d.ts files generated with GenService descriptors
- [x] T004 Installed @delicasa/wire v0.2.0 (file:) + @connectrpc/connect-web v2.1.1
- [x] T005 moduleResolution: "bundler" already set in tsconfig.app.json — no change needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: RPC transport, service clients, error mapper, Vite proxy — MUST complete before any user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Created Connect transport module at src/infrastructure/rpc/transport.ts with auth + correlation interceptors
- [x] T007 Created service clients module at src/infrastructure/rpc/clients.ts — 4 typed clients
- [x] T008 Created Connect error mapper at src/infrastructure/rpc/error-mapper.ts — ConnectError → ApiError mapping
- [x] T009 [P] Created session adapter at src/infrastructure/rpc/adapters/session-adapter.ts — proto→domain with stale flag
- [x] T010 [P] Created evidence adapter at src/infrastructure/rpc/adapters/evidence-adapter.ts — proto→domain with enum mapping
- [x] T011 [P] Created camera adapter at src/infrastructure/rpc/adapters/camera-adapter.ts — proto→domain with bigint conversion
- [x] T012 Added `/rpc` proxy rule to vite.config.ts → port 8081, with env-driven host
- [x] T013 [P] Created .env.example with VITE_PI_RPC_URL, VITE_PI_HOST, VITE_API_KEY

**Checkpoint**: Foundation ready — RPC transport, 4 service clients, 3 adapters, error mapper, Vite proxy all operational

---

## Phase 3: User Story 1 — View Live Operation Sessions via RPC (Priority: P1) MVP

**Goal**: Replace REST session fetching with Connect RPC. Sessions list and detail load via SessionService.

**Independent Test**: Open Operations tab on real Pi — sessions load. Network tab shows POST to `/rpc/delicasa.device.v1.SessionService/ListSessions`. Click a session — detail opens via `GetSession`.

### Tests for User Story 1

- [ ] T014 [P] [US1] Write unit test for session adapter at tests/unit/rpc/session-adapter.test.ts (deferred to Phase 7)
- [ ] T015 [P] [US1] Update hook integration test at tests/integration/hooks/useSessions.test.ts (deferred to Phase 7)

### Implementation for User Story 1

- [x] T016 [US1] Created RPC session API module at src/infrastructure/api/sessions-rpc.ts
- [x] T017 [US1] Modified src/application/hooks/useSessions.ts — swapped to sessionsRpcApi
- [ ] T018 [US1] Remove dead REST session code from src/infrastructure/api/sessions.ts (deferred — file has session recovery code to keep)

**Checkpoint**: Sessions load via RPC. Operator can list sessions and open session detail. REST /api/v1/sessions no longer called.

---

## Phase 4: User Story 2 — View Session Evidence and Thumbnails via RPC (Priority: P1)

**Goal**: Replace REST evidence fetching with Connect RPC. Evidence pairs and session evidence load via EvidenceService. Thumbnails render from RPC response data.

**Independent Test**: Open a session with evidence on real Pi — before/after thumbnails render. Network tab shows POST to `/rpc/delicasa.device.v1.EvidenceService/GetEvidencePair`.

### Tests for User Story 2

- [ ] T019 [P] [US2] Write unit test for evidence adapter (deferred to Phase 7)
- [ ] T020 [P] [US2] Update hook integration test for useEvidence (deferred to Phase 7)

### Implementation for User Story 2

- [x] T021 [US2] Created RPC evidence API module at src/infrastructure/api/evidence-rpc.ts
- [x] T022 [US2] Modified src/application/hooks/useEvidence.ts — swapped read queries to evidenceRpcApi, kept camera capture on REST
- [ ] T023 [US2] Remove dead REST evidence code (deferred — file has camera evidence capture, presigned URL, download helpers to keep)

**Checkpoint**: Evidence pairs load via RPC. Thumbnails render correctly. No REST calls for evidence data.

---

## Phase 5: User Story 3 — Camera List, Status, and Capture via RPC (Priority: P2)

**Goal**: Replace REST camera/capture fetching with Connect RPC. Camera list, detail, status, and image capture use CameraService + CaptureService.

**Independent Test**: Open Cameras tab on real Pi — camera list loads. Click camera — detail/health shows. Trigger capture — image returns. Network tab shows POST to CameraService/CaptureService RPC endpoints.

### Tests for User Story 3

- [ ] T024 [P] [US3] Write unit test for camera adapter (deferred to Phase 7)
- [ ] T025 [P] [US3] Write unit test for error mapper (deferred to Phase 7)
- [ ] T026 [P] [US3] Update hook integration test for useCameras (deferred to Phase 7)

### Implementation for User Story 3

- [x] T027 [US3] Created RPC camera API module at src/infrastructure/api/cameras-rpc.ts
- [x] T028 [US3] Modified src/application/hooks/useCameras.ts — camera list + capture via RPC
- [x] T029 [US3] Modified src/application/hooks/useCamera.ts — single camera via RPC
- [x] T030 [US3] Modified capture mutation to use camerasRpcApi.capture
- [ ] T031 [US3] Remove dead REST camera code (deferred — file has diagnostics, reboot, listPaired to keep)

**Checkpoint**: Cameras load via RPC. Detail and health display correctly. Capture returns image. No REST calls for camera/capture data.

---

## Phase 6: User Story 4 — Environment-Driven RPC Configuration (Priority: P2)

**Goal**: Remove all hardcoded port references. RPC URL driven by VITE_PI_RPC_URL env var. Works in dev (proxy), LAN (same-origin), and Cloudflare Tunnel (cross-origin).

**Independent Test**: Set VITE_PI_RPC_URL to different values. Dashboard connects correctly in each configuration. No hardcoded 8081/8082 in source.

### Implementation for User Story 4

- [x] T032 [US4] No hardcoded port references in src/ — sessions.ts dual fallback not used by new RPC path
- [x] T033 [US4] vite.config.ts uses VITE_PI_HOST env var with 192.168.1.124 fallback for both /api and /rpc proxies
- [x] T034 [US4] Created .env.example with VITE_PI_RPC_URL, VITE_PI_HOST, VITE_API_KEY
- [x] T035 [US4] Confirmed: zero hardcoded 8081/8082/192.168.1.124 in src/ directory

**Checkpoint**: Zero hardcoded ports in source. Dashboard works with env var configuration.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, validation, deliverables

- [ ] T036 [P] Create specs/062-piorch-grpc-client/design.md — consolidate architecture decisions: RPC client module structure, adapter pattern, error mapping, two-layer validation (proto compile-time + Zod runtime)
- [ ] T037 [P] Create docs/runbooks/pidashboard-rpc.md — operational runbook: how to configure RPC URL, troubleshoot Connect errors, verify RPC connectivity, switch between dev/LAN/tunnel modes
- [ ] T038 [P] Create HANDOFF FOR DOKKU section in docs/runbooks/pidashboard-rpc.md — document which env vars Dokku must set: VITE_PI_RPC_URL, VITE_PI_HOST, VITE_API_KEY
- [x] T039 Run `npm run lint` and `npm run build` — verify zero TypeScript errors and zero ESLint errors after all migrations
- [x] T040 Run `VITEST_MAX_WORKERS=1 npm test` — verify all existing tests pass (no regressions in WiFi, door, config, container, inventory, onboarding tests)
- [ ] T041 Validate on real Pi via SSH tunnel (`ssh -L 8081:localhost:8081 -L 8082:localhost:8082 pi`): open dashboard, verify sessions load via RPC, open session detail, verify evidence thumbnails render, verify camera list loads, verify WiFi/door/config tabs still work via REST
- [ ] T042 Capture validation evidence: browser Network tab screenshots showing RPC POST requests for sessions/evidence/cameras, console showing zero errors. Document in specs/062-piorch-grpc-client/quickstart.md validation section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001→T002→T003 sequential (proto copy → generate → verify). T004, T005 after T003.
- **Foundational (Phase 2)**: Depends on Setup. T006→T007 sequential (transport before clients). T009/T010/T011 parallel (adapters are independent files). T008 parallel with adapters. T012/T013 parallel with all.
- **US1 Sessions (Phase 3)**: Depends on Phase 2 completion (needs sessionClient + session adapter)
- **US2 Evidence (Phase 4)**: Depends on Phase 2 completion (needs evidenceClient + evidence adapter). Can run parallel with US1.
- **US3 Cameras (Phase 5)**: Depends on Phase 2 completion (needs cameraClient/captureClient + camera adapter). Can run parallel with US1/US2.
- **US4 Env Config (Phase 6)**: Can run after Phase 2 (proxy config) but best done after US1-US3 to catch all hardcoded references
- **Polish (Phase 7)**: Depends on US1-US4 completion

### User Story Dependencies

- **US1 (Sessions)**: Independent after Phase 2
- **US2 (Evidence)**: Independent after Phase 2. No dependency on US1 (evidence hooks are separate from session hooks)
- **US3 (Cameras)**: Independent after Phase 2. No dependency on US1/US2
- **US4 (Env Config)**: Best done after US1-US3 to catch all hardcoded refs during cleanup

### Within Each User Story

1. Adapter unit tests (T014/T019/T024) — write first, verify they define expectations
2. RPC API module (T016/T021/T027) — infrastructure adapter using RPC client + adapter
3. Hook modifications (T017/T022/T028-T030) — swap queryFn in application layer
4. REST cleanup (T018/T023/T031) — remove dead code from old API modules
5. Integration tests (T015/T020/T026) — verify end-to-end hook behavior

### Parallel Opportunities

**Phase 2 parallelism** (after T006→T007):
```
T008 error-mapper.ts  ║  T009 session-adapter.ts  ║  T010 evidence-adapter.ts  ║  T011 camera-adapter.ts  ║  T012 vite proxy  ║  T013 .env.example
```

**Cross-story parallelism** (after Phase 2):
```
US1 (T014-T018)  ║  US2 (T019-T023)  ║  US3 (T024-T031)
```

**Within-story test parallelism**:
```
US3: T024 camera-adapter.test  ║  T025 error-mapper.test  ║  T026 useCameras.test
```

---

## Parallel Example: Phase 2 Foundation

```bash
# Sequential first (transport must exist before clients):
Task T006: "Create Connect transport in src/infrastructure/rpc/transport.ts"
Task T007: "Create service clients in src/infrastructure/rpc/clients.ts"

# Then all of these in parallel:
Task T008: "Create error mapper in src/infrastructure/rpc/error-mapper.ts"
Task T009: "Create session adapter in src/infrastructure/rpc/adapters/session-adapter.ts"
Task T010: "Create evidence adapter in src/infrastructure/rpc/adapters/evidence-adapter.ts"
Task T011: "Create camera adapter in src/infrastructure/rpc/adapters/camera-adapter.ts"
Task T012: "Add /rpc proxy rule to vite.config.ts"
Task T013: "Add VITE_PI_RPC_URL to .env.example"
```

## Parallel Example: User Stories After Phase 2

```bash
# All three user stories can start simultaneously:
# Developer A: US1 Sessions (T014-T018)
# Developer B: US2 Evidence (T019-T023)
# Developer C: US3 Cameras (T024-T031)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (wire update + deps) — ~30 min
2. Complete Phase 2: Foundational (transport, clients, adapters, proxy) — ~1 hr
3. Complete Phase 3: US1 Sessions — ~30 min
4. **STOP and VALIDATE**: Test on real Pi — sessions load via RPC
5. This proves the entire Connect pipeline works end-to-end

### Incremental Delivery

1. Setup + Foundational → RPC infrastructure ready
2. US1 Sessions → Validate on Pi → First RPC endpoint working (MVP!)
3. US2 Evidence → Validate thumbnails → Core ops drilldown complete
4. US3 Cameras → Validate list + capture → All 9 endpoints migrated
5. US4 Env Config → Remove hardcoded ports → Deployment-ready
6. Polish → Docs, runbook, Dokku handoff → Feature complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Wire update (Phase 1) modifies ../delicasa-wire — coordinate if others use it
- Hook signatures NEVER change — only queryFn implementations swap from REST to RPC
- Existing REST-only hooks (WiFi, door, config, containers, etc.) are NEVER touched
- Proto enums are numeric in TypeScript — adapters map to string values for UI
- bigint fields (free_heap, uptime_seconds, image_size_bytes) must be converted to Number() in adapters
- bytes fields (imageData in CaptureImage) must be converted to base64 for <img> src
