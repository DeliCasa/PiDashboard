# Feature Specification: Inventory Delta Viewer & Human Review Workflow

**Feature Branch**: `047-inventory-delta-viewer`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "PiDashboard: add Inventory Delta viewer + human review workflow driven by BridgeServer stock-change analysis"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Latest Inventory Delta for a Container (Priority: P1)

An operator selects a container from the dashboard and navigates to the Inventory section to see the most recent stock-change analysis. The system displays a summary showing what items were detected before and after the session, along with a line-by-line delta (items added, removed, or changed in count). Each delta line shows the system's confidence level so the operator can quickly spot items that need attention.

**Why this priority**: This is the foundational read-only view. Without seeing the delta, no other workflow (review, correction, audit) is possible. It delivers immediate value by giving operators visibility into what the vision system detected.

**Independent Test**: Can be fully tested by selecting a container and viewing the delta summary. Delivers value even without the review/correction workflow because operators can visually verify results.

**Acceptance Scenarios**:

1. **Given** a container with a completed analysis session, **When** the operator navigates to the Inventory section for that container, **Then** the system displays the latest delta with before counts, after counts, and change (+/-) for each item.
2. **Given** a container with an analysis still in progress, **When** the operator views the Inventory section, **Then** the system displays a "pending" state with a clear message that analysis is running.
3. **Given** a container where the latest analysis failed, **When** the operator views the Inventory section, **Then** the system displays an error state with the failure reason and a retry/refresh option.
4. **Given** a container with no analysis history, **When** the operator views the Inventory section, **Then** the system displays an empty state explaining no inventory data is available yet.
5. **Given** multiple containers exist, **When** the operator switches the active container via the container picker, **Then** the inventory delta updates to reflect the newly selected container.

---

### User Story 2 - View Before/After Evidence Images (Priority: P2)

The operator wants to visually verify what the vision system saw. The system shows before and after images captured during the session, displayed side-by-side. If the analysis includes bounding-box overlays highlighting detected items, those overlays are shown on top of the images. The operator can zoom into images for closer inspection.

**Why this priority**: Visual verification is the second most important capability because it gives operators the context needed to trust or challenge the automated delta. Without images, operators must blindly trust the numbers.

**Independent Test**: Can be tested by opening any completed session and verifying that before/after images load, display side-by-side, and support interaction (zoom, expand). Works standalone even if review workflow is not yet implemented.

**Acceptance Scenarios**:

1. **Given** a completed analysis session with both before and after images, **When** the operator views the session detail, **Then** the system displays both images side-by-side with labels ("Before" / "After").
2. **Given** a session where evidence overlay data is available, **When** the operator enables the overlay toggle, **Then** bounding boxes appear on the images highlighting detected items with labels.
3. **Given** a session where only one image is available (e.g., "after" only), **When** the operator views the session, **Then** the system shows the available image with a placeholder for the missing one.
4. **Given** the operator clicks on an image, **When** the image expands, **Then** a full-screen modal shows the high-resolution image with pan/zoom capability.

---

### User Story 3 - Submit Review: Approve or Correct Delta (Priority: P3)

After examining the delta and images, the operator submits a review. If the delta looks correct, they approve it with one click. If corrections are needed, the operator can adjust item counts, rename items, add missing items, or remove false detections. The system records the operator's changes and marks the session as reviewed.

**Why this priority**: The review workflow closes the human-in-the-loop cycle. It's the core differentiator from a passive display, turning the feature into an active quality-control tool. Depends on P1 (seeing the delta) and benefits from P2 (visual evidence).

**Independent Test**: Can be tested by opening a session in "needs review" state, making corrections (adjust a count, add an item), and submitting. Verify the session transitions to "reviewed" and the corrections persist on reload.

**Acceptance Scenarios**:

1. **Given** a session with status "needs_review", **When** the operator clicks "Approve", **Then** the system submits the approval and the session status changes to "approved".
2. **Given** a session with an incorrect item count, **When** the operator edits the count and clicks "Submit Review", **Then** the system records the correction and the delta display updates to reflect the operator's values.
3. **Given** a session where an item was missed by the vision system, **When** the operator clicks "Add Item" and fills in the item name and count, **Then** the new item appears in the delta with a visual indicator that it was manually added.
4. **Given** a session where the system detected a false positive, **When** the operator removes the item, **Then** the item is marked as removed in the review and excluded from the final inventory count.
5. **Given** the operator starts editing but navigates away, **When** they return to the same session, **Then** any unsaved changes are lost and the original delta is shown (no draft persistence).

---

### User Story 4 - View Review Audit Trail (Priority: P4)

After a session has been reviewed, any user can see who reviewed it, when, and what changes were made. This provides accountability and helps identify patterns in vision-system errors over time.

**Why this priority**: Audit trail is important for operational trust and compliance but depends on the review workflow (P3) existing first. It adds value by making corrections transparent.

**Independent Test**: Can be tested by viewing a previously reviewed session. The audit section shows the reviewer identity, timestamp, and a diff of what was changed (original vs. corrected values).

**Acceptance Scenarios**:

1. **Given** a session that has been reviewed with corrections, **When** the operator views the session detail, **Then** an audit section displays the reviewer, review timestamp, and a list of changes made.
2. **Given** a session that was approved without changes, **When** the operator views the audit section, **Then** it shows the reviewer and timestamp with a note "Approved as-is".
3. **Given** a session that has not yet been reviewed, **When** the operator views the session detail, **Then** the audit section is absent or shows "Pending review".

---

### Edge Cases

- What happens when the operator submits a review but the network request fails? The system shows an error toast and preserves the operator's edits in the form so they can retry without re-entering data.
- What happens when two operators try to review the same session simultaneously? The second submission receives a conflict error with a message to refresh and re-review. Optimistic concurrency (e.g., version/etag) prevents silent overwrites.
- What happens when the BridgeServer inventory endpoint is unavailable (503/404)? The Inventory section gracefully degrades: shows an "Inventory analysis unavailable" message instead of an error. The tab remains visible but non-functional.
- What happens when a delta contains zero changes (before and after are identical)? The system displays a "No changes detected" summary with the before/after counts still visible.
- What happens when a delta has extremely low confidence across all items? The system highlights the entire session with a prominent "Low Confidence - Manual Review Recommended" banner.
- What happens when the container picker has no active container selected? The Inventory section shows a prompt asking the operator to select a container first.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the latest inventory delta for the currently selected container, showing per-item before count, after count, and change value.
- **FR-002**: System MUST display a per-item confidence indicator (e.g., high/medium/low) for each line in the delta, derived from the analysis backend.
- **FR-003**: System MUST display before and after session images side-by-side, with labels indicating which is "Before" and "After".
- **FR-004**: System MUST support optional evidence overlay display (bounding boxes) on images when overlay data is available.
- **FR-005**: System MUST allow operators to approve a delta as-is with a single action.
- **FR-006**: System MUST allow operators to correct individual item counts in the delta before submitting a review.
- **FR-007**: System MUST allow operators to add items that were missed by the automated analysis.
- **FR-008**: System MUST allow operators to remove items identified as false positives.
- **FR-009**: System MUST allow operators to rename or re-identify items (correct SKU/name).
- **FR-010**: System MUST display distinct states for analysis sessions: pending, completed, needs_review, approved, failed.
- **FR-011**: System MUST scope the inventory view to the active container. When no container is selected, the system MUST prompt the operator to select one.
- **FR-012**: System MUST show an audit trail for reviewed sessions, including reviewer identity, timestamp, and list of corrections.
- **FR-013**: System MUST preserve operator edits in the form during a failed submission so the operator can retry without data loss.
- **FR-014**: System MUST gracefully handle unavailability of the inventory analysis service (404/503) by showing a degraded-but-stable UI.
- **FR-015**: System MUST refresh the delta data periodically while the operator is actively viewing the Inventory section, pausing refresh when the browser tab is hidden.

### Key Entities

- **Inventory Session**: Represents a single stock-change analysis run for a container. Has an identifier, container reference, status (pending/completed/needs_review/approved/failed), timestamps, and references to before/after evidence images.
- **Inventory Delta**: The line-by-line comparison result within a session. Each line has an item identifier, item name, before count, after count, net change, and confidence score.
- **Delta Item**: A single item in the inventory (e.g., a product or SKU). Has a name/label, optional SKU identifier, and count.
- **Review**: An operator's response to a delta. Contains the reviewer identity, timestamp, the set of corrections (count changes, additions, removals, renames), and optional notes.
- **Evidence Image**: A captured image (before or after) associated with a session. May include overlay metadata (bounding boxes with labels and coordinates) for visualization.

## Assumptions

- The BridgeServer backend will provide the three endpoints described in the feature request (latest inventory, session delta, review submission). The exact response shapes will be confirmed during planning, but the UI assumes a standard V1 API envelope.
- Confidence scores are provided per-item as a numeric value (0-1) or categorical (high/medium/low) by the backend. The UI will map numeric scores to visual indicators.
- Before/after images are served as URLs (presigned or public) rather than inline base64, given inventory images may be larger than camera snapshots.
- Only one review per session is supported (no re-review after approval). If re-review is needed, a new analysis session must be triggered.
- The feature integrates into the existing container-scoped tab navigation. It will appear as a new section within the container detail view or as a dedicated tab, consistent with existing dashboard patterns.
- Item names/SKUs are free-text strings provided by the analysis backend. The dashboard does not maintain a master product catalog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can view the latest inventory delta for any container within 3 seconds of selecting it.
- **SC-002**: Operators can complete a review (approve or submit corrections) for a session within 2 minutes, including visual verification of evidence images.
- **SC-003**: 95% of delta displays render correctly on first load without requiring a manual refresh.
- **SC-004**: The system handles all five session states (pending, completed, needs_review, approved, failed) with distinct, clearly labeled UI states that require no additional explanation.
- **SC-005**: Review corrections (count edits, additions, removals) persist correctly and are visible in the audit trail immediately after submission.
- **SC-006**: The UI remains responsive and stable when the inventory analysis service is unavailable, with no error modals or broken layouts.
