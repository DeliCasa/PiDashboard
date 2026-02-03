# CI/CD Guide

This guide explains how to run the same checks locally that CI runs, and how to troubleshoot CI failures.

## CI Workflow Overview

The project uses two GitHub Actions workflows:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Test** (`.github/workflows/test.yml`) | Push to main/dev, PRs | Fast PR checks |
| **Nightly** (`.github/workflows/nightly.yml`) | Scheduled | Full browser matrix |

## Running CI Checks Locally

### Quick Validation (Essential Checks)

Run these before pushing:

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Unit + integration tests
npm test

# Build (also validates bundle size)
npm run build
```

### Full CI Equivalent

To replicate the complete CI pipeline locally:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Unit/component tests
npm test

# 4. Contract tests (API schema validation)
npm test -- --run --grep "contract"

# 5. Build
npm run build

# 6. Coverage (70% threshold)
npm run test:coverage

# 7. E2E smoke tests (requires Nix or Playwright browsers)
npm run test:e2e
```

### E2E Tests with Nix

The project uses Nix flake for reproducible Playwright browser management:

```bash
# Enter Nix shell (sets PLAYWRIGHT_BROWSERS_PATH)
nix develop

# Run E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/smoke.spec.ts --project=chromium
```

Without Nix, install browsers manually:

```bash
npx playwright install chromium
npm run test:e2e
```

## CI Jobs Breakdown

| Job | Command | Threshold | Blocks Merge? |
|-----|---------|-----------|---------------|
| Unit & Component Tests | `npm test` | All pass | Yes |
| Contract Tests | `npm test -- --grep "contract"` | All pass | Yes |
| Lint | `npm run lint` | No errors | Yes |
| Type Check | `npx tsc --noEmit` | No errors | Yes |
| Coverage | `npm run test:coverage` | 70% | Yes |
| Bundle Size | `npm run build` | 500KB warning | No (warning only) |
| E2E Smoke | `npx playwright test --project=chromium` | All pass | Yes |
| Security Audit | `npm audit --audit-level=high` | N/A | No (report only) |

## Troubleshooting Common CI Failures

### Test Failures

```bash
# Run specific failing test
npm test -- --run tests/path/to/failing.test.ts

# Run with verbose output
npm test -- --run --reporter=verbose

# Run in watch mode for debugging
npm test -- tests/path/to/failing.test.ts
```

### Import/Export Errors

If you see `is not a function` or `is not exported` errors:

1. Check the source file's exports match what tests import
2. Check barrel files (`index.ts`) re-export correctly
3. Ensure path aliases (`@/`) resolve correctly

Example fix (from this codebase):
```typescript
// Wrong: importing from component that doesn't export these
import { Component, helperFn } from '@/components/MyComponent';

// Correct: import from the actual source
import { Component } from '@/components/MyComponent';
import { helperFn } from '@/lib/utils';
```

### TypeScript Errors

```bash
# Check for type errors
npx tsc --noEmit

# With more verbose output
npx tsc --noEmit --pretty
```

### Lint Errors

```bash
# Auto-fix what's possible
npm run lint -- --fix

# Check specific file
npx eslint src/path/to/file.ts
```

### E2E Test Failures

```bash
# Run with headed browser for debugging
npx playwright test --headed --project=chromium

# Run specific test with debug
npx playwright test tests/e2e/smoke.spec.ts --debug

# View test report
npx playwright show-report
```

### Bundle Size Issues

The bundle size check warns (doesn't fail) if main bundle exceeds 500KB:

```bash
# Check bundle size after build
npm run build
ls -la dist/assets/*.js
```

To reduce bundle size:
- Use dynamic imports for large dependencies
- Check for duplicate dependencies
- Review `build.rollupOptions.output.manualChunks` in vite.config.ts

## Pre-Commit Checklist

Before creating a PR:

- [ ] `npx tsc --noEmit` - No type errors
- [ ] `npm run lint` - No lint errors
- [ ] `npm test` - All tests pass
- [ ] `npm run build` - Build succeeds
- [ ] Tests for new code added

## CI Environment Details

| Setting | Value |
|---------|-------|
| Node.js | 22.x |
| npm | Latest with Node 22 |
| OS | Ubuntu Latest |
| Browsers | Chromium (via Nix flake) |

## Concurrency

CI cancels in-progress runs for the same branch to save resources:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
