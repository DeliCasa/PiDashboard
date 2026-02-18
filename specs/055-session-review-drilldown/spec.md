# Feature Specification: Operator Review — Session Drill-down + Delta Validation UX

**Feature Branch**: `055-session-review-drilldown`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Define the operator workflow for reviewing a customer session: see status, inspect evidence, validate/adjust delta, and finalize outcomes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Session Drill-down with Status Timeline (Priority: P1)

An operator selects an inventory analysis run from the existing run list and sees a visual status timeline showing where the session stands in its lifecycle: Created → Capture → Analysis → Delta Ready → Finalized. This replaces the current text-only status display with a step-by-step progression indicator, giving the operator immediate spatial awareness of the session's stage. The timeline highlights the current step and marks completed steps, so the operator never has to guess what happened or what comes next.

**Why this priority**: This is the primary navigation and context-setting story. Every other workflow (review, correction, evidence inspection) depends on the operator understanding the session's current state.

**Independent Test**: Can be tested by opening any run detail — the timeline renders for all statuses (pending through finalized) and visually distinguishes the current step from completed and upcoming steps.

**Acceptance Scenarios**:

1. **Given** an analysis run with status `pending`, **When** the operator opens the drill-down, **Then** the timeline shows "Created" as completed and "Capture" as the active step, with "Analysis", "Delta Ready", and "Finalized" as upcoming.
2. **Given** an analysis run with status `done` and no review, **When** the operator opens the drill-down, **Then** the timeline shows "Created", "Capture", "Analysis", and "Delta Ready" as completed, with "Finalized" as upcoming (awaiting operator review).
3. **Given** an analysis run with status `done` and a review attached, **When** the operator opens the drill-down, **Then** all five timeline steps are marked complete (including "Finalized").
4. **Given** an analysis run with status `error`, **When** the operator opens the drill-down, **Then** the timeline shows the "Analysis" step in an error state with a visual error indicator, and subsequent steps are dimmed.
5. **Given** an analysis run with status `processing`, **When** the operator views the drill-down and waits, **Then** the timeline animates or pulses at the "Analysis" step, and auto-updates when the status changes (via polling).

---

### User Story 2 — Delta Review & Correction with Audit Trail (Priority: P1)

After the analysis reaches "Delta Ready" (status `done` or `needs_review`), the operator reviews the AI-generated delta table showing item changes (before/after counts, confidence scores, rationale). The operator can approve the delta as-is or enter correction mode to adjust counts, add missed items, or remove false positives. Each correction records who made the change, when, and what was changed. After submitting, the session moves to "Finalized" status.

**Why this priority**: This is the core value-add — the operator validation that makes AI-generated inventory counts trustworthy. Without this, the system has no human-in-the-loop quality gate.

**Independent Test**: Can be tested end-to-end by opening a `needs_review` run, editing a count, submitting, and verifying the audit trail appears with the operator's corrections.

**Acceptance Scenarios**:

1. **Given** a run with status `needs_review` and 5 delta items, **When** the operator opens the drill-down, **Then** the delta table shows all items with name, before count, after count, change, confidence badge (High/Medium/Low), and rationale (if present).
2. **Given** a run with status `done` and no review, **When** the operator clicks "Approve As-Is", **Then** the review is submitted with action `approve`, the audit trail appears immediately, and a success notification is shown.
3. **Given** a run with low-confidence items (confidence < 0.5), **When** the operator opens the drill-down, **Then** a warning banner highlights that some items have low confidence and may need manual verification.
4. **Given** the operator is editing corrections, **When** they change an item's count from 3 to 5, **Then** a confirmation dialog shows a summary of all changes before final submission.
5. **Given** a run that was already reviewed by another operator, **When** the current operator attempts to submit a review, **Then** a conflict message appears ("Session already reviewed by another operator") with a "Refresh & Re-review" action.
6. **Given** a delta with zero items (empty delta), **When** the operator opens the drill-down, **Then** a message says "No inventory changes detected" with an option to still approve (confirming no changes) or manually add items.

---

### User Story 3 — Evidence Preview (Before/After) (Priority: P2)

Within the drill-down, the operator sees before and after evidence images side by side when available. Evidence images are loaded from presigned URLs that auto-refresh if expired. When evidence is unavailable (not yet captured, URL expired and unrecoverable, or session had no camera), the UI clearly communicates the state rather than showing broken images.

**Why this priority**: Evidence is important for context but the review can proceed without it. Operators can approve/correct deltas based on domain knowledge even when evidence is unavailable.

**Independent Test**: Can be tested by opening a run with evidence URLs — images load and display correctly. Separately testable with missing evidence — placeholder states render without errors.

**Acceptance Scenarios**:

1. **Given** a run with both `before_image_url` and `after_image_url` in evidence, **When** the operator views the drill-down, **Then** both images are displayed side-by-side with "Before" and "After" labels.
2. **Given** a run where evidence URLs have expired, **When** the operator views the drill-down, **Then** the system attempts URL refresh automatically and shows a "Refreshing..." state during the refresh.
3. **Given** a run with no evidence data (evidence is null), **When** the operator views the drill-down, **Then** a placeholder message says "No evidence images available for this session" and the review form remains accessible.
4. **Given** a run with only a `before_image_url` (after image missing), **When** the operator views the drill-down, **Then** the before image displays normally and the after image slot shows "After image not captured."

---

### User Story 4 — Failure UX & Recovery Actions (Priority: P2)

When an analysis fails or evidence is missing, the operator sees clear, actionable error states. Each failure mode has a distinct message and available actions. If the backend supports re-running an analysis, a "Request Re-run" button is presented. If the backend does not support re-run, the operator sees the error details and can copy diagnostic information (run ID, session ID, error message) for support escalation.

**Why this priority**: Failure handling is essential for a demo-ready experience — operators must never hit a dead end without knowing what to do next.

**Independent Test**: Can be tested by simulating each error status and verifying the correct message and available actions appear.

**Acceptance Scenarios**:

1. **Given** a run with status `error` and `metadata.error_message` set, **When** the operator opens the drill-down, **Then** the error message is displayed prominently with a "Copy Error Details" button that copies run ID, session ID, and error message to clipboard.
2. **Given** a run with status `error`, **When** the backend supports re-run (endpoint returns 200 or 202), **Then** a "Request Re-run" button is visible and triggers a new analysis for the same session/container.
3. **Given** a run with status `error`, **When** the backend does NOT support re-run (endpoint returns 404 or 501), **Then** the "Request Re-run" button is hidden and the error state shows "Contact support with the details below."
4. **Given** a run where analysis has been in `processing` status for more than 5 minutes, **When** the operator views the drill-down, **Then** a "Stale analysis" warning appears indicating the analysis may be stuck, with a "Refresh" button to re-check status.
5. **Given** the API returns an authentication error (401/403) for any operation, **When** the operator sees the error, **Then** a message says "Authentication error — the device may need re-authorization" with guidance to check the Pi's connection to BridgeServer.

---

### User Story 5 — CorrelationId & Diagnostic Metadata Display (Priority: P3)

The drill-down shows diagnostic metadata (run ID, session ID, container ID, analysis provider, processing time, model version) in a collapsible "Debug Info" section. All IDs are displayed in monospace with copy-to-clipboard buttons. The `request_id` from API response envelopes is captured and displayed alongside the run metadata for cross-referencing with backend logs.

**Why this priority**: Diagnostic metadata is a developer/support tool, not needed for the primary operator workflow. Still valuable for demos to show system observability.

**Independent Test**: Can be tested by opening any run detail, expanding the debug section, and verifying all metadata fields render with copy buttons.

**Acceptance Scenarios**:

1. **Given** any run detail view, **When** the operator clicks "Debug Info" or a similar disclosure control, **Then** a collapsible section expands showing: Run ID, Session ID, Container ID, Provider, Processing Time (ms), Model Version, and Request ID.
2. **Given** the debug section is expanded, **When** the operator clicks the copy icon next to any ID field, **Then** the full ID value (not truncated) is copied to the clipboard and a "Copied" toast appears.
3. **Given** a run detail view, **When** the operator uses the existing session lookup input with a session ID, **Then** the matching run loads in the drill-down view with all diagnostic metadata visible.

---

### User Story 6 — Demo Script: Operator Review Walkthrough (Priority: P3)

The system supports a specific end-to-end demo flow that an operator can execute to demonstrate the review workflow. This is not a separate feature but a validation that all P1 and P2 stories compose into a coherent demo.

**Why this priority**: The demo script validates that individual stories compose correctly. It has the lowest independent value since it depends on all other stories.

**Independent Test**: Can be tested as an E2E scenario covering the full operator workflow.

**Demo Script — Exact Steps**:

1. **Navigate** to the "Inventory" tab (requires a container to be selected via the header container picker).
2. **Observe** the run list showing recent analysis runs with status badges and delta summaries.
3. **Enter a session ID** in the session lookup input and press Search to jump directly to a run.
4. **Observe** the status timeline at the top of the drill-down — it shows the run at "Delta Ready" with prior steps completed.
5. **Scroll to the evidence panel** — before and after images display side-by-side.
6. **Review the delta table** — items shown with before/after counts, confidence badges, and rationale tooltips.
7. **Click "Edit & Correct"** — enter correction mode, change one item's count, add a note.
8. **Click "Submit Corrections"** — confirm in the confirmation dialog.
9. **Observe** the status timeline updates to "Finalized", the audit trail appears showing the correction, and a success toast notification is displayed.
10. **Expand "Debug Info"** — copy the Run ID and Session ID for cross-referencing with backend logs.

**Expected Result**: The full workflow completes in under 2 minutes for a run with 5–10 delta items.

---

### Edge Cases

- What happens when the operator opens a drill-down for a run that was deleted server-side between list load and click? **The system shows "Run not found" with a "Back to list" button and auto-refreshes the run list.**
- What happens when the delta contains 100+ items (huge delta)? **The delta table supports scrolling without freezing the UI. A count badge in the header shows "N items" so the operator knows the scale before scrolling.**
- What happens when two operators attempt to review the same run simultaneously? **The first submission succeeds; the second receives a 409 conflict with "Refresh & Re-review" option.**
- What happens when the network drops during review submission? **The system shows a retry-able error with the operator's corrections preserved in the form (no data loss).**
- What happens when the browser tab is backgrounded during analysis polling? **Polling pauses (visibility-aware scheduling) and resumes when the tab is foregrounded.**

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a visual status timeline in the run drill-down showing the session lifecycle: Created → Capture → Analysis → Delta Ready → Finalized.
- **FR-002**: System MUST visually distinguish completed steps, the current step, error steps, and upcoming steps in the timeline.
- **FR-003**: System MUST display the delta table with item name, before count, after count, net change, confidence badge (High ≥ 0.8, Medium 0.5–0.79, Low < 0.5), and rationale when present.
- **FR-004**: System MUST allow operators to approve a delta as-is (action: `approve`) or submit corrections (action: `override`) with item-level count changes.
- **FR-005**: System MUST show a confirmation dialog summarizing all corrections before final submission.
- **FR-006**: System MUST display an audit trail after review showing: reviewer ID, timestamp, action taken, and correction details (if override).
- **FR-007**: System MUST show before/after evidence images side-by-side when available, with automatic presigned URL refresh for expired URLs.
- **FR-008**: System MUST gracefully handle missing evidence (null evidence, missing before/after URLs) with descriptive placeholder messages.
- **FR-009**: System MUST display actionable error states for failed analyses, including the error message, copyable diagnostic metadata, and a re-run action when the backend supports it.
- **FR-010**: System MUST handle 409 conflict responses (already reviewed) with a clear message and a "Refresh & Re-review" action.
- **FR-011**: System MUST preserve the operator's in-progress corrections if a submission fails due to a network error, allowing retry without re-entering data.
- **FR-012**: System MUST show a collapsible "Debug Info" section with run ID, session ID, container ID, provider, processing time, model version, and request ID — all with copy-to-clipboard.
- **FR-013**: System MUST display a warning banner when the delta contains low-confidence items (any item with confidence < 0.5).
- **FR-014**: System MUST handle an empty delta (no items changed) with a message and the option to approve or manually add items.
- **FR-015**: System MUST display a "stale analysis" warning when a run has been in `processing` status for longer than 5 minutes.
- **FR-016**: System MUST handle backend authentication errors (401/403) with a descriptive message guiding the operator toward resolution.

### Key Entities

- **InventoryAnalysisRun**: The primary entity — represents one analysis lifecycle for a container. Has run_id, session_id, container_id, status (pending/processing/done/needs_review/error), delta entries, evidence images, review data, and analysis metadata.
- **DeltaEntry**: A single inventory change detected by AI — item name, SKU, before/after counts, net change, confidence score, and rationale text.
- **Review**: The operator's validation record — reviewer ID, action (approve/override), corrections array, notes, and reviewed_at timestamp.
- **EvidenceImages**: Before/after image URLs with optional bounding box overlays from the ML model.
- **AnalysisMetadata**: Provenance data — provider name, processing time, model version, error message (if failed), created/completed timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can complete the full review workflow (open drill-down → inspect delta → submit review) in under 2 minutes for a typical run with 5–10 delta items.
- **SC-002**: The status timeline correctly reflects the current run status for all 5 lifecycle stages, verified across all status values (pending, processing, done, needs_review, error).
- **SC-003**: 100% of failure states (analysis error, evidence missing, network error, auth error, conflict) display an actionable message — no blank screens or unhandled errors.
- **SC-004**: The demo script (10 steps defined in User Story 6) is completable end-to-end on a live Pi with real data.
- **SC-005**: Delta tables with 50+ items render without UI jank (scroll remains responsive).
- **SC-006**: Corrections submitted by the operator are accurately recorded in the audit trail with zero data loss between form state and server response.

## Assumptions

- The primary entity for "session" in this spec is the `InventoryAnalysisRun`, which already carries a `session_id` linking it to the broader purchase session.
- The PiDashboard has no user authentication — the reviewer ID is determined server-side (by PiOrchestrator or BridgeServer), not entered by the operator. "Auth denied" scenarios refer to the backend rejecting API calls (e.g., expired Pi API key), not operator login.
- The re-run capability is conditional on backend support. If `POST /v1/inventory/:runId/rerun` returns 404 or 501, the feature gracefully degrades to showing error details with copy-for-support instead.
- The "Finalized" status maps to the existing `done` status with a non-null `review` field — no new backend status enum value is required.
- Evidence presigned URL refresh uses the existing `/dashboard/diagnostics/images/presign` endpoint.
- Polling intervals match existing patterns: 15s for in-progress analysis, 30s for run list, visibility-aware pause when tab is backgrounded.

## Non-Goals

- Redesigning the overall UI layout, navigation, or design system.
- Adding operator authentication or login flows to the PiDashboard.
- Building a dedicated "sessions" tab — this feature enhances the existing Inventory tab.
- Server-side changes to BridgeServer or PiOrchestrator (spec is frontend-only; backend contracts are consumed as-is, with re-run as a conditional extension).
- Offline support or IndexedDB persistence for review data.

## Integration Contract Notes

This section documents the exact API endpoints consumed by the PiDashboard, grounded in the existing codebase. All requests are proxied through PiOrchestrator on port 8082.

### Endpoints Used

| Endpoint | Method | Purpose | Current Client |
| -------- | ------ | ------- | -------------- |
| `/v1/containers/:containerId/inventory/runs` | GET | Paginated run list (with `?limit=`, `?offset=`, `?status=` filters) | `inventoryDeltaApi.getRuns()` |
| `/v1/sessions/:sessionId/inventory-delta` | GET | Fetch full run by session ID (drill-down entry point) | `inventoryDeltaApi.getBySession()` |
| `/v1/containers/:containerId/inventory/latest` | GET | Latest run for a container | `inventoryDeltaApi.getLatest()` |
| `/v1/inventory/:runId/review` | POST | Submit review (approve or override with corrections) | `inventoryDeltaApi.submitReview()` |
| `/dashboard/diagnostics/sessions/:sessionId/evidence` | GET | List evidence captures for a session | `evidenceApi.listSessionEvidence()` |
| `/dashboard/diagnostics/images/presign` | GET | Refresh expired presigned image URLs | `evidenceApi.refreshPresignedUrl()` |
| `/v1/inventory/:runId/rerun` | POST | **NEW (conditional)** — Request re-analysis. If endpoint returns 404/501, feature degrades gracefully. | Not yet implemented |

### Response Envelope

All V1 endpoints return this envelope:

```
{
  success: boolean,
  data?: T,
  error?: { code: string, message: string, retryable?: boolean, retry_after_seconds?: number },
  timestamp?: string,
  request_id?: string    // <-- CorrelationId for debugging
}
```

The `request_id` field from this envelope is what gets displayed in the Debug Info section for cross-referencing with backend logs.

### Error Codes

| HTTP Status | Error Code | Handling |
| ----------- | ---------- | -------- |
| 404 | `INVENTORY_NOT_FOUND` | Return null / show "not found" state |
| 409 | `REVIEW_CONFLICT` | Show "already reviewed" + Refresh & Re-review button |
| 400 | `REVIEW_INVALID` | Show inline validation errors |
| 401/403 | (auth error) | Show "Authentication error" guidance |
| 500+ | (server error) | Show retry button, set `retryable: true` |

### CorrelationId Behavior

- The `request_id` is returned in every V1 response envelope.
- Currently, the API client parses it via the `InventoryLatestResponseSchema` and `RunListResponseSchema` (both include `request_id: z.string().optional()`).
- The drill-down captures the `request_id` from the most recent API response and displays it in the Debug Info collapsible section.
- Operators can copy the `request_id` to share with backend developers for log correlation.
