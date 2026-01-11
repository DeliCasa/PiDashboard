# Research: PiOrchestrator V1 API Sync

> **Feature**: 006-piorchestrator-v1-api-sync  
> **Created**: 2026-01-11  
> **Status**: Complete

---

## Table of Contents

1. [SSE vs WebSocket vs Polling](#1-sse-vs-websocket-vs-polling)
2. [Consumer-Driven Contract Testing](#2-consumer-driven-contract-testing)
3. [API Error Envelope Patterns](#3-api-error-envelope-patterns)
4. [LAN Dashboard Security](#4-lan-dashboard-security)
5. [SSE in React Best Practices](#5-sse-in-react-best-practices)
6. [API Key Storage for SPAs](#6-api-key-storage-for-spas)

---

## 1. SSE vs WebSocket vs Polling

### Decision
Use **SSE for provisioning events** and **WebSocket for system monitoring**, with **polling as fallback**.

### Rationale

| Criterion | SSE | WebSocket | Polling |
|-----------|-----|-----------|---------|
| **Complexity** | Low (HTTP-based) | Medium (custom protocol) | Low |
| **Bi-directional** | No (server-push only) | Yes | N/A |
| **Auto-reconnect** | Browser-native | Manual | N/A |
| **Battery impact** | Low | Medium | High (frequent requests) |
| **Firewall friendliness** | High (HTTP) | Medium (upgrade required) | High |
| **Use case fit** | Event streaming | Real-time monitoring | Fallback |

**Why SSE for Provisioning Events:**
- PiOrchestrator already implements SSE at `/api/v1/provisioning/batch/events`
- Events are server-to-client only (no client commands needed)
- EventSource API handles reconnection automatically
- Lower complexity than WebSocket for this use case

**Why WebSocket for Monitoring:**
- PiOrchestrator already implements WebSocket at `/ws/monitor`
- Bi-directional for ping/pong keepalive
- Single connection for all monitoring data
- More efficient for high-frequency updates (5s intervals)

**Polling as Fallback:**
- Required for browsers/environments where SSE/WS fail
- Already implemented in existing hooks
- Used when connection drops (temporary fallback)

### Alternatives Considered

1. **Polling Only**: Simpler but high latency for provisioning state changes
2. **WebSocket Only**: Would need to reimplement SSE semantics
3. **Long Polling**: More complex than SSE with similar benefits

### Risks/Gotchas

- **SSE Max Connections**: Browsers limit SSE connections (6 per domain). Our single SSE for provisioning is fine.
- **Proxy Buffering**: Some proxies buffer SSE. PiOrchestrator sets `X-Accel-Buffering: no`.
- **Memory Leaks**: Must disconnect SSE on unmount. Use `useEffect` cleanup.

### Application to Codebase

| Component | Technology | Endpoint | Interval |
|-----------|------------|----------|----------|
| `useBatchProvisioningEvents` | SSE | `/api/v1/provisioning/batch/events` | N/A (push) |
| `useSystemMonitor` | WebSocket | `/ws/monitor` | 5s (server) |
| `useSystemStatus` | Polling (existing) | `/api/system/info` | 5s (fallback) |
| `useLogs` | Polling (existing) | `/dashboard/logs` | 3s |

---

## 2. Consumer-Driven Contract Testing

### Decision
Use **Zod schemas for runtime validation** with **contract tests** against fixture snapshots.

### Rationale

Consumer-driven contracts traditionally use Pact or similar tools. However, for a frontend consuming a backend API:

1. **Zod Runtime Validation**: Validate responses at runtime, log warnings on drift
2. **Contract Tests**: Verify mock fixtures match schemas (already in place)
3. **Snapshot Testing**: Detect unexpected schema changes

This approach is already implemented in Feature 005 (`tests/integration/contracts/`).

### Current Implementation

```typescript
// src/infrastructure/api/schemas.ts
export const SystemInfoResponseSchema = z.object({
  success: z.boolean(),
  data: SystemInfoDataSchema,
});

// API service with validation
const validation = safeParseWithErrors(SystemInfoResponseSchema, raw);
if (!validation.success) {
  console.warn('[API Contract] System info validation failed:', validation.errors);
}
```

### Extension for V1 API

Add new schemas for V1 envelope and provisioning types:

```typescript
// New V1 envelope schema
export const V1SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    correlation_id: z.string().uuid(),
    timestamp: z.string().datetime(),
  });

export const V1ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    retry_after_seconds: z.number().optional(),
    details: z.string().optional(),
  }),
  correlation_id: z.string().uuid(),
  timestamp: z.string().datetime(),
});
```

### Alternatives Considered

1. **Pact**: Overkill for single consumer, requires broker setup
2. **OpenAPI Code Generation**: Considered, but adds build complexity
3. **No Validation**: Risk of silent failures in production

### Risks/Gotchas

- **Graceful Degradation**: Validation failures log warnings but don't block functionality
- **Schema Versioning**: If backend adds fields, schemas need `passthrough()` or updates
- **Performance**: Zod validation adds ~1ms per response (negligible)

### Application to Codebase

| File | Change |
|------|--------|
| `src/infrastructure/api/schemas.ts` | Add V1 envelope, provisioning schemas |
| `tests/integration/contracts/provisioning.contract.test.ts` | New contract tests |
| `tests/fixtures/provisioning.fixture.ts` | New mock data |

---

## 3. API Error Envelope Patterns

### Decision
Create an **error code registry** with **user-friendly message mappings** and **retry logic**.

### Rationale

PiOrchestrator returns structured errors:

```json
{
  "success": false,
  "error": {
    "code": "DEVICE_UNREACHABLE",
    "message": "Cannot connect to device",
    "retryable": true,
    "retry_after_seconds": 5
  },
  "correlation_id": "uuid"
}
```

The dashboard should:
1. Map codes to localized, user-friendly messages
2. Handle retry logic automatically for retryable errors
3. Log correlation IDs for support debugging

### Implementation Pattern

```typescript
// src/infrastructure/api/errors.ts

export const ERROR_MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: "The provisioning session was not found. It may have expired.",
  SESSION_ALREADY_ACTIVE: "Another provisioning session is already running.",
  DEVICE_NOT_FOUND: "The device was not found in this session.",
  DEVICE_NOT_IN_ALLOWLIST: "This device is not approved for provisioning.",
  TOTP_INVALID: "The authentication code is invalid. Please try again.",
  RATE_LIMITED: "Too many requests. Please wait before trying again.",
  DEVICE_UNREACHABLE: "Cannot connect to the device. Check it's powered on.",
  DEVICE_TIMEOUT: "The device is not responding. Try moving closer.",
  NETWORK_ERROR: "Network unavailable. Check your connection.",
  UNAUTHORIZED: "Authentication required. Please configure your API key.",
};

export function getUserMessage(code: string): string {
  return ERROR_MESSAGES[code] || "An unexpected error occurred.";
}

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
    return getUserMessage(this.code);
  }
}
```

### Alternatives Considered

1. **Show Raw Backend Messages**: Less user-friendly, may expose implementation details
2. **i18n Integration**: Overkill for single-language dashboard
3. **No Error Mapping**: Poor UX for end users

### Risks/Gotchas

- **New Error Codes**: Unknown codes fall back to generic message
- **Message Accuracy**: Must match actual error conditions
- **Retry Loops**: Need max retry limit to prevent infinite loops

### Application to Codebase

| File | Change |
|------|--------|
| `src/infrastructure/api/errors.ts` | New file with error mappings |
| `src/infrastructure/api/client.ts` | Throw V1ApiError for envelope errors |
| `src/presentation/components/common/ErrorDisplay.tsx` | New component for error UI |

---

## 4. LAN Dashboard Security

### Decision
Use **API key header** for protected endpoints, stored in **sessionStorage** with **clear guidance** for production.

### Rationale

The Pi Dashboard is served from the same origin as the API (embedded in PiOrchestrator). Security considerations:

| Threat | Mitigation |
|--------|------------|
| **CSRF** | Not applicable (same origin, no cookies) |
| **XSS** | React escapes by default; sanitize logs |
| **API Key Exposure** | sessionStorage (cleared on tab close), never log |
| **Man-in-the-Middle** | LAN assumption; Tailscale for remote |
| **Unauthorized Access** | API key required for protected endpoints |

### API Key Storage Strategy

```typescript
// Development: Environment variable
const API_KEY = import.meta.env.VITE_API_KEY;

// Production: Prompt user or fetch from config endpoint
// Option 1: Config endpoint (if auth status endpoint exists)
// GET /api/v1/auth/status -> { required: boolean, configured: boolean }

// Option 2: sessionStorage (cleared on tab close)
const storedKey = sessionStorage.getItem('delicasa-api-key');
```

**Recommendation**: 
- For embedded dashboard, API key can be baked in at build time (controlled deployment)
- For development, use `VITE_API_KEY` environment variable
- Never store in localStorage (persists across sessions)

### Header Injection Pattern

```typescript
// In apiClient
function getHeaders(requiresAuth: boolean): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (requiresAuth) {
    const apiKey = getApiKey();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
  }
  
  return headers;
}
```

### Alternatives Considered

1. **Bearer Token (JWT)**: Overkill for single-user dashboard
2. **Cookie-based Auth**: Adds CSRF complexity
3. **No Auth**: Unacceptable for door control, config changes

### Risks/Gotchas

- **Key Leakage**: Never log API key; use `[REDACTED]` in debug output
- **Key Rotation**: No UI for rotation; requires backend restart
- **Dev Mode Bypass**: PiOrchestrator has `PIORCHESTRATOR_DEV_MODE` for testing

### Application to Codebase

| File | Change |
|------|--------|
| `src/infrastructure/api/auth.ts` | New file for key management |
| `src/infrastructure/api/client.ts` | Add auth header injection |
| `vite.config.ts` | Document VITE_API_KEY env var |

---

## 5. SSE in React Best Practices

### Decision
Create a custom **`useSSE` hook** with proper cleanup, reconnection, and TypeScript typing.

### Rationale

React doesn't have built-in SSE support. Best practices:

1. **useEffect for Lifecycle**: Create EventSource on mount, close on unmount
2. **Reconnection**: Exponential backoff on error
3. **Page Visibility**: Pause when tab is hidden (optional, reduces battery)
4. **Type Safety**: Parse and validate SSE payloads

### Implementation Pattern

```typescript
// src/application/hooks/useSSE.ts

interface UseSSEOptions<T> {
  url: string;
  onMessage: (data: T) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  enabled?: boolean;
}

export function useSSE<T>({ url, onMessage, onError, onOpen, enabled = true }: UseSSEOptions<T>) {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    const connect = () => {
      setConnectionState('connecting');
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        retryCountRef.current = 0;
        setConnectionState('connected');
        onOpen?.();
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T;
          onMessage(data);
        } catch (e) {
          console.error('[SSE] Failed to parse message:', e);
        }
      };
      
      eventSource.onerror = (event) => {
        setConnectionState('disconnected');
        eventSource.close();
        onError?.(event);
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current++;
        setTimeout(connect, delay);
      };
    };
    
    connect();
    
    return () => {
      eventSourceRef.current?.close();
      setConnectionState('disconnected');
    };
  }, [url, enabled]);
  
  return { connectionState };
}
```

### Alternatives Considered

1. **@microsoft/fetch-event-source**: More features but adds dependency
2. **Raw EventSource in Component**: Code duplication, no reuse
3. **Third-party SSE Library**: Unnecessary for our use case

### Risks/Gotchas

- **Max Reconnection Attempts**: Add limit to prevent infinite retries
- **Memory Leaks**: Must close EventSource on unmount
- **Stale Closures**: Use refs for callbacks if they change frequently

### Application to Codebase

| File | Change |
|------|--------|
| `src/application/hooks/useSSE.ts` | New hook |
| `src/application/hooks/useBatchProvisioningEvents.ts` | Use SSE hook |

---

## 6. API Key Storage for SPAs

### Decision
Use **sessionStorage** for runtime API key storage, with **build-time injection** option for embedded deployment.

### Rationale

| Storage Method | Pros | Cons |
|----------------|------|------|
| **localStorage** | Persists | Survives attacks, visible in DevTools |
| **sessionStorage** | Cleared on close | Still visible in DevTools |
| **In-memory** | Not visible | Lost on refresh |
| **Build-time env** | Controlled | Requires rebuild to change |
| **Cookie (httpOnly)** | Not JS-accessible | Adds CSRF complexity |

For an embedded IoT dashboard:
- Build-time is acceptable (controlled deployment)
- sessionStorage is fallback for development
- In-memory is ideal for highest security

### Implementation

```typescript
// src/infrastructure/api/auth.ts

let inMemoryKey: string | null = null;

export function getApiKey(): string | null {
  // 1. Check in-memory first (highest priority)
  if (inMemoryKey) return inMemoryKey;
  
  // 2. Check build-time env var
  const envKey = import.meta.env.VITE_API_KEY;
  if (envKey) return envKey;
  
  // 3. Check sessionStorage (development fallback)
  return sessionStorage.getItem('delicasa-api-key');
}

export function setApiKey(key: string): void {
  inMemoryKey = key;
  // Optionally persist to sessionStorage for dev
  if (import.meta.env.DEV) {
    sessionStorage.setItem('delicasa-api-key', key);
  }
}

export function clearApiKey(): void {
  inMemoryKey = null;
  sessionStorage.removeItem('delicasa-api-key');
}
```

### Alternatives Considered

1. **Backend Session**: Adds state, complexity for embedded dashboard
2. **No Storage**: Force re-entry on every refresh (poor UX)
3. **Encrypted localStorage**: Security theater (key in JS)

### Risks/Gotchas

- **DevTools Access**: Determined attacker can find key in memory
- **Tab Duplication**: sessionStorage is per-tab, needs re-entry
- **Iframe Embedding**: sessionStorage isolated, key won't transfer

### Application to Codebase

| File | Change |
|------|--------|
| `src/infrastructure/api/auth.ts` | New file |
| `.env.example` | Document VITE_API_KEY |
| `vite.config.ts` | Ensure env vars are available |

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Real-time Updates | SSE + WebSocket + Polling fallback | Match backend implementation |
| Contract Testing | Zod schemas + fixture tests | Already in place, extend for V1 |
| Error Handling | Code registry + user messages | Better UX, debugging support |
| Security | API key header + sessionStorage | Appropriate for LAN dashboard |
| SSE Hook | Custom hook with reconnection | Reusable, type-safe |
| API Key Storage | sessionStorage + build-time env | Balance of security and UX |
