# Quickstart: Live Dashboard Inventory Validation

**Feature**: 054-live-dashboard-inventory-validation
**Date**: 2026-02-17

## What This Feature Does

Adds an opt-in live E2E test suite that validates the inventory delta correction workflow against a real BridgeServer-backed deployment. Default CI is unaffected.

## Prerequisites

- Node.js 22+
- Playwright 1.57.0 (installed via `npm ci`)
- Nix flake (for Playwright browsers on NixOS): `nix develop`
- A reachable PiDashboard + BridgeServer deployment with inventory data

## Quick Start

### Run Deterministic Tests (default, always works)

```bash
# Unit/component/contract tests
VITEST_MAX_WORKERS=1 npm test

# E2E tests with mocks
PLAYWRIGHT_WORKERS=1 npx playwright test --project=chromium
```

### Run Live Tests (requires real backend)

```bash
# Against Tailscale Funnel URL (default)
LIVE_E2E=1 PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory

# Against a specific URL
LIVE_E2E=1 LIVE_BASE_URL=http://192.168.1.124:8082 \
  PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory

# Target a specific container
LIVE_E2E=1 LIVE_TEST_CONTAINER_ID=550e8400-e29b-41d4-a716-446655440001 \
  PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory
```

### Verify CI Isolation

```bash
# Without LIVE_E2E — all live tests SKIP
npx playwright test --project=chromium tests/e2e/live-inventory-correction.spec.ts
# Expected: all tests skipped, 0 failures
```

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `LIVE_E2E` | Yes (for live tests) | unset | Set to `1` to enable live tests |
| `LIVE_BASE_URL` | No | `https://raspberrypi.tail345cd5.ts.net` | Target deployment URL |
| `LIVE_TEST_CONTAINER_ID` | No | first available | Specific container ID to test |
| `PLAYWRIGHT_WORKERS` | No | 50% CPUs | Recommend `1` for live tests |

## File Layout

```
tests/e2e/
├── live-inventory-correction.spec.ts  # Live E2E tests
└── fixtures/
    └── live-preflight.ts              # Preflight check utility

docs/runbooks/
└── live-validation-inventory.md       # Operator deploy checklist

playwright.config.ts                   # live-inventory project (conditional)
.github/workflows/test.yml             # live-e2e job (manual trigger)
```

## How Preflight Works

Before any live test runs:

1. Check `LIVE_E2E` env var → SKIP if not set
2. Probe `GET /api/v1/containers` → SKIP if unreachable, 404, or 503
3. Check container list → SKIP if empty
4. Probe `GET /api/v1/containers/{id}/inventory/latest` → SKIP if no data
5. All checks pass → tests proceed

Each skip produces a human-readable reason in Playwright output.

## Interpreting Results

| Result | Meaning | Action |
|--------|---------|--------|
| All PASS | Live stack works end-to-end | Deploy is valid |
| All SKIP | Backend not available | Check URLs, ensure services are running |
| Some FAIL | Issue with live deployment | Check screenshots in `test-results/`, review traces |
| Mix PASS/SKIP | Partial data available | Some containers have data, others don't |

## Troubleshooting

**"Backend unreachable"**: Check that the deployment URL is correct and the service is running. For Tailscale Funnel, verify with `ssh pi "sudo tailscale funnel status"`.

**"No inventory data"**: The container has no analysis runs. Trigger an inventory scan through the normal workflow first.

**"Delta already reviewed" (409)**: The live test container's latest delta was already reviewed. Need fresh analysis data.

**"Schema validation error"**: BridgeServer contract has changed. Update PiDashboard schemas to match.
