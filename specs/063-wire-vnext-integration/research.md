# Research: Wire vNEXT Integration & Test Hardening

**Feature**: 063-wire-vnext-integration
**Date**: 2026-03-06

## R1: TypeScript Module Resolution for Wire Package Imports

**Decision**: No change needed — current `moduleResolution: "bundler"` in `tsconfig.app.json` is correct.

**Rationale**: The wire package uses ES module subpath exports (`"./gen/*": { "types": "./gen/ts/*.d.ts", "default": "./gen/ts/*.js" }`). TypeScript's `bundler` resolution (5.0+) correctly resolves these wildcards. Running `tsc --noEmit` exits with zero errors — the LSP diagnostic warnings are IDE-specific (editor may use a different tsconfig scope for test files).

**Alternatives considered**:
- `moduleResolution: "node16"` — also supports `exports` maps but requires explicit `.js` extensions in relative imports, which the codebase doesn't use.
- `moduleResolution: "node"` (classic) — would break resolution since it ignores `exports` maps entirely.

**Evidence**: `tsc --noEmit -p tsconfig.app.json` exits 0. Trace resolution confirms `@delicasa/wire/gen/delicasa/device/v1/camera_service_pb` resolves to `gen/ts/delicasa/device/v1/camera_service_pb.d.ts` via the `"types"` condition.

## R2: Wire Package Factory API for Test Fixtures

**Decision**: Use `@delicasa/wire/testing` factory functions to replace all hand-crafted proto-JSON in MSW handlers.

**Rationale**: The wire package ships factory functions that produce canonical proto-JSON:
- `makeCamera()`, `makeListCamerasResponse()`, `makeGetCameraResponse()`
- `makeOperationSession()`, `makeListSessionsResponse()`, `makeGetSessionResponse()`
- `makeEvidenceCapture()`, `makeEvidencePair()`, `makeGetEvidencePairResponse()`, `makeGetSessionEvidenceResponse()`

All factories accept `Partial<T>` overrides and use `mergeDefaults()` (shallow merge, `undefined` values delete keys). Output is camelCase proto-JSON with int64 fields as strings.

**Key format details**:
- Enum values use screaming-snake prefix: `SESSION_STATUS_COMPLETE`, `CAMERA_STATUS_ONLINE`, `CAPTURE_TAG_BEFORE_OPEN`
- int64 fields (`freeHeap`, `uptimeSeconds`, `imageSizeBytes`) are string-encoded
- Timestamps are ISO 8601 strings via `makeTimestamp()`
- `mergeDefaults()` deletes keys set to `undefined` (proto3 absent-field convention)

**Alternatives considered**:
- Vector fixture JSON files (`@delicasa/wire/fixtures/*`) — static, not customizable per test scenario. Good for smoke tests but insufficient for error/edge case testing.
- Keep hand-crafted JSON — brittle, diverges from proto schema over time, already caused issues.

## R3: AbortSignal Stripping — Transport vs Global Patch

**Decision**: Keep the transport-level fix in `transport.ts`. No global patches exist to remove.

**Rationale**: Audit of test setup files confirms:
- `tests/setup/vitest.setup.ts` — no fetch/signal patches (only DOM mocks)
- `tests/setup/test-utils.tsx` — no fetch/signal patches (only QueryClient wrapper)
- `vitest.config.ts` — no global patches

The AbortSignal fix lives solely in `src/infrastructure/rpc/transport.ts` lines 42-51. It strips `signal` from fetch `init` and late-binds to `globalThis.fetch` for MSW interception. This is the correct, minimal approach.

**Alternatives considered**:
- Global `fetch` polyfill in vitest.setup.ts — would affect all tests, not just RPC; violates YAGNI.
- `AbortController` polyfill — doesn't address the jsdom incompatibility root cause (jsdom's `AbortSignal` doesn't satisfy the fetch spec).

## R4: Current RPC Handler Architecture

**Decision**: Replace the three manual converter functions (`sessionToProto`, `captureToProto`, `cameraToProto`) in `tests/mocks/handlers/rpc.ts` with wire factory calls.

**Rationale**: The current handlers import REST-era domain types (`Session`, `CaptureEntry`, `Camera`) and manually convert them to proto-JSON. This creates a fragile mapping layer that:
1. Must be maintained separately from the actual proto schema
2. Can silently diverge when the wire package adds fields
3. Duplicates enum mapping logic already in the wire package

The wire factories produce the exact proto-JSON that the Connect transport expects, eliminating this conversion layer entirely.

**Migration strategy**:
- Replace `sessionToProto(session)` with `makeOperationSession({ sessionId: session.id, ... })` from `@delicasa/wire/testing`
- Replace `captureToProto(capture)` with `makeEvidenceCapture({ evidenceId: capture.evidence_id, ... })`
- Replace `cameraToProto(camera)` with `makeCamera({ deviceId: camera.id, ... })`
- Response wrappers use `makeListSessionsResponse()`, `makeGetSessionResponse()`, etc.

## R5: Test Baseline

**Decision**: 128 test files, 2692 passed, 2 skipped. This is the regression baseline.

**Rationale**: All tests pass on `main` branch (2026-03-06). The 2 skipped tests are pre-existing. No new test skips or failures are acceptable.

## R6: Existing Handler Integration Points

**Decision**: The RPC handlers are composed into broader handler sets via spread.

**Rationale**: `tests/mocks/handlers/diagnostics.ts` spreads `createRpcSessionHandlers()` and `createRpcEvidenceHandlers()` into `createDiagnosticsHandlers()`. Similarly, `tests/mocks/v1-cameras-handlers.ts` spreads `createRpcCameraHandlers()` into `createV1CamerasHandlers()`. This composition pattern must be preserved — only the internal implementation of the RPC handler factories changes.
