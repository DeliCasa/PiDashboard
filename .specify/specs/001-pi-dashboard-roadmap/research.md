# Research Document: Pi Dashboard Roadmap

> **Feature**: 001-pi-dashboard-roadmap
> **Created**: 2026-01-06
> **Status**: Complete

---

## Technical Context Analysis

### Identified Unknowns - RESOLVED

All technical unknowns from the specification have been researched and resolved:

---

## Research Findings

### 1. React State Management for Real-Time Metrics

**Decision**: TanStack Query (React Query) for server state + Zustand for client state

**Rationale**:
- TanStack Query provides automatic refetching, caching, and background updates ideal for polling health metrics
- Built-in support for refetch intervals (5-second default for system status)
- Optimistic updates for configuration changes
- Zustand is lightweight (< 1KB) and provides simple global state for UI concerns (theme, testing mode, offline queue)
- Aligns with DeliCasa ecosystem patterns (NextClient uses same stack)

**Alternatives Considered**:
- Redux Toolkit: Overkill for single-device dashboard; adds complexity
- Jotai: Good atomic approach but less mature ecosystem for server state
- SWR: Good option but TanStack Query has better devtools and mutation support

---

### 2. API Service Layer Architecture

**Decision**: Custom hooks wrapping fetch with TypeScript interfaces

**Rationale**:
- Simple, explicit API calls aligned with PiOrchestrator's REST endpoints
- Type-safe request/response contracts using TypeScript interfaces
- Custom `useApi` hook provides consistent error handling, loading states, and retry logic
- Service layer pattern: `src/services/api/*.ts` for endpoint definitions
- Hooks layer: `src/hooks/use*.ts` for React integration

**Alternatives Considered**:
- Axios: Additional dependency not needed; native fetch sufficient
- tRPC: Overkill for simple REST API; backend is Go (not TypeScript)
- OpenAPI codegen: Could add later; manual types sufficient for initial scope

---

### 3. Real-Time Log Streaming

**Decision**: Server-Sent Events (SSE) via EventSource API

**Rationale**:
- PiOrchestrator already implements SSE endpoints (`/api/dashboard/health/stream`, `/api/dashboard/logs/stream`)
- Native browser support via EventSource API
- Simpler than WebSocket for unidirectional data flow
- Automatic reconnection built into EventSource
- Lower overhead than WebSocket for this use case

**Alternatives Considered**:
- WebSocket: Bidirectional not needed; more complex setup
- Long polling: Less efficient; higher latency
- GraphQL subscriptions: Requires GraphQL backend (Go backend is REST)

---

### 4. Offline Support Strategy

**Decision**: Service Worker with Workbox + IndexedDB for operation queue

**Rationale**:
- Vite PWA plugin provides easy Service Worker integration with Workbox
- Cache-first strategy for static assets (dashboard loads offline)
- Network-first for API calls with fallback to cached data
- IndexedDB stores queued operations (door commands, config changes)
- `navigator.onLine` + online/offline events for status detection

**Alternatives Considered**:
- localStorage: 5MB limit; not suitable for image caching
- Cache API only: Less structured for operation queue
- PouchDB: Additional dependency; IndexedDB sufficient

---

### 5. Auto-Adaptive Health Thresholds

**Decision**: Pi model detection via `/proc/cpuinfo` + baseline calibration during first 60 seconds

**Rationale**:
- Pi model determines thermal limits (Pi 4 throttles at 80°C, Pi 5 at 85°C)
- Baseline CPU/memory usage established during initial "learning" period
- Thresholds calculated as: warning = baseline + 40%, critical = baseline + 60%
- Stored in localStorage for persistence; re-calibrate option available

**Implementation**:
```typescript
interface AdaptiveThresholds {
  piModel: 'pi3' | 'pi4' | 'pi5' | 'unknown';
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  temperature: { warning: number; critical: number };
  calibratedAt: string;
}
```

**Alternatives Considered**:
- Fixed thresholds: Not suitable for varying hardware
- User-configured: Too complex for field technicians
- Cloud-based profiles: Requires connectivity; doesn't work offline

---

### 6. BLE Device Provisioning from Browser

**Decision**: Web Bluetooth API with fallback to backend-mediated provisioning

**Rationale**:
- Web Bluetooth API supported in Chrome/Chromium (Pi default browser)
- Direct BLE connection from dashboard to ESP32 for provisioning
- Fallback: POST to PiOrchestrator `/api/devices/:address/provision` for browsers without Web Bluetooth
- EspCamV2 already implements GATT service for WiFi/MQTT credential writes

**Security Considerations**:
- BLE pairing uses ESP32's built-in passkey
- MQTT credentials transmitted over BLE are encrypted at GATT level
- Audit log stored locally for all provisioning operations

**Alternatives Considered**:
- Backend-only provisioning: Works but slower roundtrip; less responsive UI
- Native mobile app: Out of scope; web-only requirement
- WiFi Direct: More complex; BLE simpler for credential transfer

---

### 7. Door Testing Mode Implementation

**Decision**: Time-limited bypass with localStorage tracking + audit logging

**Rationale**:
- Testing mode activated via explicit button click with confirmation
- 5-minute timeout tracked via setTimeout + localStorage timestamp
- All operations during testing mode logged with `testingMode: true` flag
- Visual indicator (orange badge) shows testing mode active with countdown
- Auto-deactivates after timeout or manual deactivation

**Implementation**:
```typescript
interface TestingModeState {
  active: boolean;
  activatedAt: string;
  expiresAt: string;
  operationCount: number;
}
```

**Alternatives Considered**:
- Per-session only: Risk of forgetting; timer provides safety
- PIN protection: Adds friction for legitimate testing
- Backend-enforced: Would require API changes; client-side sufficient

---

### 8. Component Architecture

**Decision**: Feature-based directory structure with shared UI components

**Rationale**:
- Aligns with constitution's single responsibility principle
- Each feature module contains its components, hooks, and services
- Shared shadcn/ui components in `src/components/ui/`
- Feature components in `src/components/{feature}/`

**Structure**:
```
src/
├── components/
│   ├── ui/           # shadcn/ui primitives
│   ├── layout/       # Header, Navigation, Layout
│   ├── wifi/         # WiFi configuration components
│   ├── devices/      # Device provisioning components
│   ├── cameras/      # Camera management components
│   ├── door/         # Door control components
│   ├── system/       # System status components
│   ├── logs/         # Log viewing components
│   └── config/       # Configuration components
├── hooks/            # Custom React hooks
├── services/         # API service layer
├── lib/              # Utilities (cn, constants, types)
└── stores/           # Zustand stores
```

---

### 9. Testing Strategy

**Decision**: Vitest + Testing Library + MSW for mocking

**Rationale**:
- Constitution requires 70%+ test coverage
- Vitest integrates seamlessly with Vite
- React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking without modifying code
- Playwright for E2E (WiFi flow, provisioning, door control)

**Test Categories**:
1. **Unit**: Utility functions, hooks (Vitest)
2. **Component**: UI interactions, state changes (Testing Library)
3. **Integration**: API communication (MSW mocks)
4. **E2E**: Critical user flows (Playwright)

---

### 10. Performance Optimization for Pi Hardware

**Decision**: Lazy loading + reduced animations + image optimization

**Rationale**:
- Constitution specifies reduced animations for Pi performance
- Route-based code splitting with React.lazy()
- CSS animations disabled via `prefers-reduced-motion` media query
- Camera preview images compressed to max 800px width
- Virtual scrolling for log entries (react-virtual)

**Targets**:
- Initial load: < 3 seconds on Pi 4
- Metric updates: < 500ms latency
- Memory footprint: < 100MB browser usage

---

## Constitution Compliance Check

| Principle | Compliance Status | Implementation Notes |
|-----------|-------------------|---------------------|
| **Code Quality** | ✅ Compliant | TypeScript strict mode, ESLint, functional components |
| **Testing Discipline** | ✅ Planned | Vitest + Testing Library + Playwright, 70%+ target |
| **Security** | ✅ Compliant | Input validation, no credential logging, CSP headers |
| **User Experience** | ✅ Compliant | 44px touch targets, responsive 320-1920px, WCAG AA |
| **Observability** | ✅ Compliant | Real-time metrics, SSE streaming, operation logging |
| **Maintainability** | ✅ Compliant | SRP components, service layer abstraction, hooks |
| **Documentation** | ✅ Planned | JSDoc, Storybook stories, CHANGELOG updates |

---

## Dependency Verification

| Dependency | Required By | Status | Notes |
|------------|-------------|--------|-------|
| PiOrchestrator API | All features | ✅ Available | Endpoints documented in spec appendix |
| EspCamV2 BLE Protocol | Device provisioning | ✅ Available | `BLEProvisioningManager.cpp` implemented |
| shadcn/ui | All UI | ✅ Installed | components.json configured |
| Tailwind CSS v4 | Styling | ✅ Installed | index.css configured |
| Vite | Build system | ✅ Installed | vite.config.ts configured |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Web Bluetooth not supported | Low | Medium | Backend fallback provisioning |
| Pi performance issues | Medium | Medium | Lazy loading, reduced animations |
| API endpoint unavailable | Low | High | Graceful degradation, cached data |
| BLE interference | Medium | Low | Retry logic, user feedback |
| Offline sync conflicts | Low | Medium | Last-write-wins with audit log |

---

## Next Steps

1. Generate data model from entities in spec
2. Define API contracts for all endpoints
3. Create quickstart guide for developers
4. Generate implementation task breakdown
