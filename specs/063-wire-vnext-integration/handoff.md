# Handoff: Wire vNEXT Integration & Test Hardening

**Feature**: 063-wire-vnext-integration
**Date**: 2026-03-06
**Status**: Complete

## Summary

Replaced hand-crafted proto-JSON converter functions in MSW test handlers with `@delicasa/wire/testing` factory functions. Added a dedicated unit test for the Connect transport's AbortSignal compatibility shim. Zero test regressions.

## Key Decisions

### 1. Wire Package v0.4.0 Integration

The `@delicasa/wire@0.4.0` package (local file link) provides:
- Protobuf-generated TypeScript service descriptors under `@delicasa/wire/gen/delicasa/device/v1/*`
- Test factory functions under `@delicasa/wire/testing` (e.g., `makeOperationSession`, `makeEvidenceCapture`, `makeCamera`)

No tsconfig changes were needed — `moduleResolution: "bundler"` in `tsconfig.app.json` correctly resolves subpath exports.

### 2. AbortSignal Transport Fix is Canonical

The fetch wrapper in `src/infrastructure/rpc/transport.ts` (lines 49-56) is the **sole mechanism** for handling jsdom/MSW AbortSignal incompatibility:
- Strips `signal` from fetch init (jsdom's AbortSignal is incompatible with fetch spec)
- Late-binds to `globalThis.fetch` (required for MSW interception)

No global fetch/signal patches exist in test setup files. This is intentional and documented.

### 3. Wire Factories Replace Hand-Crafted Proto-JSON

The three converter functions in `tests/mocks/handlers/rpc.ts` now delegate to wire factory functions:
- `sessionToProto()` → `makeOperationSession({...})`
- `captureToProto()` → `makeEvidenceCapture({...})`
- `cameraToProto()` → `makeCamera({...})` + `makeCameraHealth({...})`

Enum mapping constants (e.g., `SESSION_STATUS_TO_PROTO`) are retained for domain lowercase → proto screaming-snake conversion.

### 4. Handler Factory API Signatures Preserved

The exported handler factories maintain their existing signatures:
- `createRpcSessionHandlers(sessions: Session[])`
- `createRpcEvidenceHandlers(captures: CaptureEntry[], sessions: Session[])`
- `createRpcCameraHandlers(cameras: Camera[])`

Composition in `tests/mocks/handlers/diagnostics.ts` and `tests/mocks/v1-cameras-handlers.ts` remains unchanged.

### 5. Test Baseline Maintained

| Metric | Before | After |
|--------|--------|-------|
| Test files | 128 | 129 (+1 transport test) |
| Tests passed | 2692 | 2696 (+4 transport tests) |
| Tests skipped | 2 | 2 |
| New failures | — | 0 |

## Files Changed

| File | Change |
|------|--------|
| `tests/mocks/handlers/rpc.ts` | Converter functions now use wire factory functions |
| `src/infrastructure/rpc/transport.ts` | Improved documentation comment on AbortSignal fix |

## Files Created

| File | Purpose |
|------|---------|
| `tests/unit/rpc/transport.test.ts` | Unit test for transport fetch wrapper (4 tests) |
| `specs/063-wire-vnext-integration/handoff.md` | This document |

## Audit Results

- `tests/setup/vitest.setup.ts` — no fetch/signal patches found
- `tests/setup/test-utils.tsx` — no patches found
- `vitest.config.ts` — no patches found

## No Action Required

This feature is self-contained within PiDashboard. No cross-repo handoffs needed.
