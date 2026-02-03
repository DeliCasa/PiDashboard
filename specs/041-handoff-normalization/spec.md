# Feature Specification: Handoff Sentinel Normalization

**Feature Branch**: `041-handoff-normalization`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "Remove handoff sentinel noise and keep dashboard test suite stable: normalize handoff YAML frontmatter (or mark status correctly), ensure pretest doesn't report handoff formatting errors"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Silent Pretest Runs (Priority: P1)

As a developer, when I run `npm test` or `npm run dev`, I want the handoff sentinel detection to complete silently without warnings or errors, so that my workflow is not interrupted by stale or irrelevant handoff noise.

**Why this priority**: This is the core pain point. Every dev session currently surfaces warnings about handoff files with `new` or `in_progress` status that are no longer actionable, creating alert fatigue and obscuring real issues.

**Independent Test**: Can be fully tested by running `npm run handoff:detect --quiet` and verifying it exits with code 0 and produces no output.

**Acceptance Scenarios**:

1. **Given** all handoff files have normalized frontmatter, **When** `npm run handoff:detect` runs, **Then** no validation errors are reported
2. **Given** completed handoff items are marked as `done` or `acknowledged`, **When** `npm run handoff:detect --quiet` runs, **Then** the command produces zero output and exits successfully
3. **Given** a handoff file previously had missing or malformed frontmatter fields, **When** the file is normalized, **Then** its frontmatter passes Zod schema validation without errors

---

### User Story 2 - Accurate Handoff Status Tracking (Priority: P2)

As a project maintainer, I want each handoff file's status to accurately reflect reality (whether the work described has been completed, acknowledged, or is still pending), so that the sentinel provides a truthful overview of cross-repo coordination state.

**Why this priority**: Accurate status is what makes the sentinel useful rather than noisy. Without correct statuses, the tool becomes a source of false positives that developers learn to ignore.

**Independent Test**: Can be fully tested by inspecting each handoff file's frontmatter status and comparing it against the actual state of the work it describes.

**Acceptance Scenarios**:

1. **Given** a handoff describes work that has already been completed or consumed, **When** its status is reviewed, **Then** the status is set to `done`
2. **Given** a handoff describes work that has been seen and acknowledged but not yet started, **When** its status is reviewed, **Then** the status is set to `acknowledged`
3. **Given** a handoff is genuinely still pending action, **When** its status is reviewed, **Then** the status remains `new` or `in_progress` with a documented reason

---

### User Story 3 - Test Suite Stability (Priority: P3)

As a developer, I want the full test suite (`npm test`) to pass without regressions after handoff normalization, so that cleaning up handoff files does not inadvertently break any tests.

**Why this priority**: The normalization must not introduce side effects. Tests that depend on handoff file structure or mock data must continue to pass.

**Independent Test**: Can be fully tested by running `npm test` and `npm run test:e2e` and verifying all tests pass with the same results as before normalization.

**Acceptance Scenarios**:

1. **Given** handoff files have been updated, **When** the full unit/integration test suite runs, **Then** all tests pass with no new failures
2. **Given** handoff files have been updated, **When** `npm run handoff:detect` runs, **Then** it completes without validation errors

---

### Edge Cases

- What happens when a handoff file has no YAML frontmatter at all? It should be given complete frontmatter with appropriate fields.
- What happens when a handoff file has partial frontmatter (some fields missing)? Missing fields should be added with correct values.
- What happens when two handoff files share the same `handoff_id`? The duplicate must be resolved by assigning a unique ID to each.
- What happens when a handoff status is set to `done` but the described work is not actually complete? The audit must verify real completion state before marking done.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All handoff files matching sentinel detection patterns (`docs/HANDOFF_*.md`, `docs/handoffs/**/*.md`, `specs/**/HANDOFF*.md`, `specs/**/handoff*.md`) MUST have valid YAML frontmatter conforming to the sentinel's Zod schema
- **FR-002**: Every handoff file MUST contain all required frontmatter fields: `handoff_id`, `direction`, `from_repo`, `to_repo`, `created_at`, `status`, `related_prs`, `related_commits`, `requires`, `acceptance`, `verification`, `risks`, `notes`
- **FR-003**: The `handoff_id` field MUST match the pattern `^\d{3}-[a-z][a-z0-9-]*$` (three-digit prefix followed by lowercase slug)
- **FR-004**: Outgoing handoffs MUST have `from_repo` set to `"PiDashboard"`; incoming handoffs MUST have `to_repo` set to `"PiDashboard"`
- **FR-005**: Handoff files describing completed or consumed work MUST have their status updated to `done` or `acknowledged`
- **FR-006**: No two handoff files may share the same `handoff_id` value
- **FR-007**: The `npm run handoff:detect --quiet` command MUST exit with code 0 and produce no output after normalization is complete
- **FR-008**: The existing test suite MUST continue to pass with no new failures after normalization changes

### Key Entities

- **Handoff Document**: A markdown file with YAML frontmatter describing a cross-repo coordination item. Key attributes: unique ID, direction (incoming/outgoing), source and target repositories, lifecycle status, requirements list, and acceptance criteria.
- **Handoff State**: A persisted record tracking which handoff files have been seen and their content hashes, used to detect new or changed handoffs between detection runs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running `npm run handoff:detect` reports zero validation errors across all handoff files
- **SC-002**: Running `npm run handoff:detect --quiet` produces no output and exits with code 0
- **SC-003**: The number of handoff files with `new` status is reduced to only those that genuinely require action (target: 0 false-positive warnings)
- **SC-004**: 100% of unit and integration tests pass after normalization with no new failures
- **SC-005**: A change report documents every file modified, what was changed, and the rationale for each status assignment

## Assumptions

- Handoff files describing work that has already been implemented in PiDashboard or consumed from PiOrchestrator can safely be marked `done`.
- The handoff sentinel template file (`specs/032-handoff-sentinel/contracts/handoff-template.md`) with ID `000-template-example` and status `done` should remain unchanged as a reference.
- Updating handoff status fields does not require approval from the counterpart repository (PiOrchestrator) since this is a local tracking concern.
- The `.handoff-state.json` file will be regenerated automatically on the next detection run after normalization.
