# Feature Specification: Pi Dashboard Frontend Integration with PiOrchestrator

> **Version**: 1.0.0
> **Created**: 2026-01-06
> **Last Updated**: 2026-01-06
> **Status**: Draft
> **Feature ID**: 002-pi-orchestrator-integration

---

## Overview

### Problem Statement

The Pi Dashboard frontend (Feature 001) is complete with all 99 tasks implemented, but it has not been integrated with the PiOrchestrator Go backend. The backend (Feature 019 in PiOrchestrator) has completed 49 of 59 tasks (83%), with all backend code in place. The remaining 10 tasks require:

1. Building the frontend and copying assets to PiOrchestrator's embedded directory
2. Verifying the dashboard loads correctly from the Go binary
3. End-to-end verification of all features (WiFi, devices, bridge status, theme toggle)
4. Deployment to Raspberry Pi hardware
5. PWA installation verification

Without this integration, field technicians cannot use the dashboard to configure and monitor DeliCasa vending machines.

### Proposed Solution

Complete the integration between Pi Dashboard frontend and PiOrchestrator backend by:

1. Building the frontend production bundle
2. Copying built assets to PiOrchestrator's embedded web directory
3. Verifying the complete system works end-to-end
4. Deploying to Raspberry Pi and validating all functionality

### Target Users

1. **Field Technicians**: Will use the integrated dashboard to configure and monitor vending machines
2. **Developers**: Need the integration complete to test end-to-end functionality

### Business Value

- Enables field technicians to deploy and configure vending machines without SSH access
- Reduces deployment time from hours to minutes
- Provides visual feedback for system health and device status
- Completes the MVP for local device management

---

## User Scenarios & Acceptance Criteria

### Scenario 1: Dashboard Access from PiOrchestrator

**As a** field technician
**I want to** access the Pi Dashboard by navigating to the Pi's IP address on port 8082
**So that** I can configure and monitor the vending machine controller

**Acceptance Criteria**:
- [ ] Dashboard loads at `http://<pi-ip>:8082/` within 3 seconds
- [ ] All tab sections (System, WiFi, Devices, Cameras, Door, Network, Logs, Config) are accessible
- [ ] Light and dark theme toggle functions correctly
- [ ] Page navigation maintains application state

### Scenario 2: WiFi Configuration Workflow

**As a** field technician
**I want to** scan for and connect to WiFi networks through the dashboard
**So that** I can set up network connectivity for the vending machine

**Acceptance Criteria**:
- [ ] WiFi scan returns available networks with signal strength indicators
- [ ] Connecting to a network with correct password succeeds
- [ ] Connection status updates in real-time after connecting
- [ ] AP mode status is displayed when active

### Scenario 3: ESP32 Device Provisioning

**As a** field technician
**I want to** discover and provision ESP32-CAM devices from the dashboard
**So that** I can set up cameras for product detection

**Acceptance Criteria**:
- [ ] Device scan discovers nearby Bluetooth devices
- [ ] Discovered devices display with name, address, and signal strength
- [ ] Provisioning workflow completes successfully
- [ ] Provisioned device status updates to reflect connection state

### Scenario 4: Bridge Server Status Verification

**As a** field technician
**I want to** verify connectivity to the BridgeServer from the dashboard
**So that** I can confirm the vending machine can communicate with the cloud

**Acceptance Criteria**:
- [ ] Bridge connection status displays (connected/disconnected)
- [ ] Connection latency is shown when connected
- [ ] MQTT broker status is visible
- [ ] Test connection button provides immediate feedback

### Scenario 5: PWA Installation

**As a** field technician
**I want to** install the dashboard as a Progressive Web App
**So that** I can access it offline and from my device's home screen

**Acceptance Criteria**:
- [ ] Browser shows PWA install prompt on supported browsers
- [ ] Installed PWA launches in standalone mode
- [ ] Offline functionality works for cached operations
- [ ] PWA icon and name display correctly

---

## Functional Requirements

### FR-1: Frontend Build and Asset Deployment

**FR-1.1**: The system shall build the frontend using `npm run build` producing optimized production assets.

**FR-1.2**: The system shall copy built assets from `dist/` to PiOrchestrator's embedded directory at `internal/embedded/web/dashboard/`.

**FR-1.3**: The Go binary shall embed the dashboard assets using Go's embed directive.

**FR-1.4**: The embedded server shall serve the SPA with proper fallback routing for client-side navigation.

### FR-2: Dashboard Verification

**FR-2.1**: The dashboard shall load successfully from `http://localhost:8082/` when PiOrchestrator is running.

**FR-2.2**: All navigation tabs shall be accessible and render their respective components.

**FR-2.3**: Theme toggle (light/dark) shall persist preference and apply correctly.

**FR-2.4**: System health metrics shall update in real-time with data from the backend.

### FR-3: API Integration Verification

**FR-3.1**: WiFi section shall communicate with `/api/wifi/*` endpoints successfully.

**FR-3.2**: Devices section shall communicate with `/api/devices/*` endpoints successfully.

**FR-3.3**: System status shall poll `/api/system/info` and display current metrics.

**FR-3.4**: Bridge status shall display data from `/api/dashboard/tailscale/status` and related endpoints.

**FR-3.5**: Logs section shall stream data via SSE from `/api/dashboard/logs`.

### FR-4: Deployment Verification

**FR-4.1**: The integrated binary shall deploy successfully to Raspberry Pi hardware.

**FR-4.2**: Dashboard shall be accessible from devices on the same network as the Pi.

**FR-4.3**: All functionality verified locally shall work identically on Pi hardware.

---

## Non-Functional Requirements

### NFR-1: Performance

- Dashboard initial load time shall be under 3 seconds on Raspberry Pi 4
- Total embedded binary size should be monitored (current: ~32MB, target: reasonable for Pi deployment)

### NFR-2: Reliability

- Dashboard shall recover gracefully from backend restarts
- Network timeouts shall display user-friendly error messages

### NFR-3: Compatibility

- Dashboard shall work in Chrome, Firefox, and Safari on desktop and mobile
- PWA installation shall work on Chrome (Android) and Safari (iOS)

---

## Key Entities

No new entities required - this feature integrates existing frontend entities with existing backend APIs.

---

## Success Criteria

1. **Dashboard Accessibility**: Dashboard loads successfully at `http://<pi-ip>:8082/` on both development machine and Raspberry Pi

2. **Feature Completeness**: All 8 tab sections function correctly with live data from the backend

3. **Theme Support**: Light and dark themes toggle correctly and persist across sessions

4. **WiFi Functionality**: Users can scan networks, connect, and see updated status

5. **Device Provisioning**: ESP32 devices can be discovered and provisioned through the workflow

6. **PWA Installation**: Dashboard can be installed as PWA on supported browsers

7. **Pi Deployment**: Complete system works on Raspberry Pi hardware with identical functionality to development environment

---

## Assumptions

1. PiOrchestrator backend (Feature 019) has all necessary API endpoints implemented and tested
2. Raspberry Pi is accessible via SSH for deployment
3. Development environment has Node.js 20+ and npm installed
4. PiOrchestrator has the embedded web directory structure already created
5. Field technician will have physical or network access to the Pi during initial setup

---

## Dependencies

1. **Feature 001 (Pi Dashboard Frontend)**: Must be complete - VERIFIED COMPLETE
2. **Feature 019 (PiOrchestrator Backend)**: Backend code must be complete - VERIFIED (49/59 tasks, backend code done)
3. **PiOrchestrator Build System**: Makefile targets for frontend build and asset copying
4. **Raspberry Pi Hardware**: Required for final deployment verification

---

## Out of Scope

1. New feature development (this is integration only)
2. Backend API changes (backend is already complete)
3. Frontend UI changes (frontend is already complete)
4. Automated CI/CD deployment (manual deployment is acceptable)
5. Binary size optimization beyond current state

---

## Implementation Phases

### Phase 1: Local Build and Integration
- Build frontend production bundle
- Copy assets to PiOrchestrator embedded directory
- Verify dashboard loads locally

### Phase 2: Feature Verification
- Verify WiFi section works end-to-end
- Verify device provisioning workflow
- Verify bridge status section
- Verify theme toggle functionality

### Phase 3: Pi Deployment
- Deploy to Raspberry Pi hardware
- Verify all features on Pi
- Verify PWA installation

---

## Remaining Tasks from Feature 019

Based on the user's context, these tasks need completion:

| Task ID | Description | Phase |
|---------|-------------|-------|
| T030 | Copy frontend build output to embedded dir | Phase 1 |
| T031 | Verify dashboard loads at localhost:8082 | Phase 1 |
| T037 | Verify WiFi section works | Phase 2 |
| T042 | Verify device provisioning workflow | Phase 2 |
| T045 | Verify bridge status section | Phase 2 |
| T052 | Binary size verification (~32MB actual) | Phase 2 |
| T053 | Deploy to Raspberry Pi | Phase 3 |
| T054 | PWA installation verification | Phase 3 |
| T056 | Light/dark theme toggle verification | Phase 2 |
| T059 | Final verification on Raspberry Pi | Phase 3 |

---

## Appendix: Build Commands

**Frontend Build**:
```bash
cd PiDashboard
npm install
npm run build
```

**Copy Assets to PiOrchestrator**:
```bash
# Option 1: Using Makefile
make copy-assets

# Option 2: Manual copy
cp -r dist/* ../PiOrchestrator/internal/embedded/web/dashboard/
```

**Build PiOrchestrator with Embedded Dashboard**:
```bash
cd PiOrchestrator
make dashboard
# or
make build
```

**Deploy to Raspberry Pi**:
```bash
make deploy-dashboard
# or
scp ./bin/piorchestrator pi:/home/pi/PiOrchestrator/
```
