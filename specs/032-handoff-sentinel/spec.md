# Feature Specification: Handoff Sentinel

**Feature Branch**: `032-handoff-sentinel`
**Created**: 2026-01-13
**Status**: Draft
**Input**: Multi-repo workflow (PiDashboard ⇄ PiOrchestrator) handoff detection and generation system

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Incoming Handoff Detection (Priority: P1)

As a developer starting work on PiDashboard, I need to immediately know if there are unacknowledged handoffs from PiOrchestrator that require my attention, so I don't waste time on work that conflicts with backend changes or miss critical integration requirements.

**Why this priority**: This is the core "sentinel" function. Without detection, developers may implement features that conflict with backend contracts or miss required API changes, causing integration failures and rework.

**Independent Test**: Can be fully tested by adding a new handoff document to `docs/HANDOFF_*.md` and running the detection script. Developer sees a summary of required actions without any other features implemented.

**Acceptance Scenarios**:

1. **Given** a new handoff document exists in `docs/HANDOFF_*.md` with `status: new`, **When** developer runs `npm run dev` or `npm test`, **Then** a warning summary displays listing unacknowledged handoffs with their titles and required action types.

2. **Given** multiple handoff documents exist with various statuses, **When** detection runs, **Then** only documents with `status: new` or `status: in_progress` are surfaced; `done` and `acknowledged` are silently skipped.

3. **Given** a handoff document lacks required frontmatter fields, **When** detection runs, **Then** an error identifies the malformed document and specifies which fields are missing.

4. **Given** no unacknowledged handoffs exist, **When** detection runs, **Then** the process completes silently without warnings.

---

### User Story 2 - Outgoing Handoff Generation (Priority: P1)

As a developer who has implemented a Dashboard feature that requires backend changes, I need to generate a complete, standardized handoff document for PiOrchestrator, so the backend team has all the information needed to implement their part without back-and-forth clarification.

**Why this priority**: Equally critical to detection. Poor handoffs cause miscommunication, incomplete implementations, and integration failures. A generator ensures consistency and completeness.

**Independent Test**: Can be fully tested by running the generator command with feature details. A complete handoff document is produced that can be reviewed without any detection features.

**Acceptance Scenarios**:

1. **Given** a developer runs the handoff generator with feature context, **When** generation completes, **Then** a markdown document is created with all required frontmatter fields populated and standardized sections filled.

2. **Given** a developer specifies API contract changes, **When** generation completes, **Then** the handoff includes a contract diff section with before/after examples.

3. **Given** a developer specifies acceptance criteria, **When** generation completes, **Then** the handoff includes numbered verification steps that the receiving team can use as a checklist.

4. **Given** generation is triggered, **When** the handoff is created, **Then** it is placed in the correct output directory (`docs/HANDOFF_*.md`) with proper naming convention.

---

### User Story 3 - Handoff Status Management (Priority: P2)

As a developer consuming a handoff, I need to update its status to track my progress and prevent repeated warnings, so the team has visibility into what work is in progress and what has been completed.

**Why this priority**: Enables the detection system to be practical. Without status management, developers would face constant warnings about handoffs they're already handling.

**Independent Test**: Can be tested by manually editing a handoff's frontmatter status field and verifying detection behavior changes accordingly.

**Acceptance Scenarios**:

1. **Given** a handoff with `status: new`, **When** developer marks it as `acknowledged`, **Then** subsequent detection runs no longer surface it as requiring action.

2. **Given** a handoff with `status: in_progress`, **When** developer marks it as `done`, **Then** the handoff is archived and linked commits/PRs are recorded in the frontmatter.

3. **Given** a handoff requires work that is blocked, **When** developer marks it as `blocked`, **Then** detection surfaces it with a warning indicator distinct from `new` items.

---

### User Story 4 - CI/CD Integration (Priority: P2)

As a team lead, I need handoff detection to run in CI pipelines and fail builds when critical handoffs are unacknowledged, so incomplete integrations don't reach production.

**Why this priority**: Makes the system "unavoidable" as specified in goals. Without CI enforcement, developers can bypass warnings locally.

**Independent Test**: Can be tested by configuring a CI job that runs the detection script with `--strict` flag and verifying build fails when unacknowledged handoffs exist.

**Acceptance Scenarios**:

1. **Given** CI pipeline runs with `--strict` flag, **When** unacknowledged `incoming` handoffs exist, **Then** the build fails with exit code 1 and a summary of blocking handoffs.

2. **Given** CI pipeline runs with `--strict` flag, **When** all handoffs are acknowledged or done, **Then** the build passes normally.

3. **Given** CI pipeline runs without `--strict` flag, **When** unacknowledged handoffs exist, **Then** warnings are logged but build continues.

---

### User Story 5 - Handoff Change Summary (Priority: P3)

As a developer returning to the project after time away, I need to see what handoffs have changed since my last session, so I can quickly catch up on integration requirements without reviewing all documents.

**Why this priority**: Quality-of-life improvement. The core detection (P1) is functional without this, but change tracking improves developer experience.

**Independent Test**: Can be tested by adding a new handoff, running detection, then running again and verifying the "new since last run" summary is accurate.

**Acceptance Scenarios**:

1. **Given** detection has run previously, **When** new handoffs are added, **Then** the summary distinguishes "new since last check" from "previously seen but still pending."

2. **Given** a handoff's status changed since last run, **When** detection runs, **Then** the change is highlighted in the summary.

---

### Edge Cases

- What happens when a handoff document has invalid YAML frontmatter?
  - System reports a parsing error with file path and line number, continues processing other files.

- What happens when handoff paths are configured but directories don't exist?
  - System silently skips non-existent paths without error.

- What happens when two handoffs have the same `handoff_id`?
  - System reports a duplicate ID warning with file paths of conflicting documents.

- What happens when a developer tries to generate a handoff without required information?
  - Generator prompts for missing fields interactively or fails with clear error listing missing requirements.

- What happens when running on a fresh clone with no detection history?
  - All non-done handoffs are surfaced as "new" regardless of creation date.

## Requirements *(mandatory)*

### Functional Requirements

#### Detection (Incoming)

- **FR-001**: System MUST scan configured paths (`docs/HANDOFF_*.md`, `docs/handoffs/**/*.md`, `specs/**/HANDOFF*.md`, `specs/**/handoff*.md`) for handoff documents.
- **FR-002**: System MUST parse YAML frontmatter from each handoff document and validate required fields.
- **FR-003**: System MUST filter handoffs by `direction: incoming` for incoming detection.
- **FR-004**: System MUST surface handoffs with `status: new`, `in_progress`, or `blocked` as requiring attention.
- **FR-005**: System MUST display a summary including: handoff ID, title, required action types, and creation date.
- **FR-006**: System MUST integrate with `npm run dev`, `npm test`, and `npm start` hooks.

#### Generation (Outgoing)

- **FR-007**: System MUST provide a generator command (e.g., `npm run handoff:generate` or skill invocation).
- **FR-008**: System MUST populate all required frontmatter fields with `direction: outgoing` and `from_repo: PiDashboard`.
- **FR-009**: System MUST include sections for: Summary, Contract Changes, Acceptance Criteria, Verification Steps, and Risks.
- **FR-010**: System MUST auto-generate `handoff_id` from feature number and slug (e.g., `032-handoff-sentinel`).
- **FR-011**: System MUST place generated handoffs in `docs/HANDOFF_<ID>.md` by default.

#### Status Management

- **FR-012**: System MUST allow updating handoff status via frontmatter editing.
- **FR-013**: System MUST validate status transitions (e.g., cannot go from `done` back to `new`).
- **FR-014**: System MUST record `related_commits` and `related_prs` when status changes to `done`.

#### CI Integration

- **FR-015**: System MUST support a `--strict` flag that fails with non-zero exit code when unacknowledged handoffs exist.
- **FR-016**: System MUST support a `--quiet` flag that suppresses output for CI logs when no issues found.
- **FR-017**: System MUST output machine-readable format (JSON) when `--json` flag is provided.

### Key Entities

- **Handoff Document**: A markdown file with YAML frontmatter containing metadata (id, direction, status, requirements, acceptance criteria) and body content describing the integration work needed.

- **Handoff Registry**: Local state tracking which handoffs have been seen in previous detection runs (stored in `.handoff-state.json` or similar).

- **Detection Result**: Output of a detection run containing: list of pending handoffs, list of new handoffs since last run, validation errors, and overall status.

### Frontmatter Schema

Required fields for all handoffs:
- `handoff_id`: Unique identifier (e.g., "032-handoff-sentinel")
- `direction`: "incoming" or "outgoing"
- `from_repo`: Source repository name
- `to_repo`: Target repository name
- `created_at`: ISO date string
- `status`: "new" | "acknowledged" | "in_progress" | "done" | "blocked"

Optional fields:
- `related_prs`: Array of PR URLs
- `related_commits`: Array of commit SHAs
- `requires`: Array of requirement objects with `type` and `description`
- `acceptance`: Array of acceptance criteria strings
- `verification`: Array of verification step strings
- `risks`: Array of risk descriptions
- `notes`: Free-form notes string

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers are notified of new handoffs within 5 seconds of running `npm run dev` or `npm test`.

- **SC-002**: Generated outgoing handoffs pass validation with 100% of required fields populated on first generation.

- **SC-003**: Handoff detection catches 100% of documents matching configured path patterns.

- **SC-004**: CI builds fail within 30 seconds when unacknowledged critical handoffs exist (with `--strict` flag).

- **SC-005**: Zero handoff-related integration failures reach production after system is deployed (handoffs that would have prevented issues are surfaced before merge).

- **SC-006**: Time to create a complete outgoing handoff reduced from 15+ minutes (manual) to under 2 minutes (with generator).

- **SC-007**: 100% of handoff documents in the repository conform to the required frontmatter schema within 30 days of deployment.

## Assumptions

- Handoff documents are committed to the repository (not stored externally).
- Developers have Node.js installed and use npm scripts as primary workflow entry points.
- The YAML frontmatter format is acceptable for metadata storage.
- Detection state can be stored locally (not shared across machines).
- PiOrchestrator will adopt the same handoff format for bidirectional compatibility.

## Scope Boundaries

### In Scope
- Detection of incoming handoffs from any configured path
- Generation of outgoing handoffs to PiOrchestrator
- Status management via frontmatter editing
- npm script hooks for detection
- CI integration with strict mode
- JSON output for tooling integration

### Out of Scope
- Automatic PR creation in PiOrchestrator
- Real-time notifications (Slack, email, etc.)
- Visual diff rendering of contract changes
- Handoff approval workflows
- Integration with project management tools (Jira, Linear, etc.)
- Shared detection state across developer machines
