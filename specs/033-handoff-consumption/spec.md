# Feature Specification: Handoff Consumption Workflow

**Feature Branch**: `033-handoff-consumption`
**Created**: 2026-01-13
**Status**: Draft
**Input**: PiDashboard — Consume Handoffs and Implement Required Changes

## Problem Statement

Cross-repository handoff documents describe required changes between PiDashboard and PiOrchestrator. Currently, developers must manually discover, parse, and track these handoffs, leading to missed requirements, incomplete implementations, and lack of traceability. This feature creates a structured workflow to reliably consume incoming handoffs and produce documented evidence of implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Unresolved Handoffs (Priority: P1)

As a developer starting work on PiDashboard, I want to see all unresolved incoming handoffs so that I know what changes need to be implemented before I can consider the dashboard complete.

**Why this priority**: Discovery is the foundation - without knowing what handoffs exist, no implementation can occur. This enables all subsequent workflow steps.

**Independent Test**: Run handoff discovery command and verify it lists all incoming handoffs from PiOrchestrator with status `new`, `in_progress`, or `blocked`, sorted by priority.

**Acceptance Scenarios**:

1. **Given** handoff documents exist in the repository, **When** the developer runs discovery, **Then** all incoming handoffs targeting PiDashboard are listed with their status, creation date, and file path.
2. **Given** multiple unresolved handoffs exist, **When** discovery runs, **Then** results are sorted by status priority (`new` first, then `in_progress`, then `blocked`) and by newest creation date within each status group.
3. **Given** a handoff has status `done` or `acknowledged`, **When** discovery runs, **Then** that handoff is excluded from the unresolved list but visible in verbose/all mode.

---

### User Story 2 - Extract Actionable Requirements (Priority: P1)

As a developer, I want handoff requirements extracted into a structured consumption plan so that I have a clear checklist of what to implement and test.

**Why this priority**: Parsing handoffs into actionable work items bridges discovery to implementation. Without structured extraction, developers must manually interpret each handoff.

**Independent Test**: Select a handoff and generate a consumption plan; verify it contains summary, checklist, impacted files, and test plan.

**Acceptance Scenarios**:

1. **Given** an incoming handoff with contract changes, **When** I generate a consumption plan, **Then** a `specs/<handoff_id>-consumption/plan.md` file is created with categorized requirements (API, schema, UI, tests).
2. **Given** a handoff specifies verification commands, **When** the consumption plan is generated, **Then** those commands are included in the test plan section.
3. **Given** a handoff contains risks or breaking-change notes, **When** the consumption plan is generated, **Then** those risks are prominently documented with mitigation guidance.

---

### User Story 3 - Implement Contract Changes (Priority: P1)

As a developer, I want guidance on implementing handoff requirements in priority order so that the most critical compatibility issues are fixed first.

**Why this priority**: Implementation is the core value delivery - fixing API compatibility, schema updates, and UI behavior ensures the dashboard works with the backend.

**Independent Test**: Implement changes for a single handoff following the priority order (API client → schemas → UI → logging) and verify each category passes its tests.

**Acceptance Scenarios**:

1. **Given** a handoff requires API route changes, **When** I implement those changes, **Then** the API client correctly targets the new routes and handles responses.
2. **Given** a handoff specifies new data shapes, **When** I update schemas, **Then** runtime validation matches the backend contract.
3. **Given** a handoff requires UI behavior changes, **When** I update components, **Then** features display correct data from the updated endpoints.
4. **Given** backwards compatibility is required, **When** I implement changes, **Then** both old and new contract versions are supported as specified.

---

### User Story 4 - Prove Correctness with Tests (Priority: P2)

As a developer, I want tests that verify my handoff implementation so that I have confidence the changes work correctly and can detect regressions.

**Why this priority**: Tests provide verification and prevent future breakage. Important but secondary to the actual implementation.

**Independent Test**: Run test suite after implementation and verify tests cover the handoff's critical path with clear pass/fail results.

**Acceptance Scenarios**:

1. **Given** API client changes were made, **When** I run unit tests, **Then** route builders and response parsing are verified.
2. **Given** schema changes were made, **When** I run validation tests, **Then** both valid and invalid data shapes are tested.
3. **Given** integration tests exist in the project, **When** I run them, **Then** at least one smoke test exercises the handoff's critical path end-to-end.

---

### User Story 5 - Close the Loop with Documentation (Priority: P2)

As a developer and team lead, I want a consumption report documenting what was changed so that there is an audit trail and clear handoff closure.

**Why this priority**: Documentation provides traceability and helps future developers understand what was done. Required for proper handoff lifecycle management.

**Independent Test**: Complete a handoff consumption and verify a consumption report exists with all required sections and the handoff status is updated.

**Acceptance Scenarios**:

1. **Given** a handoff is fully implemented, **When** I close it, **Then** a `docs/handoffs/CONSUMPTION_REPORT_<handoff_id>.md` is created with: what was requested, what changed, verification steps, and any follow-ups.
2. **Given** implementation is complete, **When** I update the handoff, **Then** status is set to `done` and `related_commits`/`related_prs` fields are populated.
3. **Given** a handoff cannot be fully implemented due to backend gaps, **When** I close it as blocked, **Then** an outgoing handoff is generated describing what PiOrchestrator must provide.

---

### User Story 6 - Generate Outgoing Handoffs for Blockers (Priority: P3)

As a developer, I want to automatically generate outgoing handoffs when implementation reveals backend gaps so that PiOrchestrator knows what work remains.

**Why this priority**: Bidirectional communication ensures the full development cycle closes. Lower priority because it only applies when blockers are found.

**Independent Test**: Mark a handoff as blocked and verify an outgoing handoff is generated with the correct format and content.

**Acceptance Scenarios**:

1. **Given** a handoff requirement cannot be met because PiOrchestrator lacks an endpoint, **When** I mark blocked, **Then** an outgoing handoff is generated targeting PiOrchestrator with the missing requirement.
2. **Given** an outgoing handoff is generated, **When** I review it, **Then** it follows the standard handoff format with proper frontmatter and links to the blocked incoming handoff.

---

### Edge Cases

- What happens when a handoff file has invalid YAML frontmatter? System reports validation error with file path and continues processing other handoffs.
- How does system handle handoffs with missing required fields? System creates partial consumption plan noting missing fields and flagging for manual review.
- What happens when the same requirement appears in multiple handoffs? System detects overlap and consolidates into a single implementation task with references to all source handoffs.
- How does system handle handoffs with conflicting requirements? System flags the conflict, documents both requirements, and requires manual resolution before implementation.
- What happens when tests fail after implementation? System prevents marking handoff as `done` until tests pass, keeping status as `in_progress`.

## Requirements *(mandatory)*

### Functional Requirements

**Discovery**
- **FR-001**: System MUST scan all configured handoff paths (`docs/HANDOFF_*.md`, `docs/handoffs/**/*.md`, `specs/**/HANDOFF*.md`, `specs/**/handoff*.md`).
- **FR-002**: System MUST identify incoming handoffs where `from_repo: PiOrchestrator` AND `to_repo: PiDashboard`.
- **FR-003**: System MUST filter handoffs by unresolved status (`new`, `in_progress`, `blocked`).
- **FR-004**: System MUST sort results by status priority (new → in_progress → blocked) then by creation date (newest first).
- **FR-005**: System MUST leverage the existing Handoff Sentinel (Feature 032) for scanning if available.

**Extraction**
- **FR-006**: System MUST parse handoff frontmatter and markdown content to extract requirements.
- **FR-007**: System MUST categorize requirements into six domains: API client (routes, request/response, error codes), schema (types, validation), UI (screens, flows, components), logging (telemetry, debug), testing (unit, integration, e2e), and deployment (config, environment).
- **FR-008**: System MUST generate a consumption plan at `specs/<handoff_id>-consumption/plan.md` with summary, checklist, impacted files, and test plan.
- **FR-009**: System MUST preserve links to source handoff documents in consumption plans.

**Implementation Guidance**
- **FR-010**: System MUST provide implementation priority order: API client compatibility → DTO/schema/types → UI behavior → telemetry/logging.
- **FR-011**: System MUST prefer backwards compatibility unless the handoff explicitly authorizes breaking changes.
- **FR-012**: System MUST NOT remove validation to "fix" issues; schemas must be updated to match contracts.

**Testing**
- **FR-013**: System MUST require unit tests for API client route builders and response parsing.
- **FR-014**: System MUST require unit tests for schema/type validation.
- **FR-015**: System MUST require at least one integration/smoke test for each handoff's critical path (if project supports integration tests).

**Closure**
- **FR-016**: System MUST update handoff status to `done` or `blocked` upon completion.
- **FR-017**: System MUST populate `related_commits` and `related_prs` fields in handoff frontmatter.
- **FR-018**: System MUST generate consumption report at `docs/handoffs/CONSUMPTION_REPORT_<handoff_id>.md`.
- **FR-019**: System MUST generate outgoing handoff when marking as `blocked` due to backend dependency.
- **FR-020**: System MUST prevent marking `done` if required tests are failing.

### Key Entities

- **Handoff Document**: A markdown file with YAML frontmatter describing cross-repo requirements. Contains: handoff_id, direction, from_repo, to_repo, status, requirements, acceptance criteria, verification steps, risks.
- **Consumption Plan**: A structured work item derived from a handoff. Contains: summary, categorized requirements checklist, impacted file list, test plan, risk documentation.
- **Consumption Report**: An audit trail document created after implementing a handoff. Contains: what was requested, files changed, verification steps, blockers/follow-ups.
- **Work Item Category**: Classification of handoff requirements into implementation domains: API, Schema, UI, Logging.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Discovery shows 100% of incoming handoffs from PiOrchestrator with unresolved status within 5 seconds of scan completion.
- **SC-002**: Consumption plan generation completes within 30 seconds per handoff.
- **SC-003**: Each consumed handoff has a corresponding consumption report documenting all changes.
- **SC-004**: All implemented features described by handoffs work end-to-end as verified by tests.
- **SC-005**: 100% of handoffs end with status `done` + verification OR status `blocked` + outgoing handoff.
- **SC-006**: Developer time to understand handoff requirements reduced by 50% compared to manual parsing.
- **SC-007**: Zero handoffs remain in `new` status for more than one development cycle after this feature is deployed.

## Scope

### In Scope

- Discovery and listing of incoming handoffs
- Parsing and extraction of requirements into consumption plans
- Implementation guidance and priority ordering
- Test requirement tracking
- Status updates and consumption report generation
- Outgoing handoff generation for blockers

### Out of Scope

- Automatic code generation for handoff requirements
- Integration with external issue trackers (GitHub Issues, Jira)
- Automated PR creation
- Real-time notification of new handoffs (handled by Handoff Sentinel hooks)
- Handoff creation workflow (handled by Feature 032)

## Dependencies

- **Feature 032 (Handoff Sentinel)**: Provides handoff scanning, validation, and status management infrastructure.
- **Existing test infrastructure**: Unit tests (Vitest) and E2E tests (Playwright) for verification.
- **PiOrchestrator handoffs**: Incoming handoff documents must follow the standard frontmatter format.

## Assumptions

- Handoff Sentinel (Feature 032) is implemented and provides `npm run handoff:detect` and related commands.
- Handoff documents follow the standardized YAML frontmatter schema defined in Feature 032.
- The project has existing test infrastructure (Vitest for unit tests, Playwright for E2E).
- Developers have write access to update handoff status and create consumption reports.
- PiOrchestrator will respond to outgoing handoffs within a reasonable timeframe.
