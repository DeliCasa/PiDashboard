# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - PiOrchestrator V1 API Sync (Feature 006)

#### Phase 1: Types & Contracts (Complete)
- V1 API response envelope types with discriminated unions (`src/domain/types/v1-api.ts`)
- Batch provisioning entity types (`src/domain/types/provisioning.ts`)
- WebSocket monitoring types (`src/domain/types/websocket.ts`)
- SSE event types for real-time updates (`src/domain/types/sse.ts`)
- V1 envelope Zod schemas (`src/infrastructure/api/schemas.ts`)
- Provisioning fixtures and contract tests

#### Phase 2: Foundational API Infrastructure (Complete)
- Error code registry with user-friendly messages (`src/infrastructure/api/errors.ts`)
- API key management module (`src/infrastructure/api/auth.ts`)
- V1 API client wrapper with envelope unwrapping (`src/infrastructure/api/v1-client.ts`)
- Feature flag store with persistence (`src/application/stores/features.ts`)
- Batch provisioning API service (`src/infrastructure/api/batch-provisioning.ts`)
- Device allowlist API service (`src/infrastructure/api/allowlist.ts`)
- Session recovery API service (`src/infrastructure/api/session-recovery.ts`)
- MSW handlers for V1 endpoints (`tests/integration/mocks/handlers.ts`)

#### Phase 3: Batch Device Provisioning UI (Complete)
- Generic SSE hook with auto-reconnection (`src/application/hooks/useSSE.ts`)
- Batch provisioning events hook (`src/application/hooks/useBatchProvisioningEvents.ts`)
- ConnectionStatus component with state indicators (`src/presentation/components/common/ConnectionStatus.tsx`)
- StartSessionForm component for session initiation (`src/presentation/components/provisioning/StartSessionForm.tsx`)
- SessionProgress component with device counts (`src/presentation/components/provisioning/SessionProgress.tsx`)
- ProvisioningCandidateCard component for device display (`src/presentation/components/provisioning/ProvisioningCandidateCard.tsx`)
- BatchProvisioningSection main orchestrator (`src/presentation/components/provisioning/BatchProvisioningSection.tsx`)
- Provisioning tab in App navigation (feature-flagged)
- ScrollArea UI component (`src/components/ui/scroll-area.tsx`)

#### Phase 4: Device Allowlist Management UI (Complete)
- useAllowlist hook with optimistic updates (`src/application/hooks/useAllowlist.ts`)
- AllowlistEntryForm component with MAC validation (`src/presentation/components/allowlist/AllowlistEntryForm.tsx`)
- AllowlistEntryCard component with status display (`src/presentation/components/allowlist/AllowlistEntryCard.tsx`)
- AllowlistSection main orchestrator (`src/presentation/components/allowlist/AllowlistSection.tsx`)
- DropdownMenu UI component (`src/components/ui/dropdown-menu.tsx`)

#### Phase 5: Session Recovery UI (Complete)
- useRecoverableSessions hook with optimistic updates for discard (`src/application/hooks/useRecoverableSessions.ts`)
- useRecoveryMutations hook for resume/discard operations
- useSessionHistory hook for historical session data
- SessionRecoveryBanner component with resume/discard/dismiss (`src/presentation/components/provisioning/SessionRecoveryBanner.tsx`)
- AlertDialog UI component for discard confirmation (`src/components/ui/alert-dialog.tsx`)

#### Phase 6: Real-Time System Monitoring (Complete)
- useWebSocket generic hook with auto-reconnection and exponential backoff (`src/application/hooks/useWebSocket.ts`)
  - Ping/pong keepalive mechanism
  - Configurable retry limits and protocols
  - Connection state tracking (connecting, connected, reconnecting, error, disconnected)
- useSystemMonitor hook with WebSocket primary and polling fallback (`src/application/hooks/useSystemMonitor.ts`)
  - Automatic transport selection and fallback
  - Partial data merging for incremental updates
  - Manual transport switching (usePolling/useWebSocket)
  - Specialized hooks: useSystemHealth, useSecurityMetrics, useServiceStatus, useNetworkMetrics, useCameraMonitor
- SystemStatus component updated to use WebSocket monitoring (`src/presentation/components/system/SystemStatus.tsx`)
  - ConnectionIndicator showing transport type (WS/Poll) and connection status
  - Refresh button with loading state
  - Error state with retry button

#### Phase 7: API Key & Error Handling (Complete)
- ErrorDisplay component for structured error display (`src/presentation/components/common/ErrorDisplay.tsx`)
  - Category-based styling (auth, session, device, network, validation, infrastructure)
  - User-friendly error messages from error code registry
  - Retry countdown with automatic retry for retryable errors
  - Correlation ID display with copy-to-clipboard
  - Compact mode for inline display
- Specialized error displays: AuthErrorDisplay, NetworkErrorDisplay, InlineError

#### Phase 8: Polish & Cross-Cutting Concerns (Complete)
- Accessibility labels added to all new V1 API components:
  - ConnectionStatus: `role="status"`, `aria-live="polite"`, `aria-label` for state
  - ConnectionDot: `role="status"`, `aria-label`, `title` for tooltip
  - BatchProvisioningSection: `<section>` with `aria-label`, `role="alert"` on errors, device list with `role="region"` and `role="list"`
  - AllowlistSection: `<section>` with `aria-label`, `role="alert"` on error alerts
- V1 API integration E2E smoke tests (`tests/e2e/v1-api-integration.spec.ts`)
  - Dashboard load with V1 features enabled
  - System status with connection indicator
  - Provisioning tab navigation (feature-flagged)
  - Allowlist tab navigation (feature-flagged)
  - Error handling scenarios (network errors, retry capability)
  - Accessibility tests (ARIA labels, section labels)
  - Feature flag toggle tests

#### Tests Added
- useSSE hook unit tests (20 tests)
- useBatchProvisioningEvents integration tests (22 tests)
- useSSE reconnection integration tests (19 tests)
- ConnectionStatus component tests (27 tests)
- BatchProvisioningSection component tests (13 tests)
- Batch provisioning E2E tests (13 tests)
- AllowlistEntryForm component tests (37 tests)
- AllowlistSection component tests (21 tests)
- useRecoverableSessions hook integration tests (16 tests)
- SessionRecoveryBanner component tests (30 tests)
- useWebSocket hook unit tests (27 tests)
- useSystemMonitor hook integration tests (21 tests)
- API key management unit tests (43 tests)
- ErrorDisplay component tests (47 tests)
- V1 client error handling tests (36 tests)
- V1 API integration E2E smoke tests (14 tests)

### Dependencies
- Added `@radix-ui/react-scroll-area` for ScrollArea component
- Added `@radix-ui/react-dropdown-menu` for DropdownMenu component

## [1.3.0] - 2026-01-07

### Added - Testing Research & Hardening (Feature 005)

#### Contract Testing [US1]
- Zod schema validation for all API responses (`src/infrastructure/api/schemas.ts`)
- Contract tests for system, wifi, config, door, and logs APIs
- Runtime validation with console warnings for schema drift
- API contract documentation (`docs/API_CONTRACT.md`)

#### Brittleness Fixes [US2]
- Added `data-testid` attributes to all major components
- Replaced CSS class selectors with semantic selectors in tests
- Removed silent `.catch()` handlers that hid failures

#### Resilience Tests [US3]
- Network failure E2E tests (`tests/e2e/resilience.spec.ts`)
- Partial API failure tests (one API fails, others succeed)
- Offline queue sync tests (`tests/integration/offline/queue-sync.test.tsx`)
- Conflict resolution tests (`tests/integration/offline/conflict.test.tsx`)

#### BLE Provisioning Tests [US4]
- Web Bluetooth API mock (`tests/mocks/bluetooth.ts`)
- BLE test utilities (`tests/mocks/bluetooth-utils.ts`)
- BluetoothProvisioner unit tests (connection, WiFi write, MQTT write, status)
- DeviceList component tests (29 tests)
- useDevices hook integration tests

#### Accessibility Tests [US5]
- axe-core integration for WCAG 2.1 AA compliance (`tests/e2e/accessibility.spec.ts`)
- Tab navigation tests (Tab, Enter, Space keys)
- Arrow key navigation tests
- Modal focus trap tests
- Color contrast and touch target size validation
- Known violations documented for remediation (T078)

#### CI Optimization [US6]
- Split PR vs nightly workflows for faster feedback
- E2E smoke tests (chromium only) for PRs
- Contract tests job in PR workflow
- Nightly workflow with full browser matrix (`.github/workflows/nightly.yml`)
- E2E sharding (2 shards per browser)
- Bundle size check in CI

### Changed
- Upgraded @playwright/test to 1.57.0 for NixOS compatibility
- Added @axe-core/playwright 4.11.0 for accessibility testing
- Updated flake.nix comment with nixpkgs playwright-driver version

### Testing Infrastructure
- **Unit Tests**: 143+ tests (API, BLE provisioning, utilities)
- **Component Tests**: 140+ tests with data-testid selectors
- **Integration Tests**: 90+ tests (hooks, contracts, offline queue)
- **E2E Tests**: 100+ tests (smoke, accessibility, resilience)
- **Total**: 572+ tests passing

### Files Added
- `tests/e2e/accessibility.spec.ts` - Accessibility tests with axe-core
- `tests/e2e/resilience.spec.ts` - Network failure scenario tests
- `tests/mocks/bluetooth.ts` - Web Bluetooth API mock
- `tests/mocks/bluetooth-utils.ts` - BLE test utilities
- `tests/unit/bluetooth/` - BLE unit tests
- `tests/component/devices/DeviceList.test.tsx` - Device list component tests
- `tests/integration/offline/` - Offline queue integration tests
- `tests/integration/hooks/useDevices.test.tsx` - Device hooks tests
- `.github/workflows/nightly.yml` - Nightly test workflow with sharding
- `src/infrastructure/api/schemas.ts` - Zod validation schemas
- `docs/API_CONTRACT.md` - API contract documentation

---

## [1.2.0] - 2026-01-07

### Added
- Comprehensive testing infrastructure with NixOS Playwright support
- Nix flake for reproducible development environment with Playwright browsers
- Vitest configuration for unit, component, and integration tests
- MSW (Mock Service Worker) handlers for API mocking
- Playwright E2E tests for smoke, WiFi, system, and config flows
- GitHub Actions CI/CD workflow for automated testing

### Testing Infrastructure
- **Unit Tests** (159 tests): API transformation functions, utilities, query client
- **Component Tests** (56 tests): NetworkList, DoorControls, MetricCard, ThresholdIndicator, ConfigEditor, LogFilter
- **Integration Tests** (54 tests): React Query hooks with MSW mocking
- **E2E Tests** (73 tests per browser): Full user flow coverage with Playwright

### Files Added
- `flake.nix` - Nix flake with Playwright browser support
- `playwright.config.ts` - Playwright E2E configuration
- `vitest.config.ts` - Vitest test runner configuration
- `.github/workflows/test.yml` - CI/CD workflow
- `tests/` - Complete test suite structure

### Developer Experience
- `nix develop` provides Playwright browsers on NixOS
- `npm run test` for unit/component/integration tests
- `npm run test:e2e` for E2E tests
- `npm run test:coverage` for coverage reporting
- `LIVE_PI_URL` environment variable for testing against real hardware

---

## [1.1.4] - 2026-01-07

### Fixed
- Fixed WiFi networks not displaying after scan
  - Backend returns `security: "WPA2"` string, frontend expected `secured: boolean`
  - Added transformation from `security` string to `secured` + `encryption` fields

### Changed
- WiFi API now transforms network responses to match frontend WiFiNetwork type
- Maps security strings ("WPA2", "WPA3", "Open") to encryption enum values

---

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
