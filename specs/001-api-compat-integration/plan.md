# Implementation Plan: API Compatibility Integration (028)

**Branch**: `001-api-compat-integration` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-api-compat-integration/spec.md`

## Summary

Integrate PiDashboard with PiOrchestrator's 028-dashboard-api-compat fixes. The core implementation is complete; this plan covers verification testing, any missing test coverage, and an optional API self-test developer tool.

**Key Insight**: Per the spec's "Implementation Status" section, all major components are already implemented:
- Centralized API routes (`routes.ts`)
- Normalization utilities (`normalize.ts`)
- V1 API client with envelope unwrapping
- ErrorDisplay with retry countdown and correlation ID copy
- Defensive array handling in all relevant hooks

## Technical Context

**Language/Version**: TypeScript ~5.9.3, React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zustand 5.x, Zod 3.x, Radix UI
**Storage**: N/A (API proxied to PiOrchestrator Go backend)
**Testing**: Vitest (unit/integration), Playwright (E2E), MSW (mocking)
**Target Platform**: Web browser (served from Raspberry Pi via PiOrchestrator)
**Project Type**: Single frontend (React SPA)
**Performance Goals**: Error display <100ms after API failure, no visible jank on empty state render
**Constraints**: Must work offline-capable (graceful degradation), runs on constrained Pi hardware
**Scale/Scope**: Dashboard for single Pi device, 14 V1 API endpoints, 1 SSE event stream

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Note**: Constitution file is template-only (not yet customized for this project). Applying general software engineering principles:

| Gate | Status | Notes |
|------|--------|-------|
| Test Coverage | PASS | normalize.ts has 50+ unit tests |
| Defensive Programming | PASS | All hooks use ensureArray() |
| Error Handling | PASS | V1ApiError with user-friendly messages |
| Documentation | PASS | INTEGRATION_028_SUMMARY.md exists |

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/001-api-compat-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal - mostly implemented)
├── data-model.md        # Phase 1 output (types already exist)
├── quickstart.md        # Phase 1 output (verification guide)
├── contracts/           # Phase 1 output (API contract reference)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── domain/types/           # Entity type definitions
├── application/hooks/      # React Query hooks with defensive normalization
├── infrastructure/api/     # API client, routes, errors, schemas
├── presentation/components/common/  # ErrorDisplay, ErrorBoundary
└── lib/                    # normalize.ts utilities

tests/
├── unit/lib/              # normalize.test.ts (50+ tests)
├── component/             # UI component tests
├── integration/           # Hook integration tests, contract tests
└── e2e/                   # Playwright E2E tests
```

**Structure Decision**: Existing hexagonal architecture (domain/application/infrastructure/presentation) is maintained. No structural changes needed.

## Complexity Tracking

> **No violations to justify.** Feature uses existing patterns and infrastructure.

---

## Phase 0: Research Summary

Since the implementation is largely complete, research focuses on verification gaps.

### R1: Verification Test Coverage

**Question**: What tests verify the 028 integration end-to-end?

**Findings**:
- `tests/unit/lib/normalize.test.ts` - 50+ unit tests for normalization
- `tests/integration/hooks/useDevices.test.tsx` - Hooks with MSW mocking
- `docs/INTEGRATION_028_SUMMARY.md` - Manual verification checklist
- No automated E2E test specifically for empty state + retry UX

**Decision**: Add E2E smoke test for empty state rendering and retry countdown.

### R2: API Contract Alignment

**Question**: Are all 14 V1 endpoints correctly mapped in routes.ts?

**Findings**: Reviewed `src/infrastructure/api/routes.ts` against `docs/HANDOFF_028_API_COMPAT_COMPLETE.md`:
- 13 V1 provisioning endpoints + 1 health check = 14 dashboard-relevant endpoints mapped
- All paths use correct `/api/v1/` prefix via v1-client.ts
- `getSSEEndpoint()` helper correctly builds SSE URL
- PiOrchestrator smoke test covers 16 total endpoints (includes WiFi/system endpoints not used by provisioning)

**Decision**: Route mapping is complete. All dashboard-relevant endpoints are correctly mapped.

### R3: Error Code Coverage

**Question**: Does errors.ts cover all backend error codes?

**Findings**: Reviewed error registry against handoff:
- All documented error codes have user-friendly messages
- Retry-related fields (`retryable`, `retry_after_seconds`) are parsed
- ErrorDisplay component handles countdown correctly

**Decision**: Error handling is complete. No changes needed.

---

## Phase 1: Design Artifacts

### Data Model

See `data-model.md` for entity definitions extracted from existing types.

### API Contracts

See `contracts/` directory for endpoint reference extracted from handoff.

### Quickstart Guide

See `quickstart.md` for verification testing guide.

---

## Implementation Tasks Preview

Since most work is complete, remaining tasks focus on verification:

1. **T001**: Run empty state verification (manual or E2E)
2. **T002**: Run error UX verification (retry countdown, correlation ID)
3. **T003**: Run PiOrchestrator smoke test (16/16 endpoints)
4. **T004**: Optional - Create API self-test screen component
5. **T005**: Update spec status to "Verified" after testing passes
