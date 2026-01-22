# Tasks: Handoff Consumption Workflow

**Input**: Design documents from `/specs/033-handoff-consumption/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests required per FR-013/FR-014/FR-015 (API client, schema validation, integration/smoke tests).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and consumption-specific types

- [x] T001 Create `scripts/handoff/types-consume.ts` with consumption-specific types (WorkItemCategory, ExtractedRequirement, ConsumptionPlanFrontmatter, ConsumptionReportFrontmatter)
- [x] T002 [P] Add npm scripts to package.json: `handoff:consume` with --discover, --plan, --complete, --close, --block flags
- [x] T003 [P] Create `docs/handoffs/` directory for consumption reports (add .gitkeep)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create `scripts/handoff/extract.ts` skeleton with exported interface (parseHandoffToRequirements, categorizeRequirement)
- [x] T005 [P] Create `scripts/handoff/plan-generator.ts` skeleton with exported interface (generateConsumptionPlan)
- [x] T006 [P] Create `scripts/handoff/report.ts` skeleton with exported interface (generateConsumptionReport)
- [x] T007 [P] Create `scripts/handoff/consume.ts` skeleton with CLI entry point (parseArgs, main)
- [x] T008 Implement shared utility: requirementCategoryToPriority() mapping in `scripts/handoff/types-consume.ts`

**Checkpoint**: Foundation ready - skeletons in place, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Discover Unresolved Handoffs (Priority: P1) 🎯 MVP

**Goal**: List all incoming handoffs from PiOrchestrator with unresolved status (`new`, `in_progress`, `blocked`)

**Independent Test**: Run `npm run handoff:consume -- --discover` and verify it lists incoming handoffs sorted by status priority then date.

### Tests for User Story 1

- [x] T009 [P] [US1] Unit test for discovery filtering in `tests/unit/handoff/consume.test.ts` (filter by direction=incoming, to_repo=PiDashboard)
- [x] T010 [P] [US1] Unit test for discovery sorting in `tests/unit/handoff/consume.test.ts` (new → in_progress → blocked, then newest first)

### Implementation for User Story 1

- [x] T011 [US1] Implement `discoverIncomingHandoffs()` in `scripts/handoff/consume.ts` using Feature 032's scanner
- [x] T012 [US1] Implement `filterUnresolvedHandoffs()` in `scripts/handoff/consume.ts` (status != done, != acknowledged)
- [x] T013 [US1] Implement `sortByPriorityAndDate()` in `scripts/handoff/consume.ts`
- [x] T014 [US1] Implement `formatDiscoveryOutput()` with chalk table formatting (status, date, tags, title, path)
- [x] T015 [US1] Wire up `--discover` flag in CLI to call discovery workflow

**Checkpoint**: `npm run handoff:consume -- --discover` returns sorted list of incoming handoffs

---

## Phase 4: User Story 2 - Extract Actionable Requirements (Priority: P1)

**Goal**: Parse handoff content and generate structured consumption plan at `specs/<handoff_id>-consumption/plan.md`

**Independent Test**: Run `npm run handoff:consume -- --plan 031-backend-gaps` and verify consumption plan is created with categorized requirements.

### Tests for User Story 2

- [x] T016 [P] [US2] Unit test for requirement extraction in `tests/unit/handoff/extract.test.ts` (parse frontmatter.requires, acceptance)
- [x] T017 [P] [US2] Unit test for requirement categorization in `tests/unit/handoff/extract.test.ts` (api_client, schema, ui, logging)
- [x] T018 [P] [US2] Unit test for plan generation in `tests/unit/handoff/plan-generator.test.ts` (valid frontmatter, checklist, files, test plan)

### Implementation for User Story 2

- [x] T019 [US2] Implement `parseHandoffToRequirements()` in `scripts/handoff/extract.ts` (extract from frontmatter.requires, acceptance, content)
- [x] T020 [US2] Implement `categorizeRequirement()` in `scripts/handoff/extract.ts` using keyword matching (route/endpoint → api_client, type/schema → schema, etc.)
- [x] T021 [US2] Implement `assignPriorities()` in `scripts/handoff/extract.ts` (api_client=1, schema=2, ui=3, logging=4, testing=5, deployment=6)
- [x] T022 [US2] Implement `generateRequirementId()` in `scripts/handoff/extract.ts` (REQ-001, REQ-002, etc.)
- [x] T023 [US2] Implement `inferImpactedFiles()` in `scripts/handoff/extract.ts` based on category (api_client → src/infrastructure/api/, etc.)
- [x] T024 [US2] Implement `generateConsumptionPlan()` in `scripts/handoff/plan-generator.ts` using consumption-plan-template.md
- [x] T025 [US2] Implement `writeConsumptionPlan()` in `scripts/handoff/plan-generator.ts` (create specs/<handoff_id>-consumption/plan.md)
- [x] T026 [US2] Wire up `--plan <handoff_id>` flag in CLI to call plan generation workflow
- [x] T026a [US2] Add validation guard in `scripts/handoff/plan-generator.ts` - warn if handoff suggests removing validation (FR-012 enforcement)

**Checkpoint**: `npm run handoff:consume -- --plan <id>` creates consumption plan with categorized checklist

---

## Phase 5: User Story 3 - Implement Contract Changes (Priority: P1)

**Goal**: Track implementation progress via checklist and update plan status

**Independent Test**: Mark a requirement complete with `npm run handoff:consume -- --complete <id> REQ-001` and verify checklist updates.

### Tests for User Story 3

- [x] T027 [P] [US3] Unit test for requirement completion in `tests/unit/handoff/consume.test.ts` (update checklist, increment requirements_done)
- [x] T028 [P] [US3] Unit test for plan status transitions in `tests/unit/handoff/consume.test.ts` (pending → in_progress → testing → done)

### Implementation for User Story 3

- [x] T029 [US3] Implement `parseConsumptionPlan()` in `scripts/handoff/plan-generator.ts` (read existing plan, parse frontmatter + checklist)
- [x] T030 [US3] Implement `markRequirementComplete()` in `scripts/handoff/consume.ts` (update checkbox, increment counter)
- [x] T031 [US3] Implement `updatePlanStatus()` in `scripts/handoff/consume.ts` (auto-transition based on progress)
- [x] T032 [US3] Implement `writeUpdatedPlan()` in `scripts/handoff/plan-generator.ts` (preserve content, update frontmatter)
- [x] T033 [US3] Wire up `--complete <handoff_id> <req_id>` flag in CLI
- [x] T033a [US3] Implement `detectBackwardsCompatMode()` in `scripts/handoff/extract.ts` - check handoff frontmatter for `breaking_change` flag, default to backwards-compat (FR-011 enforcement)

**Checkpoint**: Individual requirements can be marked complete, plan status auto-updates

---

## Phase 6: User Story 4 - Prove Correctness with Tests (Priority: P2)

**Goal**: Track test status and prevent closure if tests fail

**Independent Test**: Attempt to close a handoff with failing tests and verify it's blocked.

### Tests for User Story 4

- [x] T034 [P] [US4] Unit test for test status tracking in `tests/unit/handoff/consume.test.ts` (pending/written/passing/failing)
- [x] T035 [P] [US4] Unit test for close validation in `tests/unit/handoff/consume.test.ts` (block if tests failing)

### Implementation for User Story 4

- [x] T036 [US4] Implement `runVerificationCommands()` in `scripts/handoff/consume.ts` (execute test plan commands, capture pass/fail)
- [x] T037 [US4] Implement `validateTestsPassing()` in `scripts/handoff/consume.ts` (check all verification results)
- [x] T038 [US4] Implement `formatVerificationResults()` in `scripts/handoff/consume.ts` (table output: command, expected, actual, status)
- [x] T039 [US4] Add test status to consumption plan tracking (TestPlanItem.status field)

**Checkpoint**: Verification commands execute and block closure on failure

---

## Phase 7: User Story 5 - Close the Loop with Documentation (Priority: P2)

**Goal**: Generate consumption report and update handoff status to `done`

**Independent Test**: Close a handoff with `npm run handoff:consume -- --close <id>` and verify report created, status updated.

### Tests for User Story 5

- [x] T040 [P] [US5] Unit test for report generation in `tests/unit/handoff/report.test.ts` (all sections present, commits/PRs populated)
- [x] T041 [P] [US5] Unit test for handoff status update in `tests/unit/handoff/report.test.ts` (status=done, related_commits populated)

### Implementation for User Story 5

- [x] T042 [US5] Implement `gatherChangeSummary()` in `scripts/handoff/report.ts` (git diff --stat, files changed, lines added/removed)
- [x] T043 [US5] Implement `gatherRelatedCommits()` in `scripts/handoff/report.ts` (git log --oneline since consumption plan created)
- [x] T044 [US5] Implement `generateConsumptionReport()` in `scripts/handoff/report.ts` using consumption-report-template.md
- [x] T045 [US5] Implement `writeConsumptionReport()` in `scripts/handoff/report.ts` (write to docs/handoffs/CONSUMPTION_REPORT_<id>.md)
- [x] T046 [US5] Implement `updateHandoffStatus()` in `scripts/handoff/report.ts` (set status=done, populate related_commits/related_prs)
- [x] T047 [US5] Wire up `--close <handoff_id>` flag in CLI to call closure workflow

**Checkpoint**: `npm run handoff:consume -- --close <id>` generates report and marks handoff done

---

## Phase 8: User Story 6 - Generate Outgoing Handoffs for Blockers (Priority: P3)

**Goal**: Generate outgoing handoff when marking as blocked due to backend dependency

**Independent Test**: Block a handoff with `npm run handoff:consume -- --block <id> "reason"` and verify outgoing handoff created.

### Tests for User Story 6

- [x] T048 [P] [US6] Unit test for blocker handoff generation in `tests/unit/handoff/report.test.ts` (valid frontmatter, links to blocked handoff)
- [x] T049 [P] [US6] Unit test for blocked status update in `tests/unit/handoff/report.test.ts` (status=blocked, blocker_handoff populated)

### Implementation for User Story 6

- [x] T050 [US6] Implement `generateBlockerHandoff()` in `scripts/handoff/report.ts` (create outgoing handoff to PiOrchestrator)
- [x] T051 [US6] Implement `updateHandoffAsBlocked()` in `scripts/handoff/report.ts` (set status=blocked, blocker_reason, outgoing handoff link)
- [x] T052 [US6] Implement `generateBlockedReport()` in `scripts/handoff/report.ts` (consumption report with blocker section)
- [x] T053 [US6] Wire up `--block <handoff_id> "<reason>"` flag in CLI

**Checkpoint**: `npm run handoff:consume -- --block <id> "reason"` creates outgoing handoff and updates status

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, documentation, and cleanup

- [x] T054 [P] Integration test for full consumption workflow in `tests/integration/handoff/consumption-workflow.test.ts`
- [x] T055 [P] Update quickstart.md with actual command outputs (verify examples work)
- [x] T056 [P] Add --verbose flag for detailed discovery output (include done/acknowledged handoffs)
- [x] T057 [P] Add --json flag for machine-readable output (discovery, plan, report)
- [x] T058 Add help text and usage examples to consume.ts CLI
- [x] T059 Run full workflow on existing handoff documents to validate end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1/US2/US3 (P1) should complete before US4/US5 (P2)
  - US6 (P3) can proceed after US5 (needs report infrastructure)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Discover)**: Can start after Phase 2 - No dependencies
- **US2 (Extract)**: Can start after Phase 2 - No dependencies, parallel with US1
- **US3 (Implement)**: Depends on US2 (needs consumption plan)
- **US4 (Tests)**: Depends on US3 (needs plan tracking)
- **US5 (Close)**: Depends on US4 (needs verification)
- **US6 (Block)**: Depends on US5 (reuses report infrastructure)

### Parallel Opportunities

- T002, T003 can run parallel with T001
- T004, T005, T006, T007 can run in parallel
- T009, T010 (US1 tests) can run in parallel
- T016, T017, T018 (US2 tests) can run in parallel
- US1 and US2 implementation can proceed in parallel after Phase 2

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 - Discovery
4. Complete Phase 4: US2 - Extraction/Planning
5. **STOP and VALIDATE**: Test discovery and plan generation independently
6. Demo: `npm run handoff:consume -- --discover` and `--plan`

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Discovery) → Test → Demo (MVP #1)
3. Add US2 (Extract/Plan) → Test → Demo (MVP #2)
4. Add US3 (Tracking) → Test → Demo (MVP #3)
5. Add US4 + US5 (Tests + Close) → Test → Demo (Full workflow)
6. Add US6 (Blockers) → Test → Complete feature

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Reuse Feature 032 infrastructure: scanner, validator, types, utilities
- Consumption plans use specs/<handoff_id>-consumption/plan.md pattern
- Consumption reports use docs/handoffs/CONSUMPTION_REPORT_<handoff_id>.md pattern
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
