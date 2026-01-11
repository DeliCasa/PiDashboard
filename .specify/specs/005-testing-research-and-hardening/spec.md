# Specification: Testing Research & Hardening

**Feature ID**: 005-testing-research-and-hardening
**Status**: Draft
**Created**: 2026-01-07
**Author**: Claude Code

---

## 1. Problem Statement

### Why a Second Pass?

Feature 004 delivered comprehensive testing infrastructure with **322 unit/component/integration tests** and **365 E2E tests**. However, "lots of tests" does not equal "effective testing." This specification addresses:

1. **Correctness gaps**: Tests exist but don't cover all P0/P1 risk areas (BLE provisioning: 0 tests, SSE reconnection: 0 tests)
2. **Maintainability risks**: 86+ brittleness vectors identified (fragile CSS selectors, hardcoded timeouts)
3. **Flakiness potential**: 38+ instances of `waitForTimeout()` are primary flake sources
4. **Contract stability**: No runtime schema validation; backend changes could silently break frontend
5. **Real-world resilience**: Missing tests for network failures, SSE reconnection, partial API failures
6. **CI/environment drift**: NixOS Playwright version pinning not enforced; local/CI parity undocumented

### Business Impact

| Risk Area | Current State | Potential Impact |
|-----------|---------------|------------------|
| Flaky tests | 38+ timing-dependent waits | Developer frustration, CI reruns, wasted time |
| No contract tests | Backend can break frontend silently | Production bugs, user-facing failures |
| Missing BLE tests | 0 coverage on device provisioning | Critical feature completely blind |
| SSE reconnection | Untested | Logs page may fail silently on network issues |
| Fragile selectors | 25+ Tailwind class dependencies | Tests break on every design update |

---

## 2. Current State (Evidence Map)

### 2.1 Test Counts by Type

| Type | Files | Tests | Status |
|------|-------|-------|--------|
| Unit | 6 | 159 | Passing |
| Component | 6 | 56 | 54 passing, 2 skipped |
| Integration | 5 | 54 | Passing |
| E2E | 5 | 365 | Passing (16 conditionally skipped) |
| **Total** | **22** | **634** | **616 passing, 18 skipped** |

### 2.2 Key Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `vitest.config.ts` | Unit/component/integration test runner | `/vitest.config.ts` |
| `playwright.config.ts` | E2E test configuration | `/playwright.config.ts` |
| `flake.nix` | NixOS development environment with Playwright browsers | `/flake.nix` |
| `test.yml` | GitHub Actions CI workflow | `/.github/workflows/test.yml` |
| `handlers.ts` | MSW mock API handlers | `/tests/integration/mocks/handlers.ts` |
| `test-base.ts` | Playwright custom fixtures | `/tests/e2e/fixtures/test-base.ts` |

### 2.3 Skipped Tests Analysis

**Component Tests (2 skipped)** - `tests/component/logs/LogFilter.test.tsx`:
- Lines 61, 189: Radix UI Select interaction tests
- **Reason**: jsdom doesn't support `hasPointerCapture` API required by Radix
- **Resolution**: These interactions should be tested in E2E tests (currently NOT covered there)

**E2E Tests (16 skipped)** - `tests/e2e/live-smoke.spec.ts`:
- All tests require `LIVE_PI_URL` environment variable
- **Reason**: Intentional - tests run against real Raspberry Pi hardware
- **Resolution**: Acceptable; document usage in CI/CD workflow

### 2.4 Coverage by Feature

| Feature | Unit | Integration | Component | E2E | Total | Quality |
|---------|------|-------------|-----------|-----|-------|---------|
| WiFi Management | 25 | 19 | 23 | 19 | 86 | Excellent |
| System Monitoring | 28 | 12 | 22 | 25 | 87 | Excellent |
| Door Control | 0 | 13 | 20 | 0 | 33 | Good |
| Config Editor | 8 | 13 | 24 | 28 | 73 | Excellent |
| Logs/Streaming | 0 | 15 | 17 | 0 | 32 | Good |
| Offline Queue | 60+ | 0 | 0 | 0 | 60+ | Good (unit only) |
| Network Diagnostics | 0 | 0 | 0 | 8 | 8 | Basic |
| **BLE Provisioning** | **0** | **0** | **0** | **0** | **0** | **CRITICAL GAP** |

### 2.5 Existing Pain Points

1. **Brittleness Vectors**: 86+ fragile patterns identified
   - 38+ `waitForTimeout()` calls in E2E tests
   - 25+ Tailwind class selectors (`.bg-green-500`, `.animate-spin`)
   - 6+ silent `.catch(() => false)` error handlers

2. **Missing Contract Validation**:
   - No Zod/Yup/Joi for runtime schema validation
   - MSW mocks may drift from actual backend responses
   - No OpenAPI/Swagger spec as source of truth

3. **NixOS/CI Issues**:
   - Playwright version in `package.json` (1.56.1) not validated against nixpkgs version
   - Nix store caching suboptimal (no Magic Nix Cache)
   - Local/CI parity not documented

---

## 3. Goals / Non-Goals

### Goals

1. **Risk-based coverage for all P0/P1 flows**
   - Every critical user journey has appropriate test coverage
   - Coverage gaps prioritized by business impact

2. **Stable CI execution with clear artifacts**
   - < 1% flakiness rate on main branch
   - Traces, screenshots, videos on failure for debugging
   - Clear separation of PR gates vs nightly suites

3. **Contract stability between Dashboard and Orchestrator**
   - Runtime schema validation for API responses
   - Breaking changes detected before merge
   - Mock drift prevention

4. **Reduced brittleness and faster debugging**
   - Eliminate `waitForTimeout()` anti-pattern
   - Standardize on role-based selectors
   - Clear diagnostic artifacts on failure

5. **NixOS/CI parity and documentation**
   - Playwright version pinning enforced
   - Environment contract documented
   - Reproducible builds guaranteed

### Non-Goals

1. **Rewriting the app** - No refactoring beyond test infrastructure
2. **Deleting large test portions** - Only remove truly redundant tests with evidence
3. **100% code coverage** - Focus on risk-based coverage, not arbitrary metrics
4. **Visual regression testing** - Out of scope for this iteration
5. **Performance benchmarking suite** - Define budgets only, not full perf infrastructure

---

## 4. Findings: Test Suite Audit

### 4.1 Coverage Map by Feature

```
Feature                    │ Unit │ Integ │ Comp │ E2E │ Missing Areas
───────────────────────────┼──────┼───────┼──────┼─────┼──────────────────────────
WiFi Management            │  25  │  19   │  23  │  19 │ Timeout handling, retry
System Monitoring          │  28  │  12   │  22  │  25 │ SSE reconnection
Door Control               │   0  │  13   │  20  │   0 │ E2E command tests
Config Editor              │   8  │  13   │  24  │  28 │ Type validation errors
Logs/Streaming             │   0  │  15   │  17  │   0 │ SSE disconnection, E2E
Offline Queue              │  60+ │   0   │   0  │   0 │ Integration scenarios
Network Diagnostics        │   0  │   0   │   0  │   8 │ Partial failure handling
BLE Provisioning           │   0  │   0   │   0  │   0 │ ENTIRE FEATURE
Error Boundaries           │   0  │   0   │   0  │   2 │ Crash recovery tests
Theme Persistence          │   0  │   0   │   0  │   1 │ localStorage validation
Accessibility              │   0  │   0   │   2  │   0 │ Keyboard nav, screen reader
```

### 4.2 Gaps Prioritized by Risk

| Priority | Gap | Impact | Evidence |
|----------|-----|--------|----------|
| P0 | BLE Provisioning (0 tests) | Device setup completely untested | `tests/` search returns 0 BLE files |
| P0 | SSE Reconnection (0 tests) | Logs page may fail silently | `useLogs.test.tsx` has no reconnect tests |
| P1 | Contract validation missing | Backend changes break frontend silently | No Zod/runtime schema validation |
| P1 | `waitForTimeout()` brittleness | CI flakiness, slow tests | 38+ instances in `tests/e2e/` |
| P1 | Fragile CSS selectors | Tests break on design changes | 25+ Tailwind class selectors |
| P2 | Radix Select E2E coverage | Skipped component tests unvalidated | LogFilter.test.tsx:61,189 |
| P2 | Error boundary tests | App crash recovery untested | 0 dedicated tests |
| P2 | Network partial failures | Only full failures tested | No partial failure scenarios |
| P3 | Theme persistence | localStorage state unvalidated | smoke.spec.ts has 1 theme test |
| P3 | Accessibility | Minimal keyboard/screen reader tests | 2 tests in NetworkList.test.tsx |

### 4.3 Redundancies

| Area | Finding | Recommendation |
|------|---------|----------------|
| WiFi tests | 86 tests across all layers - some overlap | Review for consolidation |
| System tests | 87 tests - component + E2E have similar assertions | Reduce E2E duplication |
| Config tests | 73 tests - comprehensive but some unit/integration overlap | Minor cleanup |

### 4.4 Brittleness Assessment

**Root Causes**:

1. **Timing dependence** (`waitForTimeout`):
   - Files affected: All 5 E2E spec files
   - Count: 38+ instances
   - Example: `await page.waitForTimeout(500)` before assertions
   - Fix: Replace with `expect(locator).toBeVisible()` or `waitForLoadState()`

2. **Presentation-coupled selectors**:
   - Files affected: 6 component test files
   - Pattern: `document.querySelector('.bg-green-500')`, `svg.lucide-check`
   - Fix: Use role-based selectors or add `data-testid` attributes

3. **Silent error handling**:
   - Files affected: wifi.spec.ts, system.spec.ts
   - Pattern: `.catch(() => false)` hides actual failures
   - Fix: Remove catch blocks; let tests fail loudly

---

## 5. Research Brief (Best Practices Summary)

### 5.1 Testing Trophy/Pyramid for Frontend Dashboards

**Recommended Distribution** (from Kent C. Dodds, Testing Library):

```
                    ▲ E2E (10%)
                   ╱ ╲     Critical user flows only
                  ╱   ╲
                 ╱ Integration (40%)
                ╱       API hooks, data flow, MSW mocks
               ╱
              ╱ Component (30%)
             ╱      Render tests, user interactions
            ╱
           ╱ Unit (20%)
          ╱      Pure functions, transformations
         ▔▔▔▔▔▔▔▔
```

**PiDashboard Current**: Unit 25%, Integration 8.5%, Component 9%, E2E 57.5%
**Issue**: Inverted trophy - too many E2E, not enough integration
**Recommendation**: Add integration tests for hooks, reduce E2E duplication

### 5.2 Playwright Reliability Patterns

**Key Findings** (from Playwright docs, BrowserStack, Better Stack):

| Pattern | Description | Adoption |
|---------|-------------|----------|
| Role-based selectors | `getByRole('button', { name: /submit/i })` | Partial |
| Auto-waiting assertions | `expect(locator).toBeVisible()` | Underused |
| Trace on failure | `trace: 'on-first-retry'` | Configured |
| CI retries | `retries: 2` on CI only | Configured |
| `data-testid` fallback | For non-semantic elements | Missing in components |

**Anti-Patterns Found**:
- `waitForTimeout()` - Replace with condition-based waits
- CSS class selectors - Replace with roles or testids
- Silent `.catch()` - Let tests fail loudly

### 5.3 Contract Testing Options

| Approach | Complexity | Coverage | Maintenance |
|----------|------------|----------|-------------|
| **Zod schema validation** | Low | Response shape | Auto from types |
| **MSW response type checking** | Low | Mock accuracy | Manual sync |
| **Pact consumer contracts** | High | Full contract | Requires provider |
| **OpenAPI validation** | Medium | Schema match | Requires spec file |

**Recommendation**: Start with Zod schema validation for critical endpoints; consider Pact later if cross-team coordination improves.

### 5.4 NixOS/CI Best Practices

**Critical Findings**:

1. **Version Pinning**: Package.json Playwright version (1.56.1) must match nixpkgs version
   - Current: No validation
   - Fix: Add flake.nix assertion

2. **Caching**: Magic Nix Cache provides 30-50% CI time reduction
   - Current: Generic cache key
   - Fix: Add `DeterminateSystems/magic-nix-cache-action`

3. **Parity Documentation**: Local/CI environment contract undocumented
   - Fix: Add CLAUDE.md section

**Sources**:
- [NixOS Wiki - Playwright](https://nixos.wiki/wiki/Playwright)
- [Playwright on NixOS for webdev](https://primamateria.github.io/blog/playwright-nixos-webdev/)
- [DeterminateSystems Magic Nix Cache](https://github.com/DeterminateSystems/magic-nix-cache-action)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Better Stack: Avoiding Flaky Tests](https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/)

---

## 6. Proposed Improvements (Prioritized Roadmap)

### A. Quick Wins (Low Effort, High Impact)

**A1. Replace `waitForTimeout()` calls**
- **Files**: All `tests/e2e/*.spec.ts` files
- **Effort**: 2-4 hours
- **Pattern**:
  ```typescript
  // Before
  await page.waitForTimeout(500);
  await expect(page.getByText('TestNetwork')).toBeVisible();

  // After
  await expect(page.getByText('TestNetwork')).toBeVisible();
  ```
- **Acceptance**: Zero `waitForTimeout()` calls except documented exceptions
- **Runtime Impact**: Tests become faster and more reliable

**A2. Add GitHub reporter for PR annotations**
- **File**: `playwright.config.ts`
- **Effort**: 15 minutes
- **Change**: Add `['github']` to reporter array
- **Acceptance**: Failed tests appear as PR annotations

**A3. Enable trace upload for failed tests**
- **File**: `.github/workflows/test.yml`
- **Effort**: 30 minutes
- **Change**: Add conditional trace artifact upload
- **Acceptance**: `test-results/` uploaded on failure

**A4. Add Magic Nix Cache**
- **File**: `.github/workflows/test.yml`
- **Effort**: 15 minutes
- **Change**: Add `DeterminateSystems/magic-nix-cache-action@main`
- **Acceptance**: 30-50% reduction in cold cache builds

### B. Contract Tests (Medium Effort)

**B1. Add Zod schema validation for critical endpoints**
- **Files**:
  - New: `src/infrastructure/api/schemas.ts`
  - Modify: `src/infrastructure/api/wifi.ts`, `system.ts`, `config.ts`
- **Effort**: 4-6 hours
- **Approach**: Define Zod schemas matching API response types; validate at runtime
- **Acceptance**: Breaking API changes throw runtime errors
- **Runtime Impact**: Minimal (~1ms per API call)

**B2. Add MSW mock contract tests**
- **Files**: New test file `tests/integration/contracts/*.test.ts`
- **Effort**: 2-3 hours
- **Approach**: Validate MSW responses match Zod schemas
- **Acceptance**: MSW drift detected in CI

**B3. Document API contract source of truth**
- **Files**: New `docs/API_CONTRACT.md`
- **Effort**: 1-2 hours
- **Content**: Expected response shapes, version compatibility notes
- **Acceptance**: Single reference document for API contracts

### C. Resilience Tests (Medium-High Effort)

**C1. SSE/polling reconnection tests**
- **Files**:
  - `tests/integration/hooks/useLogs.test.tsx` (extend)
  - New: `tests/e2e/resilience.spec.ts`
- **Effort**: 4-6 hours
- **Scenarios**:
  - Connection drops and recovers
  - Multiple rapid disconnections
  - Server returns 503 temporarily
- **Acceptance**: Log stream recovers within 5 seconds of reconnection

**C2. Partial API failure tests**
- **Files**: `tests/integration/hooks/*.test.tsx` (extend)
- **Effort**: 3-4 hours
- **Scenarios**:
  - System API works, WiFi API fails
  - Config load succeeds, update fails
  - Mixed success/failure responses
- **Acceptance**: Dashboard degrades gracefully; failed sections show error state

**C3. Offline queue integration tests**
- **Files**: New `tests/integration/offline/*.test.tsx`
- **Effort**: 3-4 hours
- **Scenarios**:
  - Queue operations while offline
  - Sync on reconnection
  - Conflict resolution
- **Acceptance**: Offline changes persist and sync correctly

### D. Performance Budgets (Low-Medium Effort)

**D1. Define and document performance budgets**
- **Files**: New `docs/PERFORMANCE_BUDGETS.md`
- **Effort**: 1-2 hours
- **Metrics**:
  - Page load: < 3 seconds on 3G
  - API response: < 500ms P95
  - SSE update latency: < 100ms
  - Bundle size: < 600KB gzipped
- **Enforcement**: CI check in nightly suite

**D2. Add bundle size check to CI**
- **Files**: `.github/workflows/test.yml`, `package.json`
- **Effort**: 1 hour
- **Approach**: Use `bundlesize` or custom script
- **Acceptance**: PR fails if bundle exceeds budget

### E. Accessibility Checks (Low-Medium Effort)

**E1. Add axe-core accessibility scans**
- **Files**:
  - New: `tests/e2e/accessibility.spec.ts`
  - Modify: `playwright.config.ts`
- **Effort**: 2-3 hours
- **Approach**: Use `@axe-core/playwright` for automated a11y checks
- **Acceptance**: No critical/serious a11y violations

**E2. Add keyboard navigation tests**
- **Files**: `tests/e2e/accessibility.spec.ts`
- **Effort**: 2 hours
- **Scenarios**:
  - Tab through all interactive elements
  - Arrow key navigation in tabs
  - Focus management on modal open/close
- **Acceptance**: All interactive elements keyboard accessible

---

## 7. Coverage Matrix (P0/P1 Flows)

### P0: Critical User Flows

| Flow | Unit | Integration | Component | E2E | Resilience | A11y |
|------|------|-------------|-----------|-----|------------|------|
| **Dashboard loads and displays metrics** | System transform (28) | useSystemStatus (12) | MetricCard (22) | system.spec.ts (25) | API timeout | Tab nav |
| **WiFi scan and connect** | WiFi transform (25) | useWifi* (19) | NetworkList (23) | wifi.spec.ts (19) | Scan timeout, retry | Focus mgmt |
| **Config view and edit** | Config transform (8) | useConfig (13) | ConfigEditor (24) | config.spec.ts (28) | Save failure | Form labels |
| **Logs streaming displays entries** | - | useLogs (15) | LogFilter (17) | - | SSE reconnect | Filter a11y |
| **Door control commands** | - | useDoor (13) | DoorControls (20) | - | Command timeout | Button a11y |

### P1: Important User Flows

| Flow | Unit | Integration | Component | E2E | Resilience | A11y |
|------|------|-------------|-----------|-----|------------|------|
| **Theme toggle and persistence** | - | - | - | smoke.spec.ts (1) | localStorage | - |
| **Network diagnostics (Tailscale/MQTT)** | - | - | - | system.spec.ts (8) | Partial failure | - |
| **Offline queue operations** | Queue (60+) | NEW: Sync tests | - | - | Conflict resolution | - |
| **BLE device provisioning** | NEW | NEW | NEW | NEW | BLE timeout | Wizard a11y |
| **Error boundary recovery** | - | - | - | smoke.spec.ts (2) | Crash recovery | - |

### Required Additions by Flow

**Dashboard Load**:
- [x] Unit: System transformation tests
- [x] Integration: useSystemStatus hook tests
- [x] Component: MetricCard render tests
- [x] E2E: System tab tests
- [ ] **NEW**: API timeout resilience test
- [ ] **NEW**: Keyboard tab navigation test

**WiFi Flow**:
- [x] Unit: WiFi transformation tests
- [x] Integration: useWifi* hook tests
- [x] Component: NetworkList tests
- [x] E2E: wifi.spec.ts
- [ ] **NEW**: Scan timeout/retry test
- [ ] **NEW**: Focus management on connect modal

**Logs Streaming**:
- [x] Integration: useLogs hook tests
- [x] Component: LogFilter tests
- [ ] **NEW**: E2E logs display test
- [ ] **NEW**: SSE reconnection test
- [ ] **NEW**: Filter accessibility test

**BLE Provisioning** (CRITICAL GAP):
- [ ] **NEW**: Unit tests for provisioning logic
- [ ] **NEW**: Integration tests for BLE hooks
- [ ] **NEW**: Component tests for provisioning wizard
- [ ] **NEW**: E2E tests for full flow (mocked BLE)
- [ ] **NEW**: BLE timeout handling
- [ ] **NEW**: Wizard keyboard accessibility

---

## 8. CI Strategy

### 8.1 PR Gates (Fast, Deterministic)

**Run on**: Every PR, push to main/dev
**Target runtime**: < 5 minutes
**Stability target**: 100% deterministic (no flakes)

| Job | Tests | Timeout | Purpose |
|-----|-------|---------|---------|
| `unit-tests` | Unit + Component + Integration | 10 min | Logic correctness |
| `lint` | ESLint | 5 min | Code quality |
| `typecheck` | TypeScript | 5 min | Type safety |
| `e2e-smoke` | smoke.spec.ts only | 10 min | Critical paths |
| `contract-check` | Schema validation tests | 5 min | API compatibility |

**Gating Rules**:
- All jobs must pass to merge
- No manual retries allowed (fix flakes, don't retry)
- Coverage threshold: 30% (maintained from 004)

### 8.2 Nightly Suite (Comprehensive)

**Run on**: Scheduled (daily 2 AM UTC)
**Target runtime**: < 30 minutes
**Stability target**: < 1% flakiness

| Job | Tests | Browsers | Purpose |
|-----|-------|----------|---------|
| `full-e2e` | All E2E specs | chromium, firefox | Cross-browser coverage |
| `resilience` | Resilience tests | chromium | Network failure handling |
| `accessibility` | Axe + keyboard | chromium | A11y compliance |
| `performance` | Bundle size, lighthouse | N/A | Performance budgets |

**Reporting**:
- Slack notification on failure
- Weekly flakiness report
- Trend dashboard (optional)

### 8.3 Sharding Strategy

**Current**: Single worker per CI job
**Recommended**: 2-3 workers with matrix sharding

```yaml
strategy:
  matrix:
    shardIndex: [1, 2, 3]
    shardTotal: [3]
steps:
  - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

**Benefits**:
- ~3x speedup for E2E suite
- Better resource utilization
- Requires blob reporter for report merging

### 8.4 Caching Strategy

| Cache | Key | Restore | Expected Savings |
|-------|-----|---------|------------------|
| Nix store | `nix-${{ hashFiles('flake.lock') }}` | Always | 2-3 minutes |
| npm | `npm-${{ hashFiles('package-lock.json') }}` | Always | 30-60 seconds |
| Playwright browsers | Via Nix (PLAYWRIGHT_BROWSERS_PATH) | N/A | Included in Nix |

**Add Magic Nix Cache**:
```yaml
- uses: DeterminateSystems/magic-nix-cache-action@main
```

### 8.5 Artifacts

| Artifact | Trigger | Retention | Contents |
|----------|---------|-----------|----------|
| `coverage-report` | Always | 7 days | HTML coverage |
| `playwright-report-{browser}` | Always | 7 days | HTML test report |
| `test-results-{browser}` | On failure | 7 days | Traces, videos, screenshots |
| `bundle-analysis` | Nightly | 30 days | Bundle size report |

---

## 9. Flakiness Policy & Stability Targets

### 9.1 Allowed Retries

| Test Type | PR | Nightly | Justification |
|-----------|----|---------|--------------|
| Unit/Component | 0 | 0 | Must be deterministic |
| Integration (MSW) | 0 | 0 | Must be deterministic |
| E2E (mocked) | 2 | 2 | Browser timing variance |
| E2E (live Pi) | 3 | 3 | Hardware variance |

### 9.2 Quarantine Policy

**Process**:
1. Test fails 3+ times in 7 days without code change → Mark as flaky
2. Flaky test moved to `tests/e2e/quarantine/` directory
3. Quarantined tests run in nightly suite only (not PR gates)
4. Flaky tests must be fixed within 14 days or deleted
5. Document root cause in test file comment

**Tracking**:
- `@flaky` tag in test description
- GitHub issue created for each quarantine
- Weekly review of quarantine backlog

### 9.3 Stability Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| PR suite flakiness | 0% | No retries needed |
| Nightly suite flakiness | < 1% | < 4 flaky runs/month |
| Quarantine backlog | < 5 tests | Reviewed weekly |
| Main branch green streak | 20+ consecutive | Tracked in dashboard |

### 9.4 Diagnostics Playbook

**On PR failure**:
1. Check GitHub annotations for failure location
2. Download `test-results-{browser}` artifact
3. Open trace file in Playwright Trace Viewer
4. Review network requests, console logs, DOM snapshots
5. Reproduce locally: `npm run test:e2e -- --grep "test name"`

**On nightly failure**:
1. Check if same test failed on recent PR
2. If new failure, check recent main commits
3. If hardware-related, verify Pi is online
4. If flaky, apply quarantine policy

---

## 10. Acceptance Criteria (Measurable)

### Coverage Criteria

| Criterion | Target | Verification |
|-----------|--------|--------------|
| BLE provisioning has tests | > 0 tests | `grep -r "ble\|provisioning" tests/` |
| SSE reconnection tested | Integration test exists | `tests/integration/hooks/useLogs.test.tsx` |
| Contract tests exist | Schema validation in CI | `tests/integration/contracts/` |
| Zero `waitForTimeout()` | 0 instances (with exceptions) | `grep -r "waitForTimeout" tests/e2e/` |

### Stability Criteria

| Criterion | Target | Verification |
|-----------|--------|--------------|
| PR suite deterministic | 100% | No allowed retries |
| Nightly flakiness | < 1% | Tracked over 30 days |
| Quarantine backlog | < 5 tests | Weekly review |
| Main branch streak | 20+ green | CI dashboard |

### CI/Infrastructure Criteria

| Criterion | Target | Verification |
|-----------|--------|--------------|
| PR suite runtime | < 5 minutes | CI job duration |
| Nightly runtime | < 30 minutes | CI job duration |
| Traces on failure | Always uploaded | Artifact check |
| NixOS version pinned | Assertion in flake | Build fails on mismatch |

### Documentation Criteria

| Criterion | Target | Verification |
|-----------|--------|--------------|
| Local/CI parity documented | CLAUDE.md section | File review |
| API contracts documented | docs/API_CONTRACT.md | File exists |
| Performance budgets defined | docs/PERFORMANCE_BUDGETS.md | File exists |
| Flakiness policy documented | This spec | Implemented |

---

## 11. Verification Plan

### Local Verification (NixOS)

```bash
# Enter Nix development environment
nix develop

# Run unit/component/integration tests
npm run test

# Run coverage report
npm run test:coverage

# Run E2E tests (all browsers)
npm run test:e2e

# Run E2E with specific browser
npm run test:e2e -- --project=chromium

# Run smoke tests only (fast)
npm run test:e2e -- --grep "Smoke"

# Run with trace for debugging
npm run test:e2e:debug

# Run against live Pi (requires LIVE_PI_URL)
LIVE_PI_URL=http://192.168.1.124:8082 npm run test:e2e:live
```

### CI Verification

```bash
# Trigger PR workflow
git push origin feature-branch

# Manual workflow trigger
gh workflow run test.yml

# View workflow status
gh run list --workflow=test.yml

# Download artifacts
gh run download <run-id> -n playwright-report-chromium
```

### Resilience Scenario Reproduction

**SSE Reconnection**:
```typescript
// In test: Simulate network interruption
await page.route('**/api/logs', route => route.abort('failed'));
await page.waitForTimeout(1000);
await page.unrouteAll();
// Verify: Stream reconnects and displays new logs
```

**Partial API Failure**:
```typescript
// In test: System works, WiFi fails
await page.route('**/api/wifi/**', route => route.fulfill({ status: 500 }));
await page.route('**/api/system/**', route => route.fulfill({ json: systemData }));
// Verify: System section displays, WiFi shows error state
```

---

## 12. Open Questions (TBD)

### Q1: PiOrchestrator Contract Source

**Question**: Does PiOrchestrator have an OpenAPI/Swagger spec?
**Impact**: Determines contract testing approach
**Resolution Steps**:
1. Check `/home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator/` for `swagger.yaml`, `openapi.json`
2. Check Go code for annotation-based spec generation
3. If none exists, create spec from existing type definitions

### Q2: BLE Testing Approach

**Question**: How to test Web Bluetooth API in headless browser?
**Impact**: Determines BLE test strategy
**Resolution Steps**:
1. Research Playwright Web Bluetooth support
2. If unsupported, mock at API layer
3. Consider separate manual test protocol for real BLE

### Q3: Live Pi Test Automation

**Question**: Should live Pi tests run in CI on schedule?
**Impact**: Hardware availability, security (exposing Pi URL)
**Resolution Steps**:
1. Determine if Pi is accessible from GitHub Actions runner
2. Evaluate Tailscale integration for secure access
3. Consider self-hosted runner on local network

### Q4: Browser Matrix Necessity

**Question**: Do we need chromium + firefox + webkit, or just chromium?
**Impact**: CI time, maintenance burden
**Resolution Steps**:
1. Analyze user analytics for browser distribution
2. If 95%+ use Chrome/Chromium, reduce matrix
3. Keep webkit for Safari mobile testing

### Q5: Performance Monitoring Integration

**Question**: Should we integrate with external monitoring (Datadog, Grafana)?
**Impact**: Long-term performance tracking
**Resolution Steps**:
1. Evaluate existing DeliCasa observability stack
2. Determine if test metrics should feed into dashboards
3. Scope as follow-up work if needed

---

## 13. Summary

This specification defines a comprehensive hardening plan for the PiDashboard test suite, addressing:

1. **Critical gaps** in BLE provisioning, SSE reconnection, and contract validation
2. **86+ brittleness vectors** from timing-dependent tests and fragile selectors
3. **CI optimization** with proper caching, sharding, and artifact management
4. **NixOS parity** with version pinning and documented environment contracts
5. **Risk-based coverage matrix** ensuring all P0/P1 flows have appropriate tests

The roadmap prioritizes quick wins (eliminating `waitForTimeout`, adding Magic Nix Cache) before tackling larger efforts (contract testing, BLE coverage).

**Next Steps**:
1. Run `/speckit.plan` to generate implementation plan
2. Run `/speckit.tasks` to create task breakdown
3. Execute improvements in priority order
