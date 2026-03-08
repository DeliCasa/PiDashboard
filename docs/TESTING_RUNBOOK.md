# Testing Runbook: Post-Deploy Validation Suite

**Feature**: 064-post-deploy-validation
**Last updated**: 2026-03-07

## Overview

The post-deploy validation suite verifies that the PiDashboard remains stable after the Connect RPC migration (features 062-063). It covers:

- **Sessions**: List, detail, evidence captures via `SessionService` RPC
- **Evidence**: Pair display, capture tags via `EvidenceService` RPC
- **Cameras**: List with health metrics via `CameraService` RPC
- **Transport**: Custom fetch wrapper regression tests (AbortSignal stripping, MSW late-binding)
- **Graceful degradation**: Error/fallback states when RPC services are unavailable

This suite exists because the RPC migration introduced a new transport layer (Connect RPC over HTTP POST with JSON) that replaces the previous REST endpoints. Without dedicated mocking, E2E tests only pass due to graceful degradation catching unmocked request failures.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 22+ | Required for Playwright and Vitest |
| npm | 10+ | Package manager |
| Nix (NixOS) | — | Development shell provides Playwright browsers via `PLAYWRIGHT_BROWSERS_PATH` |

### NixOS Setup

```bash
# Enter the Nix development shell (sets PLAYWRIGHT_BROWSERS_PATH)
nix develop

# Verify Playwright browsers are available
npx playwright --version
```

### Optional: SSH Tunnel for Live Pi Testing

```bash
ssh -L 8082:localhost:8082 pi
```

## Running Tests

### Unit: Transport Regression Tests

Tests the custom fetch wrapper that strips AbortSignal (jsdom compatibility) and late-binds to `globalThis.fetch` (MSW interception).

```bash
VITEST_MAX_WORKERS=1 npx vitest run tests/unit/rpc/transport.test.ts
```

**Expected**: 5 tests pass (AbortSignal stripping, pass-through, late-binding, undefined init, JSON format config).

### E2E: RPC Smoke Tests

Verifies sessions, evidence, and cameras render correctly with Connect RPC mocks.

```bash
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/rpc-smoke.spec.ts --project=chromium
```

**Expected**: 7 tests pass in under 60 seconds.

| Test | What it verifies |
|------|-----------------|
| sessions list renders | `ListSessions` RPC with 3 session statuses |
| session detail with evidence | `GetSession` + `GetSessionEvidence` drill-down |
| evidence pair display | `GetEvidencePair` before/after captures |
| camera list with health | `ListCameras` with online/offline cameras |
| sessions RPC unavailable | 503 error shows fallback, no console errors |
| cameras RPC unavailable | 503 error shows fallback, no console errors |
| mixed success/failure | Sessions succeed while cameras fail gracefully |

### E2E: Operations Tests

Verifies the Operations tab session list, detail drill-down, back navigation, error states, and empty states using RPC mocks.

```bash
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/operations.spec.ts --project=chromium
```

**Expected**: 6 tests pass.

### Full Suite

```bash
# Unit + integration tests
VITEST_MAX_WORKERS=1 npm test

# All E2E tests
PLAYWRIGHT_WORKERS=1 npm run test:e2e

# Everything
npm run test:all
```

## CI Integration

### PR Workflow (`.github/workflows/test.yml`)

- **Unit tests**: `VITEST_MAX_WORKERS=1 npm run test` — includes transport regression tests
- **E2E smoke**: `PLAYWRIGHT_WORKERS=1` — includes `rpc-smoke.spec.ts` and `operations.spec.ts`
- Worker constraint: always 1 worker for reproducibility

### Nightly Workflow (`.github/workflows/nightly.yml`)

- Full test suite with multi-browser matrix (Chromium, Firefox)
- E2E sharding (2 shards per browser)
- Includes accessibility and resilience tests

### Expected Duration

| Suite | Duration | Workers |
|-------|----------|---------|
| Transport unit tests | ~2s | 1 |
| RPC smoke E2E | ~15s | 1 |
| Operations E2E | ~17s | 1 |
| Full E2E suite | ~24m | 1 |

## Troubleshooting

### Unmocked RPC Endpoint (Request Escapes to Network)

**Symptom**: Test hangs or times out waiting for a component to render.

**Cause**: An RPC endpoint is being called but no mock is registered. The request goes to `localhost:8082` which isn't running.

**Fix**: Ensure `applyDefaultRpcMocks(page)` is called in the test fixture (it's in `test-base.ts`). If overriding a specific endpoint, call `unrouteRpc()` first, then `mockRpcEndpoint()`.

```typescript
await unrouteRpc(page, 'SessionService', 'ListSessions');
await mockRpcEndpoint(page, 'SessionService', 'ListSessions',
  makeListSessionsResponse, { sessions: [...] });
```

### Transport Errors (AbortSignal Cross-Realm)

**Symptom**: `TypeError: Failed to execute 'fetch' on 'Window': The provided value is not of type 'AbortSignal'`

**Cause**: The Connect RPC library passes an AbortSignal from a different realm (jsdom vs. Node.js). The transport's fetch wrapper strips it.

**Fix**: Verify `src/infrastructure/rpc/transport.ts` still contains the AbortSignal stripping logic. The `transport.test.ts` unit test catches regressions.

### Mock Mismatches (Wrong Content-Type)

**Symptom**: `ConnectError: [invalid_argument] cannot unmarshal`

**Cause**: RPC mock returning wrong Content-Type or malformed JSON.

**Fix**: Ensure `mockRpcEndpoint()` sets `contentType: 'application/json'` (it does by default). Verify the factory function returns valid proto3 JSON (string enum names, ISO 8601 timestamps, stringified uint64).

### Timeout Issues

**Symptom**: Test times out waiting for `session-list-error` or similar error state.

**Cause**: React Query retries 3 times with exponential backoff (~7-10s) before showing error state.

**Fix**: Use `timeout: 30000` when asserting error states:

```typescript
await expect(page.getByTestId('session-list-error')).toBeVisible({ timeout: 30000 });
```

### MSW Handler Order Conflicts

**Symptom**: Unit/integration tests return unexpected mock data.

**Cause**: MSW uses first-match routing. If multiple handlers match the same URL pattern, the first one wins.

**Fix**: Register more specific handlers before generic ones. In `tests/mocks/handlers/rpc.ts`, the handler order is: sessions, evidence, cameras, then error overrides.

### Playwright Route Priority (LIFO)

**Symptom**: E2E test returns data from wrong mock.

**Cause**: Playwright uses last-registered-first-matched (LIFO) for `page.route()`. If you register a generic pattern then a specific one, the specific one takes priority.

**Fix**: Call `unrouteRpc()` before `mockRpcEndpoint()` to remove the default mock, then register your override:

```typescript
await unrouteRpc(page, 'SessionService', 'ListSessions');
await mockRpcEndpoint(page, 'SessionService', 'ListSessions', factory, overrides);
```

## Fixture Conventions

### Factory Functions

All RPC mocks use factory functions from `tests/e2e/fixtures/rpc-mocks.ts` (E2E) or `@delicasa/wire/testing` (unit/integration). Never hand-craft proto JSON in tests.

```typescript
// Correct: use factory
makeOperationSession({ sessionId: 'sess-001', status: 'SESSION_STATUS_ACTIVE' })

// Wrong: hand-crafted JSON
{ session_id: 'sess-001', status: 1, started_at: { seconds: 123, nanos: 0 } }
```

### Enum Format

Proto3 JSON uses **string enum names** (not numeric values):

| Domain | Proto3 JSON |
|--------|-------------|
| `active` | `SESSION_STATUS_ACTIVE` |
| `complete` | `SESSION_STATUS_COMPLETE` |
| `failed` | `SESSION_STATUS_FAILED` |
| `online` | `CAMERA_STATUS_ONLINE` |
| `offline` | `CAMERA_STATUS_OFFLINE` |
| `BEFORE_OPEN` | `CAPTURE_TAG_BEFORE_OPEN` |
| `AFTER_CLOSE` | `CAPTURE_TAG_AFTER_CLOSE` |

### Timestamps

ISO 8601 format: `"2026-03-06T10:00:00.000Z"`

### uint64 Fields

Stringified to prevent JavaScript number overflow: `"245760"` not `245760`.

### RPC URL Pattern

Connect RPC endpoints: `POST /rpc/delicasa.device.v1.{Service}/{Method}`

Examples:
- `/rpc/delicasa.device.v1.SessionService/ListSessions`
- `/rpc/delicasa.device.v1.EvidenceService/GetSessionEvidence`
- `/rpc/delicasa.device.v1.CameraService/ListCameras`
