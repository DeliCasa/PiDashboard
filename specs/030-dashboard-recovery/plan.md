# Implementation Plan: Dashboard Recovery + ESP Visibility

**Branch**: `030-dashboard-recovery` | **Date**: 2026-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-dashboard-recovery/spec.md`

## Summary

This feature addresses the "ESPs not being shown" and "no feature is working" reports by improving error observability and state management in the PiDashboard. Research revealed that the API infrastructure is functional, but silent failures and unclear UI states create a "nothing works" perception.

**Key findings from research**:
- API endpoints return JSON correctly (verified via curl)
- Device list returns empty because no devices are registered (not a bug)
- HTML fallback responses are handled silently (no error shown)
- Error display lacks endpoint information for debugging

**Primary approach**: Enhance observability by making failures visible and actionable.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui
**Storage**: N/A (API proxied to PiOrchestrator Go backend)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari)
**Project Type**: Single React SPA
**Performance Goals**: Page load < 3s, API response visible within 3s
**Constraints**: Must work offline-first (existing queue), no backend changes
**Scale/Scope**: Single dashboard application, ~15 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Library-First | N/A | UI feature, not library |
| Test-First | ✅ | Unit tests for error handling, E2E for states |
| Simplicity | ✅ | Minimal changes, focused on observability |
| Observability | ✅ | Core goal of this feature |

**Gate Status**: PASS - No violations.

## Project Structure

### Documentation (this feature)

```text
specs/030-dashboard-recovery/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Investigation findings
├── data-model.md        # Enhanced error/state models
├── quickstart.md        # Development quickstart
├── contracts/           # Zod schemas for validation
│   └── api-error-schema.ts
└── tasks.md             # Phase 2 output (after /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── types/           # Type definitions (existing)
├── application/
│   └── hooks/           # React Query hooks (existing)
├── infrastructure/
│   └── api/
│       ├── client.ts    # MODIFY: Add HTML detection, endpoint tracking
│       └── errors.ts    # MODIFY: Add HTMLFallbackError class
├── presentation/
│   └── components/
│       ├── common/
│       │   └── ErrorDisplay.tsx  # MODIFY: Add endpoint, debug info
│       └── devices/
│           └── DeviceList.tsx    # MODIFY: Add state distinction
└── lib/
    └── normalize.ts     # Existing normalization utilities

scripts/
└── smoke_030_dashboard_recovery.sh  # NEW: Smoke test script

tests/
├── unit/
│   └── api/
│       └── client.test.ts    # ADD: HTML detection tests
└── integration/
    └── hooks/
        └── useDevices.test.tsx  # ADD: State handling tests
```

**Structure Decision**: Single project structure - this is a React SPA with no backend modifications.

## Implementation Phases

### Phase 1: API Client Hardening

**Goal**: Make API failures detectable and actionable.

**Changes**:

1. **`src/infrastructure/api/client.ts`**
   - Add `Accept: application/json` header to all requests
   - Check content-type before parsing; throw HTMLFallbackError if HTML
   - Include endpoint path in ApiError
   - Extract `X-Request-Id` from response headers

2. **`src/infrastructure/api/errors.ts`**
   - Add `HTMLFallbackError` class with specific hint message
   - Add `endpoint` field to existing error classes
   - Add `createDebugInfo()` helper function

**Tests**:
- Unit test: HTML fallback detection
- Unit test: Endpoint tracking in errors
- Unit test: Request ID extraction

### Phase 2: Error Display Enhancement

**Goal**: Show actionable error information in UI.

**Changes**:

1. **`src/presentation/components/common/ErrorDisplay.tsx`**
   - Add endpoint path display
   - Add "Copy debug info" button (JSON blob)
   - Add specific message for HTMLFallbackError
   - Add timestamp to error display

**Tests**:
- Component test: Endpoint display
- Component test: Copy functionality
- Component test: HTML fallback message

### Phase 3: Device List State Distinction

**Goal**: Clear visual distinction between loading, empty, error, and populated states.

**Changes**:

1. **`src/presentation/components/devices/DeviceList.tsx`**
   - Add explicit state management (loading/empty/error/populated)
   - Empty state: "No devices found" + "Scan for Devices" CTA
   - Error state: ErrorDisplay with retry button
   - Loading state: Spinner with "Loading devices..."

**Tests**:
- Component test: All four states render correctly
- E2E test: State transitions work

### Phase 4: Smoke Test Script

**Goal**: Automated verification of API health.

**Changes**:

1. **`scripts/smoke_030_dashboard_recovery.sh`**
   - Test `/api/devices` returns JSON
   - Test `/api/wifi/status` returns JSON
   - Test `/api/system/info` returns JSON
   - Test `/api/v1/provisioning/allowlist` returns JSON
   - Verify content-type headers
   - Output PASS/FAIL summary

**Tests**:
- Manual execution on Pi
- CI integration (optional)

## Complexity Tracking

> **No violations to justify** - This is a focused observability enhancement.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing error handling | Low | High | Add tests before changes |
| HTML detection false positives | Low | Medium | Check content-type header, not body |
| Performance impact from extra checks | Low | Low | Checks are O(1) string operations |

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| PiOrchestrator 029+ | External | Must be deployed for V1 routes on 8082 |
| Zod 3.x | Existing | Already in project |
| shadcn/ui Alert | Existing | Already used by ErrorDisplay |

## Verification Checklist

### Pre-Implementation

- [x] Research complete (research.md)
- [x] Data model documented (data-model.md)
- [x] Contracts defined (contracts/)
- [x] Quickstart written (quickstart.md)

### Post-Implementation (after /speckit.tasks)

- [ ] API client adds Accept header
- [ ] HTML fallback detected and surfaced
- [ ] Endpoint shown in error display
- [ ] Debug info copyable
- [ ] Device list shows 4 distinct states
- [ ] Smoke test passes
- [ ] All tests pass
- [ ] No new lint errors

## Estimated Effort

| Phase | Files Changed | New Tests | Effort |
|-------|---------------|-----------|--------|
| 1. API Client | 2 | 3 | Small |
| 2. Error Display | 1 | 3 | Small |
| 3. Device List | 1 | 4 | Medium |
| 4. Smoke Test | 1 (new) | 1 | Small |
| **Total** | **5** | **11** | **~2-3 hours** |

## Next Steps

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Implement in phase order (API → Display → DeviceList → Smoke)
3. Run smoke test on Pi to verify
4. Create completion handoff document
