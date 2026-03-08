# Quickstart: Post-Deploy Validation Suite

**Feature**: 064-post-deploy-validation
**Branch**: `064-post-deploy-validation`

## Prerequisites

- Node.js 22+
- npm (project uses npm, not pnpm)
- Nix development shell (for Playwright browsers on NixOS)

## Setup

```bash
# 1. Checkout the feature branch
git checkout 064-post-deploy-validation

# 2. Install dependencies
npm install

# 3. Enter Nix shell (NixOS only — sets PLAYWRIGHT_BROWSERS_PATH)
nix develop
```

## Running Tests

### Unit Tests (Transport Regression)

```bash
# Run transport tests only
VITEST_MAX_WORKERS=1 npx vitest run tests/unit/rpc/transport.test.ts

# Run all unit tests
VITEST_MAX_WORKERS=1 npm test
```

### E2E Smoke Tests

```bash
# Run RPC smoke tests only
PLAYWRIGHT_WORKERS=1 npx playwright test tests/e2e/rpc-smoke.spec.ts --project=chromium

# Run all E2E tests
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```

### Full Validation

```bash
# All tests (unit + component + integration + E2E)
npm run test:all
```

## Key Files

| File | Purpose |
|------|---------|
| `tests/e2e/rpc-smoke.spec.ts` | E2E smoke tests for session/evidence/camera RPC flows |
| `tests/e2e/fixtures/rpc-mocks.ts` | Playwright helpers for mocking Connect RPC endpoints |
| `tests/unit/rpc/transport.test.ts` | Transport layer regression tests |
| `docs/TESTING_RUNBOOK.md` | Full testing runbook documentation |

## Development Workflow

1. Start with transport regression tests (fastest feedback loop)
2. Add RPC mock helpers to E2E fixture
3. Write E2E smoke tests using the mock helpers
4. Verify all existing tests still pass
5. Write the testing runbook
