# Tasks: Handoff Sentinel Normalization

**Input**: Design documents from `/specs/041-handoff-normalization/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: No test tasks generated — this feature is a data-only correction (markdown frontmatter edits). Validation is performed via existing sentinel tooling and test suite.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No project initialization needed — this feature modifies existing files only.

*Phase skipped: No setup tasks required for markdown-only edits.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational infrastructure needed.

*Phase skipped: All user story tasks operate on existing files with no shared dependencies.*

---

## Phase 3: User Story 1 — Silent Pretest Runs (Priority: P1) MVP

**Goal**: Eliminate the 2 false-positive sentinel warnings that appear during `npm run handoff:detect` by updating incoming handoff statuses to reflect completed/acknowledged work.

**Independent Test**: Run `npm run handoff:detect --quiet` — should exit with code 0 and produce no output.

**Agent**: `agent-handoff`

### Implementation for User Story 1

- [x] T001 [P] [US1] Update `status: "new"` to `status: "done"` in YAML frontmatter of `docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md` (handoff_id: 031-logs-v1-sse). Rationale: SSE logs migration is fully implemented in `src/infrastructure/api/logs.ts`.
- [x] T002 [P] [US1] Update `status: "new"` to `status: "acknowledged"` in YAML frontmatter of `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` (handoff_id: 035-auto-onboard-api). Rationale: Informational API documentation received, no blocking action required from PiDashboard.
- [x] T003 [P] [US1] Update `status: "new"` to `status: "done"` in YAML frontmatter of `specs/032-handoff-sentinel/contracts/handoff-template.md` (handoff_id: 000-template-example). Rationale: Template/example file should not appear as pending work.

**Checkpoint**: After T001-T003, `npm run handoff:detect --quiet` should exit silently with code 0.

---

## Phase 4: User Story 2 — Accurate Handoff Status Tracking (Priority: P2)

**Goal**: Verify that all 11 handoff files have correct statuses reflecting the actual state of work described.

**Independent Test**: Run `npm run handoff:detect -- --verbose` and confirm each handoff shows its correct lifecycle status.

**Agent**: `agent-handoff`

### Implementation for User Story 2

- [x] T004 [US2] Run `npm run handoff:detect -- --verbose` and verify all 11 handoff files pass validation with no errors. Document the output showing: 3 outgoing `new` (legitimate pending requests to PiOrchestrator), 2 `acknowledged`, and 6 `done`.
- [x] T005 [US2] Generate change report in `specs/041-handoff-normalization/CHANGE_REPORT.md` documenting: each file modified (T001-T003) with the specific frontmatter change, rationale for each status assignment, all 8 files audited but not changed (with reason why status is correct), and sentinel verification output.

**Checkpoint**: Change report complete. Verbose sentinel output shows correct statuses for all handoffs.

---

## Phase 5: User Story 3 — Test Suite Stability (Priority: P3)

**Goal**: Confirm no regressions in the test suite after handoff normalization.

**Independent Test**: Run `npm test` — all unit, component, and integration tests pass with no new failures.

**Agent**: `agent-test`

### Implementation for User Story 3

- [x] T006 [US3] Run `npm run handoff:detect --quiet` and verify exit code is 0 with no output (sentinel validation pass).
- [x] T007 [US3] Run `npm test` and verify all unit, component, and integration tests pass with no new failures compared to pre-normalization baseline.

**Checkpoint**: Full test suite green. Sentinel clean. Feature complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US1)**: No dependencies — can start immediately
- **Phase 4 (US2)**: Depends on Phase 3 completion (files must be modified before verification)
- **Phase 5 (US3)**: Depends on Phase 3 completion (files must be modified before test validation)

### User Story Dependencies

- **User Story 1 (P1)**: Independent — edit 3 markdown files
- **User Story 2 (P2)**: Depends on US1 — verification of changes made in US1
- **User Story 3 (P3)**: Depends on US1 — test validation of changes made in US1

### Within Each User Story

- T001, T002, T003 are all [P] — they edit different files and can run in parallel
- T004 depends on T001-T003 (verifies the edits)
- T005 depends on T004 (report includes verification output)
- T006 depends on T001-T003 (validates sentinel after edits)
- T007 depends on T001-T003 (validates test suite after edits)

### Parallel Opportunities

- **T001 + T002 + T003**: All three frontmatter edits can execute in parallel (different files, no dependencies)
- **T004 + T006**: Both are verification commands that can run in parallel after T001-T003 complete
- **T005 + T007**: Report generation and test suite can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all 3 frontmatter edits in parallel (different files):
agent-handoff: "Update status in docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md"
agent-handoff: "Update status in docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md"
agent-handoff: "Update status in specs/032-handoff-sentinel/contracts/handoff-template.md"
```

## Parallel Example: Verification (after US1 complete)

```bash
# Launch verification tasks in parallel:
agent-test:    "Run npm run handoff:detect --quiet (T006)"
agent-test:    "Run npm test (T007)"
agent-handoff: "Run npm run handoff:detect -- --verbose and generate change report (T004, T005)"
```

---

## Swarm Agent Assignment

| Agent | Tasks | Role |
|-------|-------|------|
| `agent-handoff` | T001, T002, T003, T004, T005 | Edit frontmatter + verify + write report |
| `agent-test` | T006, T007 | Run sentinel validation + test suite |

**Execution flow**:
1. `agent-handoff` runs T001 + T002 + T003 in parallel
2. After completion: `agent-handoff` runs T004 → T005, `agent-test` runs T006 + T007 in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Execute T001 + T002 + T003 (3 frontmatter edits)
2. **STOP and VALIDATE**: Run `npm run handoff:detect --quiet` — should be silent
3. Feature delivers immediate value: no more sentinel noise

### Incremental Delivery

1. User Story 1 → Edit files → Sentinel goes quiet (MVP!)
2. User Story 2 → Verify all statuses + generate change report
3. User Story 3 → Run full test suite → Confirm zero regressions
4. Each story adds confidence without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All changes are YAML frontmatter `status` field only — no code modifications
- The `.handoff-state.json` file regenerates automatically on next `handoff:detect` run
- 3 outgoing handoffs remain with `new` status intentionally (legitimate pending requests to PiOrchestrator)
