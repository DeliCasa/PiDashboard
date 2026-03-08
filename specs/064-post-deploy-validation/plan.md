# Implementation Plan: Post-Deploy Validation Suite

**Branch**: `064-post-deploy-validation` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/064-post-deploy-validation/spec.md`

## Summary

Add a post-deploy validation suite ensuring PiDashboard remains stable under Connect RPC. The critical gap: after features 062–063 migrated cameras, sessions, and evidence from REST to Connect RPC, **zero E2E tests mock `/rpc/...` endpoints**. Existing tests pass incidentally via graceful degradation fallbacks, meaning success paths are unverified. This plan addresses: (A) E2E smoke tests with Playwright RPC mocking using wire testing factories, (B) transport regression test improvements to import the real module, (C) audit/confirm proto-safe fixtures in MSW handlers, and (D) a testing runbook.

## Technical Context

**Language/Version**: TypeScript ~5.9.3
**Primary Dependencies**: React 19.2.0, TanStack React Query 5.x, @connectrpc/connect-web ^2.1.x, @delicasa/wire 0.5.0, Vitest 3.2.4, Playwright 1.57.0, MSW 2.x
**Storage**: N/A (test infrastructure only)
**Testing**: Vitest (unit/integration), Playwright (E2E), MSW (API mocking)
**Target Platform**: Web (Chromium for E2E, Node.js/jsdom for unit)
**Project Type**: Single frontend app (test infrastructure addition)
**Performance Goals**: E2E smoke suite < 60s on CI (single Chromium worker)
**Constraints**: 50% CPU cap for test parallelism, VITEST_MAX_WORKERS=1 for CI, PLAYWRIGHT_WORKERS=1 for CI
**Scale/Scope**: ~5 new/modified test files, 1 documentation file, 0 production code changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hexagonal Architecture | PASS | No production code changes. Test files follow existing layer conventions. |
| II. Contract-First API | PASS | E2E mocks use wire testing factory response envelopes that conform to proto schema. |
| II.B Enum Synchronization | PASS | Wire factories produce correct proto3 enum strings. No manual enum values in new code. |
| III. Test Discipline | PASS | This feature _is_ test discipline — adds missing E2E coverage for RPC flows. |
| III. Resource Constraints | PASS | All tests configured for 50% CPU cap; CI uses single worker. |
| IV. Simplicity & YAGNI | PASS | No new abstractions — reuses existing `mockEndpoint` pattern and wire factories. |

**Post-Phase 1 re-check**: All gates still pass. No production code changes, no new patterns, no complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/064-post-deploy-validation/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: test artifact structures
├── quickstart.md        # Phase 1: development quickstart
├── contracts/
│   └── rpc-e2e-mock-contract.md  # RPC endpoint mock contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
tests/
├── e2e/
│   ├── rpc-smoke.spec.ts              # NEW: E2E smoke tests for RPC device flows
│   └── fixtures/
│       ├── test-base.ts               # MODIFY: Add RPC mocks to applyDefaultMocks
│       └── rpc-mocks.ts              # NEW: Playwright RPC mock helpers using wire factories
├── unit/
│   └── rpc/
│       └── transport.test.ts          # MODIFY: Import real transport module instead of replicating
docs/
└── TESTING_RUNBOOK.md                 # NEW: How to run smoke suite locally vs CI
```

**Structure Decision**: Single frontend app. All changes are test infrastructure — no new production directories or layers. New E2E test file follows existing pattern (`tests/e2e/*.spec.ts`). New fixture file follows existing pattern (`tests/e2e/fixtures/*.ts`). Runbook goes in `docs/` per spec assumption.

## Implementation Phases

### Phase A: RPC Mock Infrastructure (Foundation)

**Goal**: Create reusable Playwright helpers for mocking Connect RPC endpoints.

**File: `tests/e2e/fixtures/rpc-mocks.ts`** (NEW)

Create helper functions that wrap `page.route()` for RPC endpoints:

- `mockRpcEndpoint(page, service, method, responseFactory, overrides?)` — generic helper matching `**/rpc/delicasa.device.v1.{service}/{method}` and returning `JSON.stringify(factory(overrides))` with `Content-Type: application/json`
- `mockRpcError(page, service, method, code, message, status?)` — returns Connect error envelope
- `applyDefaultRpcMocks(page)` — registers empty/safe defaults for all 7 RPC endpoints:
  - ListSessions → empty sessions
  - ListCameras → empty cameras
  - GetSession → 404
  - GetSessionEvidence → 404
  - GetEvidencePair → 404
  - GetCamera → 404
  - CaptureImage → 404

**File: `tests/e2e/fixtures/test-base.ts`** (MODIFY)

Add `applyDefaultRpcMocks(page)` call inside `applyDefaultMocks()` so all E2E tests get baseline RPC coverage. This prevents unmocked RPC requests from causing unexpected test behavior.

### Phase B: E2E Smoke Tests (Core Value)

**Goal**: E2E tests proving sessions, evidence, and cameras render correctly via RPC.

**File: `tests/e2e/rpc-smoke.spec.ts`** (NEW)

Test groups:

1. **Sessions smoke** (Operations tab)
   - List sessions: Mock `ListSessions` with 2-3 sessions → verify session cards render with status, timestamps, container IDs
   - Session detail: Mock `GetSession` + `GetSessionEvidence` → click session → verify detail view with evidence captures
   - Evidence pairs: Mock `GetEvidencePair` → verify before/after display with capture tags and status

2. **Cameras smoke** (Cameras tab or Operations tab camera health)
   - List cameras: Mock `ListCameras` with 2 cameras (online + offline) → verify camera cards with health metrics
   - Camera health: Verify RSSI, uptime, free heap display for online camera

3. **Graceful degradation**
   - Sessions unavailable: Mock `ListSessions` with 503 → verify error state, no console errors
   - Cameras unavailable: Mock `ListCameras` with 503 → verify fallback UI
   - Mixed: Sessions succeed, cameras fail → verify partial rendering

Each test uses `mockedPage` fixture, overrides default RPC mocks with scenario-specific data, navigates to appropriate tab, and asserts via `data-testid` selectors.

### Phase C: Transport Regression Tests (Enhancement)

**Goal**: Ensure transport unit tests import the real module, not a replica.

**File: `tests/unit/rpc/transport.test.ts`** (MODIFY)

- Extract the custom fetch function from `transport.ts` as a named export (or test the transport's fetch behavior indirectly)
- If the fetch wrapper is not directly exportable (it's inline in `createConnectTransport`), keep the current approach but add a comment explaining why, and add an integration-level test that verifies MSW intercepts a real Connect client request
- Verify existing 4 test cases still pass: AbortSignal stripping, pass-through, late-binding, undefined init
- Add test: verify `useBinaryFormat: false` configuration (JSON mode)

### Phase D: Proto-Safe Fixture Audit (Verification)

**Goal**: Confirm MSW RPC handlers use wire factories. Document findings.

Research confirmed `tests/mocks/handlers/rpc.ts` is already fully migrated:
- All 5 domain object factories imported and used
- All happy-path responses route through adapter functions calling wire factories
- Error handlers produce correct Connect error envelopes

**Action**: No code changes needed. Add a brief note to the testing runbook documenting that RPC handlers use `@delicasa/wire/testing` factories and should not be hand-crafted.

### Phase E: Testing Runbook (Documentation)

**Goal**: Create `docs/TESTING_RUNBOOK.md` with instructions for running smoke suite.

Sections:
1. **Overview**: What the validation suite covers and why it exists
2. **Prerequisites**: Node.js 22, Nix shell (NixOS), npm
3. **Local Setup**: SSH tunnel for live testing, `npm run dev`, running E2E against dev server
4. **Running Tests**:
   - Unit tests (transport): `VITEST_MAX_WORKERS=1 npx vitest run tests/unit/rpc/`
   - E2E smoke: `PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/rpc-smoke.spec.ts --project=chromium`
   - Full suite: `npm run test:all`
5. **CI Integration**: How smoke tests fit in PR workflow (`.github/workflows/test.yml`)
6. **Troubleshooting**: Common failures — transport errors, mock mismatches, timeouts, MSW escapes
7. **Fixture Conventions**: RPC handlers use wire factories, enum format expectations, timestamp format

## Dependency Graph

```
Phase A (RPC mock infra)
  ↓
Phase B (E2E smoke tests)  ←  depends on Phase A

Phase C (Transport tests)     independent
Phase D (Fixture audit)       independent

Phase E (Runbook)          ←  depends on B, C, D (documents all findings)
```

Phases A→B are sequential. C and D can run in parallel with A. E comes last.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing E2E tests break when RPC default mocks are added to `applyDefaultMocks` | High | Run full E2E suite after Phase A; default mocks return empty/404 which matches current unmocked behavior |
| Transport fetch wrapper not exportable for direct testing | Low | Keep replicated approach with comment; add integration-level verification |
| Wire factory output format changes in future versions | Low | Factory dependency means tests auto-update; version pinned in package.json |
| E2E smoke tests flaky due to timing | Medium | Use Playwright `waitForSelector` patterns, avoid hard timeouts |

## Complexity Tracking

> No constitution violations. No complexity justifications needed.
