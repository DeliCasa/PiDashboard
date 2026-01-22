# Feature Specification: Auto-Onboard ESP-CAM Dashboard Integration

**Feature Branch**: `035-auto-onboard-dashboard`
**Created**: 2026-01-22
**Status**: Draft
**Input**: Handoff document HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md from PiOrchestrator

## Overview

This feature integrates the PiOrchestrator's Auto-Onboard API into the PiDashboard, allowing developers to monitor and control automatic ESP-CAM device onboarding during development. Auto-onboard is a **DEV MODE ONLY** feature that automatically discovers and pairs ESP-CAM devices on the Pi's access point network without manual Bluetooth pairing.

**Key Integration Point**: Auto-onboarded devices automatically appear in the existing camera list (`/api/v1/espcam/paired`). The dashboard does NOT need to call auto-onboard APIs to see devices—they appear automatically when onboarded by PiOrchestrator.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Auto-Onboard Status (Priority: P1)

As a developer, I want to see the current status of the auto-onboard system so that I know whether it's actively onboarding devices and how it's configured.

**Why this priority**: This is the foundational feature—developers need visibility into the auto-onboard state before they can make decisions about enabling/disabling it.

**Independent Test**: Can be fully tested by viewing the dashboard when auto-onboard is available; delivers immediate visibility into onboarding state without any user interaction.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded and auto-onboard mode is "dev", **When** I view the Cameras section, **Then** I see an "Auto-Onboard" status panel showing enabled/disabled state, running status, and configuration summary.

2. **Given** auto-onboard is enabled and running, **When** I view the status panel, **Then** I see live metrics including attempts count, success count, failed count, and last success/failure timestamps.

3. **Given** auto-onboard mode is "off" (not configured), **When** I view the Cameras section, **Then** the Auto-Onboard panel shows "Not Available" with a message explaining it requires DEV mode configuration on the Pi.

4. **Given** the dashboard cannot reach the auto-onboard API, **When** I view the status panel, **Then** I see an error state with a retry option.

---

### User Story 2 - Toggle Auto-Onboard On/Off (Priority: P1)

As a developer, I want to enable or disable auto-onboard with a single action so that I can quickly start/stop automatic device onboarding during development.

**Why this priority**: Control is essential for development workflow—developers need to start onboarding when testing and stop it (kill switch) when something goes wrong.

**Independent Test**: Can be fully tested by toggling the switch and verifying the state changes; delivers immediate control over the onboarding process.

**Acceptance Scenarios**:

1. **Given** auto-onboard is disabled and mode is "dev", **When** I click the "Enable Auto-Onboard" toggle, **Then** the system enables auto-onboard and shows a success confirmation with the new "Running" state.

2. **Given** auto-onboard is enabled and running, **When** I click the "Disable Auto-Onboard" toggle (kill switch), **Then** the system immediately disables auto-onboard and shows confirmation that it has stopped.

3. **Given** auto-onboard mode is "off", **When** I try to enable auto-onboard, **Then** I see an error message explaining that DEV mode must be configured on the Pi first.

4. **Given** a network error occurs during toggle, **When** the request fails, **Then** I see an error message and the toggle reverts to its previous state.

---

### User Story 3 - View Onboarding Metrics (Priority: P2)

As a developer, I want to see success/failure statistics for auto-onboarding so that I can understand how well the system is working and troubleshoot issues.

**Why this priority**: Metrics provide valuable debugging information but are secondary to basic enable/disable functionality.

**Independent Test**: Can be tested by viewing metrics after some onboarding attempts have occurred; delivers insight into system health.

**Acceptance Scenarios**:

1. **Given** auto-onboard has processed some devices, **When** I view the metrics panel, **Then** I see total attempts, successful onboards, failed onboards, rejected by policy, and already onboarded counts.

2. **Given** metrics show failures, **When** I view the metrics panel, **Then** I see the timestamp of the last failure to help with troubleshooting.

3. **Given** I want to start fresh, **When** I click "Reset Metrics", **Then** all counters reset to zero and I see confirmation of the reset.

---

### User Story 4 - View Audit Event History (Priority: P2)

As a developer, I want to see a timeline of onboarding events so that I can understand what happened to each device and debug issues.

**Why this priority**: Event history is valuable for debugging but not essential for basic onboarding control.

**Independent Test**: Can be tested by viewing event log after devices have been processed; delivers detailed debugging information.

**Acceptance Scenarios**:

1. **Given** auto-onboard has processed devices, **When** I view the audit events panel, **Then** I see a paginated list of events showing MAC address, stage, outcome, timestamp, and any error details.

2. **Given** I want to see events for a specific device, **When** I filter by MAC address, **Then** I see only events for that device in chronological order.

3. **Given** many events exist, **When** I scroll through the list, **Then** more events load automatically (pagination).

4. **Given** an event shows "failed" outcome, **When** I view the event details, **Then** I see the error code and error message explaining what went wrong.

---

### User Story 5 - View Configuration Details (Priority: P3)

As a developer, I want to see the auto-onboard configuration so that I understand the operational constraints (rate limits, allowed subnets, timeouts).

**Why this priority**: Configuration is informational and read-only from the dashboard; helpful but not essential.

**Independent Test**: Can be tested by viewing configuration panel; delivers transparency into system constraints.

**Acceptance Scenarios**:

1. **Given** auto-onboard is available, **When** I view the configuration panel, **Then** I see rate limits (max per minute, burst size), subnet allowlist, and verification timeout.

2. **Given** the configuration shows subnet restrictions, **When** I view the allowlist, **Then** I understand which network ranges can auto-onboard (e.g., "192.168.10.0/24").

---

### User Story 6 - Cleanup Old Events (Priority: P3)

As a developer, I want to remove old audit events so that the event log stays manageable and relevant.

**Why this priority**: Housekeeping feature that is useful for long-running development but not essential.

**Independent Test**: Can be tested by running cleanup and verifying old events are removed.

**Acceptance Scenarios**:

1. **Given** many old events exist, **When** I click "Cleanup Old Events" and specify a retention period (e.g., 7 days), **Then** events older than that period are removed and I see a count of deleted events.

---

### Edge Cases

- What happens when the Pi is restarted and auto-onboard status is unknown?
  - Dashboard shows "Loading" state, then refreshes to current status once API responds.

- How does the system handle rapid enable/disable toggling?
  - Toggle is disabled during API requests to prevent race conditions.

- What if an ESP-CAM is already onboarded and appears again?
  - PiOrchestrator handles this (increments "already_onboarded" counter); dashboard just displays the metric.

- What happens when rate limits are exceeded?
  - Events show "rejected_by_policy" stage; dashboard displays this in metrics and event log.

- How does the dashboard behave when auto-onboard is enabled but no devices are connecting?
  - Status shows "Running" with zero attempts; metrics remain at zero until devices connect.

## Requirements *(mandatory)*

### Functional Requirements

#### Status & Monitoring

- **FR-001**: System MUST display the current auto-onboard enabled/disabled state prominently in the Cameras section.
- **FR-002**: System MUST show whether auto-onboard is actively running (listening for devices).
- **FR-003**: System MUST display the auto-onboard mode ("dev" or "off") and indicate when DEV mode is required.
- **FR-004**: System MUST show a persistent warning banner when auto-onboard is enabled, indicating it is a DEV MODE ONLY feature.
- **FR-005**: System MUST poll auto-onboard status every 15 seconds when the feature is available.
- **FR-006**: System MUST pause polling when the browser tab is hidden (visibility-aware polling).

#### Control

- **FR-007**: System MUST provide a toggle switch to enable auto-onboard when mode is "dev".
- **FR-008**: System MUST provide a toggle switch (kill switch) to immediately disable auto-onboard.
- **FR-009**: System MUST disable the toggle control during pending API requests to prevent double-submission.
- **FR-010**: System MUST show a confirmation toast/notification after successful enable/disable.
- **FR-011**: System MUST revert toggle state and show error message if the API request fails.

#### Metrics Display

- **FR-012**: System MUST display onboarding metrics: attempts, success, failed, rejected by policy, already onboarded.
- **FR-013**: System MUST display timestamps for last successful and last failed onboarding attempts.
- **FR-014**: System MUST provide a "Reset Metrics" action that clears all counters.
- **FR-015**: System MUST update metrics automatically when status is polled.

#### Audit Events

- **FR-016**: System MUST display a paginated list of onboarding audit events.
- **FR-017**: System MUST show event details: MAC address, stage, outcome, timestamp, error information, duration.
- **FR-018**: System MUST support filtering events by MAC address.
- **FR-019**: System MUST support filtering events by time range (since timestamp).
- **FR-020**: System MUST support pagination with configurable page size (default 50, max 100).
- **FR-021**: System MUST allow viewing events for a specific device by MAC address.

#### Configuration Display

- **FR-022**: System MUST display auto-onboard configuration: max per minute, burst size, subnet allowlist, verification timeout.
- **FR-023**: Configuration display MUST be read-only (configuration is managed on the Pi side).

#### Housekeeping

- **FR-024**: System MUST provide a "Cleanup Old Events" action with configurable retention period (1-365 days, default 90).

#### Integration with Existing Features

- **FR-025**: Auto-onboarded devices MUST appear in the existing camera list without additional user action.
- **FR-026**: System MUST NOT duplicate functionality—camera list continues to use `/api/v1/espcam/paired` or `/api/v1/cameras`.
- **FR-027**: Auto-onboard panel MUST integrate visually with the existing Cameras section design.

### Non-Functional Requirements

- **NFR-001**: Toggle actions MUST complete within 5 seconds when network RTT is under 500ms.
- **NFR-002**: Status polling MUST NOT impact dashboard performance or cause excessive API load.
- **NFR-003**: UI MUST be responsive and work on tablet-sized screens (768px minimum width).
- **NFR-004**: All interactive elements MUST be keyboard accessible.
- **NFR-005**: Toggle switch MUST use proper ARIA role="switch" for accessibility.

### Key Entities

- **AutoOnboardStatus**: Represents the current state of auto-onboard (enabled, mode, running, config, metrics).
- **AutoOnboardConfig**: Rate limiting and policy configuration (max_per_minute, burst_size, subnet_allowlist, verification_timeout).
- **AutoOnboardMetrics**: Success/failure counters and timestamps.
- **OnboardingAuditEntry**: Individual audit log entry tracking a device's onboarding journey.
- **AuditEventStage**: Enum of possible stages (discovered, verified, registered, paired, failed, rejected_by_policy).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can view auto-onboard status within 3 seconds of loading the dashboard.
- **SC-002**: Developers can enable or disable auto-onboard with a single click/tap.
- **SC-003**: Toggle action completes and shows feedback within 5 seconds.
- **SC-004**: Metrics update automatically without manual refresh.
- **SC-005**: Developers can find events for a specific device (by MAC) within 10 seconds.
- **SC-006**: Dashboard remains responsive during status polling (no UI freezes or delays).
- **SC-007**: 100% of interactive controls are accessible via keyboard navigation.
- **SC-008**: Warning banner is visible whenever auto-onboard is enabled (100% visibility).

## Assumptions

1. PiOrchestrator backend is running and accessible on port 8081 (auto-onboard API base).
2. The dashboard already has working camera list functionality via V1 API.
3. Auto-onboard API endpoints follow the structure documented in the handoff.
4. DEV mode is configured on the Pi before auto-onboard can be enabled.
5. The existing API client patterns (error handling, retries, Zod validation) will be extended for auto-onboard.
6. Polling intervals align with existing dashboard patterns (10-30 seconds, visibility-aware).

## Out of Scope

- Modifying auto-onboard configuration from the dashboard (Pi-side only).
- Auto-onboard for production environments (DEV MODE ONLY).
- Bluetooth/BLE provisioning integration (separate existing feature).
- Creating new ESP-CAM device entries (handled automatically by PiOrchestrator).
- Alert notifications for onboarding events (future enhancement).

## Dependencies

- **PiOrchestrator**: Must have auto-onboard API endpoints available (spec 032-dev-auto-onboard-espcam).
- **Existing Features**: Builds on 034-esp-camera-integration for camera list display.
- **UI Components**: Uses existing shadcn/ui components (Switch, Card, Badge, Alert, Collapsible).

## Technical Context (from codebase exploration)

### Existing Patterns to Follow

1. **API Client**: Extend `v1-client.ts` pattern with Zod schema validation.
2. **Hooks**: Create `useAutoOnboard.ts` following `useCameras.ts` patterns with visibility-aware polling.
3. **Error Handling**: Use `V1ApiError` class with user-friendly message mapping.
4. **Components**: Follow existing camera component structure (Section -> Cards -> Dialogs).
5. **Fallback Strategy**: Handle case where auto-onboard API returns HTML (SPA fallback).

### API Endpoints to Integrate

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/onboarding/auto/status` | GET | Get current status, config, metrics |
| `/api/v1/onboarding/auto/enable` | POST | Enable auto-onboard |
| `/api/v1/onboarding/auto/disable` | POST | Disable auto-onboard (kill switch) |
| `/api/v1/onboarding/auto/events` | GET | Get paginated audit events |
| `/api/v1/onboarding/auto/events/:mac` | GET | Get events for specific device |
| `/api/v1/onboarding/auto/metrics/reset` | POST | Reset metrics counters |
| `/api/v1/onboarding/auto/events/cleanup` | POST | Remove old events |

### UI Component Structure (Proposed)

```
CameraSection
├── AutoOnboardPanel (new)
│   ├── DevModeWarningBanner
│   ├── StatusCard (enabled/running state + toggle)
│   ├── MetricsCard (success/failure counts)
│   ├── ConfigCard (collapsible, read-only)
│   └── AuditEventsPanel (collapsible)
│       ├── EventFilters (MAC, time range)
│       ├── EventList (paginated)
│       └── EventDetail (expandable rows)
└── CameraList (existing)
```
