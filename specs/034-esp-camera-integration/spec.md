# Feature Specification: ESP Camera Integration via PiOrchestrator

**Feature Branch**: `034-esp-camera-integration`
**Created**: 2026-01-14
**Status**: Draft
**Input**: PiDashboard must integrate with ESP cameras through PiOrchestrator using the V1 Cameras API endpoints. This includes listing cameras, viewing details, capturing images, rebooting cameras, and viewing diagnostics.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Camera List (Priority: P1)

As a system administrator, I want to see a list of all connected ESP cameras with their status and health so that I can monitor my camera network at a glance.

**Why this priority**: This is the foundational feature. Without seeing cameras, no other functionality is useful. Users need visibility into their camera fleet as the primary entry point.

**Independent Test**: Can be fully tested by navigating to the cameras page and verifying cameras display with status badges. Delivers immediate value by showing the camera network state.

**Acceptance Scenarios**:

1. **Given** the dashboard is open and PiOrchestrator is running, **When** I navigate to the Cameras page, **Then** I see a list of all registered cameras with their name, status (online/offline), health indicator, and last seen timestamp.
2. **Given** cameras are displayed, **When** a camera goes offline, **Then** the camera's status updates to "offline" within the polling interval (10 seconds) without requiring a page refresh.
3. **Given** no cameras are connected, **When** I navigate to the Cameras page, **Then** I see an empty state message "No cameras connected" with guidance on how to add cameras.
4. **Given** the API request fails, **When** I navigate to the Cameras page, **Then** I see an error message with a "Retry" button.

---

### User Story 2 - Capture Image from Camera (Priority: P2)

As a system administrator, I want to capture a still image from a specific camera so that I can verify the camera is functioning and check its field of view.

**Why this priority**: Image capture is the primary action users take after viewing the camera list. It validates camera functionality and provides immediate visual feedback.

**Independent Test**: Can be tested by clicking "Capture" on any online camera and verifying an image displays in a modal. Delivers value by confirming camera operation.

**Acceptance Scenarios**:

1. **Given** a camera is online, **When** I click the "Capture" button, **Then** a modal opens showing a loading spinner, and once complete, displays the captured JPEG image with timestamp and camera ID.
2. **Given** an image is displayed in the capture modal, **When** I click "Download", **Then** the image downloads to my device as a JPEG file with a descriptive filename.
3. **Given** a capture is in progress, **When** the capture times out (after 30 seconds), **Then** I see an error message "Request timed out - check WiFi / Pi" with a "Retry" option.
4. **Given** a camera is offline, **When** I attempt to capture, **Then** I see a message "Camera offline" and the capture button is disabled (or shows a warning).

---

### User Story 3 - View Camera Details (Priority: P3)

As a system administrator, I want to view detailed information about a specific camera so that I can troubleshoot issues or verify configuration.

**Why this priority**: Detail view is accessed after identifying a camera of interest. Provides deeper information for debugging without cluttering the list view.

**Independent Test**: Can be tested by clicking a camera row/card to open detail view. Delivers value by providing complete camera information in one place.

**Acceptance Scenarios**:

1. **Given** the camera list is displayed, **When** I click "View" on a camera, **Then** I see a detail page showing status, health summary (WiFi signal, memory, uptime), last capture preview (if any), IP address, and MAC address.
2. **Given** I'm on the camera detail page, **When** I click "Capture", **Then** the capture modal opens (same as Story 2).
3. **Given** a camera cannot be found (deleted or stale ID), **When** I navigate to its detail page, **Then** I see a 404-like state with a link back to the camera list.
4. **Given** the camera has recent errors, **When** I view its details, **Then** I see the last error message displayed.

---

### User Story 4 - Reboot Camera (Priority: P4)

As a system administrator, I want to remotely reboot a camera so that I can resolve issues without physical access to the device.

**Why this priority**: Reboot is a recovery action used when cameras malfunction. Less frequently used than capture but essential for remote troubleshooting.

**Independent Test**: Can be tested by clicking "Reboot" and confirming the action. Delivers value by enabling remote camera recovery.

**Acceptance Scenarios**:

1. **Given** a camera is online, **When** I click "Reboot", **Then** a confirmation dialog appears warning "This will temporarily disconnect the camera."
2. **Given** the confirmation dialog is shown, **When** I confirm the reboot, **Then** the request is sent, the button is disabled during the request, and I see a success toast when complete.
3. **Given** a reboot request fails, **When** the failure occurs, **Then** I see an error toast with the failure reason.
4. **Given** a camera is already rebooting, **When** I view it in the list, **Then** its status shows "rebooting" and actions are temporarily disabled.

---

### User Story 5 - View Diagnostics (Priority: P5)

As a developer or advanced user, I want to view raw diagnostic data for all cameras so that I can debug complex issues.

**Why this priority**: Diagnostics is a debugging tool for advanced users. Not needed for normal operation but valuable for troubleshooting.

**Independent Test**: Can be tested by navigating to diagnostics page and verifying JSON renders correctly. Delivers value for technical troubleshooting.

**Acceptance Scenarios**:

1. **Given** I navigate to the Diagnostics page, **When** the page loads, **Then** I see a warning banner indicating this is for debugging purposes only.
2. **Given** diagnostics data is loaded, **When** I view the page, **Then** I see the full JSON payload with syntax highlighting, search/filter capability, and a "Copy JSON" button.
3. **Given** diagnostics data is very large, **When** the page renders, **Then** it handles the payload without crashing or freezing the browser.
4. **Given** I click "Copy JSON", **When** the copy succeeds, **Then** the full JSON is copied to my clipboard and I see confirmation feedback.

---

### Edge Cases

- What happens when the user's browser tab is hidden? Polling should pause to reduce unnecessary requests.
- How does the system handle network disconnection? Shows appropriate error states with retry options.
- What happens if a capture request takes longer than expected? Timeout after 30 seconds with clear error message.
- How does the system handle a camera that disappears mid-request? Returns NOT_FOUND error with graceful UI handling.
- What if the PiOrchestrator service is down? All requests fail with OFFLINE error, prompting user to check the Pi.
- How are very large base64 images handled? Images should render progressively; browser handles memory management.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a list of all registered cameras from the PiOrchestrator backend with name, ID, status, health indicator, and last seen timestamp.
- **FR-002**: System MUST poll for camera list updates every 10 seconds and pause polling when the browser tab is not visible.
- **FR-003**: System MUST display individual camera details including status, health metrics (WiFi signal, free heap, uptime), IP address, MAC address, and last error (if any).
- **FR-004**: System MUST allow users to capture a still image from an online camera and display it as a JPEG in a modal.
- **FR-005**: System MUST provide a download option for captured images that converts base64 to a downloadable file.
- **FR-006**: System MUST allow users to reboot a camera with a confirmation dialog before executing.
- **FR-007**: System MUST display read-only diagnostics data with search/filter and copy-to-clipboard functionality.
- **FR-008**: System MUST handle API errors gracefully with user-friendly messages and appropriate recovery actions.
- **FR-009**: System MUST normalize API errors into typed categories: OFFLINE, TIMEOUT, NOT_FOUND, VALIDATION, UNKNOWN.
- **FR-010**: System MUST NOT retry requests for NOT_FOUND errors (camera no longer exists).
- **FR-011**: System MUST retry requests for transient errors (TIMEOUT) with appropriate backoff.
- **FR-012**: System MUST disable capture/reboot actions for offline cameras or show appropriate warnings.
- **FR-013**: System MUST display empty states when no cameras are connected.
- **FR-014**: System MUST log all errors to the console with structured information for debugging.

### Key Entities

- **Camera**: Represents an ESP32-CAM device registered with PiOrchestrator. Key attributes: id, name, status (online/offline/error/rebooting), lastSeen timestamp, health metrics, IP address, MAC address.
- **CameraHealth**: Embedded health metrics for a camera. Key attributes: wifi_rssi (signal strength), free_heap (memory), uptime, resolution, firmware version, last capture timestamp.
- **CameraDiagnostics**: Extended camera information for debugging. Includes connection quality rating and error history.
- **CaptureResult**: Result of a capture operation. Contains base64 JPEG data, timestamp, camera ID, and file size.
- **ApiError**: Normalized error from API responses. Contains code (OFFLINE/TIMEOUT/NOT_FOUND/VALIDATION/UNKNOWN), message, retryable flag, and retry delay.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view the complete camera list within 5 seconds of page load when PiOrchestrator is available.
- **SC-002**: Camera status updates reflect actual device state within 15 seconds (polling interval + propagation).
- **SC-003**: 95% of capture requests complete successfully within 30 seconds when camera is online and reachable.
- **SC-004**: Users can download captured images within 2 seconds of capture completion.
- **SC-005**: Error messages are user-friendly and actionable in 100% of error scenarios (no raw error codes or stack traces shown to users).
- **SC-006**: Diagnostics page renders payloads up to 1MB without browser freezing or crashing.
- **SC-007**: Users can complete the reboot flow (click -> confirm -> feedback) in under 5 seconds of interaction time.
- **SC-008**: When a camera goes offline, users see updated status within one polling cycle (10 seconds).

## Assumptions

- PiOrchestrator is running and accessible on the same origin (port 8082) as the dashboard.
- The V1 API endpoints (`/api/v1/cameras/*`) are fully implemented on PiOrchestrator.
- ESP cameras are already discovered and registered with PiOrchestrator (provisioning is out of scope).
- No authentication is required for the cameras API (or authentication is handled at the PiOrchestrator level).
- Base64 JPEG images from capture are reasonably sized (under 1MB typically).
- Network connectivity between the dashboard and PiOrchestrator is generally reliable (occasional timeouts expected).

## Constraints

- The dashboard communicates with cameras **only** through PiOrchestrator - no direct ESP HTTP connections.
- Video streaming is explicitly out of scope - only still image capture is supported.
- Camera provisioning/pairing is out of scope for this feature.
- The capture operation is synchronous and may take up to 30 seconds for slower cameras.

## Dependencies

- **PiOrchestrator V1 Cameras API**: Must expose GET `/api/v1/cameras`, GET `/api/v1/cameras/:id`, GET `/api/v1/cameras/diagnostics`, POST `/api/v1/cameras/:id/capture`, POST `/api/v1/cameras/:id/reboot`.
- **Existing infrastructure**: Builds on existing API client (`src/infrastructure/api/client.ts`), error handling (`src/infrastructure/api/errors.ts`), and React Query patterns.
