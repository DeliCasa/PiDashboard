# Tasks: Auto-Onboard ESP-CAM Dashboard Integration

**Feature**: 035-auto-onboard-dashboard
**Input**: Design documents from `/specs/035-auto-onboard-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per feature specification (Test Discipline is a NON-NEGOTIABLE constitution principle)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## User Story Summary

| Story | Title | Priority | Entities/Endpoints |
|-------|-------|----------|-------------------|
| US1 | View Auto-Onboard Status | P1 | AutoOnboardStatus, `/api/v1/onboarding/auto/status` |
| US2 | Toggle Auto-Onboard On/Off | P1 | `/api/v1/onboarding/auto/enable`, `/api/v1/onboarding/auto/disable` |
| US3 | View Onboarding Metrics | P2 | AutoOnboardMetrics, `/api/v1/onboarding/auto/metrics/reset` |
| US4 | View Audit Event History | P2 | OnboardingAuditEntry, `/api/v1/onboarding/auto/events`, `/api/v1/onboarding/auto/events/:mac` |
| US5 | View Configuration Details | P3 | AutoOnboardConfig (from /status response) |
| US6 | Cleanup Old Events | P3 | `/api/v1/onboarding/auto/events/cleanup` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared infrastructure for all user stories

- [X] T001 [P] Create Zod schemas for all API response types in src/infrastructure/api/v1-auto-onboard-schemas.ts
- [X] T002 [P] Add auto-onboard error codes (ONBOARD_*) to src/infrastructure/api/errors.ts
- [X] T003 [P] Add autoOnboard query keys to src/lib/queryClient.ts
- [X] T004 [P] Create MSW handlers for auto-onboard API in tests/mocks/v1-auto-onboard-handlers.ts
- [X] T005 Create API client with getStatus method in src/infrastructure/api/v1-auto-onboard.ts

**Checkpoint**: Zod schemas validated, API client ready for testing, MSW handlers operational

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and base component that MUST be complete before user story components

**CRITICAL**: No UI component work can begin until this phase is complete

- [X] T006 Create useAutoOnboardStatus hook with visibility-aware polling in src/application/hooks/useAutoOnboard.ts
- [X] T007 Create auto-onboard component directory at src/presentation/components/auto-onboard/
- [X] T008 Create base AutoOnboardPanel container component in src/presentation/components/auto-onboard/AutoOnboardPanel.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Auto-Onboard Status (Priority: P1)

**Goal**: Display current auto-onboard status with enabled/disabled state, running status, and mode indicator

**Independent Test**: Load dashboard with auto-onboard API available; verify status panel shows current state

**Acceptance Criteria**:
- FR-001: Display enabled/disabled state prominently
- FR-002: Show whether actively running
- FR-003: Display mode ("dev" or "off")
- FR-005: Poll status every 15 seconds
- FR-006: Pause polling when tab hidden

### Tests for User Story 1

- [X] T009 [P] [US1] Unit test for AutoOnboardStatusSchema validation in tests/unit/api/v1-auto-onboard.test.ts
- [X] T010 [P] [US1] Unit test for getStatus API client method in tests/unit/api/v1-auto-onboard.test.ts
- [X] T011 [P] [US1] Component test for AutoOnboardStatusCard in tests/component/auto-onboard/AutoOnboardStatusCard.test.tsx

### Implementation for User Story 1

- [X] T012 [US1] Create AutoOnboardStatusCard component in src/presentation/components/auto-onboard/AutoOnboardStatusCard.tsx
- [X] T013 [US1] Add loading state with skeleton UI to AutoOnboardStatusCard
- [X] T014 [US1] Add error state with retry button to AutoOnboardStatusCard
- [X] T015 [US1] Add "Not Available" state when mode is "off" to AutoOnboardStatusCard
- [X] T016 [US1] Integrate AutoOnboardStatusCard into AutoOnboardPanel in src/presentation/components/auto-onboard/AutoOnboardPanel.tsx
- [X] T017 [US1] Add AutoOnboardPanel to CameraSection in src/presentation/components/cameras/CameraSection.tsx
- [X] T017a [US1] Verify AutoOnboardPanel visual consistency with CameraSection styling (FR-027)

**Checkpoint**: User Story 1 complete - Status panel shows live auto-onboard state with polling

---

## Phase 4: User Story 2 - Toggle Auto-Onboard On/Off (Priority: P1)

**Goal**: Enable/disable auto-onboard with a single click toggle switch (kill switch functionality)

**Independent Test**: Toggle switch from off to on; verify state changes and confirmation appears

**Acceptance Criteria**:
- FR-007: Toggle switch to enable when mode is "dev"
- FR-008: Toggle switch (kill switch) to disable immediately
- FR-009: Disable toggle during pending API requests
- FR-010: Show confirmation toast after success
- FR-011: Revert toggle state and show error on failure

### Tests for User Story 2

- [X] T018 [P] [US2] Unit test for enable/disable API methods in tests/unit/api/v1-auto-onboard.test.ts
- [X] T019 [P] [US2] Component test for toggle interaction in tests/component/auto-onboard/AutoOnboardStatusCard.test.tsx

### Implementation for User Story 2

- [X] T020 [US2] Add enable() and disable() methods to API client in src/infrastructure/api/v1-auto-onboard.ts
- [X] T021 [US2] Create useAutoOnboardToggle mutation hook with optimistic updates in src/application/hooks/useAutoOnboard.ts
- [X] T022 [US2] Add Switch component with role="switch" to AutoOnboardStatusCard in src/presentation/components/auto-onboard/AutoOnboardStatusCard.tsx
- [X] T023 [US2] Add disabled state during pending toggle to AutoOnboardStatusCard
- [X] T024 [US2] Add toast notifications for enable/disable success/failure using sonner in AutoOnboardStatusCard
- [X] T025 [US2] Create DevModeWarningBanner component in src/presentation/components/auto-onboard/DevModeWarningBanner.tsx
- [X] T026 [US2] Show DevModeWarningBanner when auto-onboard is enabled (FR-004) in AutoOnboardPanel

**Checkpoint**: User Story 2 complete - Toggle works with optimistic updates and rollback on error

---

## Phase 5: User Story 3 - View Onboarding Metrics (Priority: P2)

**Goal**: Display success/failure statistics with counts and timestamps

**Independent Test**: View metrics panel after onboarding attempts; verify counters and timestamps display

**Acceptance Criteria**:
- FR-012: Display attempts, success, failed, rejected, already_onboarded counts
- FR-013: Display last_success_at and last_failure_at timestamps
- FR-014: Reset Metrics action clears all counters
- FR-015: Metrics update automatically with status polling

### Tests for User Story 3

- [X] T027 [P] [US3] Unit test for resetMetrics API method in tests/unit/api/v1-auto-onboard.test.ts
- [X] T028 [P] [US3] Component test for AutoOnboardMetricsCard in tests/component/auto-onboard/AutoOnboardMetricsCard.test.tsx

### Implementation for User Story 3

- [X] T029 [US3] Add resetMetrics() method to API client in src/infrastructure/api/v1-auto-onboard.ts
- [X] T030 [US3] Create useResetMetrics mutation hook in src/application/hooks/useAutoOnboard.ts
- [X] T031 [US3] Create AutoOnboardMetricsCard component in src/presentation/components/auto-onboard/AutoOnboardMetricsCard.tsx
- [X] T032 [US3] Add counter badges for all metric types to AutoOnboardMetricsCard
- [X] T033 [US3] Add formatted timestamps for last success/failure to AutoOnboardMetricsCard
- [X] T034 [US3] Add Reset Metrics button with confirmation to AutoOnboardMetricsCard
- [X] T035 [US3] Integrate AutoOnboardMetricsCard into AutoOnboardPanel

**Checkpoint**: User Story 3 complete - Metrics display with reset functionality

---

## Phase 6: User Story 4 - View Audit Event History (Priority: P2)

**Goal**: Display paginated timeline of onboarding events with filtering

**Independent Test**: View events panel after devices processed; verify list shows with MAC, stage, outcome, timestamp

**Acceptance Criteria**:
- FR-016: Paginated list of audit events
- FR-017: Show MAC address, stage, outcome, timestamp, error details, duration
- FR-018: Filter events by MAC address
- FR-019: Filter events by time range (since)
- FR-020: Pagination with configurable page size (default 50, max 100)
- FR-021: View events for specific device by MAC

### Tests for User Story 4

- [X] T036 [P] [US4] Unit test for getEvents API method in tests/unit/api/v1-auto-onboard.test.ts
- [X] T037 [P] [US4] Unit test for getEventsByMac API method in tests/unit/api/v1-auto-onboard.test.ts
- [X] T038 [P] [US4] Component test for AuditEventsPanel in tests/component/auto-onboard/AuditEventsPanel.test.tsx

### Implementation for User Story 4

- [X] T039 [US4] Add getEvents() method with filters to API client in src/infrastructure/api/v1-auto-onboard.ts
- [X] T040 [US4] Add getEventsByMac() method to API client in src/infrastructure/api/v1-auto-onboard.ts
- [X] T041 [US4] Create useAutoOnboardEvents hook with pagination in src/application/hooks/useAutoOnboard.ts
- [X] T042 [US4] Create AuditEventsPanel collapsible component in src/presentation/components/auto-onboard/AuditEventsPanel.tsx
- [X] T043 [US4] Add MAC address filter input to AuditEventsPanel
- [X] T043a [US4] Add time range filter (since timestamp) to AuditEventsPanel (FR-019)
- [X] T044 [US4] Add event list table with stage badge, outcome badge, timestamp to AuditEventsPanel
- [X] T045 [US4] Add expandable row for error details (code, message) to AuditEventsPanel
- [X] T046 [US4] Add pagination controls (prev/next, page size) to AuditEventsPanel
- [X] T047 [US4] Add loading skeleton for events list to AuditEventsPanel
- [X] T048 [US4] Integrate AuditEventsPanel into AutoOnboardPanel

**Checkpoint**: User Story 4 complete - Event history with filtering and pagination

---

## Phase 7: User Story 5 - View Configuration Details (Priority: P3)

**Goal**: Display read-only auto-onboard configuration

**Independent Test**: Expand config panel; verify rate limits, subnet allowlist, timeout display

**Acceptance Criteria**:
- FR-022: Display max_per_minute, burst_size, subnet_allowlist, verification_timeout
- FR-023: Configuration is read-only

### Tests for User Story 5

- [X] T049 [P] [US5] Component test for AutoOnboardConfigCard in tests/component/auto-onboard/AutoOnboardConfigCard.test.tsx

### Implementation for User Story 5

- [X] T050 [US5] Create AutoOnboardConfigCard collapsible component in src/presentation/components/auto-onboard/AutoOnboardConfigCard.tsx
- [X] T051 [US5] Display rate limit info (max_per_minute, burst_size) in AutoOnboardConfigCard
- [X] T052 [US5] Display subnet allowlist as comma-separated badges in AutoOnboardConfigCard
- [X] T053 [US5] Display verification timeout in seconds in AutoOnboardConfigCard
- [X] T054 [US5] Add read-only indicator/styling to AutoOnboardConfigCard
- [X] T055 [US5] Integrate AutoOnboardConfigCard into AutoOnboardPanel

**Checkpoint**: User Story 5 complete - Configuration displayed read-only

---

## Phase 8: User Story 6 - Cleanup Old Events (Priority: P3)

**Goal**: Remove old audit events with configurable retention period

**Independent Test**: Click cleanup with 7 days retention; verify old events removed and count shown

**Acceptance Criteria**:
- FR-024: Cleanup action with configurable retention (1-365 days, default 90)

### Tests for User Story 6

- [X] T056 [P] [US6] Unit test for cleanupEvents API method in tests/unit/api/v1-auto-onboard.test.ts
- [X] T057 [P] [US6] Component test for cleanup dialog in tests/component/auto-onboard/AuditEventsPanel.test.tsx

### Implementation for User Story 6

- [X] T058 [US6] Add cleanupEvents() method with days param to API client in src/infrastructure/api/v1-auto-onboard.ts
- [X] T059 [US6] Create useCleanupEvents mutation hook in src/application/hooks/useAutoOnboard.ts
- [X] T060 [US6] Add Cleanup Old Events button to AuditEventsPanel in src/presentation/components/auto-onboard/AuditEventsPanel.tsx
- [X] T061 [US6] Add retention period input (number input, 1-365) to cleanup dialog
- [X] T062 [US6] Add confirmation dialog before cleanup in AuditEventsPanel
- [X] T063 [US6] Show deleted count in success toast after cleanup

**Checkpoint**: User Story 6 complete - Cleanup with configurable retention

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, accessibility, and final integration

### E2E Tests

- [X] T064 [P] E2E test for status view flow in tests/e2e/auto-onboard.spec.ts
- [X] T065 [P] E2E test for enable/disable toggle flow in tests/e2e/auto-onboard.spec.ts
- [X] T066 E2E test for events pagination in tests/e2e/auto-onboard.spec.ts

### Accessibility & Polish

- [X] T067 Verify all Switch components have role="switch", aria-checked, and aria-label attributes (NFR-005)
- [X] T068 Verify keyboard navigation for all interactive elements (NFR-004) - shadcn/ui components have built-in keyboard support
- [X] T069 Add aria-label to toggle switch in AutoOnboardStatusCard
- [X] T070 Add aria-live region for status changes in AutoOnboardPanel
- [X] T071 Verify responsive layout at 768px width (NFR-003) - uses Tailwind responsive utilities
- [X] T072 Run quickstart.md validation - verify all setup steps work - confirmed through tests

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────────────────────────────────────────────┐
                                                                         │
Phase 2: Foundational ──────────────────────────────────────────────────┤
         (BLOCKS all user stories)                                      │
                                                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  User Stories (can run in parallel after Phase 2)                      │
│                                                                        │
│  Phase 3: US1 View Status (P1)  ◄─── MVP START HERE                   │
│  Phase 4: US2 Toggle On/Off (P1) ◄── Depends on US1 StatusCard        │
│                                                                        │
│  Phase 5: US3 View Metrics (P2) ◄── Independent                       │
│  Phase 6: US4 View Events (P2) ◄── Independent                        │
│                                                                        │
│  Phase 7: US5 View Config (P3) ◄── Independent                        │
│  Phase 8: US6 Cleanup Events (P3) ◄── Depends on US4 AuditEventsPanel │
└────────────────────────────────────────────────────────────────────────┘
                                                                         │
Phase 9: Polish ◄───────────────────────────────────────────────────────┘
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 | Foundational (Phase 2) | - |
| US2 | US1 (needs StatusCard) | US3, US4, US5 |
| US3 | Foundational | US2, US4, US5 |
| US4 | Foundational | US2, US3, US5 |
| US5 | Foundational | US2, US3, US4 |
| US6 | US4 (needs AuditEventsPanel) | - |

### Within Each User Story

1. Tests first (if included) - write and verify they FAIL
2. API client methods
3. React hooks
4. UI components
5. Integration into parent component

---

## Parallel Execution Examples

### Phase 1 (All can run in parallel):

```bash
# Launch all Setup tasks together:
Task: T001 "Create Zod schemas in v1-auto-onboard-schemas.ts"
Task: T002 "Add error codes to errors.ts"
Task: T003 "Add query keys to queryClient.ts"
Task: T004 "Create MSW handlers in v1-auto-onboard-handlers.ts"
```

### User Story 1 Tests (All can run in parallel):

```bash
# Launch all US1 tests together:
Task: T009 "Unit test for AutoOnboardStatusSchema"
Task: T010 "Unit test for getStatus API"
Task: T011 "Component test for AutoOnboardStatusCard"
```

### Multiple User Stories (After Phase 2):

```bash
# Developer A: User Story 1 + 2 (P1 features)
# Developer B: User Story 3 (P2 metrics)
# Developer C: User Story 4 (P2 events)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T008)
3. Complete Phase 3: User Story 1 (T009-T017)
4. Complete Phase 4: User Story 2 (T018-T026)
5. **STOP and VALIDATE**: Toggle enable/disable works with status display
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Core toggle feature works (MVP!)
3. Add US3 → Metrics visible
4. Add US4 → Event history available
5. Add US5 → Config transparency
6. Add US6 → Housekeeping capability
7. Polish → Full feature complete

---

## Notes

- [P] tasks = different files, no dependencies, safe to parallelize
- [US#] label maps task to specific user story for traceability
- Polling pauses when tab hidden (useVisibilityAwareInterval)
- Optimistic updates for toggle with rollback on error
- All components use shadcn/ui primitives (Switch, Card, Badge, Alert, Collapsible)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
