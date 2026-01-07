# Implementation Plan: Pi Dashboard Comprehensive Roadmap

> **Feature**: 001-pi-dashboard-roadmap
> **Created**: 2026-01-06
> **Status**: Ready for Implementation

---

## Implementation Overview

This plan breaks down the Pi Dashboard implementation into 6 phases with clear task dependencies. Each phase builds upon the previous, enabling incremental delivery of value.

**Total Estimated Tasks**: 98 implementation tasks (updated after analysis)
**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

---

## Phase 1: Core Infrastructure

**Goal**: Establish the foundation for all subsequent features with API client, state management, and UI primitives.

### Task 1.1: API Service Layer Setup
**File**: `src/infrastructure/api/client.ts`
**Description**: Create base API client with fetch wrapper, error handling, and TypeScript types.

**Implementation**:
- Create `ApiError` class extending Error with status code
- Implement generic `request<T>()` function with JSON parsing
- Export `apiClient` object with `get`, `post`, `put`, `delete` methods
- Add request timeout handling (default 30s)
- Implement retry logic for network failures (max 3 retries)

**Dependencies**: None (first task)
**Tests**: Unit tests for error handling, timeout, retry logic

---

### Task 1.2: Type Definitions
**Files**: `src/domain/types/entities.ts`, `src/domain/types/api.ts`
**Description**: Define all TypeScript interfaces from data model.

**Implementation**:
- Copy entity types from data-model.md
- Add discriminated unions for status enums
- Export all types with proper JSDoc documentation

**Dependencies**: None
**Tests**: Type compilation check via `tsc --noEmit`

---

### Task 1.3: System Status API Service
**File**: `src/infrastructure/api/system.ts`
**Description**: API functions for system health endpoints.

**Implementation**:
```typescript
export const systemApi = {
  getInfo: () => apiClient.get<SystemStatus>('/api/system/info'),
  getHealth: () => apiClient.get<{ status: string }>('/health'),
};
```

**Dependencies**: Task 1.1, Task 1.2
**Tests**: MSW mocks for endpoint responses

---

### Task 1.4: TanStack Query Setup
**File**: `src/lib/queryClient.ts`, update `src/main.tsx`
**Description**: Configure React Query for server state management.

**Implementation**:
- Create QueryClient with default options
- Set staleTime: 10000 (10s for real-time data)
- Set retry: 2 for failed requests
- Wrap App in QueryClientProvider

**Dependencies**: Task 1.1
**Tests**: Provider mounting tests

---

### Task 1.5: useSystemStatus Hook
**File**: `src/application/hooks/useSystemStatus.ts`
**Description**: Custom hook for system health data.

**Implementation**:
```typescript
export function useSystemStatus() {
  return useQuery({
    queryKey: ['system', 'status'],
    queryFn: systemApi.getInfo,
    refetchInterval: 5000,
  });
}
```

**Dependencies**: Task 1.3, Task 1.4
**Tests**: Hook tests with QueryClientProvider wrapper

---

### Task 1.6: Zustand Testing Mode Store
**File**: `src/application/stores/testingMode.ts`
**Description**: Client state for door testing mode.

**Implementation**:
```typescript
interface TestingModeState {
  active: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  operationCount: number;
  activate: () => void;
  deactivate: () => void;
  incrementOperations: () => void;
}
```
- Auto-deactivate after 5 minutes via setTimeout
- Persist to localStorage for page refresh survival
- Track operation count for audit

**Dependencies**: None
**Tests**: Store action tests, timer behavior

---

### Task 1.7: Adaptive Thresholds Store
**File**: `src/application/stores/thresholds.ts`
**Description**: Auto-adaptive health thresholds based on Pi model.

**Implementation**:
- Detect Pi model from `/proc/cpuinfo` (via API)
- Set default thresholds per model:
  - Pi 3: temp warning 75°C, critical 80°C
  - Pi 4: temp warning 75°C, critical 80°C
  - Pi 5: temp warning 80°C, critical 85°C
- Calibration mode: first 60s establishes baseline
- Calculate warning = baseline + 40%, critical = baseline + 60%
- Store calibrated values in localStorage

**Dependencies**: Task 1.3
**Tests**: Calibration logic, model detection

---

### Task 1.8: Layout Components
**Files**: `src/presentation/components/layout/Header.tsx`, `src/presentation/components/layout/Navigation.tsx`, `src/presentation/components/layout/Container.tsx`
**Description**: Main layout structure for the dashboard.

**Implementation**:
- Header: Logo, system hostname, online/offline indicator
- Navigation: Tabs for each section (System, WiFi, Devices, etc.)
- Container: Responsive padding, max-width constraints
- Mobile-first responsive breakpoints

**Dependencies**: shadcn/ui Tabs component
**Tests**: Responsive rendering tests

---

### Task 1.9: System Status Section
**Files**: `src/presentation/components/system/SystemStatus.tsx`, `src/presentation/components/system/MetricCard.tsx`, `src/presentation/components/system/ThresholdIndicator.tsx`
**Description**: System health monitoring UI.

**Implementation**:
- MetricCard: Displays single metric with icon, value, unit
- ThresholdIndicator: Color-coded status (green/yellow/red)
- SystemStatus: Grid of MetricCards for CPU, Memory, Disk, Temperature
- Uptime display with human-readable formatting
- Hostname display

**Dependencies**: Task 1.5, Task 1.7, Task 1.8
**Tests**: Component rendering with mock data

---

### Task 1.10: App Integration
**File**: `src/App.tsx`
**Description**: Integrate layout and system status into main app.

**Implementation**:
- Add TabsProvider for navigation state
- Render Header, Navigation, Container
- Default tab: System status
- Add loading and error states

**Dependencies**: Task 1.8, Task 1.9
**Tests**: Full page integration tests

---

## Phase 2: WiFi Configuration

**Goal**: Enable network scanning, connection, and status display.

### Task 2.1: WiFi API Service
**File**: `src/infrastructure/api/wifi.ts`
**Description**: WiFi management API functions.

**Implementation**:
```typescript
export const wifiApi = {
  scan: () => apiClient.get<WiFiNetwork[]>('/api/wifi/scan'),
  connect: (ssid: string, password: string) =>
    apiClient.post<{ success: boolean }>('/api/wifi/connect', { ssid, password }),
  disconnect: () => apiClient.post<{ success: boolean }>('/api/wifi/disconnect'),
  getStatus: () => apiClient.get<WiFiStatus>('/api/wifi/status'),
};
```

**Dependencies**: Task 1.1, Task 1.2
**Tests**: MSW mocks for all endpoints

---

### Task 2.2: useWifi Hook
**File**: `src/application/hooks/useWifi.ts`
**Description**: Hook for WiFi operations with optimistic updates.

**Implementation**:
- `useWifiStatus()`: Query for current status, refetch every 10s
- `useWifiScan()`: Mutation for network scan
- `useWifiConnect()`: Mutation with loading state
- `useWifiDisconnect()`: Mutation for disconnection

**Dependencies**: Task 2.1, Task 1.4
**Tests**: Hook tests with mutation states

---

### Task 2.3: NetworkList Component
**File**: `src/presentation/components/wifi/NetworkList.tsx`
**Description**: Display available WiFi networks.

**Implementation**:
- List of networks sorted by signal strength
- Signal indicator (4 bars based on dBm)
- Lock icon for secured networks
- Currently connected network highlighted
- Tap to select network for connection

**Dependencies**: Task 2.2
**Tests**: Rendering with network data

---

### Task 2.4: ConnectionStatus Component
**File**: `src/presentation/components/wifi/ConnectionStatus.tsx`
**Description**: Current WiFi connection details.

**Implementation**:
- Client mode: SSID, IP address, signal strength
- AP mode: SSID, IP, connected device count
- Connection state indicator (connected/connecting/disconnected)
- Disconnect button when connected

**Dependencies**: Task 2.2
**Tests**: Status display tests

---

### Task 2.5: WiFi Connect Modal
**File**: `src/presentation/components/wifi/WiFiConnectModal.tsx`
**Description**: Password entry dialog for WiFi connection.

**Implementation**:
- Network name display
- Password input with show/hide toggle
- Connect button with loading state
- Error message display
- Cancel/close functionality

**Dependencies**: Task 2.2, shadcn/ui Dialog
**Tests**: Form validation, submission

---

### Task 2.6: WiFi Section Integration
**File**: `src/presentation/components/wifi/WiFiSection.tsx`
**Description**: Complete WiFi management section.

**Implementation**:
- Scan button with loading indicator
- NetworkList below scan results
- ConnectionStatus card
- WiFiConnectModal trigger
- Refresh status button

**Dependencies**: Task 2.3, Task 2.4, Task 2.5
**Tests**: Full section integration

---

## Phase 3: Device Provisioning

**Goal**: BLE scanning and ESP32 device provisioning via Web Bluetooth.

### Task 3.1: Devices API Service
**File**: `src/infrastructure/api/devices.ts`
**Description**: Device management API functions.

**Implementation**:
```typescript
export const devicesApi = {
  list: () => apiClient.get<Device[]>('/api/devices'),
  scan: () => apiClient.post<{ scanning: boolean }>('/api/devices/scan'),
  provision: (address: string, config: MQTTConfig) =>
    apiClient.post<ProvisioningResult>(`/api/devices/${address}/provision`, config),
  getProvisioningHistory: () => apiClient.get<ProvisioningRecord[]>('/api/devices/history'),
};
```

**Dependencies**: Task 1.1, Task 1.2
**Tests**: MSW mocks for endpoints

---

### Task 3.2: Web Bluetooth Service
**File**: `src/infrastructure/bluetooth/provisioning.ts`
**Description**: Direct BLE provisioning via Web Bluetooth API.

**Implementation**:
- Check Web Bluetooth support
- Request device with DeliCasa service UUID
- Connect to GATT server
- Write WiFi credentials to characteristic
- Write MQTT credentials to characteristic
- Handle connection errors gracefully
- Fallback flag for backend provisioning

**Dependencies**: None
**Tests**: Mock Web Bluetooth API tests

---

### Task 3.3: useDevices Hook
**File**: `src/application/hooks/useDevices.ts`
**Description**: Hook for device operations.

**Implementation**:
- `useDevices()`: Query for device list
- `useDeviceScan()`: Mutation for BLE scan
- `useProvisionDevice()`: Mutation with progress tracking
- `useProvisioningQueue()`: State for batch operations

**Dependencies**: Task 3.1, Task 3.2, Task 1.4
**Tests**: Hook tests with state transitions

---

### Task 3.4: DeviceList Component
**File**: `src/presentation/components/devices/DeviceList.tsx`
**Description**: Display discovered BLE devices.

**Implementation**:
- Device card with name, address, RSSI
- Signal strength indicator
- Status badge (discovered/provisioning/provisioned/online)
- Provision button for unprovisioned devices
- Batch select checkboxes

**Dependencies**: Task 3.3
**Tests**: Rendering, selection state

---

### Task 3.5: MQTTConfigForm Component
**File**: `src/presentation/components/devices/MQTTConfigForm.tsx`
**Description**: Form for MQTT broker configuration.

**Implementation**:
- Broker address input with validation
- Port input (default 1883/8883)
- Username input
- Password input with show/hide
- Save as default checkbox
- Validation feedback

**Dependencies**: shadcn/ui Form components
**Tests**: Form validation tests

---

### Task 3.6: ProvisioningModal Component
**File**: `src/presentation/components/devices/ProvisioningModal.tsx`
**Description**: Provisioning workflow dialog.

**Implementation**:
- Step indicator: Configure → Connect → Write → Verify
- MQTTConfigForm for step 1
- Progress animation for steps 2-4
- Success/failure result display
- Retry option on failure
- Queue progress for batch operations

**Dependencies**: Task 3.4, Task 3.5, Task 3.3
**Tests**: Multi-step workflow tests

---

### Task 3.7: Device Section Integration
**File**: `src/presentation/components/devices/DeviceSection.tsx`
**Description**: Complete device provisioning section.

**Implementation**:
- Scan button with Web Bluetooth check
- Browser compatibility warning if needed
- DeviceList with selection
- Batch provision button
- ProvisioningModal integration
- Provisioning history expandable section

**Dependencies**: Task 3.4, Task 3.6
**Tests**: Full section tests

---

## Phase 4: Camera Management

**Goal**: Camera listing, test captures, and health diagnostics.

### Task 4.1: Cameras API Service
**File**: `src/infrastructure/api/cameras.ts`
**Description**: Camera management API functions.

**Implementation**:
```typescript
export const camerasApi = {
  list: () => apiClient.get<Camera[]>('/cameras'),
  getDiagnostics: () => apiClient.get<CameraDiagnostics>('/cameras/diagnostics'),
  capture: (cameraId: string) =>
    apiClient.post<CaptureResult>('/snapshot', { camera_id: cameraId }),
  reboot: (cameraId: string) =>
    apiClient.post<{ success: boolean }>(`/cameras/${cameraId}/reboot`),
};
```

**Dependencies**: Task 1.1, Task 1.2
**Tests**: MSW mocks

---

### Task 4.2: useCameras Hook
**File**: `src/application/hooks/useCameras.ts`
**Description**: Hook for camera operations.

**Implementation**:
- `useCameras()`: Query with 10s refetch
- `useCameraDiagnostics()`: Query for health data
- `useCaptureTest()`: Mutation for test capture
- `useRebootCamera()`: Mutation with confirmation

**Dependencies**: Task 4.1, Task 1.4
**Tests**: Hook tests

---

### Task 4.3: CameraCard Component
**File**: `src/presentation/components/cameras/CameraCard.tsx`
**Description**: Individual camera status card.

**Implementation**:
- Camera name and ID
- Status badge (online/offline/error)
- Last seen timestamp
- Health metrics (RSSI, heap, uptime)
- Capture test button
- Reboot button (with confirmation)

**Dependencies**: Task 4.2
**Tests**: Card rendering

---

### Task 4.4: CapturePreview Component
**File**: `src/presentation/components/cameras/CapturePreview.tsx`
**Description**: Display captured test images.

**Implementation**:
- Image display with loading skeleton
- Capture timestamp
- Image comparison mode (before/after)
- Download button
- Full-screen view option

**Dependencies**: Task 4.2
**Tests**: Image loading states

---

### Task 4.5: Camera Section Integration
**File**: `src/presentation/components/cameras/CameraSection.tsx`
**Description**: Complete camera management section.

**Implementation**:
- Camera grid layout (responsive)
- CameraCard for each camera
- CapturePreview modal
- Refresh all cameras button
- Empty state when no cameras

**Dependencies**: Task 4.3, Task 4.4
**Tests**: Full section tests

---

## Phase 5: Door Control

**Goal**: Door state display, control operations, and testing mode.

### Task 5.1: Door API Service
**File**: `src/infrastructure/api/door.ts`
**Description**: Door control API functions.

**Implementation**:
```typescript
export const doorApi = {
  getStatus: () => apiClient.get<Door>('/api/door/status'),
  open: (duration?: number) =>
    apiClient.post<CommandResult>('/open', { duration }),
  close: () => apiClient.post<CommandResult>('/close'),
  getHistory: () => apiClient.get<DoorOperation[]>('/api/door/history'),
};
```

**Dependencies**: Task 1.1, Task 1.2
**Tests**: MSW mocks

---

### Task 5.2: useDoor Hook
**File**: `src/application/hooks/useDoor.ts`
**Description**: Hook for door operations.

**Implementation**:
- `useDoorStatus()`: Query with 2s refetch
- `useOpenDoor()`: Mutation with testing mode check
- `useCloseDoor()`: Mutation with testing mode check
- `useDoorHistory()`: Query for operation log

**Dependencies**: Task 5.1, Task 1.6, Task 1.4
**Tests**: Hook tests with testing mode

---

### Task 5.3: DoorControls Component
**File**: `src/presentation/components/door/DoorControls.tsx`
**Description**: Door control buttons and state display.

**Implementation**:
- Current state display (open/closed/unknown)
- Lock state indicator
- Open button with duration selector (5s, 10s, 30s)
- Close button
- Confirmation dialog (unless testing mode)
- Loading states during operations

**Dependencies**: Task 5.2
**Tests**: Control interactions

---

### Task 5.4: TestingModeToggle Component
**File**: `src/presentation/components/door/TestingModeToggle.tsx`
**Description**: Testing mode activation control.

**Implementation**:
- Toggle switch for testing mode
- Activation confirmation dialog
- Countdown timer display when active
- Operation count badge
- Manual deactivation button
- Visual warning indicator (orange)

**Dependencies**: Task 1.6
**Tests**: Toggle and timer tests

---

### Task 5.5: Door Section Integration
**File**: `src/presentation/components/door/DoorSection.tsx`
**Description**: Complete door control section.

**Implementation**:
- DoorControls as primary interface
- TestingModeToggle card
- Operation history table (recent 20)
- GPIO status display
- Safety warning banner

**Dependencies**: Task 5.3, Task 5.4
**Tests**: Full section tests

---

## Phase 6: Advanced Features

**Goal**: Log streaming, configuration management, diagnostics export, and offline support.

### Task 6.1: Logs API Service
**File**: `src/infrastructure/api/logs.ts`
**Description**: Log management API functions.

**Implementation**:
```typescript
export const logsApi = {
  getRecent: (level?: string, limit?: number) =>
    apiClient.get<LogEntry[]>('/api/dashboard/logs', { level, limit }),
  exportDiagnostics: () =>
    apiClient.get<DiagnosticReport>('/api/dashboard/export'),
};
```

**Dependencies**: Task 1.1, Task 1.2
**Tests**: MSW mocks

---

### Task 6.2: useLogs Hook with SSE
**File**: `src/application/hooks/useLogs.ts`
**Description**: Hook for log streaming via SSE.

**Implementation**:
- `useLogStream()`: EventSource connection
- Connection state tracking (connected/disconnected)
- Auto-reconnect on disconnect
- Buffer management (keep last 500 entries)
- Level filtering
- Cleanup on unmount

**Dependencies**: Task 6.1, Task 1.4
**Tests**: SSE connection tests (mocked)

---

### Task 6.3: LogStream Component
**File**: `src/presentation/components/logs/LogStream.tsx`
**Description**: Real-time log display with virtual scrolling.

**Implementation**:
- Virtual list for performance (react-virtual)
- Log entry rows with timestamp, level, component, message
- Color-coded severity levels
- Auto-scroll to bottom (toggle)
- Copy log entry button

**Dependencies**: Task 6.2, react-virtual
**Tests**: Rendering with large datasets

---

### Task 6.4: LogFilter Component
**File**: `src/presentation/components/logs/LogFilter.tsx`
**Description**: Log filtering controls.

**Implementation**:
- Level filter dropdown (all/debug/info/warn/error)
- Search input for keyword filter
- Clear button
- Export button
- Connection status indicator

**Dependencies**: Task 6.2
**Tests**: Filter state changes

---

### Task 6.5: Log Section Integration
**File**: `src/presentation/components/logs/LogSection.tsx`
**Description**: Complete log viewing section.

**Implementation**:
- LogFilter toolbar
- LogStream main area
- Clear logs button
- Export diagnostics button
- Pause streaming toggle

**Dependencies**: Task 6.3, Task 6.4
**Tests**: Full section tests

---

### Task 6.6: Config API Service
**File**: `src/infrastructure/api/config.ts`
**Description**: Configuration management API functions.

**Implementation**:
```typescript
export const configApi = {
  get: () => apiClient.get<SystemConfig>('/api/dashboard/config'),
  update: (key: string, value: unknown) =>
    apiClient.put<{ success: boolean }>(`/api/dashboard/config/${key}`, { value }),
  reset: (key: string) =>
    apiClient.post<{ success: boolean }>(`/api/dashboard/config/${key}/reset`),
};
```

**Dependencies**: Task 1.1, Task 1.2
**Tests**: MSW mocks

---

### Task 6.7: useConfig Hook
**File**: `src/application/hooks/useConfig.ts`
**Description**: Hook for configuration operations.

**Implementation**:
- `useConfig()`: Query for all config
- `useUpdateConfig()`: Mutation with optimistic update
- `useResetConfig()`: Mutation for reset to default

**Dependencies**: Task 6.6, Task 1.4
**Tests**: Hook tests

---

### Task 6.8: ConfigEditor Component
**File**: `src/presentation/components/config/ConfigEditor.tsx`
**Description**: Configuration editing interface.

**Implementation**:
- Grouped settings display
- Inline editing for each setting
- Type-appropriate inputs (text, number, boolean, select)
- Sensitive value masking with reveal
- Reset to default button per setting
- Save/cancel for changes
- Validation feedback

**Dependencies**: Task 6.7
**Tests**: Editing interactions

---

### Task 6.9: Config Section Integration
**File**: `src/presentation/components/config/ConfigSection.tsx`
**Description**: Complete configuration section.

**Implementation**:
- Category tabs (System, MQTT, Camera, Door)
- ConfigEditor for active category
- Unsaved changes warning
- Reset all to defaults button

**Dependencies**: Task 6.8
**Tests**: Full section tests

---

### Task 6.10: Offline Queue Store
**File**: `src/application/stores/offlineQueue.ts`
**Description**: Queue for offline operations.

**Implementation**:
- IndexedDB storage for queue
- Operation types: door commands, config changes
- Add/remove/process queue methods
- Sync status tracking
- Auto-sync on reconnect

**Dependencies**: idb library
**Tests**: Queue operations

---

### Task 6.11: useOfflineQueue Hook
**File**: `src/application/hooks/useOfflineQueue.ts`
**Description**: Hook for offline operation management.

**Implementation**:
- `useOfflineQueue()`: Queue state and methods
- `useOnlineStatus()`: navigator.onLine tracking
- Auto-process queue when online
- Queue size indicator

**Dependencies**: Task 6.10
**Tests**: Queue hook tests

---

### Task 6.12: Service Worker Setup
**File**: `vite.config.ts`, `src/sw.ts`
**Description**: PWA with offline support.

**Implementation**:
- Configure vite-plugin-pwa
- Precache static assets
- Network-first for API calls
- Fallback to cached data
- Update prompt component

**Dependencies**: vite-plugin-pwa
**Tests**: SW registration tests

---

### Task 6.13: Network Status Component
**File**: `src/presentation/components/layout/NetworkStatus.tsx`
**Description**: Online/offline indicator.

**Implementation**:
- Online/offline badge in header
- Queue count when offline
- Sync progress when reconnecting
- Click to view queue details

**Dependencies**: Task 6.11
**Tests**: Status display tests

---

### Task 6.14: Final Integration and Polish
**File**: Various
**Description**: Final integration and testing.

**Implementation**:
- Add all sections to App tabs
- Test complete user flows
- Performance optimization (lazy loading)
- Accessibility audit (WCAG AA)
- Error boundary for sections
- 404/error pages

**Dependencies**: All previous tasks
**Tests**: E2E tests with Playwright

---

## Dependencies Summary

### External Dependencies to Add

```json
{
  "@tanstack/react-query": "^5.x",
  "@tanstack/react-virtual": "^3.x",
  "zustand": "^4.x",
  "idb": "^8.x",
  "vite-plugin-pwa": "^0.20.x"
}
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add button card dialog form input label select tabs badge switch alert progress skeleton toast
```

---

## Critical Path

```
Phase 1 (Core)
  ├── Task 1.1 API Client
  ├── Task 1.2 Types
  └── Task 1.4 Query Setup
        │
        v
Phase 2 (WiFi)
  └── Task 2.6 WiFi Section
        │
        v
Phase 3 (Devices)
  └── Task 3.7 Device Section
        │
        v
Phase 4 (Cameras)
  └── Task 4.5 Camera Section
        │
        v
Phase 5 (Door)
  └── Task 5.5 Door Section
        │
        v
Phase 6 (Advanced)
  └── Task 6.14 Final Integration
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | ≥70% | `npm run test:coverage` |
| Lighthouse Performance | ≥80 | Chrome DevTools |
| First Contentful Paint | <2s | Performance audit |
| Time to Interactive | <3s | Performance audit |
| Accessibility Score | ≥90 | Lighthouse |
| Type Coverage | 100% | `tsc --noEmit` |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Web Bluetooth not supported | Backend fallback via Task 3.1 API |
| Pi performance issues | Lazy loading, virtual scrolling |
| API endpoint unavailable | Graceful degradation with cached data |
| SSE connection drops | Auto-reconnect with exponential backoff |
| Large log volumes | Virtual scrolling, buffer limits |

---

## Next Steps

1. Review and approve this plan
2. Run `/speckit.tasks` to generate tasks.md with detailed subtasks
3. Begin Phase 1 implementation
4. Iterate with user feedback after each phase
