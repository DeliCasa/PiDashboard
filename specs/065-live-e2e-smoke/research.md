# Research: Live E2E Smoke Tests

**Feature**: 065-live-e2e-smoke
**Date**: 2026-03-08

## R1: Can existing operations/rpc-smoke tests run against live endpoints?

**Decision**: No — new live-specific test files are required.

**Rationale**: `operations.spec.ts` and `rpc-smoke.spec.ts` use the `mockedPage` fixture from `tests/e2e/fixtures/test-base.ts`, which applies `applyDefaultMocks(page)` and `applyDefaultRpcMocks(page)` before every test. These mocks intercept all `/api/*` and `/rpc/*` requests at the Playwright level, preventing real API calls. The tests are structurally coupled to mock data via their fixture signatures (`{ mockedPage, ... }`).

**Alternatives considered**:
1. **Conditionally skip mocking in `mockedPage` fixture** — Rejected. Would require changing the fixture behavior based on env vars, risking subtle breakage in all 130+ existing E2E tests. The fixture contract is "page with mocks applied" — changing that violates expectations.
2. **Create a second fixture `livePage`** — Rejected as over-engineering. A simpler approach is to create dedicated live test files that use the standard `page` fixture (no mocks) following the existing `live-smoke.spec.ts` pattern.
3. **New live test files** — Selected. Create `live-rpc-smoke.spec.ts` that tests the same RPC flows (sessions, evidence, cameras) against real endpoints using pre-flight checks. This follows the established pattern from `live-smoke.spec.ts` (Feature 044).

## R2: Existing live testing infrastructure

**Decision**: Leverage the existing `live-pi` Playwright project and `LIVE_PI_URL` env var.

**Rationale**: `playwright.config.ts` already defines a conditional `live-pi` project that:
- Activates only when `LIVE_PI_URL` is set
- Matches `**/live-smoke.spec.ts` pattern
- Disables the Vite web server (tests hit real endpoints directly)
- Uses `LIVE_PI_URL` as `baseURL`

The only change needed is widening the `testMatch` pattern to also include the new `live-rpc-smoke.spec.ts`.

## R3: RPC endpoint access from dev machine

**Decision**: SSH tunnel is the primary access method; Tailscale Funnel is the backup.

**Rationale**:
- RPC endpoints are on port 8081 (`/rpc/delicasa.device.v1.*`), but the dashboard (port 8082) proxies RPC requests to 8081 internally.
- `live-smoke.spec.ts` uses `LIVE_PI_URL` which points to port 8082 — the dashboard serves both the UI and proxies API/RPC calls.
- SSH tunnel: `ssh -L 8082:localhost:8082 pi` — simple, reliable, already documented.
- Tailscale: `https://raspberrypi.tail345cd5.ts.net` — public, no tunnel needed, but depends on Funnel being active.

## R4: Evidence artifact strategy

**Decision**: Screenshots + JSON summary committed; traces excluded from git.

**Rationale**:
- Playwright generates screenshots (PNG, ~50-200KB each) and traces (ZIP, 5-50MB each).
- Screenshots are small enough to commit and provide visual proof.
- Traces are too large for git — add to `.gitignore`.
- A `RESULTS.md` summary document provides the human-readable evidence record.

## R5: Test match pattern for live-pi project

**Decision**: Change `testMatch` from `**/live-smoke.spec.ts` to `**/live-*.spec.ts`.

**Rationale**: This glob catches both the existing `live-smoke.spec.ts` and the new `live-rpc-smoke.spec.ts` without needing an array of patterns. Any future live test files following the `live-*.spec.ts` naming convention will automatically be included.
