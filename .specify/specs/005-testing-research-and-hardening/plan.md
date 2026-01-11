# Implementation Plan: Testing Research & Hardening

**Feature ID**: 005-testing-research-and-hardening
**Branch**: 005-testing-hardening
**Created**: 2026-01-07
**Status**: Ready for Implementation

---

## Technical Context

### Tech Stack
- **Testing**: Vitest 3.2.x, Playwright 1.56.x, MSW 2.8.x
- **Validation**: Zod 3.x (NEW)
- **CI**: GitHub Actions, Nix flakes
- **Framework**: React 19, TypeScript 5.x, Vite 7.x

### Dependencies
| Package | Purpose | Version |
|---------|---------|---------|
| zod | Runtime schema validation | ^3.24.0 |
| @axe-core/playwright | Accessibility testing | ^4.10.0 |

### Integration Points
- PiOrchestrator OpenAPI spec at `/api/openapi.json`
- Existing MSW handlers at `tests/integration/mocks/handlers.ts`
- Playwright config at `playwright.config.ts`
- GitHub Actions workflow at `.github/workflows/test.yml`

---

## Constitution Check

### Principle 1: Code Quality ✅
- Zod schemas will have explicit TypeScript types
- All new test utilities will follow strict mode
- No `@ts-ignore` in test infrastructure

### Principle 2: Testing Discipline ✅
- **Direct alignment** - This feature enhances testing coverage
- Will maintain >70% coverage threshold
- Adds contract tests, resilience tests, accessibility tests

### Principle 3: Security ✅
- No secrets in test code
- Mock data sanitized
- Live Pi tests require explicit env var

### Principle 4: User Experience ✅
- Accessibility tests ensure WCAG 2.1 AA compliance
- Touch target validation via axe-core
- Keyboard navigation tests

### Principle 5: Observability ✅
- Performance budgets for critical metrics
- CI artifacts for debugging
- Trace/video on failure

### Principle 6: Maintainability ✅
- Schemas as single source of truth
- Flaky test quarantine policy
- Clear test organization

### Principle 7: Documentation ✅
- API contracts documented
- Performance budgets documented
- Local/CI parity documented in CLAUDE.md

---

## Implementation Phases

### Phase 0: Quick Wins (Estimated: 1 day)

**Goal**: Immediate stability improvements with minimal effort

| Task | Files | Effort |
|------|-------|--------|
| A1. Remove `waitForTimeout()` calls | `tests/e2e/*.spec.ts` | 2-3 hours |
| A2. Add GitHub reporter | `playwright.config.ts` | 15 min |
| A3. Add trace upload on failure | `.github/workflows/test.yml` | 30 min |
| A4. Add Magic Nix Cache | `.github/workflows/test.yml` | 15 min |

**Acceptance**:
- Zero `waitForTimeout()` calls (grep verification)
- Failed tests appear as PR annotations
- Traces uploaded on failure
- CI time reduced by 30%+

---

### Phase 1: Contract Testing (Estimated: 1.5 days)

**Goal**: Prevent silent API contract drift

| Task | Files | Effort |
|------|-------|--------|
| B1. Create Zod schemas | `src/infrastructure/api/schemas.ts` | 3 hours |
| B2. Add schema validation to API calls | `src/infrastructure/api/*.ts` | 2 hours |
| B3. Create contract tests | `tests/integration/contracts/*.test.ts` | 2 hours |
| B4. Document API contracts | `docs/API_CONTRACT.md` | 1 hour |

**File Structure**:
```
src/infrastructure/api/
├── schemas.ts      # NEW: Zod schemas
├── client.ts       # Modify: Add validation
├── wifi.ts         # Modify: Validate responses
├── system.ts       # Modify: Validate responses
├── config.ts       # Modify: Validate responses
├── door.ts         # Modify: Validate responses
├── logs.ts         # Modify: Validate responses
└── network.ts      # Modify: Validate responses

tests/integration/contracts/
├── types.ts        # NEW: Contract test types
├── system.contract.test.ts  # NEW
├── wifi.contract.test.ts    # NEW
├── config.contract.test.ts  # NEW
├── door.contract.test.ts    # NEW
└── logs.contract.test.ts    # NEW
```

**Acceptance**:
- All critical endpoints have Zod schemas
- MSW mocks validated against schemas
- Contract tests in CI pass

---

### Phase 2: Brittleness Fixes (Estimated: 1 day)

**Goal**: Reduce fragile selectors and improve test reliability

| Task | Files | Effort |
|------|-------|--------|
| C1. Add data-testid to components | `src/presentation/components/**/*.tsx` | 2 hours |
| C2. Update E2E tests to use testid | `tests/e2e/*.spec.ts` | 2 hours |
| C3. Replace CSS class selectors in component tests | `tests/component/**/*.test.tsx` | 2 hours |
| C4. Remove silent `.catch()` handlers | `tests/e2e/*.spec.ts` | 1 hour |

**Components to Update**:
- `NetworkList.tsx` - Add `data-testid="network-item-{ssid}"`
- `MetricCard.tsx` - Add `data-testid="metric-{label}"`
- `DoorControls.tsx` - Add `data-testid="door-open-btn"`, etc.
- `ConfigEditor.tsx` - Add `data-testid="config-save-btn"`
- `LogFilter.tsx` - Add `data-testid="log-level-select"`

**Acceptance**:
- High-value components have data-testid
- E2E tests use role-based or testid selectors
- No `.bg-green-500` or similar CSS selectors in tests
- No silent `.catch(() => false)` patterns

---

### Phase 3: Resilience Tests (Estimated: 2 days)

**Goal**: Test network failures and recovery

| Task | Files | Effort |
|------|-------|--------|
| D1. Add SSE reconnection tests | `tests/integration/hooks/useLogs.test.tsx` | 3 hours |
| D2. Add partial API failure tests | `tests/integration/hooks/*.test.tsx` | 3 hours |
| D3. Create E2E resilience spec | `tests/e2e/resilience.spec.ts` | 4 hours |
| D4. Add offline queue integration tests | `tests/integration/offline/*.test.tsx` | 3 hours |

**New Test Files**:
```
tests/
├── integration/
│   ├── hooks/
│   │   └── useLogs.test.tsx     # Extend: reconnection scenarios
│   └── offline/
│       ├── queue-sync.test.tsx  # NEW: Offline queue sync
│       └── conflict.test.tsx    # NEW: Conflict resolution
└── e2e/
    └── resilience.spec.ts       # NEW: Network failure E2E
```

**Scenarios to Cover**:
1. SSE connection drops and reconnects
2. System API works, WiFi API fails (partial failure)
3. Config save fails, rollback works
4. Offline queue syncs on reconnection
5. API timeout handling

**Acceptance**:
- SSE reconnection test passes
- Partial failure graceful degradation verified
- Offline queue sync tested

---

### Phase 4: BLE Provisioning Tests (Estimated: 1.5 days)

**Goal**: Add test coverage for critical BLE feature

| Task | Files | Effort |
|------|-------|--------|
| E1. Create Bluetooth mock | `tests/mocks/bluetooth.ts` | 2 hours |
| E2. Add provisioning unit tests | `tests/unit/bluetooth/provisioning.test.ts` | 3 hours |
| E3. Add provisioning component tests | `tests/component/devices/ProvisioningModal.test.tsx` | 3 hours |
| E4. Add BLE hook integration tests | `tests/integration/hooks/useDevices.test.tsx` | 2 hours |

**Test Structure**:
```
tests/
├── mocks/
│   └── bluetooth.ts             # NEW: Mock Web Bluetooth API
├── unit/
│   └── bluetooth/
│       └── provisioning.test.ts # NEW: Unit tests
├── component/
│   └── devices/
│       └── ProvisioningModal.test.tsx # NEW: Component tests
└── integration/
    └── hooks/
        └── useDevices.test.tsx  # NEW: Hook tests
```

**Scenarios to Cover**:
1. Device discovery (mocked)
2. WiFi credentials write
3. MQTT config write
4. Status verification
5. Timeout handling
6. Error states

**Acceptance**:
- BLE provisioning has >0 tests
- All provisioning steps covered
- Error scenarios tested

---

### Phase 5: Accessibility Tests (Estimated: 1 day)

**Goal**: Ensure WCAG 2.1 AA compliance

| Task | Files | Effort |
|------|-------|--------|
| F1. Install axe-core | `package.json` | 15 min |
| F2. Create accessibility spec | `tests/e2e/accessibility.spec.ts` | 3 hours |
| F3. Add keyboard navigation tests | `tests/e2e/accessibility.spec.ts` | 2 hours |
| F4. Fix critical a11y violations | `src/presentation/components/**/*.tsx` | 2 hours |

**Test Coverage**:
- axe-core scan on each major tab
- Tab navigation through interactive elements
- Arrow key navigation in tab list
- Focus management on modal open/close
- Form label associations

**Acceptance**:
- No critical/serious axe violations
- Keyboard navigation works on all tabs
- Focus properly managed

---

### Phase 6: CI Optimization (Estimated: 0.5 days)

**Goal**: Optimize CI for speed and reliability

| Task | Files | Effort |
|------|-------|--------|
| G1. Split PR vs nightly suites | `.github/workflows/test.yml` | 2 hours |
| G2. Add sharding for E2E | `.github/workflows/test.yml` | 1 hour |
| G3. Add bundle size check | `.github/workflows/test.yml`, `package.json` | 1 hour |

**CI Structure**:
```yaml
# PR Gates (< 5 min)
- unit-tests
- lint
- typecheck
- e2e-smoke (chromium only)
- contract-check
- bundle-size

# Nightly (< 30 min)
- full-e2e (chromium, firefox)
- resilience
- accessibility
- performance
```

**Acceptance**:
- PR suite < 5 minutes
- Nightly suite < 30 minutes
- Bundle size enforced

---

### Phase 7: Documentation (Estimated: 0.5 days)

**Goal**: Document all new test infrastructure

| Task | Files | Effort |
|------|-------|--------|
| H1. Update CLAUDE.md with testing section | `CLAUDE.md` | 1 hour |
| H2. Create performance budgets doc | `docs/PERFORMANCE_BUDGETS.md` | 1 hour |
| H3. Update CHANGELOG | `CHANGELOG.md` | 30 min |

**Documentation Sections**:
- Local/CI parity instructions
- Test command reference
- Flakiness policy
- Contract testing approach
- Performance budget enforcement

**Acceptance**:
- CLAUDE.md has testing section
- Performance budgets documented
- Flakiness policy documented

---

## Risk Mitigation

### Risk 1: Zod schema/type drift
**Mitigation**: Contract tests validate MSW mocks match schemas at build time

### Risk 2: BLE tests difficult to mock
**Mitigation**: Comprehensive mock implementation; fallback to manual testing protocol

### Risk 3: CI time increases
**Mitigation**: Sharding, PR/nightly split, chromium-only for PR gates

### Risk 4: Accessibility fixes break UI
**Mitigation**: Component tests verify visual appearance not changed

---

## Dependencies Graph

```
Phase 0 (Quick Wins)
    │
    ├──► Phase 1 (Contract Testing)
    │        │
    │        └──► Phase 2 (Brittleness Fixes)
    │                 │
    │                 └──► Phase 3 (Resilience Tests)
    │
    ├──► Phase 4 (BLE Tests) [Independent]
    │
    ├──► Phase 5 (Accessibility) [Independent]
    │
    └──► Phase 6 (CI Optimization)
             │
             └──► Phase 7 (Documentation)
```

**Parallel Execution**:
- Phase 4 (BLE) can run in parallel with Phase 1-3
- Phase 5 (A11y) can run in parallel with Phase 1-4
- Phase 6 depends on Phase 0
- Phase 7 depends on all other phases

---

## Success Metrics

| Metric | Before | After | Verification |
|--------|--------|-------|--------------|
| BLE test count | 0 | >10 | `grep -r "provisioning" tests/` |
| `waitForTimeout` instances | 38+ | 0 | `grep -r "waitForTimeout" tests/e2e/` |
| Contract tests | 0 | >10 | `tests/integration/contracts/` exists |
| Critical a11y violations | Unknown | 0 | axe-core report |
| PR suite time | ~8 min | <5 min | CI job duration |
| Nightly flakiness | Unknown | <1% | 30-day tracking |

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Quick Wins | 1 day | None |
| Phase 1: Contract Testing | 1.5 days | Phase 0 |
| Phase 2: Brittleness Fixes | 1 day | Phase 1 |
| Phase 3: Resilience Tests | 2 days | Phase 2 |
| Phase 4: BLE Tests | 1.5 days | Phase 0 |
| Phase 5: Accessibility | 1 day | Phase 0 |
| Phase 6: CI Optimization | 0.5 days | Phase 0 |
| Phase 7: Documentation | 0.5 days | All |

**Total**: ~9 days (with parallelization: ~6-7 days)

---

## Next Steps

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Create feature branch: `git checkout -b 005-testing-hardening`
3. Start with Phase 0 quick wins
4. Execute phases in dependency order
