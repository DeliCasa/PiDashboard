# Implementation Plan: Testing Strategy & Playwright on NixOS

**Feature ID**: 004-testing-and-playwright-nixos
**Status**: Ready for Implementation
**Created**: 2026-01-07
**Author**: Claude Code

---

## Technical Context

| Aspect | Current State | Target State |
|--------|---------------|--------------|
| Test Runner | None | Vitest 3.2.4 with jsdom |
| E2E Framework | None | Playwright 1.56.1 (synced with nixpkgs) |
| API Mocking | None | MSW 2.8.x |
| Coverage Tool | None | V8 via Vitest |
| Nix Environment | None | flake.nix with playwright-driver.browsers |
| CI Platform | None | GitHub Actions with Nix |

### Dependencies to Add

```json
{
  "devDependencies": {
    "@playwright/test": "1.56.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.6.1",
    "msw": "^2.8.0",
    "vitest": "^3.2.4",
    "@vitest/coverage-v8": "^3.2.4",
    "jsdom": "^26.1.0"
  }
}
```

---

## Constitution Check

| Principle | Requirement | Plan Compliance |
|-----------|-------------|-----------------|
| **Testing Discipline** | Unit tests for utilities/hooks | ✅ Unit tests for all API transformation functions |
| **Testing Discipline** | Component tests for interactions | ✅ Component tests for critical UI components |
| **Testing Discipline** | Integration tests for API | ✅ MSW-based integration tests for hooks |
| **Testing Discipline** | E2E for critical flows | ✅ Playwright tests for WiFi, system, config flows |
| **Testing Discipline** | >70% coverage | ✅ Target 70% minimum, 100% for bug areas |
| **Code Quality** | TypeScript strict mode | ✅ Test files use strict TypeScript |
| **Maintainability** | Service layer abstraction | ✅ Tests organized by layer (unit/component/integration/e2e) |
| **Maintainability** | Storybook stories | ⏸️ Deferred to separate feature (out of scope for testing infra) |
| **Security** | npm audit | ✅ Added T057 for security audit verification |
| **Documentation** | README with commands | ✅ quickstart.md with all test commands |

**Gate Status**: ✅ All in-scope principles satisfied (Storybook explicitly deferred)

---

## Gate Evaluation

### Pre-Implementation Gates

| Gate | Status | Evidence |
|------|--------|----------|
| Spec complete | ✅ | `spec.md` created with acceptance criteria |
| TBDs resolved | ✅ | `research.md` resolves all 4 TBDs |
| Constitution compliant | ✅ | See Constitution Check above |
| Dependencies available | ✅ | All packages exist on npm |
| NixOS compatible | ✅ | `playwright-driver` v1.56.1 in nixpkgs |

### Post-Implementation Gates

| Gate | Verification |
|------|--------------|
| Tests pass locally | `nix develop --command npm run test:all` |
| Tests pass in CI | GitHub Actions workflow green |
| Coverage ≥70% | `npm run test:coverage` shows ≥70% |
| E2E runs on NixOS | `nix develop --command npm run test:e2e` |
| No /opt/google/chrome | `grep -r "/opt/google" tests/` returns nothing |

---

## Implementation Phases

### Phase 1: Nix Development Environment (1-2 files)

**Goal**: Enable reproducible development with Playwright browsers via Nix

**Files to Create**:
1. `flake.nix` - Nix flake with devShell
2. `.envrc` - direnv integration (optional)

**Implementation**:
```nix
# flake.nix
{
  description = "PiDashboard development environment";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            playwright-driver.browsers
          ];
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
          '';
        };
      });
}
```

**Verification**:
```bash
nix develop
echo $PLAYWRIGHT_BROWSERS_PATH  # Should show /nix/store/...
```

---

### Phase 2: Vitest Setup (3-4 files)

**Goal**: Configure test runner for unit and component tests

**Files to Create**:
1. `vitest.config.ts` - Vitest configuration
2. `tests/setup/vitest.setup.ts` - Global test setup
3. `tests/setup/test-utils.tsx` - Custom render with providers

**Configuration**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/component/**/*.test.tsx',
      'tests/integration/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/**',
        'src/components/ui/**',
        '**/*.d.ts',
        '**/types/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Scripts to Add**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

### Phase 3: Unit Tests for API Transformations (6-8 files)

**Goal**: Test all API response transformation functions

**Priority Files** (from known bug areas):
1. `tests/unit/api/wifi.test.ts` - `mapSecurityToEncryption`, `transformNetwork`
2. `tests/unit/api/logs.test.ts` - Log response transformation
3. `tests/unit/api/network.test.ts` - Network field mapping
4. `tests/unit/api/config.test.ts` - `mapSectionToCategory`, nested→flat
5. `tests/unit/api/system.test.ts` - System info transformation

**Example Test**:
```typescript
// tests/unit/api/wifi.test.ts
import { describe, it, expect } from 'vitest';
import { mapSecurityToEncryption, transformNetwork } from '@/infrastructure/api/wifi';

describe('mapSecurityToEncryption', () => {
  it('maps WPA2 to wpa2', () => {
    expect(mapSecurityToEncryption('WPA2')).toBe('wpa2');
  });

  it('maps Open to open', () => {
    expect(mapSecurityToEncryption('Open')).toBe('open');
  });

  it('handles case insensitivity', () => {
    expect(mapSecurityToEncryption('wpa2')).toBe('wpa2');
    expect(mapSecurityToEncryption('OPEN')).toBe('open');
  });
});

describe('transformNetwork', () => {
  it('transforms backend response to frontend format', () => {
    const backend = {
      ssid: 'TestNetwork',
      signal: -45,
      security: 'WPA2',
      bssid: '00:11:22:33:44:55',
    };

    const result = transformNetwork(backend);

    expect(result).toEqual({
      ssid: 'TestNetwork',
      signal: -45,
      secured: true,
      encryption: 'wpa2',
      bssid: '00:11:22:33:44:55',
      channel: undefined,
    });
  });

  it('marks open networks as unsecured', () => {
    const backend = { ssid: 'OpenNetwork', signal: -60, security: 'Open' };
    const result = transformNetwork(backend);

    expect(result.secured).toBe(false);
    expect(result.encryption).toBe('open');
  });
});
```

---

### Phase 4: MSW Setup and Integration Tests (5-7 files)

**Goal**: Test React Query hooks with mocked API responses

**Files to Create**:
1. `tests/integration/mocks/handlers.ts` - MSW request handlers
2. `tests/integration/mocks/server.ts` - MSW server setup
3. `tests/integration/hooks/useWifi.test.tsx`
4. `tests/integration/hooks/useSystemStatus.test.tsx`
5. `tests/integration/hooks/useConfig.test.tsx`
6. `tests/integration/hooks/useDoor.test.tsx`
7. `tests/integration/hooks/useLogs.test.tsx`

**MSW Handler Example**:
```typescript
// tests/integration/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/wifi/scan', () => {
    return HttpResponse.json({
      success: true,
      count: 2,
      networks: [
        { ssid: 'HomeNetwork', signal: -45, security: 'WPA2' },
        { ssid: 'GuestNetwork', signal: -70, security: 'Open' },
      ],
    });
  }),

  http.get('/api/system/info', () => {
    return HttpResponse.json({
      cpu: { usage: 25.5, cores: 4 },
      memory: { used: 512, total: 4096 },
      disk: { used: 8192, total: 32768 },
      temperature: 54.3,
      uptime: 86400000000000, // nanoseconds
    });
  }),

  http.get('/api/config', () => {
    return HttpResponse.json({
      sections: [
        { name: 'Server', items: [{ key: 'port', value: '8082' }] },
        { name: 'MQTT', items: [{ key: 'broker', value: 'mqtt://localhost' }] },
      ],
    });
  }),
];
```

**Integration Test Example**:
```typescript
// tests/integration/hooks/useWifi.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { useWifiScan } from '@/application/hooks/useWifi';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useWifiScan', () => {
  it('transforms backend response to frontend format', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWifiScan(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const networks = result.current.data?.networks;
    expect(networks).toHaveLength(2);
    expect(networks[0]).toMatchObject({
      ssid: 'HomeNetwork',
      secured: true,
      encryption: 'wpa2',
    });
  });
});
```

---

### Phase 5: Component Tests (4-6 files)

**Goal**: Test UI components with mocked props/hooks

**Files to Create**:
1. `tests/component/wifi/NetworkList.test.tsx`
2. `tests/component/door/DoorControls.test.tsx`
3. `tests/component/system/MetricCard.test.tsx`
4. `tests/component/config/ConfigEditor.test.tsx`

**Example**:
```typescript
// tests/component/door/DoorControls.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoorControls } from '@/presentation/components/door/DoorControls';

describe('DoorControls', () => {
  it('shows unavailable state when isError is true', () => {
    render(<DoorControls status={{ state: 'unknown' }} isError={true} />);

    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });

  it('disables open button when door is already open', () => {
    render(<DoorControls status={{ state: 'open' }} isError={false} />);

    expect(screen.getByRole('button', { name: /open/i })).toBeDisabled();
  });
});
```

---

### Phase 6: Playwright Configuration (3-4 files)

**Goal**: Set up E2E testing with NixOS-compatible browser

**Files to Create**:
1. `playwright.config.ts` - Playwright configuration
2. `tests/e2e/fixtures/test-base.ts` - Extended test fixtures
3. `tests/e2e/fixtures/mock-routes.ts` - API route mocking

**Configuration**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Scripts to Add**:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

### Phase 7: E2E Tests (4-5 files)

**Goal**: End-to-end tests for critical user flows

**Files to Create**:
1. `tests/e2e/smoke.spec.ts` - Basic page load tests
2. `tests/e2e/wifi.spec.ts` - WiFi scanning flow
3. `tests/e2e/system.spec.ts` - System health display
4. `tests/e2e/config.spec.ts` - Config section rendering
5. `tests/e2e/live-smoke.spec.ts` - Optional live Pi tests

**Smoke Test Example**:
```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/system/info', (route) =>
      route.fulfill({
        json: { cpu: { usage: 25 }, memory: { used: 512, total: 4096 } },
      })
    );
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('header displays DeliCasa branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /delicasa/i })).toBeVisible();
  });

  test('navigation tabs are accessible', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('tab', { name: /wifi/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /system/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /config/i })).toBeVisible();
  });
});
```

---

### Phase 8: GitHub Actions CI (1 file)

**Goal**: Automated testing in CI with Nix

**File to Create**:
1. `.github/workflows/test.yml`

**Workflow**:
```yaml
name: Test Suite

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Nix
        uses: cachix/install-nix-action@v27
        with:
          nix_path: nixpkgs=channel:nixos-unstable

      - name: Setup Cachix
        uses: cachix/cachix-action@v15
        with:
          name: nix-community
          authToken: '${{ secrets.CACHIX_AUTH_TOKEN }}'

      - name: Install dependencies
        run: nix develop --command npm ci

      - name: Run unit and component tests
        run: nix develop --command npm run test:coverage

      - name: Run E2E tests
        run: nix develop --command npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

---

### Phase 9: Documentation Updates (2-3 files)

**Goal**: Document test commands and workflows

**Files to Update/Create**:
1. `README.md` - Add Testing section
2. `.specify/specs/004-testing-and-playwright-nixos/quickstart.md`
3. `CHANGELOG.md` - Document testing infrastructure addition

---

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Feature Spec | `spec.md` | ✅ Complete |
| Research | `research.md` | ✅ Complete |
| Implementation Plan | `plan.md` | ✅ This document |
| Data Model | `data-model.md` | 🔄 Next |
| Quick Start | `quickstart.md` | 🔄 Pending |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Playwright version drift | Medium | High | Exact version pinning, CI check |
| MSW 2.x learning curve | Low | Medium | Follow official examples |
| Flaky E2E tests | Medium | Medium | Fixed viewport, web-first assertions |
| CI cache miss | Low | Low | Cachix binary caching |
| Coverage regression | Medium | Medium | CI enforcement, PR checks |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit test count | ≥15 | `vitest --reporter=verbose | grep -c PASS` |
| Coverage | ≥70% | `vitest --coverage` |
| E2E pass rate | 100% (with retries) | `playwright test --reporter=json` |
| CI duration | <10 minutes | GitHub Actions timing |
| Local E2E runs | 10 consecutive passes | Manual verification |
