# Testing Strategy & Playwright on NixOS

**Feature ID**: 004-testing-and-playwright-nixos
**Status**: Draft
**Created**: 2026-01-07
**Author**: Claude Code

---

## 1. Problem Statement

### Current Situation
The PiDashboard project has **no test infrastructure** whatsoever. The Playwright MCP browser navigation failed with:

```
Error: Chromium distribution 'chrome' not found at /opt/google/chrome/chrome
Run "npx playwright install chrome"
```

This error occurs because:
1. NixOS doesn't use FHS-compliant paths like `/opt/google/chrome/`
2. Browsers installed via `playwright install` have dynamic linker issues on NixOS
3. The project lacks any testing setup (no Vitest, Jest, or Playwright configuration)

### Why This Matters
- **No regression safety**: Recent bugs (WiFi `security` → `secured` transformation, logs SSE→polling, config API format mismatch) were discovered only through manual testing
- **Development velocity**: Without tests, every change requires manual verification on Pi hardware
- **CI/CD blocked**: Cannot implement automated quality gates without a test suite
- **NixOS-specific**: Standard `npx playwright install` doesn't work on NixOS due to dynamic linker incompatibilities

---

## 2. Current State (Evidence Map)

### Framework & Build Tooling
| Aspect | Finding | Source |
|--------|---------|--------|
| Framework | React 19.2.0 | `package.json:29` |
| Build Tool | Vite 7.2.4 | `package.json:58` |
| Language | TypeScript 5.9.3 (strict mode) | `package.json:56`, `tsconfig.app.json` |
| CSS | Tailwind CSS 4.1.18 + shadcn/ui | `package.json:55` |
| State (Server) | TanStack React Query 5.90.16 | `package.json:25` |
| State (Client) | Zustand 5.0.9 | `package.json:32` |
| Offline Storage | idb 8.0.3 (IndexedDB) | `package.json:27` |

### Existing Test Setup
**None.** Zero test infrastructure exists:
- No test runner (Vitest/Jest) in dependencies
- No test scripts in `package.json`
- No `*.test.ts`, `*.spec.ts` files found
- No Playwright/Cypress configuration
- No `.nix` files (no flake.nix, shell.nix)
- No GitHub Actions workflows

### Critical Flows & Known Bug History
Based on CHANGELOG.md (v1.1.1 - v1.1.4):

| Flow | Bug Found | Root Cause | File |
|------|-----------|------------|------|
| WiFi Network Display | v1.1.4 | Backend `security: "WPA2"` → frontend `secured: boolean` mismatch | `src/infrastructure/api/wifi.ts` |
| System Logs | v1.1.3 | Backend returns JSON, frontend expected SSE stream | `src/infrastructure/api/logs.ts` |
| Network Diagnostics | v1.1.2 | Backend `backend_state` vs frontend `connected` field names | `src/infrastructure/api/network.ts` |
| Config Section | v1.1.2 | Nested `{sections: []}` vs flat `ConfigEntry[]` | `src/infrastructure/api/config.ts` |
| Door Control | v1.1.1 | Infinite loading when API unavailable | `src/presentation/components/door/DoorControls.tsx` |
| Layout | v1.1.1 | Missing `mx-auto` centering | `src/App.tsx` |

### Architecture (Hexagonal)
```
src/
├── domain/types/           # Entity definitions, API types
├── application/
│   ├── hooks/              # React Query hooks (useWifi, useDoor, etc.)
│   └── stores/             # Zustand stores (thresholds, testingMode)
├── infrastructure/
│   ├── api/                # API client + endpoint modules
│   ├── offline/            # IndexedDB queue
│   └── bluetooth/          # Web Bluetooth provisioning
├── presentation/
│   └── components/         # UI components by feature
├── lib/                    # Utilities (queryClient, utils)
└── components/ui/          # shadcn/ui primitives
```

---

## 3. Goals / Non-Goals

### Goals
1. **Reliable Playwright on NixOS**: E2E tests run locally and in CI without requiring `/opt/google/chrome`
2. **Deterministic test suite**: Clear separation of fast unit tests vs slower integration/E2E tests
3. **Regression prevention**: Cover the 6 known bug areas with automated tests
4. **CI-ready**: Commands that work in GitHub Actions with reproducible browser availability
5. **Minimal flakiness**: Explicit wait strategies, no hard timeouts, consistent viewport

### Non-Goals
- Full rewrite of build tooling
- Visual regression testing (defer unless needed)
- Performance benchmarking
- Mobile browser testing (desktop Chromium only)
- 100% coverage targets (focus on critical paths)
- **Storybook setup** (Constitution P6 requires Storybook stories for components, but this is deferred to a separate feature focused on visual documentation. This feature establishes automated testing infrastructure only.)

---

## 4. Recommended Testing Pyramid (PiDashboard)

### Layer A: Unit Tests (Vitest + jsdom)
**Purpose**: Test pure functions and isolated logic
**Run time**: < 10 seconds
**Examples**:
- `mapSecurityToEncryption()` in `wifi.ts` (WPA2→wpa2, Open→open)
- `transformSystemInfo()` in `system.ts` (nanoseconds→uptime string)
- `mapSectionToCategory()` in `config.ts`
- Query key factory in `queryClient.ts`
- Error classification logic in `client.ts`

### Layer B: Component Tests (Vitest + React Testing Library + jsdom)
**Purpose**: Test UI components with mocked hooks/props
**Run time**: < 30 seconds
**Examples**:
- `NetworkList` renders correct number of networks with signal icons
- `DoorControls` shows "Unavailable" when `isError=true`
- `ConnectionStatus` displays correct state for connected/disconnected
- `ThresholdIndicator` color coding (green/yellow/red)
- `LogFilter` filters apply correctly

### Layer C: Integration Tests (Vitest + MSW + React Query)
**Purpose**: Test hooks + API client with mocked network responses
**Run time**: < 60 seconds
**Examples**:
- `useWifiStatus()` transforms backend response correctly
- `useSystemStatus()` handles API errors gracefully
- `useLogStream()` polling accumulates logs without duplicates
- `useOfflineQueue()` queues operations when offline
- API client retry logic on 5xx errors

### Layer D: E2E Tests (Playwright)
**Purpose**: Full browser tests against running backend
**Run time**: < 5 minutes
**Two modes**:

#### D1: Mocked Backend (Default CI)
- Uses MSW or static mock server
- Tests user flows without real PiOrchestrator
- Fast, deterministic, no hardware dependency

#### D2: Live Pi Smoke Test (Optional, Gated)
- Runs against real PiOrchestrator at `LIVE_PI_URL`
- Non-destructive invariants only:
  - Page loads without console errors
  - System status card shows data
  - Network diagnostics cards render
  - Config section doesn't crash
- Triggered manually or on `main` merge

### Coverage Map by Feature

| Feature | Unit | Component | Integration | E2E |
|---------|------|-----------|-------------|-----|
| WiFi scan/transform | `mapSecurityToEncryption` | `NetworkList` | `useWifiScan` | Scan flow |
| System health | `transformSystemInfo` | `MetricCard` | `useSystemStatus` | Dashboard load |
| Door control | - | `DoorControls` | `useDoor` | Testing mode toggle |
| Logs viewer | - | `LogFilter` | `useLogStream` | Log filtering |
| Config editor | `mapSectionToCategory` | `ConfigEditor` | `useConfig` | Config display |
| Network diagnostics | - | `ConnectionCard` | Network hooks | Status cards |
| Offline queue | Queue logic | `OfflineIndicator` | `useOfflineQueue` | - |

---

## 5. Playwright on NixOS: Implementation Strategy

### Recommended Approach: nixpkgs `playwright-driver.browsers`

After evaluating options:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A: playwright-driver.browsers** | Built into nixpkgs, no external flake | Must match npm version to nixpkgs version | **Recommended** |
| B: playwright-web-flake | Pin any version | External dependency, extra maintenance | Backup option |
| C: System chromium + override | Use existing browser | Version drift, complex config | Not recommended |

### flake.nix Configuration

```nix
{
  description = "PiDashboard development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
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

            echo "Playwright browsers: $PLAYWRIGHT_BROWSERS_PATH"
            echo "Node: $(node --version)"
          '';
        };
      });
}
```

### Version Synchronization Strategy

The npm `@playwright/test` version must match the nixpkgs `playwright-driver` version.

**Workflow**:
1. Check nixpkgs Playwright version: `nix eval nixpkgs#playwright-driver.version`
2. Pin `@playwright/test` to same version in `package.json`
3. Document the pinned version in `flake.nix` comments
4. Use Renovate/Dependabot to alert on version drift

### Developer Workflow Commands

```bash
# Enter development shell (sets PLAYWRIGHT_BROWSERS_PATH)
nix develop

# Install npm dependencies
npm install

# Run unit + component tests (fast)
npm run test

# Run integration tests with MSW
npm run test:integration

# Run E2E tests (mocked backend)
npm run test:e2e

# Run E2E in headed mode for debugging
npm run test:e2e:headed

# Run live Pi smoke test (requires LIVE_PI_URL)
LIVE_PI_URL=http://192.168.1.124:8082 npm run test:e2e:live
```

### CI Configuration (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v27
      - uses: cachix/cachix-action@v15
        with:
          name: pidashboard
      - run: nix develop --command npm ci
      - run: nix develop --command npm run test
      - run: nix develop --command npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 6. Test Structure & Conventions

### Directory Structure

```
tests/
├── unit/                       # Pure function tests
│   ├── api/
│   │   ├── wifi.test.ts        # mapSecurityToEncryption
│   │   ├── system.test.ts      # transformSystemInfo
│   │   └── config.test.ts      # mapSectionToCategory
│   └── lib/
│       └── queryClient.test.ts # Query key factory
├── component/                  # React component tests
│   ├── wifi/
│   │   └── NetworkList.test.tsx
│   ├── door/
│   │   └── DoorControls.test.tsx
│   └── system/
│       └── MetricCard.test.tsx
├── integration/                # Hooks + MSW tests
│   ├── hooks/
│   │   ├── useWifi.test.tsx
│   │   └── useSystemStatus.test.tsx
│   └── mocks/
│       └── handlers.ts         # MSW request handlers
├── e2e/                        # Playwright tests
│   ├── smoke.spec.ts           # Basic page load
│   ├── wifi.spec.ts            # WiFi scanning flow
│   ├── system.spec.ts          # System health display
│   └── fixtures/
│       └── mock-server.ts      # Optional mock server
└── setup/
    ├── vitest.setup.ts         # DOM cleanup, MSW setup
    └── playwright.setup.ts     # Global setup for E2E
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `*.test.ts` | `wifi.test.ts` |
| Component test | `*.test.tsx` | `NetworkList.test.tsx` |
| Integration test | `*.test.tsx` | `useWifi.test.tsx` |
| E2E test | `*.spec.ts` | `smoke.spec.ts` |
| Mock handlers | `handlers.ts` | `mocks/handlers.ts` |
| Fixtures | `*.fixture.ts` | `networks.fixture.ts` |

### Selector Strategy

Use `data-testid` for E2E stability:

```tsx
// Component
<div data-testid="network-list">
  {networks.map(n => (
    <div key={n.ssid} data-testid={`network-item-${n.ssid}`}>
      {n.ssid}
    </div>
  ))}
</div>

// Test
await page.getByTestId('network-list').waitFor();
await page.getByTestId('network-item-HomeNetwork').click();
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PLAYWRIGHT_BROWSERS_PATH` | NixOS browser location | Set by flake.nix |
| `LIVE_PI_URL` | Real PiOrchestrator URL | (none - skips live tests) |
| `TEST_MODE` | `unit`, `integration`, `e2e`, `all` | `all` |
| `CI` | Detected automatically | `true` in GitHub Actions |

---

## 7. Live Integration Tests (Optional, Gated)

### Invariants (Non-Destructive)

Live smoke tests verify read-only behavior:

```typescript
// tests/e2e/live-smoke.spec.ts
test.describe('Live Pi Smoke Test', () => {
  test.skip(!process.env.LIVE_PI_URL, 'LIVE_PI_URL not set');

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(process.env.LIVE_PI_URL!);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('system status card displays data', async ({ page }) => {
    await page.goto(process.env.LIVE_PI_URL!);
    await page.getByTestId('system-status-card').waitFor();

    // Verify non-zero values render
    const cpuText = await page.getByTestId('cpu-usage').textContent();
    expect(cpuText).toMatch(/\d+%/);
  });

  test('network diagnostics cards render', async ({ page }) => {
    await page.goto(process.env.LIVE_PI_URL!);
    await page.getByRole('tab', { name: /network/i }).click();

    await expect(page.getByTestId('tailscale-card')).toBeVisible();
    await expect(page.getByTestId('bridge-card')).toBeVisible();
  });
});
```

### Safety Measures

1. **No credentials in code**: `LIVE_PI_URL` is env-only
2. **Read-only assertions**: No door commands, no config writes
3. **Network isolation**: Tests on private network only
4. **Manual trigger**: Not in default CI pipeline

---

## 8. Flakiness Policy & Stability Techniques

### Flake Risk Assessment

| Risk | Source | Mitigation |
|------|--------|------------|
| Animations | CSS transitions, loading spinners | `prefers-reduced-motion: reduce` in test CSS |
| Polling | Log stream (3s interval), system status (5s) | Mock timers or wait for specific content |
| Network timing | API response variance | MSW for mocked tests, generous timeouts for live |
| Responsive layout | Viewport differences | Fixed 1280x720 viewport |
| Service Worker | PWA caching | Disable SW in test mode |
| localStorage | Zustand persistence | Clear before each test |

### Test Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 30000,           // Test timeout
  expect: { timeout: 5000 }, // Assertion timeout
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  use: {
    viewport: { width: 1280, height: 720 },
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

### Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
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
      reporter: ['text', 'json', 'html'],
      exclude: ['tests/**', 'src/components/ui/**'],
    },
  },
});
```

### Wait Strategies

```typescript
// Prefer: Web-first assertions with auto-retry
await expect(page.getByTestId('network-list')).toBeVisible();
await expect(page.getByText('Connected')).toBeVisible();

// Avoid: Hard waits
await page.waitForTimeout(1000); // BAD

// For polling data: wait for specific content
await expect(page.getByTestId('cpu-usage')).not.toHaveText('Loading...');
```

### Retry Policy

| Scope | Retries | Justification |
|-------|---------|---------------|
| CI E2E | 2 | Network variance, cold start |
| Local E2E | 0 | Fast feedback during development |
| Unit/Component | 0 | Must be deterministic |
| Live Pi tests | 1 | Hardware variance acceptable |

---

## 9. Acceptance Criteria

### Performance
- [ ] Unit + component tests complete in < 30 seconds
- [ ] Integration tests complete in < 60 seconds
- [ ] E2E smoke suite completes in < 2 minutes
- [ ] Full E2E suite completes in < 5 minutes

### Stability
- [ ] E2E tests pass 10 consecutive runs on NixOS
- [ ] No `/opt/google/chrome` dependency anywhere
- [ ] CI runs with `nix develop` providing browsers
- [ ] Flake.nix documented with Playwright version

### Coverage
- [ ] All 6 known bug areas have regression tests:
  - WiFi security→secured transformation
  - Logs JSON→SSE handling
  - Network field name mapping
  - Config nested→flat transformation
  - Door error state display
  - Layout centering
- [ ] Critical hooks have integration tests: `useWifiScan`, `useSystemStatus`, `useDoor`, `useLogStream`, `useConfig`

### CI/CD
- [ ] PR checks run unit + component + mocked E2E
- [ ] Main branch can trigger live Pi smoke test
- [ ] Test artifacts (traces, screenshots) uploaded on failure

---

## 10. Verification Plan

### Local Verification

```bash
# 1. Enter nix shell
nix develop

# 2. Verify Playwright browser path
echo $PLAYWRIGHT_BROWSERS_PATH
# Expected: /nix/store/...-playwright-driver-browsers-...

# 3. Run full test suite
npm run test:all

# 4. Check coverage report
open coverage/index.html
```

### CI Verification

```bash
# In GitHub Actions:
nix develop --command npx playwright test --reporter=html

# Artifacts:
# - playwright-report/ (HTML report)
# - test-results/ (traces, screenshots on failure)
```

### Debugging Failures

```bash
# Run single test in headed mode
npm run test:e2e -- --headed --debug wifi.spec.ts

# View trace from failed CI run
npx playwright show-trace test-results/*/trace.zip

# Run with verbose logging
DEBUG=pw:api npm run test:e2e
```

---

## 11. Research Brief

### Sources Used

| Source | Topic | Decision Informed |
|--------|-------|-------------------|
| [NixOS Wiki: Playwright](https://nixos.wiki/wiki/Playwright) | NixOS browser setup | Use `playwright-driver.browsers` from nixpkgs |
| [playwright-web-flake](https://github.com/pietdevries94/playwright-web-flake) | Alternative flake approach | Backup option if version pinning needed |
| [Vitest Component Testing Guide](https://vitest.dev/guide/browser/component-testing) | React component testing | jsdom + RTL for component tests |
| [MSW Documentation](https://mswjs.io/docs/) | API mocking strategy | MSW for integration tests |
| [Avoiding Flaky Playwright Tests](https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/) | Flakiness mitigation | Web-first assertions, no hard waits |
| [Playwright Retries Documentation](https://playwright.dev/docs/test-retries) | Retry configuration | CI-only retries (2), local retries (0) |

### Key Findings

1. **NixOS requires special handling**: Standard `playwright install` fails due to dynamic linker issues; must use `playwright-driver.browsers`
2. **Version synchronization critical**: npm `@playwright/test` must match nixpkgs `playwright-driver` version
3. **MSW is the industry standard**: Works with fetch, axios, React Query; intercepts at network level
4. **Vitest preferred over Jest**: Native ESM, faster, better Vite integration

---

## 12. Open Questions & Resolution Steps

### TBD: Exact Playwright Version in nixpkgs

**Question**: What version of Playwright is in `nixos-unstable`?

**Resolution**:
```bash
nix eval nixpkgs#playwright-driver.version
# Then pin @playwright/test to this version
```

### TBD: MSW Node.js vs Browser

**Question**: Should MSW run in Node (Vitest) or browser (Playwright)?

**Resolution**:
- Use MSW in Node.js for integration tests (Vitest)
- Use static mock server or page.route() for E2E tests (Playwright)

### TBD: CI Runner Environment

**Question**: Is GitHub Actions the CI platform?

**Resolution**: Check for `.github/workflows/` or ask team. Spec assumes GitHub Actions with `cachix/install-nix-action`.

### TBD: Minimum Coverage Targets

**Question**: What coverage percentage is required?

**Resolution**: Start with critical path coverage (6 bug areas), establish baseline, then set targets based on team input.

---

## Next Steps

After this spec is approved:

1. Run `/speckit.plan` to generate implementation plan
2. Run `/speckit.tasks` to create task breakdown
3. Implement in order: flake.nix → Vitest setup → unit tests → component tests → MSW → integration tests → Playwright → E2E tests
