# Tasks: Project Constitution

**Input**: Design documents from `/specs/036-project-constitution/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), quickstart.md (complete)

**Tests**: No code tests needed - this is a documentation-only feature. Validation is done by reviewing the constitution updates.

**Organization**: Tasks are grouped by user story to enable independent implementation. Each story's documentation can be reviewed and approved separately.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different sections, no dependencies)
- **[Story]**: Which user story this task supports (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This feature updates documentation files only:
- Primary target: `.specify/memory/constitution.md`
- Reference doc: `docs/contracts/API-TYPE-CONTRACTS.md`
- Cross-reference: `CLAUDE.md`

---

## Phase 1: Setup

**Purpose**: Prepare for constitution amendments

- [x] T001 Read current constitution at .specify/memory/constitution.md to understand existing structure
- [x] T002 Read existing API contracts document at docs/contracts/API-TYPE-CONTRACTS.md for reference
- [x] T003 Create backup of current constitution (note current version 1.0.0 in git history)

---

## Phase 2: Foundational (API Type Contract Subsection)

**Purpose**: Add core API contract rules to Section II that ALL user stories depend on

**⚠️ CRITICAL**: All user story documentation builds on this subsection

- [x] T004 Add Section II.A header "Zod Schema Conventions" to .specify/memory/constitution.md
- [x] T005 [P] Document schema naming rule: {Entity}Schema pattern in Section II.A of .specify/memory/constitution.md
- [x] T006 [P] Document field mapping rule: Go JSON tags → snake_case in Section II.A of .specify/memory/constitution.md
- [x] T007 [P] Document timestamp rule: RFC3339 → z.string() in Section II.A of .specify/memory/constitution.md
- [x] T008 [P] Document optional field rule: omitempty → .optional() in Section II.A of .specify/memory/constitution.md
- [x] T009 Add Section II.B header "Enum Synchronization" to .specify/memory/constitution.md
- [x] T010 Document PiOrchestrator-first rule for enum additions in Section II.B of .specify/memory/constitution.md
- [x] T011 Add CameraStatus as canonical example in Section II.B of .specify/memory/constitution.md
- [x] T012 Add cross-reference to docs/contracts/API-TYPE-CONTRACTS.md in Section II of .specify/memory/constitution.md

**Checkpoint**: Core API contract rules documented - user story specific documentation can now be added

---

## Phase 3: User Story 1 - Developer Adds New API Integration (Priority: P1) 🎯 MVP

**Goal**: Document the complete workflow for adding a new API integration

**Independent Test**: A developer can successfully follow the documented checklist to add a new API endpoint without additional guidance

### Implementation for User Story 1

- [x] T013 [US1] Add Section II.C header "API Integration Workflow" to .specify/memory/constitution.md
- [x] T014 [US1] Document API integration checklist with 7 steps in Section II.C of .specify/memory/constitution.md
- [x] T015 [US1] Add code examples for each step (Zod schema, API client, hook) in Section II.C of .specify/memory/constitution.md
- [x] T016 [US1] Document validation helper usage (safeParseWithErrors, validateOrThrow, validateWithFallback) in Section II.C of .specify/memory/constitution.md
- [x] T017 [US1] Add file location reference table (schemas.ts, entities.ts, hooks/) in Section II.C of .specify/memory/constitution.md

**Checkpoint**: API integration workflow fully documented - can be tested by having a developer follow it

---

## Phase 4: User Story 2 - Developer Responds to Breaking Change (Priority: P2)

**Goal**: Document the response procedure when PiOrchestrator makes breaking changes

**Independent Test**: A developer can successfully update schemas in response to a simulated breaking change by following the documented procedure

### Implementation for User Story 2

- [x] T018 [US2] Add Section II.D header "Breaking Change Response" to .specify/memory/constitution.md
- [x] T019 [US2] Document step-by-step response procedure (5 steps) in Section II.D of .specify/memory/constitution.md
- [x] T020 [US2] Document handoff document consumption workflow in Section II.D of .specify/memory/constitution.md
- [x] T021 [US2] Add cross-reference to handoff system docs in Section II.D of .specify/memory/constitution.md

**Checkpoint**: Breaking change response procedure documented

---

## Phase 5: User Story 3 - Developer Runs Tests Before Commit (Priority: P2)

**Goal**: Ensure quality gates are clearly documented and easy to follow

**Independent Test**: Running documented test commands catches intentional errors

### Implementation for User Story 3

- [x] T022 [US3] Review and enhance Section III "Test Discipline" in .specify/memory/constitution.md
- [x] T023 [US3] Add explicit contract test requirements to Section III of .specify/memory/constitution.md
- [x] T024 [US3] Document test file location convention (tests/integration/contracts/) in Section III of .specify/memory/constitution.md
- [x] T025 [US3] Add mock data validation requirement in Section III of .specify/memory/constitution.md
- [x] T026 [US3] Document pre-commit test commands with expected output in Section III of .specify/memory/constitution.md

**Checkpoint**: Quality gate documentation complete and explicit

---

## Phase 6: User Story 4 - New Team Member Onboards (Priority: P3)

**Goal**: Ensure the constitution is accessible and educational for new developers

**Independent Test**: A new developer can understand project conventions by reading the constitution alone

### Implementation for User Story 4

- [x] T027 [US4] Add "Quick Start for New Developers" appendix to .specify/memory/constitution.md
- [x] T028 [US4] Add architecture diagram or description for hexagonal structure in appendix of .specify/memory/constitution.md
- [x] T029 [US4] Add common gotchas section with Zod schema mistakes in appendix of .specify/memory/constitution.md
- [x] T030 [US4] Add cross-reference to CLAUDE.md for runtime guidance in appendix of .specify/memory/constitution.md

**Checkpoint**: Onboarding documentation complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final updates and version increment

- [x] T031 [P] Update version number to 1.1.0 in .specify/memory/constitution.md
- [x] T032 [P] Update "Last Amended" date to 2026-01-22 in .specify/memory/constitution.md
- [x] T033 [P] Add Sync Impact Report comment block at top of .specify/memory/constitution.md
- [x] T034 Update CLAUDE.md to reference new constitution sections if needed
- [x] T035 Review all cross-references between constitution and API-TYPE-CONTRACTS.md
- [x] T036 Run quickstart.md validation: verify all documented commands work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational (can run in parallel with US1)
- **User Story 3 (Phase 5)**: Depends on Foundational (can run in parallel with US1, US2)
- **User Story 4 (Phase 6)**: Depends on all other user stories (references their sections)
- **Polish (Phase 7)**: Depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Depends on Foundational - Independent of US1
- **User Story 3 (P2)**: Depends on Foundational - Independent of US1, US2
- **User Story 4 (P3)**: Depends on US1, US2, US3 (references their sections in "Quick Start")

### Within Each Phase

- Tasks marked [P] within the same phase can run in parallel
- Sequential tasks must complete in order

### Parallel Opportunities

**Phase 2 (Foundational)**: T005, T006, T007, T008 can run in parallel (different rules)

**User Stories 1, 2, 3**: Can run in parallel after Foundational completes (independent sections)

**Phase 7 (Polish)**: T031, T032, T033 can run in parallel (metadata updates)

---

## Parallel Example: Phase 2 Foundational

```bash
# After T004 (header added), run these in parallel:
Task: "Document schema naming rule: {Entity}Schema pattern"
Task: "Document field mapping rule: Go JSON tags → snake_case"
Task: "Document timestamp rule: RFC3339 → z.string()"
Task: "Document optional field rule: omitempty → .optional()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T012) - CRITICAL
3. Complete Phase 3: User Story 1 (T013-T017)
4. **STOP and VALIDATE**: Have a developer test the API integration workflow
5. Commit as MVP if validated

### Incremental Delivery

1. Setup + Foundational → Core rules documented
2. Add User Story 1 → API integration workflow complete
3. Add User Story 2 → Breaking change response documented
4. Add User Story 3 → Quality gates enhanced
5. Add User Story 4 → Onboarding appendix added
6. Polish → Version increment, cross-references verified

### Single Author Strategy (Recommended for Docs)

Since this is documentation, sequential completion is recommended:
1. Complete all phases in order
2. Review entire constitution for consistency
3. Single commit with all changes
4. Request review as a complete package

---

## Notes

- [P] tasks = can be written in any order (different subsections)
- [Story] label maps documentation to the user story it enables
- Each user story phase adds documentation that directly addresses its acceptance scenarios
- Commit after completing each phase checkpoint
- Constitution updates should maintain consistent formatting and voice
- All code examples should be copy-paste ready and tested

---

## Task Summary

| Phase | Tasks | Parallel |
|-------|-------|----------|
| Setup | T001-T003 | 0 |
| Foundational | T004-T012 | 4 |
| US1 (P1) | T013-T017 | 0 |
| US2 (P2) | T018-T021 | 0 |
| US3 (P2) | T022-T026 | 0 |
| US4 (P3) | T027-T030 | 0 |
| Polish | T031-T036 | 3 |
| **Total** | **36 tasks** | **7 parallel opportunities** |

**MVP Scope**: Phases 1-3 (17 tasks) delivers a complete API integration workflow
