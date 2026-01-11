# Research: Testing Strategy & Playwright on NixOS

**Feature ID**: 004-testing-and-playwright-nixos
**Created**: 2026-01-07
**Status**: Complete

---

## TBD Resolutions

### 1. Exact Playwright Version in nixpkgs

**Question**: What version of Playwright is in `nixos-unstable`?

**Investigation**:
```bash
nix-instantiate --eval -E '(import <nixpkgs> {}).playwright-driver.version'
# Result: "1.56.1"
```

**Decision**: Pin `@playwright/test@1.56.1` in package.json

**Rationale**:
- Nixpkgs unstable provides Playwright 1.56.1 via `playwright-driver.browsers`
- Version synchronization is mandatory - mismatched versions cause browser launch failures
- This is a recent version (Dec 2025 release) with full Chromium/Firefox/WebKit support

**Alternatives Considered**:
- Use older stable nixpkgs (rejected: older Playwright lacks recent fixes)
- Use playwright-web-flake for version pinning (deferred: adds external dependency)

---

### 2. MSW Node.js vs Browser Strategy

**Question**: Should MSW run in Node (Vitest) or browser (Playwright)?

**Investigation**:
- MSW 2.x supports both Node.js (via `setupServer`) and browser (via `setupWorker`)
- Vitest runs in Node.js environment with jsdom for DOM simulation
- Playwright runs actual browser instances

**Decision**:
- **Vitest (Integration tests)**: Use MSW in Node.js mode with `setupServer()`
- **Playwright (E2E tests)**: Use `page.route()` for request interception

**Rationale**:
1. MSW Node works perfectly with Vitest + jsdom for testing React Query hooks
2. Playwright's built-in `page.route()` is more reliable in actual browser context
3. Avoids complexity of service worker registration in E2E tests
4. Clear separation: MSW for unit/integration, Playwright routes for E2E

**Implementation**:
```typescript
// tests/integration/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);

// tests/e2e/fixtures/routes.ts
export async function mockApiRoutes(page: Page) {
  await page.route('**/api/**', (route) => {
    // Return mock responses based on URL
  });
}
```

---

### 3. CI Runner Environment

**Question**: Is GitHub Actions the CI platform?

**Investigation**:
- Checked `.github/workflows/` directory - does not exist in PiDashboard repo
- Parent DeliCasa project uses GitHub Actions (see CLAUDE.md)
- Nix flakes work well with `cachix/install-nix-action`

**Decision**: Use GitHub Actions with Nix flake

**Rationale**:
- Consistent with parent DeliCasa project CI practices
- Excellent Nix support via `cachix/install-nix-action@v27`
- Binary caching via Cachix reduces CI time
- Well-documented, widely used in NixOS community

**Alternative Considered**:
- Self-hosted runner on Dokku (rejected: adds maintenance burden)
- GitLab CI (rejected: project uses GitHub)

---

### 4. Minimum Coverage Targets

**Question**: What coverage percentage is required?

**Investigation**:
- Constitution.md specifies ">70% coverage" as testing discipline requirement
- 6 known bug areas identified in CHANGELOG.md (v1.1.1 - v1.1.4)
- Critical hooks: `useWifiScan`, `useSystemStatus`, `useDoor`, `useLogStream`, `useConfig`

**Decision**:
- **Minimum overall coverage**: 70%
- **Critical path coverage**: 100% of 6 known bug areas
- **Hook coverage**: All critical hooks have at least one integration test

**Rationale**:
- 70% aligns with constitution.md testing discipline requirement
- 100% coverage of known bug areas prevents regression
- Hook integration tests validate the API response transformations that caused bugs

**Coverage Breakdown**:
| Area | Target | Tests Required |
|------|--------|----------------|
| API transformation functions | 100% | Unit tests for all `transform*()` and `map*()` functions |
| Critical hooks | 100% | Integration tests with MSW |
| UI components | 70% | Component tests for key interactive elements |
| Utility functions | 80% | Unit tests |

---

## Technology Decisions

### Test Framework Selection

| Choice | Selected | Alternative | Rationale |
|--------|----------|-------------|-----------|
| Test Runner | Vitest | Jest | Native ESM, faster, Vite integration |
| Component Testing | React Testing Library | Enzyme | Modern, accessibility-focused |
| API Mocking | MSW 2.x | nock, axios-mock-adapter | Framework-agnostic, works with fetch |
| E2E Framework | Playwright | Cypress | Better NixOS support, faster |
| Coverage Tool | V8 (via Vitest) | Istanbul | Built into Vitest |

### Vitest Configuration Decisions

**Environment**: `jsdom`
- Required for React component testing
- Simulates browser DOM APIs

**Globals**: `true`
- Enables `describe`, `it`, `expect` without imports
- Consistent with Jest migration path

**Coverage Exclude**:
- `tests/**` - Test files themselves
- `src/components/ui/**` - shadcn/ui primitives (third-party)
- `**/*.d.ts` - Type declarations

### Playwright Configuration Decisions

**Browsers**: Chromium only (initially)
- Reduces CI time by 66%
- Add Firefox/WebKit if cross-browser bugs surface

**Viewport**: 1280x720 (fixed)
- Prevents responsive layout flakiness
- Standard desktop viewport

**Retries**: 2 in CI, 0 locally
- CI variance requires retries
- Local development needs immediate feedback

**Artifacts**: retain-on-failure
- Video, trace, screenshot for debugging
- Reduces storage in CI

---

## Dependency Versions

### NPM Dependencies to Add

```json
{
  "devDependencies": {
    "@playwright/test": "1.56.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.6.1",
    "@types/testing-library__jest-dom": "^6.0.0",
    "msw": "^2.8.0",
    "vitest": "^3.2.4",
    "@vitest/coverage-v8": "^3.2.4",
    "jsdom": "^26.1.0"
  }
}
```

### Version Pinning Strategy

| Package | Pin Strategy | Reason |
|---------|--------------|--------|
| `@playwright/test` | Exact (`1.56.1`) | Must match nixpkgs |
| `vitest` | Minor (`^3.2.4`) | Compatible updates OK |
| `msw` | Minor (`^2.8.0`) | Stable 2.x API |
| `@testing-library/*` | Minor | Stable APIs |

---

## Implementation Order

Based on research, recommended implementation sequence:

1. **flake.nix** - Enable Nix development environment
2. **Vitest config** - Set up test runner
3. **Unit tests** - Test API transformation functions
4. **MSW handlers** - Create mock API responses
5. **Integration tests** - Test hooks with MSW
6. **Component tests** - Test UI components
7. **Playwright config** - Set up E2E framework
8. **E2E tests** - Create smoke and flow tests
9. **CI workflow** - GitHub Actions integration
10. **Documentation** - Update README with test commands

---

## Risk Mitigation

### Risk: Playwright Version Drift

**Mitigation**:
1. Pin exact version in package.json
2. Add CI check that compares npm version to nixpkgs version
3. Document version sync in flake.nix comments
4. Use Renovate/Dependabot with manual merge for Playwright updates

### Risk: MSW 2.x Migration Issues

**Mitigation**:
1. Use MSW 2.x from start (no migration needed)
2. Follow official Node.js setup guide
3. Test MSW setup in isolation before integrating

### Risk: Flaky E2E Tests

**Mitigation**:
1. Fixed viewport (1280x720)
2. Web-first assertions (auto-retry)
3. No hard `waitForTimeout()` calls
4. Mock timers for polling (log stream, system status)
5. Clear localStorage before each test
6. Disable service worker in test mode

---

## Sources

| Source | URL | Topic |
|--------|-----|-------|
| NixOS Wiki: Playwright | https://nixos.wiki/wiki/Playwright | NixOS browser setup |
| Vitest Documentation | https://vitest.dev/ | Test runner configuration |
| MSW 2.x Migration Guide | https://mswjs.io/docs/migrations/2.0 | API changes in MSW 2 |
| Playwright Node.js Setup | https://playwright.dev/docs/test-configuration | Config best practices |
| React Testing Library | https://testing-library.com/docs/react-testing-library/intro | Component testing |
| Cachix Nix Action | https://github.com/cachix/cachix-action | CI caching |
