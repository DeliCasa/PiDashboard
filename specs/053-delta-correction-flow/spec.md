# Feature Specification: Delta Correction Flow

**Feature Branch**: `053-delta-correction-flow`
**Created**: 2026-02-16
**Status**: Draft
**Input**: Operator workflow to view latest inventory delta per container/session and submit corrections with an audit trail, resilient to real-world states.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Latest Delta for a Container (Priority: P1)

An operator selects a container and immediately sees the most recent inventory analysis result. The view shows what changed (items added, removed, or adjusted in quantity), along with confidence indicators so the operator knows how trustworthy each line item is. If analysis is still running, the operator sees a clear "in progress" indicator that automatically updates when results arrive.

**Why this priority**: Viewing the delta is the prerequisite for every downstream action. Without this, the operator cannot assess or correct anything.

**Independent Test**: Can be fully tested by selecting a container that has a completed analysis — the operator sees a table of changes and can confirm it matches expectations.

**Acceptance Scenarios**:

1. **Given** a container with a completed analysis, **When** the operator selects that container, **Then** the latest delta is displayed showing item name, before count, after count, change, and confidence for each entry.
2. **Given** a container with a pending analysis, **When** the operator selects that container, **Then** a "pending" indicator is displayed and the view automatically refreshes when the analysis completes.
3. **Given** a container with a failed analysis, **When** the operator selects that container, **Then** an error message is displayed with the failure reason and a retry/refresh option.
4. **Given** a container with a "needs review" analysis, **When** the operator selects that container, **Then** the delta is displayed alongside a clear call-to-action to review and correct.
5. **Given** a container with no analysis history, **When** the operator selects that container, **Then** an empty state message explains that no inventory data is available yet.

---

### User Story 2 — Submit a Correction (Priority: P1)

An operator reviews the delta and notices discrepancies (e.g., the system counted 3 of an item but the operator can see 5). The operator edits the counts, optionally adds or removes line items, writes a note explaining the correction, and submits. After submission, the view refreshes to reflect the corrected state, and an audit trail records who corrected what and when.

**Why this priority**: Corrections are the core value of this workflow — without them, operators have no way to fix inaccurate deltas, and downstream inventory records remain wrong.

**Independent Test**: Can be tested by opening a "needs review" or "done" delta, editing one item's count, submitting, and verifying the audit trail shows the correction.

**Acceptance Scenarios**:

1. **Given** a completed or needs-review delta that has not been reviewed, **When** the operator clicks "approve", **Then** the review is submitted as-is and the audit trail records an approval with no corrections.
2. **Given** a completed or needs-review delta, **When** the operator enters edit mode, changes an item's count, and submits, **Then** the correction is saved, the delta view refreshes, and the audit trail shows the original vs. corrected count.
3. **Given** edit mode, **When** the operator adds a new item (name + count), **Then** it appears as an "added" correction in the summary and audit trail.
4. **Given** edit mode, **When** the operator removes an existing item, **Then** it appears as a "removed" correction in the summary and audit trail.
5. **Given** a delta that has already been reviewed, **When** another operator tries to submit a correction, **Then** the system shows a conflict message and offers to refresh before re-reviewing.
6. **Given** any correction submission, **When** the operator submits, **Then** a confirmation dialog shows a summary of all changes before final submission.

---

### User Story 3 — View Audit Trail (Priority: P2)

After a correction has been submitted, any operator can view the audit trail to see who reviewed the delta, what action they took (approve vs. override), what specific corrections were made, and any notes they left. This supports accountability and dispute resolution.

**Why this priority**: Important for trust and compliance, but depends on corrections having been submitted first.

**Independent Test**: Can be tested by viewing a delta that has already been corrected — the audit trail section is visible and shows reviewer, timestamp, action, and correction details.

**Acceptance Scenarios**:

1. **Given** a delta that was approved as-is, **When** the operator views the audit trail, **Then** it shows the reviewer, timestamp, and an "Approved" label with a note that no corrections were made.
2. **Given** a delta that was corrected, **When** the operator views the audit trail, **Then** it shows each corrected item with original and corrected counts, plus any items added or removed.
3. **Given** a delta that was corrected with notes, **When** the operator views the audit trail, **Then** the reviewer's notes are displayed.

---

### User Story 4 — Session-Based Lookup (Priority: P2)

An operator has a session ID (e.g., from a receipt or external system) and wants to jump directly to the delta for that session without browsing the container's run list.

**Why this priority**: Useful shortcut for support/investigation flows, but not the primary path.

**Independent Test**: Can be tested by entering a known session ID and verifying the correct delta loads.

**Acceptance Scenarios**:

1. **Given** a valid session ID, **When** the operator enters it in the lookup field and submits, **Then** the corresponding delta detail view loads.
2. **Given** an invalid or unknown session ID, **When** the operator submits, **Then** an error message is shown without crashing the page.

---

### User Story 5 — Resilient State Handling Across All States (Priority: P1)

The system handles all real-world analysis states gracefully. Operators never see raw error dumps, broken layouts, or ambiguous spinners. Each state has a clear visual treatment and actionable guidance:

- **Pending**: "Analysis queued" with automatic polling.
- **Processing**: "Analysis in progress" with a spinner/progress indicator.
- **Done**: Full delta view with review options.
- **Needs Review**: Full delta view with prominent "Review" call-to-action.
- **Error/Failed**: Error explanation with the failure reason and a refresh option.
- **Service Unavailable**: "Inventory service temporarily unavailable" with guidance to retry later.

**Why this priority**: Without resilient state handling, the UI is unreliable in production — operators lose trust and stop using it.

**Independent Test**: Can be tested by loading the view with each state fixture and verifying the correct visual treatment renders.

**Acceptance Scenarios**:

1. **Given** the inventory service returns a pending status, **When** the view loads, **Then** it shows "Analysis queued" and polls for updates.
2. **Given** the inventory service returns an error with a failure reason, **When** the view loads, **Then** the error reason is displayed and a refresh button is available.
3. **Given** the inventory service is unavailable (503), **When** the view loads, **Then** a "service unavailable" message is shown and polling stops.
4. **Given** a network failure occurs mid-session, **When** the operator retries, **Then** the view recovers gracefully without page reload.

---

### Edge Cases

- What happens when the operator submits a correction but the network drops before the server responds? The system should show an error with the option to retry, and not leave the form in an ambiguous submitted/unsaved state.
- What happens when two operators attempt to review the same delta simultaneously? The second submission receives a conflict error and is prompted to refresh before re-reviewing.
- What happens when a correction includes invalid data (empty item name, negative count)? The form validates inline before allowing submission.
- What happens when the delta has zero changes (nothing added, removed, or changed)? The view shows an explicit "No changes detected" message rather than an empty table.
- What happens when confidence is very low across all items? A banner warns the operator that results may be unreliable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the latest inventory delta for the selected container, showing item names, before/after counts, change amounts, and confidence levels.
- **FR-002**: System MUST allow operators to approve a delta as-is (no corrections).
- **FR-003**: System MUST allow operators to enter edit mode and adjust individual item counts.
- **FR-004**: System MUST allow operators to add new items to the correction (with name and count).
- **FR-005**: System MUST allow operators to mark items as removed from the correction.
- **FR-006**: System MUST allow operators to attach free-text notes (up to 500 characters) to a correction.
- **FR-007**: System MUST validate corrections before submission: item names must be non-empty, counts must be non-negative.
- **FR-008**: System MUST show a confirmation dialog summarizing all changes before final submission.
- **FR-009**: System MUST display an audit trail for reviewed deltas showing reviewer, timestamp, action taken, and correction details.
- **FR-010**: System MUST handle concurrent review conflicts by alerting the operator and offering a refresh-and-retry flow.
- **FR-011**: System MUST display distinct visual states for pending, processing, done, needs-review, and error statuses.
- **FR-012**: System MUST automatically poll for updates when analysis is in a non-terminal state (pending, processing, needs-review).
- **FR-013**: System MUST stop polling and show an appropriate message when the inventory service is unavailable.
- **FR-014**: System MUST support session-based lookup to navigate directly to a specific delta by session ID.
- **FR-015**: System MUST show a low-confidence banner when average confidence across delta entries falls below a threshold.
- **FR-016**: System MUST handle the "zero changes" case with an explicit empty-state message.
- **FR-017**: Consumer contract tests MUST validate that all response shapes match the expected schemas for every state variant.
- **FR-018**: An end-to-end test MUST verify the full operator workflow: open session, view delta, submit correction, confirm updated state.

### Key Entities

- **Inventory Analysis Run**: Represents a single analysis of a container's contents at a point in time. Has a status (pending → processing → done/error/needs_review), contains before/after item lists, a delta (changes detected), optional evidence images, optional review, and analysis metadata.
- **Delta Entry**: A single item change detected during analysis. Records the item name, before count, after count, net change, and a confidence score indicating how certain the system is about this change.
- **Correction**: An operator-supplied adjustment to a delta entry. Records the item name, original count, corrected count, and whether the item was added or removed.
- **Review**: The operator's submitted assessment of a delta. Contains the reviewer identity, the action taken (approve or override with corrections), a list of corrections, optional notes, and a timestamp.
- **Evidence Images**: Before/after photos of the container contents with optional overlay data (bounding boxes marking detected items).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can view a container's latest delta and submit a correction in under 60 seconds for a typical 5-item delta.
- **SC-002**: 100% of analysis states (pending, processing, done, needs-review, error, service-unavailable) render a distinct, actionable view with no layout breakage.
- **SC-003**: Consumer contract tests cover all response schema variants (success, error, conflict, service-unavailable) and pass in CI.
- **SC-004**: The end-to-end correction workflow test (view → edit → submit → verify audit trail) passes reliably in CI.
- **SC-005**: Concurrent review conflicts are detected and surfaced to the operator 100% of the time (no silent overwrites).
- **SC-006**: Inline form validation catches all invalid corrections (empty names, negative counts) before submission, preventing bad data from reaching the server.

## Assumptions

- The backend inventory analysis API is already implemented and returns responses matching the documented schemas (this feature is frontend-only).
- Container selection is handled by a separate feature (opaque container identity, Feature 046); this feature operates on whichever container is currently selected.
- The correction submission API is idempotent from the backend perspective — conflict detection is based on whether a review already exists for a given run.
- Evidence images (before/after photos) are served as URLs from the backend; image hosting is not in scope.
- There is no "undo" for a submitted correction in this iteration; corrections are final once submitted.

## Scope Boundaries

**In scope**:
- Latest delta view per container with all status variants
- Correction flow (approve, edit counts, add/remove items, notes)
- Audit trail display after corrections
- Session-based delta lookup
- Consumer contract tests against API schemas
- E2E test for the correction workflow
- Mock fixtures for all state variants
- HANDOFF notes with manual verification walkthrough

**Out of scope**:
- Backend behavior changes (handled in BridgeServer/PiOrchestrator specs)
- Bulk corrections across multiple containers
- Correction undo/rollback
- Image annotation or manual bounding box editing
- Historical delta comparison (comparing deltas across multiple runs)
- Notification system for pending reviews
