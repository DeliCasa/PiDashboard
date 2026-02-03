# Tasks: DEV Observability Panels

**Input**: Design documents from `/specs/038-dev-observability-panels/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Constitution Test Discipline requirements (Section III)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Following hexagonal architecture from plan.md:
- Domain types: `src/domain/types/`
- Application hooks: `src/application/hooks/`
- Infrastructure API: `src/infrastructure/api/`
- Presentation: `src/presentation/components/diagnostics/`
- Tests: `tests/unit/`, `tests/component/`, `tests/integration/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create foundational structure for diagnostics feature

- [X] T001 Create diagnostics component directory at src/presentation/components/diagnostics/
- [X] T002 [P] Add queryKeys entries for diagnostics in src/lib/queryClient.ts
- [X] T003 [P] Create mock data fixtures directory at tests/mocks/diagnostics/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schemas and types that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create ServiceHealth, Session, EvidenceCapture domain types in src/domain/types/diagnostics.ts
- [X] T005 [P] Create ServiceStatusSchema Zod schema in src/infrastructure/api/diagnostics-schemas.ts
- [X] T006 [P] Create SessionSchema and SessionStatusSchema in src/infrastructure/api/diagnostics-schemas.ts
- [X] T007 [P] Create EvidenceCaptureSchema in src/infrastructure/api/diagnostics-schemas.ts
- [X] T008 Create diagnostics API client base in src/infrastructure/api/diagnostics.ts
- [X] T009 [P] Create MSW mock handlers for diagnostics endpoints in tests/mocks/handlers/diagnostics.ts
- [X] T010 [P] Create mock data fixtures for ServiceHealth in tests/mocks/diagnostics/health-fixtures.ts
- [X] T011 [P] Create mock data fixtures for Session/Evidence in tests/mocks/diagnostics/session-fixtures.ts
- [X] T012 Contract tests for ServiceHealthSchema in tests/integration/contracts/diagnostics.contract.test.ts

**Checkpoint**: Foundation ready - all schemas validated, mock infrastructure in place

---

## Phase 3: User Story 1 - DEV Diagnostics Health Check (Priority: P1)

**Goal**: Enable operators to verify BridgeServer, PiOrchestrator, and MinIO health status in <60 seconds

**Independent Test**: Navigate to DEV Diagnostics page, verify all three services show health indicators with timestamps

### Tests for User Story 1

- [X] T013 [P] [US1] Unit test for diagnostics API client in tests/unit/api/diagnostics.test.ts
- [X] T014 [P] [US1] Component test for ServiceHealthCard in tests/component/diagnostics/ServiceHealthCard.test.tsx
- [X] T015 [P] [US1] Component test for DiagnosticsSection in tests/component/diagnostics/DiagnosticsSection.test.tsx
- [X] T016 [P] [US1] Hook test for useHealthChecks in tests/integration/hooks/useDiagnostics.test.ts

### Implementation for User Story 1

- [X] T017 [P] [US1] Implement getBridgeServerHealth in src/infrastructure/api/diagnostics.ts
- [X] T018 [P] [US1] Implement getPiOrchestratorHealth (reuse useSystemStatus pattern) in src/infrastructure/api/diagnostics.ts
- [X] T019 [P] [US1] Implement getMinioHealth (via BridgeServer /health/storage) in src/infrastructure/api/diagnostics.ts
- [X] T020 [US1] Implement getAllHealthChecks aggregator in src/infrastructure/api/diagnostics.ts
- [X] T021 [US1] Create useHealthChecks hook with 5s polling in src/application/hooks/useDiagnostics.ts
- [X] T022 [P] [US1] Create ServiceHealthCard component in src/presentation/components/diagnostics/ServiceHealthCard.tsx
- [X] T023 [US1] Create DiagnosticsSection main component in src/presentation/components/diagnostics/DiagnosticsSection.tsx
- [X] T024 [US1] Add Diagnostics tab (stethoscope icon) to App.tsx navigation
- [X] T025 [US1] Implement manual refresh button functionality in DiagnosticsSection
- [X] T026 [US1] Add error states and graceful degradation per isFeatureUnavailable pattern

**Checkpoint**: User Story 1 complete - Operator can see all three service health indicators with refresh capability

---

## Phase 4: User Story 2 - Active Sessions Overview (Priority: P2)

**Goal**: Display current purchase/evidence sessions with session ID, start time, and state

**Independent Test**: View sessions panel, verify sessions display with correct data when active sessions exist, empty state when none

### Tests for User Story 2

- [X] T027 [P] [US2] Unit test for sessions API client in tests/unit/api/sessions.test.ts
- [X] T028 [P] [US2] Component test for SessionsPanel in tests/component/diagnostics/SessionsPanel.test.tsx
- [X] T029 [P] [US2] Component test for SessionCard in tests/component/diagnostics/SessionCard.test.tsx
- [X] T030 [P] [US2] Hook test for useSessions in tests/integration/hooks/useSessions.test.ts

### Implementation for User Story 2

- [X] T031 [US2] Create sessions API client in src/infrastructure/api/sessions.ts
- [X] T032 [US2] Create useSessions hook with 10s polling in src/application/hooks/useSessions.ts
- [X] T033 [P] [US2] Create SessionCard component in src/presentation/components/diagnostics/SessionCard.tsx
- [X] T034 [US2] Create SessionsPanel component in src/presentation/components/diagnostics/SessionsPanel.tsx
- [X] T035 [US2] Integrate SessionsPanel into DiagnosticsSection
- [X] T036 [US2] Implement empty state ("No active sessions") in SessionsPanel
- [X] T037 [US2] Implement session sorting (most recent first) in useSessions

**Checkpoint**: User Story 2 complete - Operator can see active sessions list with IDs, timestamps, and states

---

## Phase 5: User Story 3 - Evidence Capture Status (Priority: P2)

**Goal**: Display last evidence capture timestamp with stale capture warning (>5 min)

**Independent Test**: View session details, verify capture timestamp displays and stale indicator appears for old captures

### Tests for User Story 3

- [X] T038 [P] [US3] Unit test for stale capture detection in tests/unit/lib/stale-capture.test.ts
- [X] T039 [P] [US3] Component test for capture timestamp display in tests/component/diagnostics/SessionCard.test.tsx (extend)

### Implementation for User Story 3

- [X] T040 [US3] Create isStaleCapture utility function in src/lib/diagnostics-utils.ts
- [X] T041 [US3] Add last_capture_at and is_stale display to SessionCard component
- [X] T042 [US3] Add stale capture warning indicator (yellow/orange styling) to SessionCard
- [X] T043 [US3] Add capture_count badge to SessionCard

**Checkpoint**: User Story 3 complete - Operator can see capture timestamps with stale capture warnings

---

## Phase 6: User Story 4 - Evidence Thumbnail Preview (Priority: P3)

**Goal**: Display evidence thumbnails via BridgeServer /view endpoints without storageKey exposure

**Independent Test**: Expand session with evidence, verify thumbnails load via presigned URLs, click shows full image modal

### Tests for User Story 4

- [X] T044 [P] [US4] Unit test for evidence API client in tests/unit/api/evidence.test.ts
- [X] T045 [P] [US4] Component test for EvidencePanel in tests/component/diagnostics/EvidencePanel.test.tsx
- [X] T046 [P] [US4] Component test for EvidenceThumbnail in tests/component/diagnostics/EvidenceThumbnail.test.tsx
- [X] T047 [P] [US4] Hook test for useSessionEvidence in tests/integration/hooks/useEvidence.test.ts

### Implementation for User Story 4

- [X] T048 [US4] Create evidence API client in src/infrastructure/api/evidence.ts
- [X] T049 [US4] Create useSessionEvidence hook in src/application/hooks/useEvidence.ts
- [X] T050 [US4] Create useRefreshPresignedUrl hook for URL expiration handling in src/application/hooks/useEvidence.ts
- [X] T051 [P] [US4] Create EvidenceThumbnail component in src/presentation/components/diagnostics/EvidenceThumbnail.tsx
- [X] T052 [US4] Create EvidencePanel component with thumbnail grid in src/presentation/components/diagnostics/EvidencePanel.tsx
- [X] T053 [US4] Create EvidencePreviewModal for full image view in src/presentation/components/diagnostics/EvidencePreviewModal.tsx
- [X] T054 [US4] Add collapsible evidence section to SessionCard
- [X] T055 [US4] Implement thumbnail error state (placeholder for failed loads)
- [X] T056 [US4] Implement presigned URL refresh logic on expiration

**Checkpoint**: User Story 4 complete - Operator can view evidence thumbnails and full images securely

---

## Phase 7: E2E Tests

**Purpose**: End-to-end validation of complete diagnostics feature

- [X] T057 [P] E2E test: Health check page loads and displays all services in tests/e2e/diagnostics.spec.ts
- [X] T058 [P] E2E test: Health refresh updates timestamps in tests/e2e/diagnostics.spec.ts
- [X] T059 [P] E2E test: Sessions panel displays active sessions in tests/e2e/diagnostics.spec.ts
- [X] T060 [P] E2E test: Evidence thumbnails load securely in tests/e2e/diagnostics.spec.ts
- [X] T061 E2E test: Error states display correctly when services unavailable in tests/e2e/diagnostics.spec.ts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final quality checks

- [X] T062 Create operator documentation at docs/dev-diagnostics.md
- [X] T063 [P] Add data-testid attributes to all diagnostic components for E2E testing
- [X] T064 [P] Verify no storageKey exposure in browser network traffic
- [X] T065 Run full test suite and fix any failures
- [X] T066 Validate SC-001: Health status visible in <60s
- [X] T067 Validate SC-002: Health checks complete in <5s
- [X] T068 Validate SC-004: Thumbnails load in <3s for 95% requests

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
┌───────────────────────────────────────────────────┐
│ Phase 3: US1 (Health Check) ← MVP                 │
│     ↓ (recommended order, not strict dependency)  │
│ Phase 4: US2 (Sessions) + Phase 5: US3 (Capture)  │
│     ↓                                             │
│ Phase 6: US4 (Thumbnails)                         │
└───────────────────────────────────────────────────┘
    ↓
Phase 7: E2E Tests
    ↓
Phase 8: Polish
```

### User Story Dependencies

| Story | Can Start After | Dependencies |
|-------|-----------------|--------------|
| US1 (Health Check) | Phase 2 | None - fully independent |
| US2 (Sessions) | Phase 2 | None - uses same DiagnosticsSection but independent |
| US3 (Capture Status) | US2 | Extends SessionCard from US2 |
| US4 (Thumbnails) | US2/US3 | Extends SessionCard with evidence viewing |

### Within Each User Story

1. Tests (marked [P]) can run in parallel
2. API client before hooks
3. Hooks before components
4. Components before integration
5. Individual component before main section integration

### Parallel Opportunities

**Phase 2 (Foundational)**:
```bash
# Can run T005, T006, T007 in parallel (different schema files)
# Can run T009, T010, T011 in parallel (different mock files)
```

**Phase 3 (User Story 1)**:
```bash
# Tests T013-T016 can all run in parallel
# API implementations T017-T019 can run in parallel (different functions)
```

**Phase 4-6 (User Stories 2-4)**:
```bash
# Each story's tests can run in parallel
# After US1 complete, US2 and US3 can progress in parallel
```

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests in parallel:
T013: Unit test for diagnostics API client
T014: Component test for ServiceHealthCard
T015: Component test for DiagnosticsSection
T016: Hook test for useHealthChecks

# Launch all US1 API implementations in parallel:
T017: getBridgeServerHealth
T018: getPiOrchestratorHealth
T019: getMinioHealth
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T012)
3. Complete Phase 3: User Story 1 (T013-T026)
4. **STOP and VALIDATE**: Operator can assess all three service health in <60s
5. Deploy/demo MVP

### Incremental Delivery

| Milestone | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 | Health status assessment in <60s |
| +Sessions | US1, US2 | Session monitoring |
| +Capture Status | US1-3 | Capture pipeline verification |
| Full Feature | US1-4 | Visual evidence verification |

### Test Coverage Summary

| Category | Count | Location |
|----------|-------|----------|
| Unit Tests | 6 | tests/unit/api/, tests/unit/lib/ |
| Component Tests | 8 | tests/component/diagnostics/ |
| Integration Tests | 4 | tests/integration/hooks/, tests/integration/contracts/ |
| E2E Tests | 5 | tests/e2e/ |
| **Total** | **23** | |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story can be independently completed and tested
- US1 delivers immediate value as MVP
- Stale capture threshold: 5 minutes (per spec FR-009)
- Polling intervals: Health 5s, Sessions 10s (per research.md ADR-003)
- All evidence access through BridgeServer presigned URLs (per spec FR-011)
