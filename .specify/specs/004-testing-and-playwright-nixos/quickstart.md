# Quick Start: Testing PiDashboard

**Feature ID**: 004-testing-and-playwright-nixos
**Created**: 2026-01-07

---

## Prerequisites

- NixOS or Nix package manager installed
- Git repository cloned

---

## First Time Setup

```bash
# Enter the Nix development shell
nix develop

# Install npm dependencies
npm install

# Verify Playwright browsers are available
echo $PLAYWRIGHT_BROWSERS_PATH
# Should output: /nix/store/...-playwright-driver-browsers-1.56.1

# Run all tests to verify setup
npm run test:all
```

---

## Daily Development Commands

### Unit & Component Tests (Fast)

```bash
# Run all unit and component tests once
npm run test

# Watch mode (re-run on file changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Interactive UI mode
npm run test:ui
```

### Integration Tests

```bash
# Run integration tests with MSW mocking
npm run test:integration

# Run specific integration test
npm run test:integration -- useWifi
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through)
npm run test:e2e:debug

# Run specific E2E test file
npm run test:e2e -- wifi.spec.ts

# View HTML report after run
npm run test:e2e:report
```

### All Tests

```bash
# Run complete test suite
npm run test:all

# CI mode (with coverage and all layers)
npm run test:ci
```

---

## Live Pi Testing (Optional)

For testing against a real PiOrchestrator:

```bash
# Set the Pi URL and run smoke tests
LIVE_PI_URL=http://192.168.1.124:8082 npm run test:e2e:live

# Or via environment file
echo "LIVE_PI_URL=http://192.168.1.124:8082" > .env.test.local
npm run test:e2e:live
```

**Note**: Live tests only run non-destructive read operations.

---

## Test File Locations

```
tests/
├── unit/                     # Pure function tests
│   └── api/*.test.ts         # API transformation tests
├── component/                # React component tests
│   └── *.test.tsx
├── integration/              # Hooks + MSW tests
│   ├── hooks/*.test.tsx
│   └── mocks/handlers.ts     # MSW handlers
├── e2e/                      # Playwright tests
│   ├── *.spec.ts
│   └── fixtures/
└── setup/
    ├── vitest.setup.ts       # Unit/component setup
    └── test-utils.tsx        # Custom render function
```

---

## Writing New Tests

### Unit Test Template

```typescript
// tests/unit/api/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/infrastructure/api/example';

describe('myFunction', () => {
  it('handles expected input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(myFunction('')).toBe('default');
  });
});
```

### Component Test Template

```typescript
// tests/component/example/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../setup/test-utils';
import { MyComponent } from '@/presentation/components/example/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Integration Test Template

```typescript
// tests/integration/hooks/useExample.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';
import { useExample } from '@/application/hooks/useExample';
import { createWrapper } from '../setup/test-utils';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useExample', () => {
  it('fetches and transforms data', async () => {
    const { result } = renderHook(() => useExample(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

### E2E Test Template

```typescript
// tests/e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Example Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/example', (route) =>
      route.fulfill({ json: { data: 'mocked' } })
    );
  });

  test('completes flow successfully', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start/i }).click();
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

---

## Debugging Failed Tests

### View Playwright Traces

```bash
# After a failed run
npx playwright show-trace test-results/*/trace.zip
```

### Run Single Test in Debug Mode

```bash
# Vitest
npm run test -- --run wifi.test.ts

# Playwright
npm run test:e2e:debug -- wifi.spec.ts
```

### Check Coverage Gaps

```bash
npm run test:coverage
open coverage/index.html
```

---

## CI Integration

Tests run automatically on:
- Every push to `main` or `dev` branches
- Every pull request targeting `main`

### CI Commands (for reference)

```bash
# What CI runs:
nix develop --command npm ci
nix develop --command npm run test:coverage
nix develop --command npm run test:e2e
```

---

## Troubleshooting

### "Browser not found" error

```bash
# Ensure you're in the Nix shell
nix develop

# Verify environment variable
echo $PLAYWRIGHT_BROWSERS_PATH
```

### "Cannot find module" errors

```bash
# Rebuild node_modules
rm -rf node_modules
npm install
```

### Flaky E2E tests

1. Check for timing issues (use `waitFor` assertions)
2. Ensure mock routes are set before navigation
3. Use fixed viewport (1280x720)

---

## npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run test` | Run unit + component tests once |
| `npm run test:watch` | Watch mode for fast feedback |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:ui` | Interactive test UI |
| `npm run test:integration` | Run integration tests with MSW |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:headed` | E2E with visible browser |
| `npm run test:e2e:debug` | E2E with debugger |
| `npm run test:e2e:report` | Open HTML report |
| `npm run test:e2e:live` | Live Pi smoke tests |
| `npm run test:all` | Run all test layers |
| `npm run test:ci` | Full CI test suite |
