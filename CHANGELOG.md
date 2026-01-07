# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2026-01-07

### Fixed
- Fixed System Logs showing "Disconnected" and "Waiting for logs"
  - Backend returns JSON `{count, logs}` instead of SSE stream
  - Changed from EventSource SSE to polling-based fetching (3s interval)
- Fixed Ping Tool showing "400 Bad Request: missing 'type' parameter"
  - Added `type: 'icmp'` parameter to ping requests
  - Graceful error handling when ping endpoint unavailable

### Changed
- Logs API now returns `LogEntry[]` after extracting from `{count, logs}` response
- Logs hook uses polling instead of SSE for backend compatibility
- Ping API includes proper error handling and fallback response

---

## [1.1.2] - 2026-01-07

### Fixed
- Fixed Network Diagnostics showing "Disconnected" for all services
  - Tailscale: Transform `backend_state` to `connected`, `tailscale_ip` to `ip`
  - BridgeServer: Extract nested `status.connected` and `status.url` to flat format
  - MQTT: Graceful handling when endpoint doesn't exist
- Fixed Config section black screen crash
  - Backend returns nested `{sections: [{name, items}]}` structure
  - Frontend now correctly transforms to flat `ConfigEntry[]` array

### Changed
- Network API now transforms backend responses to expected frontend format
- Config API maps section names to ConfigCategory (Server/Bridge→system, MQTT→mqtt, etc.)

---

## [1.1.1] - 2026-01-07

### Fixed
- Fixed layout centering issue - added `mx-auto` to container classes in App.tsx
- Fixed Door Control infinite loading spinner when Door API is unavailable
- Door component now shows "Door Control Unavailable" message instead of loading forever

### Changed
- Reduced Door API retry attempts from 3 to 1 (endpoint may not exist on all PiOrchestrator versions)

---

## [1.1.0] - 2026-01-07

### Added
- Successfully deployed integrated dashboard to Raspberry Pi hardware
- UFW firewall rules for ports 8081/8082 on Pi

### Changed
- Updated PiOrchestrator systemd service to use new hexagonal binary
- Binary path: `/home/pi/Documents/Code/PiOrchestrator/bin/piorch-hex`

### Fixed
- Fixed Go embed directive for nested directories (`//go:embed all:web/dashboard`)
- Resolved Gin route conflicts between DashboardHandler and ConfigWebHandler
- Removed conflicting `/` and `/setup` routes from config_handler.go

### Verified on Pi Hardware
- React dashboard serves at `http://192.168.1.124:8082/`
- System info API: CPU 4 cores, Memory ~14%, Temp 54°C
- WiFi status API: client mode, proper status reporting
- Bridge status API: connected to `dokku.tail1ba2bb.ts.net`
- Config API: 5 configuration sections
- PWA manifest and service worker functional
- ARM64 binary size: 30MB

---

## [1.0.0] - 2026-01-06

### Added

#### Core Infrastructure
- React 19 + TypeScript + Vite 7 foundation
- TanStack React Query for server state management
- Zustand for client state management
- Hexagonal architecture (domain/application/infrastructure/presentation layers)
- Base API client with fetch wrapper, retry logic, and timeout handling (`src/infrastructure/api/client.ts`)
- QueryClient configuration with optimized caching (`src/lib/queryClient.ts`)

#### Layout Components
- Header component with DeliCasa branding and hostname display (`src/presentation/components/layout/Header.tsx`)
- Tabbed navigation component (`src/presentation/components/layout/Navigation.tsx`)
- Responsive container wrapper (`src/presentation/components/layout/Container.tsx`)
- Toast notifications via Sonner (`src/presentation/components/layout/Toaster.tsx`)
- Error boundary for graceful error handling (`src/presentation/components/ErrorBoundary.tsx`)
- 404 Not Found page (`src/presentation/components/NotFound.tsx`)

#### US1: WiFi and Device Provisioning
- WiFi API service (`src/infrastructure/api/wifi.ts`)
- WiFi hooks: useWifiStatus, useWifiScan, useWifiConnect (`src/application/hooks/useWifi.ts`)
- NetworkList component with signal strength indicators (`src/presentation/components/wifi/NetworkList.tsx`)
- ConnectionStatus component (`src/presentation/components/wifi/ConnectionStatus.tsx`)
- WiFiConnectModal with password form (`src/presentation/components/wifi/WiFiConnectModal.tsx`)
- WiFiSection integrating all WiFi components (`src/presentation/components/wifi/WiFiSection.tsx`)
- APModeStatus component for access point mode (`src/presentation/components/wifi/APModeStatus.tsx`)
- Devices API service (`src/infrastructure/api/devices.ts`)
- Web Bluetooth provisioning service for ESP32 BLE (`src/infrastructure/bluetooth/provisioning.ts`)
- Device hooks: useDevices, useProvisionDevice (`src/application/hooks/useDevices.ts`)
- DeviceList component with status badges (`src/presentation/components/devices/DeviceList.tsx`)
- MQTTConfigForm component (`src/presentation/components/devices/MQTTConfigForm.tsx`)
- ProvisioningModal with step wizard (`src/presentation/components/devices/ProvisioningModal.tsx`)
- DeviceSection integrating all device components (`src/presentation/components/devices/DeviceSection.tsx`)
- ProvisioningHistory panel (`src/presentation/components/devices/ProvisioningHistory.tsx`)

#### US2: System Health Monitoring
- System API service (`src/infrastructure/api/system.ts`)
- useSystemStatus hook with 5s polling (`src/application/hooks/useSystemStatus.ts`)
- Adaptive thresholds store for Pi model detection (`src/application/stores/thresholds.ts`)
- useAdaptiveThresholds hook (`src/application/hooks/useAdaptiveThresholds.ts`)
- MetricCard component with progress indicator (`src/presentation/components/system/MetricCard.tsx`)
- ThresholdIndicator component with color coding (`src/presentation/components/system/ThresholdIndicator.tsx`)
- SystemStatus section (`src/presentation/components/system/SystemStatus.tsx`)

#### US3: Camera Testing and Diagnostics
- Cameras API service (`src/infrastructure/api/cameras.ts`)
- Camera hooks: useCameras, useCaptureTest, useRebootCamera (`src/application/hooks/useCameras.ts`)
- CameraCard component with health metrics (`src/presentation/components/cameras/CameraCard.tsx`)
- CapturePreview component (`src/presentation/components/cameras/CapturePreview.tsx`)
- CameraSection with grid layout (`src/presentation/components/cameras/CameraSection.tsx`)

#### US4: Door Control Testing
- Door API service (`src/infrastructure/api/door.ts`)
- Door hooks: useDoorStatus, useOpenDoor, useCloseDoor (`src/application/hooks/useDoor.ts`)
- Testing mode store with 5-minute timer (`src/application/stores/testingMode.ts`)
- TestingModeToggle component with countdown (`src/presentation/components/door/TestingModeToggle.tsx`)
- DoorControls component with duration selector (`src/presentation/components/door/DoorControls.tsx`)
- DoorSection with operation history table (`src/presentation/components/door/DoorSection.tsx`)
- GPIOStatus component showing relay state (`src/presentation/components/door/GPIOStatus.tsx`)

#### US5: Network Diagnostics
- Network API service (`src/infrastructure/api/network.ts`)
- useNetworkDiagnostics hook (`src/application/hooks/useNetwork.ts`)
- TailscaleStatus component (`src/presentation/components/network/TailscaleStatus.tsx`)
- NetworkDiagnostics section (`src/presentation/components/network/NetworkDiagnostics.tsx`)
- MQTTStatus component (`src/presentation/components/network/MQTTStatus.tsx`)
- BridgeServerStatus component with latency (`src/presentation/components/network/BridgeServerStatus.tsx`)

#### US6: Log Viewing
- Logs API service (`src/infrastructure/api/logs.ts`)
- Log hooks: useLogStream (SSE), useExportDiagnostics (`src/application/hooks/useLogs.ts`)
- LogStream component with TanStack Virtual scrolling (`src/presentation/components/logs/LogStream.tsx`)
- LogFilter component (`src/presentation/components/logs/LogFilter.tsx`)
- LogSection integrating stream and filter (`src/presentation/components/logs/LogSection.tsx`)

#### US7: Configuration Management
- Config API service (`src/infrastructure/api/config.ts`)
- Config hooks: useConfig, useUpdateConfig (`src/application/hooks/useConfig.ts`)
- ConfigEditor component with type-aware inputs (`src/presentation/components/config/ConfigEditor.tsx`)
- ConfigSection with category tabs (`src/presentation/components/config/ConfigSection.tsx`)

#### US8: Offline Operation (PWA)
- Offline queue with IndexedDB (`src/infrastructure/offline/queue.ts`)
- Offline queue store (`src/application/stores/offlineQueue.ts`)
- Offline hooks: useOfflineQueue, useOnlineStatus (`src/application/hooks/useOfflineQueue.ts`)
- Service worker configuration (`public/sw.js`)
- PWA manifest (`public/manifest.json`)
- NetworkStatus indicator (`src/presentation/components/layout/NetworkStatus.tsx`)
- OfflineQueuePanel component (`src/presentation/components/layout/OfflineQueuePanel.tsx`)

#### Type Definitions
- Domain entity types (`src/domain/types/entities.ts`)
- API request/response types (`src/domain/types/api.ts`)

#### shadcn/ui Components
- button, card, dialog, form, input, label, select, tabs, badge, switch
- alert, progress, skeleton, toast, checkbox, alert-dialog, collapsible, tooltip

### Technical Details

- **Build Output**: 548KB JS (165KB gzipped), 50KB CSS (9KB gzipped)
- **Architecture**: Hexagonal (domain/application/infrastructure/presentation)
- **State Management**: TanStack Query (server) + Zustand (client)
- **Styling**: Tailwind CSS + shadcn/ui components
- **PWA**: Service worker with offline caching and background sync
- **Accessibility**: WCAG AA compliant, 44x44px touch targets
- **Browser Support**: Web Bluetooth API for ESP32 BLE provisioning

### Dependencies Added
- @tanstack/react-query ^5.80.0
- @tanstack/react-virtual ^3.13.0
- zustand ^5.0.5
- idb ^8.0.1
- sonner ^2.0.0
- lucide-react ^0.513.0
- class-variance-authority ^0.7.1
- clsx ^2.1.1
- tailwind-merge ^3.0.0

### Notes

- Web Bluetooth types use `any` for browser compatibility (experimental API)
- Minor lint warnings from shadcn/ui patterns (variant exports) are expected
- TanStack Virtual has known React Compiler compatibility warning
