# Implementation Plan: PiOrchestrator V1 API Sync

**Branch**: `006-piorchestrator-v1-api-sync` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `.specify/specs/006-piorchestrator-v1-api-sync/spec.md`

---

## Summary

Integrate the PiDashboard with PiOrchestrator's new V1 API, adding batch provisioning UI, device allowlist management, SSE event streaming for real-time updates, and API key authentication for protected endpoints.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Vite 7  
**Primary Dependencies**: TanStack React Query, Zustand, Zod, shadcn/ui, Tailwind CSS v4  
**Storage**: IndexedDB (offline queue), localStorage (thresholds), sessionStorage (API key)  
**Testing**: Vitest (unit/component/integration), Playwright (E2E), MSW (mocks)  
**Target Platform**: Web (embedded in PiOrchestrator Go binary on Raspberry Pi)  
**Project Type**: Single frontend SPA with hexagonal architecture  
**Performance Goals**: SSE latency < 100ms, bundle increase < 20KB, 50 devices without UI lag  
**Constraints**: Must work on Raspberry Pi 4, offline-capable for cached data, LAN security model  
**Scale/Scope**: Single-user dashboard, 50 devices max per provisioning session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Library-First | N/A | Frontend feature, not a library |
| Test-First | PASS | Contract tests defined before implementation |
| Integration Testing | PASS | MSW handlers + contract tests planned |
| Observability | PASS | Correlation ID logging, connection status indicators |
| Simplicity | PASS | Feature flags for gradual rollout, polling fallbacks |
| Backward Compatibility | PASS | All changes additive, existing endpoints unchanged |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/006-piorchestrator-v1-api-sync/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output - SSE, security, contracts research
├── data-model.md        # Phase 1 output - TypeScript types and Zod schemas
├── quickstart.md        # Phase 1 output - Developer setup guide
├── contracts/           # Phase 1 output - Handoff mapping
│   └── handoff-mapping.md
├── checklists/          # Requirements verification
│   └── requirements.md
└── tasks.md             # Phase 2 output - Detailed task breakdown
```

### Source Code (repository root)

```text
src/
├── domain/types/           # New: v1-api.ts, provisioning.ts, websocket.ts, sse.ts
├── application/
│   ├── hooks/              # New: useSSE.ts, useWebSocket.ts, useBatchProvisioningEvents.ts, etc.
│   └── stores/             # New: features.ts (feature flags)
├── infrastructure/api/     # Modified: schemas.ts; New: v1-client.ts, auth.ts, errors.ts, batch-provisioning.ts, allowlist.ts
├── presentation/components/
│   ├── common/             # New: ConnectionStatus.tsx, ErrorDisplay.tsx
│   ├── provisioning/       # New: BatchProvisioningSection.tsx, etc.
│   └── allowlist/          # New: AllowlistSection.tsx, etc.

tests/
├── unit/hooks/             # New: useSSE.test.ts, useWebSocket.test.ts
├── component/
│   ├── provisioning/       # New: BatchProvisioningSection.test.tsx
│   └── allowlist/          # New: AllowlistSection.test.tsx
├── integration/
│   ├── contracts/          # New: provisioning.contract.test.ts
│   └── hooks/              # New: useBatchProvisioning.test.tsx
├── fixtures/               # New: provisioning.fixture.ts
└── e2e/                    # New: batch-provisioning.spec.ts, v1-api-integration.spec.ts
```

**Structure Decision**: Extends existing hexagonal architecture with new domain types, infrastructure services, and presentation components. All new code follows established patterns.

## Complexity Tracking

No violations requiring justification. All changes follow existing patterns.

---

## Implementation Overview

This plan implements the PiOrchestrator V1 API integration in **8 phases** with **51 tasks**. Each phase is designed to be:

- **Independently testable** - Can verify before proceeding
- **Backward compatible** - Existing features continue to work
- **Rollback-safe** - Can revert each phase without breaking others

### Critical Path

```
Phase 1 (Types) -> Phase 2 (API Client) -> Phase 3 (SSE/WS) -> Phase 4 (Batch UI)
                                                            -> Phase 5 (Allowlist)
                                                            -> Phase 6 (Polish)
```

---

## Phase 1: Types & Contracts (Safe, No Runtime Change)

**Goal**: Define all new types and Zod schemas without changing any runtime behavior.

### Task 1.1: Create V1 API Type Definitions

**File**: `src/domain/types/v1-api.ts`  
**Description**: Add TypeScript types for V1 response envelopes and error structures.

```typescript
// V1 Success Response
export interface V1SuccessResponse<T> {
  success: true;
  data: T;
  correlation_id: string;
  timestamp: string;
}

// V1 Error Response
export interface V1ErrorResponse {
  success: false;
  error: V1Error;
  correlation_id: string;
  timestamp: string;
}

export interface V1Error {
  code: string;
  message: string;
  retryable: boolean;
  retry_after_seconds?: number;
  details?: string;
}

export type V1Response<T> = V1SuccessResponse<T> | V1ErrorResponse;
```

**Tests**: Type-only, no runtime tests needed  
**Dependencies**: None

### Task 1.2: Create Provisioning Entity Types

**File**: `src/domain/types/provisioning.ts`  
**Description**: Add entity types for batch provisioning, candidates, and allowlist.

**Dependencies**: Task 1.1  
**Tests**: Type-only

### Task 1.3: Create WebSocket Monitoring Types

**File**: `src/domain/types/websocket.ts`  
**Description**: Add types for WebSocket monitoring data and messages.

**Dependencies**: None  
**Tests**: Type-only

### Task 1.4: Create SSE Event Types

**File**: `src/domain/types/sse.ts`  
**Description**: Add types for SSE event envelopes and payloads.

**Dependencies**: Task 1.2  
**Tests**: Type-only

### Task 1.5: Add V1 Envelope Zod Schemas

**File**: `src/infrastructure/api/schemas.ts`  
**Description**: Add Zod schemas for V1 response validation.

```typescript
export const V1ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  retry_after_seconds: z.number().optional(),
  details: z.string().optional(),
});

export const createV1SuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    correlation_id: z.string(),
    timestamp: z.string(),
  });
```

**Dependencies**: Task 1.1  
**Tests**: Contract tests in Phase 1.8

### Task 1.6: Add Provisioning Zod Schemas

**File**: `src/infrastructure/api/schemas.ts`  
**Description**: Add Zod schemas for batch provisioning entities.

**Dependencies**: Task 1.2, 1.5  
**Tests**: Contract tests in Phase 1.8

### Task 1.7: Create Provisioning Fixtures

**File**: `tests/fixtures/provisioning.fixture.ts`  
**Description**: Add mock data for batch provisioning contract tests.

```typescript
export const mockBatchSession: BatchProvisioningSession = {
  id: 'sess_test123',
  state: 'discovering',
  target_ssid: 'TestNetwork',
  // ...
};

export const mockProvisioningCandidate: ProvisioningCandidate = {
  mac: 'AA:BB:CC:DD:EE:FF',
  ip: '192.168.4.100',
  state: 'discovered',
  // ...
};
```

**Dependencies**: Task 1.2  
**Tests**: Used by Task 1.8

### Task 1.8: Create Provisioning Contract Tests

**File**: `tests/integration/contracts/provisioning.contract.test.ts`  
**Description**: Verify fixtures match schemas.

```typescript
describe('Provisioning API Contracts', () => {
  it('validates BatchProvisioningSession schema', () => {
    const result = BatchProvisioningSessionSchema.safeParse(mockBatchSession);
    expect(result.success).toBe(true);
  });
});
```

**Dependencies**: Task 1.6, 1.7  
**Validation**: `npm test tests/integration/contracts/provisioning`

---

## Phase 2: API Client Enhancement (Feature Flagged)

**Goal**: Create V1 API client wrapper with auth and error handling, behind feature flag.

### Task 2.1: Create Error Code Registry

**File**: `src/infrastructure/api/errors.ts`  
**Description**: Map error codes to user-friendly messages.

```typescript
export const ERROR_MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: 'The provisioning session was not found.',
  UNAUTHORIZED: 'Authentication required. Please configure your API key.',
  // ...
};

export class V1ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean,
    public retryAfterSeconds?: number,
    public correlationId?: string
  ) {
    super(message);
    this.name = 'V1ApiError';
  }
  
  get userMessage(): string {
    return ERROR_MESSAGES[this.code] || 'An unexpected error occurred.';
  }
}
```

**Dependencies**: Phase 1 complete  
**Tests**: Unit tests for error mapping

### Task 2.2: Create API Key Management Module

**File**: `src/infrastructure/api/auth.ts`  
**Description**: Manage API key storage and retrieval.

```typescript
let inMemoryKey: string | null = null;

export function getApiKey(): string | null {
  if (inMemoryKey) return inMemoryKey;
  const envKey = import.meta.env.VITE_API_KEY;
  if (envKey) return envKey;
  if (import.meta.env.DEV) {
    return sessionStorage.getItem('delicasa-api-key');
  }
  return null;
}

export function setApiKey(key: string): void { /* ... */ }
export function clearApiKey(): void { /* ... */ }
export function isAuthRequired(): boolean { /* ... */ }
```

**Dependencies**: None  
**Tests**: Unit tests for key management

### Task 2.3: Create V1 API Client Wrapper

**File**: `src/infrastructure/api/v1-client.ts`  
**Description**: Wrapper that unwraps V1 envelopes and handles auth.

```typescript
import { apiClient } from './client';
import { getApiKey } from './auth';
import { V1ApiError } from './errors';

export async function v1Request<T>(
  endpoint: string,
  options: RequestOptions & { requiresAuth?: boolean } = {}
): Promise<{ data: T; correlationId: string }> {
  const headers: HeadersInit = {};
  
  if (options.requiresAuth) {
    const apiKey = getApiKey();
    if (!apiKey) throw new V1ApiError('UNAUTHORIZED', 'API key required', false);
    headers['X-API-Key'] = apiKey;
  }
  
  const response = await apiClient.get<V1Response<T>>(`/v1${endpoint}`, { headers });
  
  if (!response.success) {
    throw new V1ApiError(
      response.error.code,
      response.error.message,
      response.error.retryable,
      response.error.retry_after_seconds,
      response.correlation_id
    );
  }
  
  // Log correlation ID for debugging
  console.debug(`[API] ${endpoint} correlation_id=${response.correlation_id}`);
  
  return { data: response.data, correlationId: response.correlation_id };
}
```

**Dependencies**: Task 2.1, 2.2  
**Tests**: Integration tests with MSW

### Task 2.4: Create Feature Flag for V1 API

**File**: `src/application/stores/features.ts`  
**Description**: Feature flag store for gradual rollout.

```typescript
interface FeatureFlags {
  useV1Api: boolean;
  useBatchProvisioning: boolean;
  useWebSocketMonitor: boolean;
}

export const useFeatureFlags = create<FeatureFlags>((set) => ({
  useV1Api: import.meta.env.VITE_USE_V1_API === 'true',
  useBatchProvisioning: import.meta.env.VITE_BATCH_PROVISIONING === 'true',
  useWebSocketMonitor: false, // Start with polling
}));
```

**Dependencies**: None  
**Tests**: Store tests

### Task 2.5: Create Batch Provisioning API Service

**File**: `src/infrastructure/api/batch-provisioning.ts`  
**Description**: API service for batch provisioning endpoints.

```typescript
export const batchProvisioningApi = {
  startSession: async (request: StartSessionRequest) => {
    return v1Request<StartSessionData>('/provisioning/batch/start', {
      method: 'POST',
      body: request,
      requiresAuth: true,
    });
  },
  
  getSession: async (id: string, includeDevices = true) => {
    return v1Request<SessionData>(`/provisioning/batch/${id}?include_devices=${includeDevices}`, {
      requiresAuth: true,
    });
  },
  
  // ... stopSession, provisionAll, provisionDevice, retryDevice
};
```

**Dependencies**: Task 2.3  
**Tests**: Contract tests with MSW

### Task 2.6: Create Allowlist API Service

**File**: `src/infrastructure/api/allowlist.ts`  
**Description**: API service for device allowlist endpoints.

**Dependencies**: Task 2.3  
**Tests**: Contract tests with MSW

### Task 2.7: Create Session Recovery API Service

**File**: `src/infrastructure/api/session-recovery.ts`  
**Description**: API service for session recovery endpoints.

**Dependencies**: Task 2.3  
**Tests**: Contract tests with MSW

### Task 2.8: Add MSW Handlers for V1 Endpoints

**File**: `tests/integration/mocks/handlers.ts`  
**Description**: Add MSW handlers for new V1 endpoints.

**Dependencies**: Task 1.7  
**Tests**: Used by integration tests

### Task 2.9: Create API Client Integration Tests

**File**: `tests/integration/hooks/useBatchProvisioning.test.tsx`  
**Description**: Integration tests for API client with MSW.

**Dependencies**: Task 2.5, 2.8  
**Validation**: `npm test tests/integration/hooks`

---

## Phase 3: SSE & WebSocket Infrastructure (New Hooks)

**Goal**: Create reusable hooks for SSE and WebSocket connections.

### Task 3.1: Create useSSE Hook

**File**: `src/application/hooks/useSSE.ts`  
**Description**: Generic SSE hook with reconnection.

```typescript
export function useSSE<T>({
  url,
  onMessage,
  onError,
  enabled = true,
}: UseSSEOptions<T>): UseSSEReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  // ... implementation with exponential backoff
}
```

**Dependencies**: Phase 2 complete  
**Tests**: Unit tests with mocked EventSource

### Task 3.2: Create useBatchProvisioningEvents Hook

**File**: `src/application/hooks/useBatchProvisioningEvents.ts`  
**Description**: SSE hook for provisioning events.

```typescript
export function useBatchProvisioningEvents(sessionId: string | null) {
  const [devices, setDevices] = useState<Map<string, ProvisioningCandidate>>(new Map());
  const [session, setSession] = useState<BatchProvisioningSession | null>(null);
  
  const handleMessage = (envelope: SSEEventEnvelope<unknown>) => {
    switch (envelope.type) {
      case 'device.state_changed':
        // Update device state
        break;
      case 'session.status':
        // Update session
        break;
    }
  };
  
  const { connectionState } = useSSE({
    url: sessionId ? `/api/v1/provisioning/batch/events?session_id=${sessionId}` : null,
    onMessage: handleMessage,
    enabled: !!sessionId,
  });
  
  return { devices: Array.from(devices.values()), session, connectionState };
}
```

**Dependencies**: Task 3.1  
**Tests**: Integration tests

### Task 3.3: Create useWebSocket Hook

**File**: `src/application/hooks/useWebSocket.ts`  
**Description**: Generic WebSocket hook with reconnection.

**Dependencies**: None  
**Tests**: Unit tests

### Task 3.4: Create useSystemMonitor Hook

**File**: `src/application/hooks/useSystemMonitor.ts`  
**Description**: WebSocket hook for real-time monitoring.

```typescript
export function useSystemMonitor() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  
  // Use WebSocket when available, fallback to polling
  const { data: polledData } = useSystemStatus({
    enabled: connectionState !== 'connected',
  });
  
  return {
    data: data || polledData,
    connectionState,
    isWebSocket: connectionState === 'connected',
  };
}
```

**Dependencies**: Task 3.3  
**Tests**: Integration tests

### Task 3.5: Create Connection Status Indicator Component

**File**: `src/presentation/components/common/ConnectionStatus.tsx`  
**Description**: Visual indicator for SSE/WS connection state.

```tsx
export function ConnectionStatus({ state, type }: ConnectionStatusProps) {
  const statusConfig = {
    connected: { color: 'bg-green-500', label: 'Connected' },
    connecting: { color: 'bg-yellow-500', label: 'Connecting...' },
    disconnected: { color: 'bg-red-500', label: 'Disconnected' },
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${statusConfig[state].color}`} />
      <span className="text-xs text-muted-foreground">{type}: {statusConfig[state].label}</span>
    </div>
  );
}
```

**Dependencies**: None  
**Tests**: Component tests

### Task 3.6: Add SSE Hook Unit Tests

**File**: `tests/unit/hooks/useSSE.test.ts`  
**Description**: Unit tests for SSE hook.

**Dependencies**: Task 3.1  
**Validation**: `npm test tests/unit/hooks/useSSE`

### Task 3.7: Add WebSocket Hook Unit Tests

**File**: `tests/unit/hooks/useWebSocket.test.ts`  
**Description**: Unit tests for WebSocket hook.

**Dependencies**: Task 3.3  
**Validation**: `npm test tests/unit/hooks/useWebSocket`

### Task 3.8: Create Reconnection Integration Test

**File**: `tests/integration/hooks/useSSE.reconnection.test.ts`  
**Description**: Test SSE reconnection with exponential backoff.

**Dependencies**: Task 3.1, 3.2  
**Validation**: `npm test tests/integration/hooks`

---

## Phase 4: Batch Provisioning UI (New Feature)

**Goal**: Create the batch provisioning user interface.

### Task 4.1: Create BatchProvisioningSection Component

**File**: `src/presentation/components/provisioning/BatchProvisioningSection.tsx`  
**Description**: Main container for batch provisioning workflow.

```tsx
export function BatchProvisioningSection() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { devices, session, connectionState } = useBatchProvisioningEvents(sessionId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Device Provisioning</CardTitle>
        <ConnectionStatus state={connectionState} type="SSE" />
      </CardHeader>
      <CardContent>
        {!session ? (
          <StartSessionForm onStart={setSessionId} />
        ) : (
          <SessionProgress session={session} devices={devices} />
        )}
      </CardContent>
    </Card>
  );
}
```

**Dependencies**: Task 3.2  
**Tests**: Component tests

### Task 4.2: Create StartSessionForm Component

**File**: `src/presentation/components/provisioning/StartSessionForm.tsx`  
**Description**: Form to start a new batch session.

**Dependencies**: Task 2.5  
**Tests**: Component tests

### Task 4.3: Create SessionProgress Component

**File**: `src/presentation/components/provisioning/SessionProgress.tsx`  
**Description**: Progress display for active session.

**Dependencies**: None  
**Tests**: Component tests

### Task 4.4: Create ProvisioningCandidateCard Component

**File**: `src/presentation/components/provisioning/ProvisioningCandidateCard.tsx`  
**Description**: Card showing device state with state machine visualization.

```tsx
export function ProvisioningCandidateCard({ candidate, onRetry, onProvision }: Props) {
  const stateConfig = {
    discovered: { icon: Search, color: 'text-blue-500' },
    provisioning: { icon: Loader2, color: 'text-yellow-500', spin: true },
    provisioned: { icon: Check, color: 'text-green-500' },
    verifying: { icon: Loader2, color: 'text-yellow-500', spin: true },
    verified: { icon: CheckCircle, color: 'text-green-600' },
    failed: { icon: XCircle, color: 'text-red-500' },
  };
  
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="font-mono text-sm">{candidate.mac}</div>
          <div className="text-xs text-muted-foreground">
            RSSI: {candidate.rssi} dBm | FW: {candidate.firmware_version}
          </div>
        </div>
        <DeviceStateIndicator state={candidate.state} />
        {candidate.state === 'failed' && (
          <Button size="sm" variant="outline" onClick={() => onRetry(candidate.mac)}>
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

**Dependencies**: None  
**Tests**: Component tests

### Task 4.5: Create SessionRecoveryBanner Component

**File**: `src/presentation/components/provisioning/SessionRecoveryBanner.tsx`  
**Description**: Banner for resuming interrupted sessions.

```tsx
export function SessionRecoveryBanner() {
  const { data: recoverableSessions } = useRecoverableSessions();
  
  if (!recoverableSessions?.length) return null;
  
  return (
    <Alert>
      <AlertTitle>Recoverable Session Found</AlertTitle>
      <AlertDescription>
        You have {recoverableSessions.length} session(s) that can be resumed.
        <Button onClick={() => onResume(recoverableSessions[0].id)}>
          Resume
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

**Dependencies**: Task 2.7  
**Tests**: Component tests

### Task 4.6: Create useRecoverableSessions Hook

**File**: `src/application/hooks/useRecoverableSessions.ts`  
**Description**: Hook to check for and resume recoverable sessions.

**Dependencies**: Task 2.7  
**Tests**: Integration tests

### Task 4.7: Add Provisioning Section to App Navigation

**File**: `src/App.tsx`  
**Description**: Add provisioning tab to navigation (behind feature flag).

**Dependencies**: Task 4.1, 2.4  
**Tests**: E2E smoke test

### Task 4.8: Create Batch Provisioning Component Tests

**File**: `tests/component/provisioning/BatchProvisioningSection.test.tsx`  
**Description**: Component tests for provisioning UI.

**Dependencies**: Task 4.1-4.5  
**Validation**: `npm test tests/component/provisioning`

### Task 4.9: Create Batch Provisioning E2E Test

**File**: `tests/e2e/batch-provisioning.spec.ts`  
**Description**: E2E test for batch provisioning flow.

**Dependencies**: Task 4.7  
**Validation**: `npm run test:e2e -- batch-provisioning`

---

## Phase 5: Allowlist Management UI (New Feature)

**Goal**: Create the device allowlist management interface.

### Task 5.1: Create AllowlistSection Component

**File**: `src/presentation/components/allowlist/AllowlistSection.tsx`  
**Description**: Main container for allowlist management.

**Dependencies**: Task 2.6  
**Tests**: Component tests

### Task 5.2: Create AllowlistEntryForm Component

**File**: `src/presentation/components/allowlist/AllowlistEntryForm.tsx`  
**Description**: Form to add new allowlist entries with MAC validation.

```tsx
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export function AllowlistEntryForm({ onSubmit }: Props) {
  const [mac, setMac] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = () => {
    if (!MAC_REGEX.test(mac)) {
      setError('Invalid MAC address format. Use AA:BB:CC:DD:EE:FF');
      return;
    }
    onSubmit({ mac: mac.toUpperCase(), description });
  };
  
  return (/* form JSX */);
}
```

**Dependencies**: None  
**Tests**: Component tests

### Task 5.3: Create AllowlistEntryCard Component

**File**: `src/presentation/components/allowlist/AllowlistEntryCard.tsx`  
**Description**: Card displaying allowlist entry with delete action.

**Dependencies**: None  
**Tests**: Component tests

### Task 5.4: Create useAllowlist Hook

**File**: `src/application/hooks/useAllowlist.ts`  
**Description**: Hook for allowlist CRUD operations.

```typescript
export function useAllowlist() {
  const queryClient = useQueryClient();
  
  const { data: entries } = useQuery({
    queryKey: ['allowlist'],
    queryFn: () => allowlistApi.list(),
  });
  
  const addMutation = useMutation({
    mutationFn: allowlistApi.add,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allowlist'] }),
  });
  
  const removeMutation = useMutation({
    mutationFn: allowlistApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allowlist'] }),
  });
  
  return { entries, add: addMutation.mutate, remove: removeMutation.mutate };
}
```

**Dependencies**: Task 2.6  
**Tests**: Integration tests

### Task 5.5: Create Allowlist Component Tests

**File**: `tests/component/allowlist/AllowlistSection.test.tsx`  
**Description**: Component tests for allowlist UI.

**Dependencies**: Task 5.1-5.3  
**Validation**: `npm test tests/component/allowlist`

---

## Phase 6: Integration & Polish

**Goal**: Final integration, polish, and comprehensive testing.

### Task 6.1: Create ErrorDisplay Component

**File**: `src/presentation/components/common/ErrorDisplay.tsx`  
**Description**: Reusable error display with retry countdown.

```tsx
export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const [countdown, setCountdown] = useState(error.retryAfterSeconds || 0);
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  return (
    <Alert variant="destructive">
      <AlertTitle>{error.userMessage}</AlertTitle>
      <AlertDescription>
        {error.retryable && (
          countdown > 0 ? (
            <span>Retry in {countdown}s</span>
          ) : (
            <Button onClick={onRetry}>Retry</Button>
          )
        )}
        <details>
          <summary>Details</summary>
          <pre>Correlation ID: {error.correlationId}</pre>
        </details>
      </AlertDescription>
    </Alert>
  );
}
```

**Dependencies**: Task 2.1  
**Tests**: Component tests

### Task 6.2: Add Accessibility Labels

**Files**: All new components  
**Description**: Ensure all interactive elements have proper ARIA labels.

**Dependencies**: Phase 4, 5 complete  
**Validation**: `npm run test:e2e -- accessibility`

### Task 6.3: Update Test Coverage

**Files**: Various  
**Description**: Ensure new code has adequate test coverage.

**Dependencies**: All phases complete  
**Validation**: `npm run test:coverage` (target: 70%)

### Task 6.4: Create Integration Smoke Test

**File**: `tests/e2e/v1-api-integration.spec.ts`  
**Description**: E2E smoke test for V1 API integration.

```typescript
test.describe('V1 API Integration', () => {
  test('protected endpoints require auth', async ({ page }) => {
    // Test 401 handling
  });
  
  test('batch provisioning flow', async ({ page }) => {
    // Test happy path
  });
  
  test('SSE connection recovery', async ({ page }) => {
    // Test reconnection
  });
});
```

**Dependencies**: All phases complete  
**Validation**: `npm run test:e2e`

---

## Dependencies Summary

### External Dependencies (None Required)

The implementation uses only existing dependencies:
- `zod` - Already installed, used for schemas
- Native `EventSource` - Browser API
- Native `WebSocket` - Browser API

### Optional Future Dependencies

- `@microsoft/fetch-event-source` - If native EventSource is insufficient
- `reconnecting-websocket` - If WebSocket reconnection needs enhancement

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage (new code) | > 70% | `npm run test:coverage` |
| Bundle Size Increase | < 20KB | `npm run build` |
| SSE Connection Time | < 1s | Performance test |
| Error Message Coverage | 100% | Manual review |
| Accessibility Issues | 0 new | `npm run test:e2e -- accessibility` |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SSE instability | Polling fallback in useSystemStatus |
| API key exposure | sessionStorage + never log key |
| Type drift | Zod validation + contract tests |
| Breaking changes | Feature flags for V1 API |
| Bundle bloat | Lazy load provisioning components |

---

## Rollback Plan

Each phase can be rolled back independently:

1. **Phase 1 (Types)**: Delete new type files
2. **Phase 2 (API Client)**: Feature flag to use legacy client
3. **Phase 3 (SSE/WS)**: Hooks already have polling fallback
4. **Phase 4-5 (UI)**: Feature flag hides new tabs
5. **Phase 6 (Polish)**: No breaking changes

---

## Validation Checkpoints

After each phase, run:

```bash
# Phase 1
npm test tests/integration/contracts

# Phase 2
npm test tests/integration/hooks

# Phase 3
npm test tests/unit/hooks

# Phase 4
npm test tests/component/provisioning

# Phase 5
npm test tests/component/allowlist

# Phase 6
npm run test:all
```
