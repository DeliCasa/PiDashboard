# Tasks: Handoff Sentinel (032)

**Input**: Design documents from `/specs/032-handoff-sentinel/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `scripts/handoff/`, `tests/` at repository root
- This is a Node.js scripts feature - all source in `scripts/handoff/`, tests in `tests/unit/handoff/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [x] T001 Install dependencies: `npm install gray-matter fast-glob chalk tsx --save-dev`
- [x] T002 [P] Create scripts/handoff/ directory structure
- [x] T003 [P] Add `.handoff-state.json` to .gitignore
- [x] T004 [P] Create TypeScript types file in scripts/handoff/types.ts with all interfaces from data-model.md

**Checkpoint**: Development environment ready for implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Core Utilities

- [x] T005 Implement glob pattern scanner in scripts/handoff/utils.ts (scanHandoffPaths function)
- [x] T006 [P] Implement frontmatter parser in scripts/handoff/utils.ts (parseHandoffFile function using gray-matter)
- [x] T007 [P] Implement Zod schema for HandoffFrontmatter in scripts/handoff/validate.ts (from contracts/handoff-schema.yaml)
- [x] T008 Implement validation function in scripts/handoff/validate.ts (validateHandoff function)
- [x] T009 [P] Implement terminal output formatter in scripts/handoff/utils.ts (formatOutput, formatBox using chalk)
- [x] T010 Add error codes enum in scripts/handoff/types.ts (INVALID_YAML, MISSING_FIELD, INVALID_FORMAT, etc.)

**Checkpoint**: Foundation ready - utilities can parse, validate, and format handoff documents

---

## Phase 3: User Story 1 - Incoming Handoff Detection (Priority: P1) MVP

**Goal**: Scan for unacknowledged incoming handoffs and display warnings during dev/test

**Independent Test**: Add a handoff to `docs/HANDOFF_*.md` with `status: new`, run `npm run handoff:detect`, verify warning displays

### Implementation for User Story 1

- [x] T011 [US1] Create detection core in scripts/handoff/detect.ts (detectHandoffs function)
- [x] T012 [US1] Implement status filtering logic in scripts/handoff/detect.ts (filter by new, in_progress, blocked)
- [x] T013 [US1] Implement direction filtering in scripts/handoff/detect.ts (filter incoming to PiDashboard)
- [x] T014 [US1] Implement summary output in scripts/handoff/detect.ts (formatDetectionSummary function)
- [x] T015 [US1] Add CLI argument parsing in scripts/handoff/detect.ts (--quiet, --verbose flags)
- [x] T016 [US1] Implement main() function in scripts/handoff/detect.ts with exit codes
- [x] T017 [US1] Add npm scripts to package.json: `handoff:detect`, `handoff:list`
- [x] T018 [US1] Verify detection works via manual test: add test handoff, run `npm run handoff:detect`

**Checkpoint**: User Story 1 complete - developers can detect incoming handoffs with `npm run handoff:detect`

---

## Phase 4: User Story 2 - Outgoing Handoff Generation (Priority: P1)

**Goal**: Generate standardized handoff documents for PiOrchestrator

**Independent Test**: Run `npm run handoff:generate`, provide feature details, verify complete document created in docs/

### Implementation for User Story 2

- [x] T019 [US2] Create generator core in scripts/handoff/generate.ts (generateHandoff function)
- [x] T020 [US2] Implement template loading from specs/032-handoff-sentinel/contracts/handoff-template.md
- [x] T021 [US2] Implement frontmatter population in scripts/handoff/generate.ts (auto-fill direction, from_repo, created_at)
- [x] T022 [US2] Implement handoff_id generation from feature number and slug
- [x] T023 [US2] Implement interactive prompts in scripts/handoff/generate.ts (feature number, slug, summary, requirements)
- [x] T024 [US2] Implement file writing with proper naming convention (HANDOFF_NNN_slug.md)
- [x] T025 [US2] Add npm script to package.json: `handoff:generate`
- [x] T026 [US2] Verify generation works via manual test: run generator, check output file

**Checkpoint**: User Story 2 complete - developers can generate outgoing handoffs with `npm run handoff:generate`

---

## Phase 5: User Story 3 - Handoff Status Management (Priority: P2)

**Goal**: Track handoff lifecycle through status changes in frontmatter

**Independent Test**: Edit handoff status from `new` to `acknowledged`, run detection, verify it no longer surfaces

### Implementation for User Story 3

- [x] T027 [US3] Implement status transition validation in scripts/handoff/validate.ts (validateStatusTransition function)
- [x] T028 [US3] Update detection to respect acknowledged status in scripts/handoff/detect.ts
- [x] T029 [US3] Implement blocked status distinct display in scripts/handoff/detect.ts (warning vs info)
- [x] T030 [US3] Document status management in quickstart.md update

**Checkpoint**: User Story 3 complete - status changes affect detection behavior correctly

---

## Phase 6: User Story 4 - CI/CD Integration (Priority: P2)

**Goal**: Detection can fail CI builds when unacknowledged handoffs exist

**Independent Test**: Run `npm run handoff:detect -- --strict` with unacknowledged handoff, verify exit code 1

### Implementation for User Story 4

- [x] T031 [US4] Implement --strict flag in scripts/handoff/detect.ts (exit 1 on pending handoffs)
- [x] T032 [US4] Implement --json flag in scripts/handoff/detect.ts (JSON output for tooling)
- [x] T033 [P] [US4] Create GitHub Actions workflow example in .github/workflows/handoff-check.yml
- [x] T034 [US4] Test CI flags: `npm run handoff:detect -- --strict --json`

**Checkpoint**: User Story 4 complete - CI can enforce handoff acknowledgment

---

## Phase 7: User Story 5 - Handoff Change Summary (Priority: P3)

**Goal**: Show what handoffs have changed since last detection run

**Independent Test**: Run detection twice with new handoff added between runs, verify "new since last check" indicator

### Implementation for User Story 5

- [x] T035 [US5] Implement state file reading/writing in scripts/handoff/state.ts (loadState, saveState)
- [x] T036 [US5] Implement content hash comparison in scripts/handoff/state.ts (hasContentChanged)
- [x] T037 [US5] Implement "new since last run" detection in scripts/handoff/detect.ts
- [x] T038 [US5] Update summary output to distinguish "new since last check" vs "pending but seen"
- [x] T039 [US5] Test change detection: add handoff, run detect, add another, run again

**Checkpoint**: User Story 5 complete - developers see what changed since their last check

---

## Phase 8: Polish & Integration

**Purpose**: Final integration, npm hooks, and documentation

### npm Hook Integration

- [x] T040 Add predev hook to package.json: `"predev": "npx tsx scripts/handoff/detect.ts --quiet || true"`
- [x] T041 Add pretest hook to package.json: `"pretest": "npx tsx scripts/handoff/detect.ts --quiet || true"`
- [x] T042 Test hooks work: run `npm run dev`, verify handoff check runs first

### Claude Code Skill (Optional)

- [x] T043 [P] Create Claude Code skill in .claude/commands/handoff-generate.md

### Documentation & Cleanup

- [x] T044 [P] Update CLAUDE.md with handoff commands documentation
- [x] T045 Run full validation: test all npm scripts (handoff:detect, handoff:generate, handoff:list)
- [x] T046 Verify existing handoffs (docs/HANDOFF_*.md) pass validation or fix them (one example updated)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1): Can start immediately after Foundational
  - US2 (P1): Can run in parallel with US1 (different files)
  - US3 (P2): Depends on US1 detection logic
  - US4 (P2): Depends on US1 detection logic
  - US5 (P3): Depends on US1 detection logic
- **Polish (Phase 8)**: Depends on US1-US4 being complete (US5 optional for MVP)

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational - Core detection, can proceed first
- **User Story 2 (P1)**: Requires Foundational - Standalone generator, can run in parallel with US1
- **User Story 3 (P2)**: Requires US1 detection to be functional
- **User Story 4 (P2)**: Requires US1 detection to be functional
- **User Story 5 (P3)**: Requires US1 detection to be functional

### Parallel Opportunities

- Setup tasks T002-T004 can run in parallel
- Foundational tasks T006-T007, T009-T010 can run in parallel
- User Stories 1 & 2 can run in parallel after Foundational (different files)
- User Stories 3, 4, 5 all depend on US1 but can run in parallel with each other
- Polish tasks T043-T044 can run in parallel

---

## Parallel Example: User Stories 1 & 2 Together

```bash
# After Foundational phase completes, launch both P1 stories in parallel:

# User Story 1 - Detection (detect.ts)
Task: "Create detection core in scripts/handoff/detect.ts"
Task: "Implement status filtering logic in scripts/handoff/detect.ts"

# User Story 2 - Generation (generate.ts)
Task: "Create generator core in scripts/handoff/generate.ts"
Task: "Implement template loading from contracts/handoff-template.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Detection
4. **STOP and VALIDATE**: Test detection with real handoff
5. Developer can now see incoming handoffs

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Detection works (MVP!)
3. Add User Story 2 → Generation works
4. Add User Story 3 → Status management works
5. Add User Story 4 → CI integration works
6. Add User Story 5 → Change tracking works
7. Each story adds value without breaking previous stories

### Full Implementation (Recommended)

With single developer:

1. Complete Setup + Foundational sequentially (~20 min)
2. Complete User Stories 1 & 2 sequentially (~60 min)
3. Complete User Stories 3 & 4 (build on US1) (~30 min)
4. Complete User Story 5 (optional enhancement) (~20 min)
5. Complete Polish phase (~15 min)
6. Total estimated time: ~2.5 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each phase or user story completion
- Stop at any checkpoint to validate story independently
- Tests not included in this task list (not explicitly requested in spec)
- Manual testing is required to validate script behavior
