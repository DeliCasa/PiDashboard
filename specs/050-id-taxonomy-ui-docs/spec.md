# Feature Specification: ID Taxonomy Consistency in UI & Documentation

**Feature Branch**: `050-id-taxonomy-ui-docs`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Make ID taxonomy consistent in UI/docs and remove any remaining semantic container naming assumptions; ensure all displayed IDs are clearly 'opaque identifiers' and only user-facing labels are semantic."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Documentation Uses Non-Semantic ID Examples (Priority: P1)

An operator or developer reading PiDashboard documentation encounters example container and camera IDs. Every example uses clearly non-semantic placeholder IDs (e.g., UUID-style strings or generic `container-1`, `camera-1` labels) rather than domain-specific names like "fridge-1" or "kitchen-fridge-001". This ensures readers understand that IDs carry no inherent meaning and that human-friendly labels are separate from identifiers.

**Why this priority**: Documentation shapes developer and operator mental models. Semantic example IDs (like "fridge-1") train readers to expect meaning in identifiers, which leads to fragile assumptions in integrations and troubleshooting. Fixing docs is the highest-leverage change.

**Independent Test**: Review all documentation files and verify zero semantic ID examples remain; all ID examples are clearly opaque (UUID-format or generic numbered placeholders).

**Acceptance Scenarios**:

1. **Given** the handoff document `HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md`, **When** an operator reads the environment variable configuration section, **Then** the `AUTO_ONBOARD_TARGET_CONTAINER` example uses a UUID-format string, not "fridge-1".
2. **Given** any specification file in `specs/`, **When** a developer reads example IDs, **Then** examples use UUID-format strings or clearly non-semantic placeholders (e.g., `550e8400-e29b-41d4-...`), and any "fridge-1" references are clearly labeled as anti-patterns to avoid.
3. **Given** the container management guide, **When** a new operator reads the identity model section, **Then** they find a clear explanation that IDs are opaque and labels are the human-friendly display.

---

### User Story 2 - UI Labels Distinguish IDs from Display Names (Priority: P2)

An operator viewing the dashboard sees every identifier field explicitly labeled. Where an opaque ID is shown (e.g., container ID, session ID, camera ID), the field is labeled "ID" or "Identifier" and rendered in monospace. Where a human-friendly name is shown, the field is labeled "Name", "Label", or "Display Name". There is no ambiguity about which value is the opaque identifier and which is the user-assigned label.

**Why this priority**: Clear visual and textual distinction between IDs and labels prevents operators from confusing the two, reducing support incidents and misconfiguration.

**Independent Test**: Navigate through all dashboard views (Container Picker, Container Card, Container Detail, Camera Card, Inventory Run List, Inventory Run Detail) and verify each ID field has an explicit "ID" label and each name field has a "Name" or "Label" designation.

**Acceptance Scenarios**:

1. **Given** the Container Detail view, **When** an operator views a container's information, **Then** the opaque identifier is displayed under a field labeled "Container ID" in monospace, and the human-friendly name is displayed under "Label" or "Display Name".
2. **Given** the Inventory Run Detail view, **When** an operator views run metadata, **Then** the session ID is labeled "Session ID" and the container ID is labeled "Container ID", both in monospace with truncation and copy-to-clipboard.
3. **Given** the Camera Card component, **When** an operator views camera information, **Then** the camera identifier is labeled "Camera ID" (monospace) and any human-assigned camera name is labeled "Name".

---

### User Story 3 - Test Fixtures Use Clearly Opaque IDs (Priority: P3)

A developer reviewing E2E or integration test fixtures sees that mock container and camera IDs use UUID-format strings rather than semantic strings like "kitchen-fridge-001". This reinforces that the system treats IDs as opaque and prevents tests from accidentally encoding semantic assumptions about ID formats.

**Why this priority**: Test fixtures serve as living documentation. Semantic IDs in fixtures undermine the opaque-ID principle even if production code handles them correctly. Using UUIDs in test data reinforces the architecture.

**Independent Test**: Search all test fixture files for container/camera IDs and verify they use UUID-format strings or clearly non-semantic identifiers.

**Acceptance Scenarios**:

1. **Given** the E2E mock routes fixture, **When** a developer examines container mock data, **Then** container IDs use UUID-format strings (e.g., `f47ac10b-58cc-4372-a567-0e02b2c3d479`) rather than semantic strings like "kitchen-fridge-001".
2. **Given** the E2E accessibility and inventory delta test files, **When** a developer examines mock container data, **Then** all `container_id` fields use UUID-format strings.
3. **Given** the integration contract test for non-UUID acceptance, **When** the test validates opaque ID handling, **Then** the test uses clearly arbitrary strings (e.g., `OPAQUE_ABC_123`, `42`) rather than domain-suggestive strings like "kitchen-fridge-001".

---

### Edge Cases

- What happens when a container has no label configured? The UI already falls back to "Unnamed Container" in italicized muted text. This behavior is preserved unchanged.
- What happens when an ID is very long? The existing truncation strategy (first 8 chars + "..." + last 4 chars) is preserved unchanged.
- How does this affect existing API contracts? No API changes are involved. Only UI labels and documentation text change.
- What happens to existing spec files that reference "fridge-1"? References in historical context (describing what was removed or as anti-pattern examples) are preserved but clearly annotated as anti-patterns.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Documentation MUST NOT use semantic container IDs (e.g., "fridge-1", "kitchen-fridge-001") as positive example identifiers; such strings may only appear when explicitly illustrating anti-patterns.
- **FR-002**: All documentation examples of container IDs MUST use UUID-format strings or clearly non-semantic placeholders.
- **FR-003**: The UI MUST label every displayed opaque identifier with a descriptive field name (e.g., "Container ID", "Session ID", "Camera ID").
- **FR-004**: The UI MUST visually distinguish opaque IDs from human-friendly labels using the existing convention: IDs in monospace, small, muted styling; labels in standard typography.
- **FR-005**: Test fixtures MUST use UUID-format strings for container and camera IDs rather than semantic strings.
- **FR-006**: The container management documentation MUST include a clear explanation of the ID-vs-label taxonomy: IDs are opaque, machine-assigned, and never carry semantic meaning; labels are human-assigned display names.
- **FR-007**: No semantic IDs MUST leak into API calls, persisted identifiers, or URL parameters. (Verification only; this is already true in production code.)

### Key Entities

- **Opaque Identifier**: A machine-assigned string (typically UUID) that uniquely identifies an entity. Never carries human-readable meaning. Used in API calls, storage, and URL parameters.
- **Display Label**: A human-assigned, human-readable name for an entity. Used for display purposes only. Optional; falls back to "Unnamed [Entity]" when not set.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero documentation files contain semantic container ID examples (e.g., "fridge-1", "kitchen-fridge-001") used as positive examples. All ID examples use UUID-format or clearly non-semantic strings.
- **SC-002**: Every UI view that displays an opaque identifier includes an explicit field label containing "ID" (e.g., "Container ID", "Session ID").
- **SC-003**: All E2E and integration test fixtures use UUID-format container IDs, with zero instances of semantic-looking container IDs like "kitchen-fridge-001".
- **SC-004**: Operators can distinguish identifiers from labels at a glance in every dashboard view, as confirmed by visual audit.
- **SC-005**: The container management guide includes a dedicated section explaining the ID taxonomy (opaque ID vs. display label) that a new operator can understand without prior context.

## Assumptions

- The existing monospace + muted-foreground styling convention for IDs is retained. No visual redesign is needed.
- The "Unnamed Container" fallback for missing labels is retained unchanged.
- The truncation strategy (8 chars + "..." + 4 chars) for long IDs is retained unchanged.
- No API changes are required. All changes are UI labels, documentation text, and test fixture data.
- Spec files in `specs/046-*`, `specs/048-*`, and `specs/049-*` that reference "fridge-1" in historical/anti-pattern context may keep those references with clear annotation.
- The contract test that validates non-UUID ID acceptance will update its test data to use arbitrary non-semantic strings rather than "kitchen-fridge-001".
