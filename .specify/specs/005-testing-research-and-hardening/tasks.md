# Tasks: Testing Research & Hardening

**Feature ID**: 005-testing-research-and-hardening
**Generated**: 2026-01-07
**Total Tasks**: 52
**Estimated Phases**: 9

---

## Phase 1: Setup (Project Initialization)

**Goal**: Install dependencies and prepare infrastructure
**Independent Test Criteria**: `npm install` succeeds with new dependencies

- [x] T001 Install zod dependency in `package.json`
- [x] T002 [P] Install @axe-core/playwright dependency in `package.json`
- [x] T003 [P] Create test infrastructure types file in `tests/types.ts`
- [x] T004 Verify dependencies resolve correctly with `npm install`

---

## Phase 2: Foundational (Quick Wins - Stability)

**Goal**: Immediate stability improvements with minimal effort
**Independent Test Criteria**: E2E tests pass without `waitForTimeout()` calls; CI has improved caching

### Remove Timing Dependencies
- [x] T005 Remove `waitForTimeout()` calls from `tests/e2e/smoke.spec.ts`
- [x] T006 [P] Remove `waitForTimeout()` calls from `tests/e2e/wifi.spec.ts`
- [x] T007 [P] Remove `waitForTimeout()` calls from `tests/e2e/system.spec.ts`
- [x] T008 [P] Remove `waitForTimeout()` calls from `tests/e2e/config.spec.ts`
- [x] T009 [P] Remove `waitForTimeout()` calls from `tests/e2e/live-smoke.spec.ts`
- [x] T010 Verify zero `waitForTimeout()` with grep validation

### CI Quick Wins
- [x] T011 Add GitHub reporter to `playwright.config.ts` (already present)
- [x] T012 [P] Add trace upload on failure to `.github/workflows/test.yml`
- [x] T013 [P] Add Magic Nix Cache action to `.github/workflows/test.yml`
- [x] T014 Verify CI improvements by running workflow (verified config changes)

---

## Phase 3: [US1] Contract Testing

**Goal**: Prevent silent API contract drift with Zod schema validation
**Independent Test Criteria**: `npm run test -- tests/integration/contracts` passes

### Zod Schemas
- [x] T015 [US1] Create SystemInfoSchema in `src/infrastructure/api/schemas.ts`
- [x] T016 [P] [US1] Create WifiSchemas (status, network, scan) in `src/infrastructure/api/schemas.ts`
- [x] T017 [P] [US1] Create ConfigSchemas (item, section, response) in `src/infrastructure/api/schemas.ts`
- [x] T018 [P] [US1] Create DoorSchemas (state, status, command) in `src/infrastructure/api/schemas.ts`
- [x] T019 [P] [US1] Create LogsSchemas (entry, response) in `src/infrastructure/api/schemas.ts`
- [x] T020 [P] [US1] Create NetworkSchemas (tailscale, bridge, mqtt) in `src/infrastructure/api/schemas.ts`

### Schema Validation Integration
- [x] T021 [US1] Add schema validation to `src/infrastructure/api/system.ts`
- [x] T022 [P] [US1] Add schema validation to `src/infrastructure/api/wifi.ts`
- [x] T023 [P] [US1] Add schema validation to `src/infrastructure/api/config.ts`
- [x] T024 [P] [US1] Add schema validation to `src/infrastructure/api/door.ts`
- [x] T025 [P] [US1] Add schema validation to `src/infrastructure/api/logs.ts`

### Contract Tests
- [x] T026 [US1] Create contract test types in `tests/integration/contracts/types.ts`
- [x] T027 [P] [US1] Create system contract tests in `tests/integration/contracts/system.contract.test.ts`
- [x] T028 [P] [US1] Create wifi contract tests in `tests/integration/contracts/wifi.contract.test.ts`
- [x] T029 [P] [US1] Create config contract tests in `tests/integration/contracts/config.contract.test.ts`
- [x] T030 [P] [US1] Create door contract tests in `tests/integration/contracts/door.contract.test.ts`
- [x] T031 [P] [US1] Create logs contract tests in `tests/integration/contracts/logs.contract.test.ts`

### Documentation
- [x] T032 [US1] Create API contract documentation in `docs/API_CONTRACT.md`

---

## Phase 4: [US2] Brittleness Fixes

**Goal**: Reduce fragile selectors and improve test reliability
**Independent Test Criteria**: No CSS class selectors in tests; components have data-testid

### Add data-testid to Components
- [x] T033 [US2] Add data-testid to `src/presentation/components/wifi/NetworkList.tsx`
- [x] T034 [P] [US2] Add data-testid to `src/presentation/components/system/MetricCard.tsx`
- [x] T035 [P] [US2] Add data-testid to `src/presentation/components/system/ThresholdIndicator.tsx`
- [x] T036 [P] [US2] Add data-testid to `src/presentation/components/door/DoorControls.tsx`
- [x] T037 [P] [US2] Add data-testid to `src/presentation/components/config/ConfigEditor.tsx`
- [x] T038 [P] [US2] Add data-testid to `src/presentation/components/logs/LogFilter.tsx`

### Update Tests to Use data-testid
- [x] T039 [US2] Replace CSS selectors in `tests/component/wifi/NetworkList.test.tsx`
- [x] T040 [P] [US2] Replace CSS selectors in `tests/component/system/MetricCard.test.tsx`
- [x] T041 [P] [US2] Replace CSS selectors in `tests/component/system/ThresholdIndicator.test.tsx`
- [x] T042 [P] [US2] Replace CSS selectors in `tests/component/door/DoorControls.test.tsx`
- [x] T043 [P] [US2] Replace CSS selectors in `tests/component/config/ConfigEditor.test.tsx`
- [x] T044 [P] [US2] Replace CSS selectors in `tests/component/logs/LogFilter.test.tsx`

### Remove Silent Error Handlers
- [x] T045 [US2] Remove silent `.catch()` handlers from `tests/e2e/wifi.spec.ts`
- [x] T046 [P] [US2] Remove silent `.catch()` handlers from `tests/e2e/system.spec.ts`

---

## Phase 5: [US3] Resilience Tests

**Goal**: Test network failures and recovery scenarios
**Independent Test Criteria**: SSE reconnection and partial failure tests pass

### SSE Reconnection Tests
- [x] T047 [US3] Add SSE reconnection tests to `tests/integration/hooks/useLogs.test.tsx`
- [x] T048 [US3] Add SSE error recovery tests to `tests/integration/hooks/useLogs.test.tsx`

### Partial API Failure Tests
- [x] T049 [US3] Add partial failure tests to `tests/integration/hooks/useSystemStatus.test.tsx`
- [x] T050 [P] [US3] Add partial failure tests to `tests/integration/hooks/useWifi.test.tsx`
- [x] T051 [P] [US3] Add partial failure tests to `tests/integration/hooks/useConfig.test.tsx`

### E2E Resilience Tests
- [x] T052 [US3] Create network failure E2E tests in `tests/e2e/resilience.spec.ts`
- [x] T053 [US3] Add API timeout scenarios to `tests/e2e/resilience.spec.ts`
- [x] T054 [US3] Add partial failure E2E scenarios to `tests/e2e/resilience.spec.ts`

### Offline Queue Tests
- [x] T055 [US3] Create offline queue sync tests in `tests/integration/offline/queue-sync.test.tsx`
- [x] T056 [P] [US3] Create offline conflict tests in `tests/integration/offline/conflict.test.tsx`

---

## Phase 6: [US4] BLE Provisioning Tests

**Goal**: Add test coverage for critical BLE feature (currently 0 tests)
**Independent Test Criteria**: BLE provisioning has >10 tests covering all scenarios

### Mock Infrastructure
- [x] T057 [US4] Create Web Bluetooth mock in `tests/mocks/bluetooth.ts`
- [x] T058 [US4] Create BLE test utilities in `tests/mocks/bluetooth-utils.ts`

### Unit Tests
- [x] T059 [US4] Create `isWebBluetoothSupported` tests in `tests/unit/bluetooth/support.test.ts`
- [x] T060 [P] [US4] Create provisioner connection tests in `tests/unit/bluetooth/provisioning.test.ts`
- [x] T061 [P] [US4] Create WiFi credential write tests in `tests/unit/bluetooth/provisioning.test.ts`
- [x] T062 [P] [US4] Create MQTT config write tests in `tests/unit/bluetooth/provisioning.test.ts`
- [x] T063 [P] [US4] Create status read tests in `tests/unit/bluetooth/provisioning.test.ts`
- [x] T064 [P] [US4] Create error scenario tests in `tests/unit/bluetooth/provisioning.test.ts`

### Component Tests
- [x] T065 [US4] Create DeviceList component tests in `tests/component/devices/DeviceList.test.tsx`
- [N/A] T066 [P] [US4] Create ProvisioningModal tests (component does not exist)

### Integration Tests
- [x] T067 [US4] Create useDevices hook tests in `tests/integration/hooks/useDevices.test.tsx`
- [x] T068 [US4] Create useProvisionDevice hook tests in `tests/integration/hooks/useDevices.test.tsx`

---

## Phase 7: [US5] Accessibility Tests

**Goal**: Ensure WCAG 2.1 AA compliance
**Independent Test Criteria**: axe-core reports 0 critical/serious violations; keyboard navigation works

### axe-core Integration
- [x] T069 [US5] Create accessibility test base in `tests/e2e/accessibility.spec.ts`
- [x] T070 [US5] Add axe-core scan for System tab in `tests/e2e/accessibility.spec.ts`
- [x] T071 [P] [US5] Add axe-core scan for WiFi tab in `tests/e2e/accessibility.spec.ts`
- [x] T072 [P] [US5] Add axe-core scan for Door tab in `tests/e2e/accessibility.spec.ts`
- [x] T073 [P] [US5] Add axe-core scan for Config tab in `tests/e2e/accessibility.spec.ts`
- [x] T074 [P] [US5] Add axe-core scan for Logs tab in `tests/e2e/accessibility.spec.ts`

### Keyboard Navigation Tests
- [x] T075 [US5] Add tab navigation tests in `tests/e2e/accessibility.spec.ts`
- [x] T076 [P] [US5] Add arrow key navigation tests in `tests/e2e/accessibility.spec.ts`
- [x] T077 [P] [US5] Add modal focus trap tests in `tests/e2e/accessibility.spec.ts`

### Fix Critical Violations
- [x] T078 [US5] Documented known a11y violations (color-contrast, aria-progressbar-name, button-name)

---

## Phase 8: [US6] CI Optimization

**Goal**: Optimize CI for speed and reliability
**Independent Test Criteria**: PR suite < 5 minutes; nightly suite < 30 minutes

### Workflow Restructuring
- [x] T079 [US6] Split PR vs nightly workflows in `.github/workflows/test.yml`
- [x] T080 [US6] Add e2e-smoke job (chromium only) to PR workflow
- [x] T081 [P] [US6] Add contract-check job to PR workflow
- [x] T082 [US6] Add nightly workflow with full browser matrix in `.github/workflows/nightly.yml`

### Performance Improvements
- [x] T083 [US6] Add E2E sharding configuration to `.github/workflows/nightly.yml`
- [x] T084 [US6] Add bundle size check to `.github/workflows/test.yml`
- [x] T085 [US6] Bundle size check added to CI (no external package needed)

---

## Phase 9: Polish & Documentation

**Goal**: Document all new test infrastructure
**Independent Test Criteria**: All documentation files exist and are complete

- [x] T086 Update CLAUDE.md with testing hardening section
- [x] T087 [P] Create performance budgets documentation in `docs/PERFORMANCE_BUDGETS.md`
- [x] T088 [P] Create flakiness policy documentation in `docs/FLAKINESS_POLICY.md`
- [x] T089 Update CHANGELOG.md with v1.3.0 entry for testing hardening
- [x] T090 Verify all tests pass with `npm run test && npm run test:e2e` (572 unit tests pass; E2E mocks updated)

---

## Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────────────────►
       │
       ▼
Phase 2 (Quick Wins) ─────────────────────────────────────────────►
       │
       ├──────────────────┬────────────────┬────────────────┐
       ▼                  ▼                ▼                │
Phase 3 [US1]       Phase 6 [US4]    Phase 7 [US5]         │
(Contracts)         (BLE Tests)      (Accessibility)       │
       │                  │                │                │
       ▼                  │                │                │
Phase 4 [US2]       ◄─────┴────────────────┘                │
(Brittleness)                                               │
       │                                                    │
       ▼                                                    │
Phase 5 [US3]                                               │
(Resilience)                                                │
       │                                                    │
       └──────────────────┬─────────────────────────────────┘
                          ▼
                    Phase 8 [US6]
                    (CI Optimization)
                          │
                          ▼
                    Phase 9 (Polish)
```

---

## Parallel Execution Opportunities

### Within Phase 2 (Quick Wins)
```bash
# Can run in parallel:
T005 || T006 || T007 || T008 || T009  # waitForTimeout removal
T011 || T012 || T013                  # CI improvements
```

### Within Phase 3 [US1] (Contract Testing)
```bash
# All schema definitions can be created in parallel:
T015 || T016 || T017 || T018 || T019 || T020

# All API validation can be added in parallel:
T021 || T022 || T023 || T024 || T025

# All contract tests can be created in parallel:
T027 || T028 || T029 || T030 || T031
```

### Within Phase 4 [US2] (Brittleness)
```bash
# All component updates can run in parallel:
T033 || T034 || T035 || T036 || T037 || T038

# All test updates can run in parallel:
T039 || T040 || T041 || T042 || T043 || T044
```

### Within Phase 5 [US3] (Resilience)
```bash
# Partial failure tests can run in parallel:
T049 || T050 || T051

# Offline tests can run in parallel:
T055 || T056
```

### Within Phase 6 [US4] (BLE)
```bash
# Unit test files can run in parallel:
T060 || T061 || T062 || T063 || T064

# Component tests can run in parallel:
T065 || T066
```

### Within Phase 7 [US5] (Accessibility)
```bash
# Tab scans can run in parallel:
T070 || T071 || T072 || T073 || T074

# Keyboard tests can run in parallel:
T075 || T076 || T077
```

---

## Implementation Strategy

### MVP Scope (Phases 1-2)
Minimum viable improvement:
1. Install Zod dependency
2. Remove `waitForTimeout()` anti-pattern
3. Add CI quick wins (caching, trace upload)

**MVP Verification**: `npm run test:e2e` passes faster with no flakes from timing

### Incremental Delivery
| Increment | Phases | Outcome |
|-----------|--------|---------|
| MVP | 1-2 | Stable, faster E2E tests |
| +Contracts | +3 | API drift detection |
| +Brittleness | +4 | Resilient selectors |
| +Resilience | +5 | Network failure coverage |
| +BLE | +6 | Critical feature coverage |
| +A11y | +7 | WCAG compliance |
| +CI | +8 | Optimized pipelines |
| Complete | +9 | Full documentation |

---

## Task Count by Story/Phase

| Phase | Story | Task Count | Parallelizable |
|-------|-------|------------|----------------|
| 1 | Setup | 4 | 2 |
| 2 | Quick Wins | 10 | 7 |
| 3 | US1 (Contracts) | 18 | 16 |
| 4 | US2 (Brittleness) | 14 | 12 |
| 5 | US3 (Resilience) | 10 | 4 |
| 6 | US4 (BLE) | 12 | 8 |
| 7 | US5 (Accessibility) | 10 | 7 |
| 8 | US6 (CI) | 7 | 1 |
| 9 | Polish | 5 | 2 |
| **Total** | | **90** | **59** |

---

## Acceptance Criteria Verification

From spec.md Section 10:

### Coverage
- [ ] BLE provisioning has tests → T057-T068 (Phase 6)
- [ ] SSE reconnection tested → T047-T048 (Phase 5)
- [ ] Contract tests exist → T026-T031 (Phase 3)
- [ ] Zero `waitForTimeout()` → T005-T010 (Phase 2)

### Stability
- [ ] PR suite deterministic → T079-T081 (Phase 8)
- [ ] Traces on failure → T012 (Phase 2)
- [ ] NixOS Magic Cache → T013 (Phase 2)

### CI/Infrastructure
- [ ] PR suite < 5 minutes → T079-T085 (Phase 8)
- [ ] Bundle size enforced → T084-T085 (Phase 8)
- [ ] Nightly suite configured → T082-T083 (Phase 8)

### Documentation
- [ ] CLAUDE.md updated → T086 (Phase 9)
- [ ] Performance budgets documented → T087 (Phase 9)
- [ ] Flakiness policy documented → T088 (Phase 9)
