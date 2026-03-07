# Quickstart: Wire vNEXT Integration & Test Hardening

**Feature**: 063-wire-vnext-integration
**Date**: 2026-03-06

## Prerequisites

- Node.js 22+
- `@delicasa/wire@0.4.0` installed (via `file:../delicasa-wire`)
- All existing tests passing: `VITEST_MAX_WORKERS=1 npm test`

## What Changes

### Files Modified

| File | Change |
|------|--------|
| `tests/mocks/handlers/rpc.ts` | Replace hand-crafted proto-JSON converters with `@delicasa/wire/testing` factories |
| `src/infrastructure/rpc/transport.ts` | Improve documentation comment on AbortSignal fix |

### Files Created

| File | Purpose |
|------|---------|
| `tests/unit/rpc/transport.test.ts` | Unit test for transport fetch wrapper (signal stripping + MSW late-binding) |
| `specs/063-wire-vnext-integration/handoff.md` | Handoff document summarizing integration decisions |

### Files Unchanged (Verified)

| File | Why |
|------|-----|
| `tsconfig.app.json` | `moduleResolution: "bundler"` is already correct |
| `src/infrastructure/rpc/clients.ts` | Import paths are correct and resolving |
| `src/infrastructure/rpc/adapters/*.ts` | Adapters work with factory output as-is |
| `tests/setup/vitest.setup.ts` | No fetch/signal patches to remove |
| `tests/setup/test-utils.tsx` | No patches to remove |

## Development Workflow

```bash
# 1. Verify baseline
VITEST_MAX_WORKERS=1 npm test

# 2. Make changes to rpc.ts handlers (replace converters with factories)
# 3. Add transport unit test
# 4. Verify no regressions
VITEST_MAX_WORKERS=1 npm test

# 5. Lint
npm run lint

# 6. Type-check
npx tsc --noEmit

# 7. Build
npm run build
```

## Key Decisions

1. **No tsconfig changes needed** — `moduleResolution: "bundler"` resolves `@delicasa/wire/gen/*` correctly
2. **Transport fix stays in source** — no global test patches exist; the transport-level approach is canonical
3. **Wire factories replace domain-to-proto converters** — eliminates `sessionToProto`, `captureToProto`, `cameraToProto` functions
4. **Handler API signatures preserved** — `createRpcSessionHandlers()`, `createRpcEvidenceHandlers()`, `createRpcCameraHandlers()` keep the same external interface; only internal implementation changes
5. **Composition into diagnostics/cameras handlers preserved** — spread patterns in `diagnostics.ts` and `v1-cameras-handlers.ts` remain unchanged

## Test Baseline

- **128 test files**, **2692 passed**, **2 skipped**
- Target: same or higher pass count, zero new failures
