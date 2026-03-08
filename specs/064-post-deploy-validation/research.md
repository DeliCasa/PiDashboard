# Research: Post-Deploy Validation Suite

**Feature**: 064-post-deploy-validation
**Date**: 2026-03-07

## R1: E2E RPC Mocking Gap

**Decision**: Add Playwright `page.route()` interception for Connect RPC endpoints (HTTP POST to `/rpc/delicasa.device.v1.*`) using wire testing factory response envelopes.

**Rationale**: Features 062–063 migrated cameras, sessions, and evidence from REST to Connect RPC clients. The existing E2E tests only mock REST endpoints (`/api/v1/sessions*`, `/api/v1/cameras`, etc.). Zero E2E tests intercept `/rpc/...` routes. Production code now sends HTTP POST requests to `/rpc/delicasa.device.v1.SessionService/ListSessions`, etc. Existing tests pass incidentally because `isRpcFeatureUnavailable()` graceful degradation catches the unmocked request failures and shows empty/fallback states — but this means tests are not actually validating the success paths.

**Alternatives considered**:
- Mock at MSW level in Playwright: Not viable — Playwright runs in a browser, MSW is for Node.
- Use Playwright's `page.route()` with hand-crafted JSON: Rejected — wire factories already provide proto-safe envelopes.

## R2: Existing Transport Test Coverage

**Decision**: Enhance the existing `tests/unit/rpc/transport.test.ts` by importing the actual transport module's fetch wrapper instead of replicating it inline.

**Rationale**: The current test file (created in feature 063) replicates the fetch wrapper logic as a local function `transportFetch()`. This means the test doesn't break if someone changes `src/infrastructure/rpc/transport.ts` — it only tests a copy. The fix is to import and test the real function. The test already covers 4 behaviors: AbortSignal stripping, pass-through without signal, late-binding to globalThis.fetch, and undefined init handling.

**Alternatives considered**:
- Keep the replicated approach: Rejected — defeats the purpose of regression testing since the real module can diverge from the test copy.
- Full integration test with MSW + Connect client: Out of scope — too slow for unit-level transport validation.

## R3: Proto-Safe Fixture Status

**Decision**: The MSW RPC handlers (`tests/mocks/handlers/rpc.ts`) are already fully migrated to wire factories. No further migration needed for RPC handlers. The E2E fixtures (`tests/e2e/fixtures/mock-routes.ts`) use domain-format REST JSON — these are out of scope since they mock REST endpoints, not proto endpoints.

**Rationale**: Audit confirmed that `rpc.ts` imports all 5 wire factories (`makeOperationSession`, `makeEvidenceCapture`, `makeEvidencePair`, `makeCamera`, `makeCameraHealth`) and routes all happy-path responses through adapter functions that call these factories. Error handlers produce Connect protocol error envelopes (`{ code, message }`) which are not proto-schema objects — these are correct by design.

**Remaining concern**: The enum mapping tables (`SESSION_STATUS_TO_PROTO`, `CAPTURE_TAG_TO_PROTO`, etc.) in `rpc.ts` translate domain strings to proto enum strings before passing to factories. These are necessary because the wire factories expect proto-prefixed enum values (e.g., `SESSION_STATUS_ACTIVE`, not `active`).

**Alternatives considered**:
- Migrate E2E REST fixtures to wire factories: Rejected — REST endpoints use domain-format JSON, not proto-format. Wire factories produce proto JSON.
- Remove enum mapping tables: Not possible without changing wire factory API.

## R4: Wire Testing Factory Completeness

**Decision**: The `@delicasa/wire/testing` package (v0.5.0) provides complete response envelope factories for all 4 services. No new factories needed.

**Rationale**: Available response envelope factories:
- **SessionService**: `makeListSessionsResponse`, `makeGetSessionResponse`
- **EvidenceService**: `makeGetSessionEvidenceResponse`, `makeGetEvidencePairResponse`
- **CameraService**: `makeListCamerasResponse`, `makeGetCameraResponse`, `makeGetCameraStatusResponse`, `makeReconcileCamerasResponse`
- **CaptureService**: `makeCaptureImageResponse`, `makeRequestCaptureResponse`, `makeGetCaptureStatusResponse`

Key format notes:
- All timestamps: ISO 8601 strings via `makeTimestamp()` (default: `2026-03-06T10:00:00Z`)
- uint64 fields: JSON strings (e.g., `"245760"` not `245760`)
- Enum fields: Proto3 string names (e.g., `"CAMERA_STATUS_ONLINE"`)
- All factories accept `overrides` parameter for customization

## R5: Playwright RPC Route Pattern

**Decision**: Use Playwright's `page.route()` with URL glob `**/rpc/delicasa.device.v1.*` and filter by `request.method() === 'POST'` inside the handler callback.

**Rationale**: Connect RPC over HTTP/1.1 sends JSON POST requests with `Content-Type: application/connect+json`. Playwright's `page.route()` intercepts based on URL pattern. Since all RPC endpoints use POST, we can match the URL glob and respond with factory-generated JSON. The response must include `Content-Type: application/json` (Connect protocol accepts this for responses).

**Pattern**:
```typescript
await page.route('**/rpc/delicasa.device.v1.SessionService/ListSessions', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(makeListSessionsResponse()),
  });
});
```
