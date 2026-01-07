# Feature Specification: Pi Dashboard Comprehensive Roadmap

> **Version**: 1.0.0
> **Created**: 2026-01-06
> **Last Updated**: 2026-01-06
> **Status**: Draft
> **Feature ID**: 001-pi-dashboard-roadmap

---

## Clarifications

### Session 2026-01-06

- Q: Should health monitoring thresholds be hardcoded, user-configurable, or auto-adaptive? → A: Auto-adaptive thresholds based on Pi model and environment
- Q: How should door operation confirmation work during rapid testing scenarios? → A: Confirmation with "testing mode" bypass (5-minute window, logged)
- Q: How should batch provisioning of multiple ESP32 devices be handled? → A: Sequential queue (one device at a time, clear progress per device)

---

## Overview

### Problem Statement

Field technicians deploying and maintaining DeliCasa smart vending machines currently lack a unified, user-friendly interface to configure Raspberry Pi controllers, provision ESP32-CAM devices, monitor system health, and troubleshoot issues. The existing dashboard provides basic functionality but requires significant expansion to support real-world deployment scenarios without SSH access.

### Proposed Solution

A comprehensive web dashboard that serves as the primary interface for Pi setup, management, monitoring, and troubleshooting. The dashboard will integrate tightly with the PiOrchestrator Go backend, providing field technicians with all necessary tools to deploy, configure, and maintain DeliCasa IoT devices through a touchscreen-friendly, offline-capable interface.

### Target Users

1. **Field Technicians**: Primary users who deploy vending machines at partner locations
2. **System Administrators**: Users who monitor fleet health and perform remote diagnostics
3. **Support Engineers**: Users who troubleshoot issues reported by partners or customers

### Business Value

- Reduce deployment time from hours to minutes by eliminating SSH-based configuration
- Enable non-technical staff to perform device setup and basic troubleshooting
- Improve system reliability through proactive monitoring and alerting
- Reduce support escalations by providing self-service diagnostic tools

---

## User Scenarios & Acceptance Criteria

### Scenario 1: Initial Device Deployment

**As a** field technician deploying a new vending machine
**I want to** configure WiFi, provision ESP32-CAM devices, and verify system connectivity
**So that** the vending machine is operational and connected to the DeliCasa platform

**Acceptance Criteria**:
- [ ] Technician can scan for available WiFi networks within 30 seconds
- [ ] Technician can connect Pi to selected WiFi network with password
- [ ] System displays clear success/failure status for WiFi connection
- [ ] Technician can initiate Bluetooth scan for nearby ESP32 devices
- [ ] Discovered devices show signal strength, name, and provisioning status
- [ ] Technician can provision ESP32 devices with MQTT broker credentials
- [ ] Provisioning status shows real-time progress and completion confirmation
- [ ] System verifies end-to-end connectivity to BridgeServer after setup

### Scenario 2: System Health Monitoring

**As a** field technician or system administrator
**I want to** view real-time system health metrics and device status
**So that** I can identify issues before they impact vending machine operations

**Acceptance Criteria**:
- [ ] Dashboard displays CPU usage, memory usage, disk usage, and temperature
- [ ] Metrics update automatically at configurable intervals (default 5 seconds)
- [ ] Visual indicators show normal (green), warning (yellow), and critical (red) states
- [ ] System uptime and hostname are prominently displayed
- [ ] Connected ESP32-CAM devices show individual status (online/offline, signal strength)
- [ ] MQTT broker connection status is clearly visible
- [ ] BridgeServer connectivity status shows latency and connection state

### Scenario 3: Camera Testing and Diagnostics

**As a** field technician validating camera functionality
**I want to** test camera capture, view preview images, and diagnose issues
**So that** I can ensure AI product detection will work correctly

**Acceptance Criteria**:
- [ ] Dashboard lists all registered ESP32-CAM devices with health indicators
- [ ] Technician can trigger test capture from any camera
- [ ] Preview images display within 5 seconds of capture request
- [ ] Camera diagnostics show WiFi RSSI, free heap memory, and uptime
- [ ] Failed captures show clear error messages with suggested remediation
- [ ] Multiple camera comparison view for multi-camera setups
- [ ] Camera reboot command available for troubleshooting

### Scenario 4: Door Control Testing

**As a** field technician verifying door mechanism
**I want to** test door lock/unlock operations from the dashboard
**So that** I can confirm the physical hardware is properly connected

**Acceptance Criteria**:
- [ ] Dashboard shows current door state (open/closed/unknown)
- [ ] Technician can trigger door unlock for configurable duration
- [ ] Door state updates reflect actual hardware state
- [ ] Manual lock/unlock commands are available for testing
- [ ] Operation history shows timestamp and result of recent commands
- [ ] Safety warning displayed before door operations

### Scenario 5: Network and Connectivity Management

**As a** field technician troubleshooting connectivity issues
**I want to** view network configuration, Tailscale VPN status, and test connectivity
**So that** I can diagnose and resolve network-related problems

**Acceptance Criteria**:
- [ ] Dashboard displays current WiFi connection details (SSID, IP, signal)
- [ ] Tailscale VPN status shows connection state and peer information
- [ ] Ping test available for key endpoints (BridgeServer, MQTT broker, internet)
- [ ] Network diagnostics include DNS resolution and route information
- [ ] Technician can disconnect/reconnect WiFi without full reboot
- [ ] Access Point mode status visible when operating as WiFi hotspot

### Scenario 6: Log Viewing and Troubleshooting

**As a** support engineer investigating an issue
**I want to** view system logs, filter by component, and export diagnostics
**So that** I can identify root causes and resolve problems efficiently

**Acceptance Criteria**:
- [ ] Real-time log streaming displays new entries as they occur
- [ ] Logs can be filtered by severity (debug, info, warn, error)
- [ ] Logs can be searched by keyword or component name
- [ ] Log entries show timestamp, level, component, and message
- [ ] Diagnostic export generates comprehensive JSON report
- [ ] Export includes system info, config (sanitized), recent logs, and metrics

### Scenario 7: Configuration Management

**As a** system administrator adjusting settings
**I want to** view and modify system configuration through the dashboard
**So that** I can tune behavior without editing files or restarting services

**Acceptance Criteria**:
- [ ] Dashboard displays current configuration values grouped by category
- [ ] Editable configurations can be modified with validation
- [ ] Changes take effect without requiring service restart where possible
- [ ] Configuration changes are logged for audit purposes
- [ ] Reset to default option available for each configurable setting
- [ ] Sensitive values (passwords, tokens) are masked but can be revealed

### Scenario 8: Offline Operation

**As a** field technician in a location with intermittent connectivity
**I want to** use the dashboard even when internet connectivity is unavailable
**So that** I can complete initial setup and basic troubleshooting offline

**Acceptance Criteria**:
- [ ] Dashboard loads and operates when internet is unavailable
- [ ] Local operations (WiFi scan, device provisioning, door control) work offline
- [ ] System clearly indicates online/offline status
- [ ] Queued operations sync automatically when connectivity restored
- [ ] Local health monitoring continues without BridgeServer connection

---

## Functional Requirements

### FR-1: WiFi Configuration Module

**FR-1.1**: The system shall scan for available WiFi networks and display results within 30 seconds.

**FR-1.2**: The system shall allow selection of a WiFi network and entry of password credentials.

**FR-1.3**: The system shall connect to the selected WiFi network and report success/failure status.

**FR-1.4**: The system shall display current WiFi connection status including SSID, IP address, and signal strength.

**FR-1.5**: The system shall support Access Point (AP) mode for initial setup when no WiFi is configured.

**FR-1.6**: The system shall persist WiFi credentials across reboots.

### FR-2: ESP32 Device Provisioning Module

**FR-2.1**: The system shall scan for Bluetooth Low Energy (BLE) devices advertising the DeliCasa provisioning service.

**FR-2.2**: The system shall display discovered devices with name, address, signal strength, and provisioning status.

**FR-2.3**: The system shall allow configuration of MQTT broker settings (broker address, port, username, password).

**FR-2.4**: The system shall provision ESP32 devices with MQTT credentials via BLE GATT writes.

**FR-2.5**: The system shall verify successful provisioning by receiving MQTT connection confirmation.

**FR-2.6**: The system shall support batch provisioning of multiple devices using a sequential queue (one device at a time) with clear per-device progress indication and the ability to skip or retry individual failed devices without aborting the queue.

**FR-2.7**: The system shall store provisioning history for audit purposes.

### FR-3: System Health Monitoring Module

**FR-3.1**: The system shall display real-time CPU usage percentage.

**FR-3.2**: The system shall display real-time memory usage percentage and available memory.

**FR-3.3**: The system shall display disk usage percentage for the root filesystem.

**FR-3.4**: The system shall display CPU temperature with thermal state indicator.

**FR-3.5**: The system shall display system uptime in human-readable format.

**FR-3.6**: The system shall display hostname and system identification.

**FR-3.7**: The system shall update health metrics at configurable intervals (default: 5 seconds).

**FR-3.8**: The system shall provide visual indicators for normal, warning, and critical thresholds using auto-adaptive values based on detected Pi model (Pi 3, Pi 4, Pi 5) and environmental baseline established during initial 60-second calibration period. Thresholds are calculated as: warning = baseline + 40%, critical = baseline + 60%.

### FR-4: Camera Management Module

**FR-4.1**: The system shall list all registered ESP32-CAM devices with status indicators.

**FR-4.2**: The system shall allow triggering test captures from any registered camera.

**FR-4.3**: The system shall display captured preview images within the dashboard.

**FR-4.4**: The system shall show camera health metrics (WiFi RSSI, free heap, uptime, resolution).

**FR-4.5**: The system shall support camera reboot commands for troubleshooting.

**FR-4.6**: The system shall indicate camera online/offline status with last-seen timestamp.

**FR-4.7**: The system shall support image comparison between before/after captures.

### FR-5: Door Control Module

**FR-5.1**: The system shall display current door state (open/closed/unknown).

**FR-5.2**: The system shall allow triggering door unlock for configurable duration.

**FR-5.3**: The system shall support manual lock/unlock commands.

**FR-5.4**: The system shall display door operation history with timestamps.

**FR-5.5**: The system shall require confirmation before door operations, with an optional "testing mode" that bypasses confirmation for a 5-minute window; testing mode activation and all bypass operations shall be logged for audit purposes.

**FR-5.6**: The system shall report GPIO hardware status and relay state.

### FR-6: Network Diagnostics Module

**FR-6.1**: The system shall display Tailscale VPN connection status and peer information.

**FR-6.2**: The system shall provide ping functionality to test connectivity to endpoints.

**FR-6.3**: The system shall display network interface information (IP addresses, MAC, gateway).

**FR-6.4**: The system shall show BridgeServer connectivity status and latency.

**FR-6.5**: The system shall display MQTT broker connection status.

**FR-6.6**: The system shall support network troubleshooting with DNS and route information.

### FR-7: Log Management Module

**FR-7.1**: The system shall stream real-time logs to the dashboard via Server-Sent Events.

**FR-7.2**: The system shall allow filtering logs by severity level.

**FR-7.3**: The system shall allow searching logs by keyword.

**FR-7.4**: The system shall display structured log entries with timestamp, level, and component.

**FR-7.5**: The system shall export diagnostic reports in JSON format.

**FR-7.6**: The system shall sanitize sensitive information in diagnostic exports.

### FR-8: Configuration Management Module

**FR-8.1**: The system shall display current system configuration grouped by category.

**FR-8.2**: The system shall allow modification of configurable settings with validation.

**FR-8.3**: The system shall apply configuration changes without service restart where possible.

**FR-8.4**: The system shall log all configuration changes for audit purposes.

**FR-8.5**: The system shall mask sensitive configuration values with reveal option.

**FR-8.6**: The system shall provide reset-to-default functionality for settings.

### FR-9: Offline Operation Support

**FR-9.1**: The system shall operate core features without internet connectivity.

**FR-9.2**: The system shall clearly indicate online/offline status.

**FR-9.3**: The system shall queue operations that require connectivity.

**FR-9.4**: The system shall automatically sync queued operations when connectivity restored.

**FR-9.5**: The system shall cache static assets for offline dashboard access.

---

## Non-Functional Requirements

### NFR-1: Performance

- Dashboard initial load time shall be under 3 seconds on Raspberry Pi 4
- Health metrics shall update with less than 500ms latency
- WiFi scan results shall return within 30 seconds
- Camera preview images shall display within 5 seconds of capture

### NFR-2: Reliability

- Dashboard shall remain functional during backend service restarts
- System shall gracefully handle network timeouts (10 second timeout, 3 retry attempts with exponential backoff) and display appropriate error messages with retry option
- All operations shall have timeout handling (30 seconds maximum) with user feedback showing elapsed time and cancel option

### NFR-3: Usability

- All interactive elements shall meet 44x44 pixel minimum touch target size
- Dashboard shall be fully functional on screens from 320px to 1920px width
- Color contrast shall meet WCAG 2.1 AA accessibility standards
- Loading states shall be visible for all asynchronous operations

### NFR-4: Maintainability

- Dashboard components shall follow single responsibility principle
- API interactions shall be abstracted into a dedicated infrastructure layer (hexagonal architecture)
- All public component props shall have JSDoc documentation
- Each feature module shall have a README.md explaining its purpose and usage
- Component files shall not exceed 300 lines; extract sub-components if larger

### NFR-5: Security

- Configuration endpoints shall validate input data
- Sensitive values shall not be logged or exposed in client-side code
- Door operations shall require user confirmation

---

## Key Entities

### Entity: SystemStatus
- cpu_usage: number (percentage)
- memory_usage: number (percentage)
- disk_usage: number (percentage)
- temperature: number (Celsius)
- uptime: string (human-readable)
- hostname: string

### Entity: WiFiNetwork
- ssid: string
- signal: number (dBm)
- secured: boolean

### Entity: WiFiStatus
- client_status: string (connected/disconnected)
- client_ssid: string
- client_ip: string
- ap_status: string (active/inactive)
- ap_ssid: string
- ap_ip: string
- connected_devices: number

### Entity: Device (ESP32)
- name: string
- address: string (BLE/MAC)
- rssi: number (signal strength)
- status: string (discovered/provisioning/provisioned/online/offline)
- provisioned: boolean

### Entity: Camera
- id: string
- name: string
- status: string (online/offline/error)
- lastSeen: timestamp
- health: CameraHealth

### Entity: CameraHealth
- wifi_rssi: number
- free_heap: number
- uptime: string
- resolution: string

### Entity: Door
- id: string
- state: string (open/closed/unknown)
- lockState: string (locked/unlocked/unknown)
- lastCommand: timestamp
- relayPin: number

### Entity: MQTTConfig
- broker: string
- port: number
- username: string
- password: string (masked)

### Entity: LogEntry
- timestamp: string (ISO 8601)
- level: string (debug/info/warn/error)
- component: string
- message: string

### Entity: ConfigEntry
- key: string (primary key)
- value: string
- category: string (system/mqtt/wifi/hardware/monitoring)
- type: string (string/number/boolean/select)
- editable: boolean
- sensitive: boolean
- default_value: string (optional)
- description: string (optional)

### Entity: OfflineQueueEntry
- id: string (UUID)
- operation: string (door_command/config_update/device_provision)
- endpoint: string (API path)
- method: string (HTTP method)
- payload: object (optional)
- createdAt: string (ISO 8601)
- status: string (pending/syncing/synced/failed)
- retryCount: number

### Entity: AdaptiveThresholds
- piModel: string (pi3/pi4/pi5/unknown)
- cpu_warning: number (0-100)
- cpu_critical: number (0-100)
- memory_warning: number (0-100)
- memory_critical: number (0-100)
- temp_warning: number (Celsius)
- temp_critical: number (Celsius)
- calibratedAt: string (ISO 8601)

### Entity: TestingMode
- active: boolean
- activatedAt: string (ISO 8601)
- expiresAt: string (ISO 8601)
- operationCount: number

---

## Success Criteria

1. **Deployment Efficiency**: Field technicians can complete full device deployment (WiFi setup, camera provisioning, connectivity verification) within 15 minutes without SSH access

2. **Self-Service Resolution**: 80% of common issues (connectivity problems, camera failures, door malfunctions) can be diagnosed and resolved through the dashboard without support escalation

3. **System Visibility**: All critical system metrics (CPU, memory, disk, temperature, connectivity) are visible and updating in real-time with appropriate threshold alerts

4. **Offline Capability**: Core setup and diagnostic functions remain operational during internet outages, with automatic synchronization when connectivity is restored

5. **User Satisfaction**: Field technicians rate the dashboard usability at 4+ out of 5 stars in user feedback surveys

6. **Error Reduction**: Configuration errors during deployment decrease by 50% compared to manual SSH-based setup

7. **Troubleshooting Speed**: Average time to diagnose common issues decreases from 30+ minutes to under 10 minutes

---

## Assumptions

1. The PiOrchestrator Go backend provides all necessary API endpoints for dashboard features (existing spec 017-pi-web-dashboard covers backend API development)

2. ESP32-CAM devices implement the BLE provisioning protocol as defined in the EspCamV2 firmware

3. Raspberry Pi hardware includes Bluetooth capability for ESP32 device provisioning

4. Field technicians have physical access to the Pi's local network or hotspot during initial setup

5. The dashboard will be served by PiOrchestrator on port 8082 and accessed via browser

6. WiFi configuration on Raspberry Pi OS is managed via `wpa_supplicant` or NetworkManager

7. System metrics are available via standard Linux interfaces (proc filesystem, sysfs)

---

## Dependencies

1. **PiOrchestrator Backend**: API endpoints must be implemented per spec 017-pi-web-dashboard
2. **EspCamV2 Firmware**: BLE provisioning protocol must be stable and documented
3. **shadcn/ui Components**: UI component library must be installed and configured
4. **Tailwind CSS v4**: Styling framework must be properly configured
5. **Vite Build System**: Development and production builds must work correctly

---

## Out of Scope

1. Remote dashboard access over internet (Tailscale access is handled separately)
2. Multi-tenant fleet management (single-device dashboard only)
3. Automated firmware updates for ESP32 devices (future feature)
4. Historical data visualization and trending (Grafana handles this)
5. User authentication within the dashboard (local network access assumed)
6. Internationalization/localization (English only for initial release)
7. Mobile native application (web-only for Pi deployment)

---

## Implementation Phases

### Phase 1: Core Infrastructure
- API service layer and hooks
- System status monitoring
- Basic navigation and layout
- Theme support (dark/light)

### Phase 2: WiFi Configuration
- Network scanning
- Connection management
- Status display

### Phase 3: Device Provisioning
- Bluetooth scanning
- MQTT configuration
- Device provisioning workflow
- Provisioning status tracking

### Phase 4: Camera Management
- Camera listing
- Test capture functionality
- Preview display
- Health diagnostics

### Phase 5: Door Control
- State display
- Control commands
- Operation history

### Phase 6: Advanced Features
- Log streaming and filtering
- Configuration management
- Diagnostic export
- Offline support

---

## Appendix: PiOrchestrator API Endpoints

Based on codebase analysis, the following endpoints are available or planned:

**System**
- `GET /api/system/info` - System health metrics
- `GET /health` - Basic health check

**WiFi**
- `GET /api/wifi/scan` - Scan available networks
- `POST /api/wifi/connect` - Connect to network
- `GET /api/wifi/status` - Current connection status

**Devices**
- `GET /api/devices` - List discovered devices
- `POST /api/devices/scan` - Initiate BLE scan
- `POST /api/devices/:address/provision` - Provision device

**Cameras**
- `GET /cameras` - List cameras
- `GET /cameras/diagnostics` - Camera health info
- `POST /snapshot` - Capture image

**Door**
- `GET /open` - Open door
- `GET /close` - Close door

**Dashboard**
- `GET /api/dashboard/health` - Dashboard health metrics
- `GET /api/dashboard/logs` - System logs
- `GET /api/dashboard/config` - Configuration
- `GET /api/dashboard/tailscale/status` - VPN status
