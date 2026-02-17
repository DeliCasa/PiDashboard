# Requirements Checklist: Live Dashboard Inventory Validation

## Spec Quality

- [x] All user stories have priorities (P1/P2)
- [x] All user stories have independent test descriptions
- [x] All user stories have Given/When/Then acceptance scenarios
- [x] Edge cases are identified and documented
- [x] Functional requirements are numbered (FR-001 to FR-014)
- [x] Success criteria are numbered and measurable (SC-001 to SC-006)
- [x] Scope boundaries clearly defined (in/out)
- [x] Assumptions documented

## Plan Quality

- [x] Constitution check passes all 4 gates
- [x] Project structure shows all new/modified files
- [x] Design decisions documented with rationale (D1-D6)
- [x] Work breakdown has clear phases
- [x] No production code changes (test infrastructure only)
- [x] Post-design re-check validated Phase 1 artifacts

## Task Quality

- [x] Tasks grouped by user story (Phases 3-7)
- [x] Exact file paths in task descriptions
- [x] [P] markers for parallel-safe tasks
- [x] [US*] markers for story traceability
- [x] Phase dependencies documented
- [x] Parallel execution opportunities identified
- [x] MVP-first strategy defined (US1 + US2)
- [x] All tasks follow checklist format: `- [ ] [T###] [P?] [US?] Description with file path`

## Task Format Validation

| Check | Result |
|-------|--------|
| All tasks start with `- [ ]` checkbox | PASS (25/25) |
| All tasks have sequential T### ID | PASS (T001-T025) |
| [P] markers only on parallelizable tasks | PASS |
| [US*] labels on all story-phase tasks | PASS |
| Setup/Foundational/Polish tasks have NO [US*] | PASS |
| All tasks include file paths or commands | PASS |

## FR-to-Task Traceability

| FR | Description | Primary Task(s) | Verification |
|----|-------------|-----------------|-------------|
| FR-001 | `LIVE_E2E=1` opt-in flag | T006 (scaffold) | T011 (SKIP test) |
| FR-002 | `LIVE_BASE_URL` env var + default | T005 (config), T006 (scaffold) | T012 (SKIP test) |
| FR-003 | Preflight check (reachability, API, data) | T004 (implementation) | T013 (diagnostic) |
| FR-004 | SKIP with human-readable reasons | T004 (reasons), T006 (wiring) | T011, T012 |
| FR-005 | SKIP immediately when not set | T006 (env check) | T011 |
| FR-006 | Correction workflow validation | T007 (view), T008 (submit) | Screenshots |
| FR-007 | Approve-as-is workflow | T009 (approve) | Screenshots |
| FR-008 | Screenshots at workflow steps | T007-T010, T019 | Artifacts |
| FR-009 | Traces and video on failure | T005 (`trace: 'on'` config) | Config review |
| FR-010 | Default CI not affected | T016 (isolation check) | CI run |
| FR-011 | CI live job with artifact upload | T014 (inputs), T015 (job) | workflow_dispatch |
| FR-012 | Operator runbook | T017 (document) | Runbook review |
| FR-013 | Operator-grade error messaging | T018 (coverage review), T019 (live check) | Test coverage |
| FR-014 | Loading state timeouts | T018 (coverage review) | Existing tests |

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total tasks | 25 |
| Setup tasks | 3 (T001-T003) |
| Foundational tasks | 2 (T004-T005) |
| US1 tasks (Live Tests) | 5 (T006-T010) |
| US2 tasks (Skip Behavior) | 3 (T011-T013) |
| US3 tasks (CI Integration) | 3 (T014-T016) |
| US4 tasks (Runbook) | 1 (T017) |
| US5 tasks (Error Verification) | 2 (T018-T019) |
| Polish tasks | 6 (T020-T025) |
| Parallel opportunities | 8 tasks marked [P] |
| MVP scope | Phases 1-4 (T001-T013) |
