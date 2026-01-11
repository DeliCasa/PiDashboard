# Research: Testing Research & Hardening

**Feature ID**: 005-testing-research-and-hardening
**Research Date**: 2026-01-07
**Status**: Complete

---

## Open Questions Resolution

### Q1: PiOrchestrator Contract Source

**Question**: Does PiOrchestrator have an OpenAPI/Swagger spec?

**Decision**: YES - Use existing OpenAPI 3.0.3 spec from PiOrchestrator

**Rationale**:
- PiOrchestrator has a complete programmatic OpenAPI spec at `/home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator/internal/openapi/`
- Spec served at runtime: `/api/openapi.json`
- Interactive docs at `/docs` endpoint using go-scalar-api-reference
- Tags: door-control, image-capture, camera-management, system, documentation

**Alternatives Considered**:
- Create spec from scratch in PiDashboard → Rejected (duplication, drift risk)
- No contract testing → Rejected (spec exists, should leverage it)

**Impact on Implementation**:
- Can fetch `/api/openapi.json` and validate against it in CI
- Contract tests can validate MSW mocks match OpenAPI schemas
- No need to create new API documentation

---

### Q2: BLE Testing Approach

**Question**: How to test Web Bluetooth API in headless browser?

**Decision**: Mock at service layer; unit test provisioner class

**Rationale**:
- Web Bluetooth not supported in headless Playwright
- PiDashboard has well-structured BLE code in `src/infrastructure/bluetooth/provisioning.ts`
- Singleton pattern (`getProvisioner()`) is mockable
- All interactions localized in `BluetoothProvisioner` class
- Progress callbacks allow testing state transitions

**Alternatives Considered**:
- Playwright Web Bluetooth support → Not available (experimental CDP only)
- Skip BLE testing entirely → Rejected (critical feature, 0 coverage is unacceptable)
- Mock at navigator level → Complex, fragile

**Implementation Strategy**:
1. Unit tests: Mock `navigator.bluetooth` global
2. Component tests: Mock `getProvisioner()` return value
3. E2E tests: Mock BLE provisioning at page level (skip actual Bluetooth)
4. Manual testing: Real hardware validation (documented protocol)

**Files to Test**:
- `src/infrastructure/bluetooth/provisioning.ts` - Core logic
- `src/presentation/components/devices/DeviceSection.tsx` - UI integration
- `src/application/hooks/useDevices.ts` - Hook integration

---

### Q3: Live Pi Test Automation

**Question**: Should live Pi tests run in CI on schedule?

**Decision**: NO - Keep as manual/local-only for now

**Rationale**:
- Pi not accessible from GitHub Actions runners (no Tailscale on GHA)
- Security concern exposing Pi URL in CI secrets
- Self-hosted runner adds maintenance burden
- Current 16 skipped tests are acceptable for manual validation

**Alternatives Considered**:
- Self-hosted runner on LAN → Rejected (maintenance overhead)
- Tailscale on GHA → Requires paid plan, complex setup
- VPN tunnel → Security risk, complexity

**Future Consideration**:
- If DeliCasa grows, consider dedicated IoT test infrastructure
- Could revisit with Tailscale ACL-based access

---

### Q4: Browser Matrix Necessity

**Question**: Do we need chromium + firefox + webkit, or just chromium?

**Decision**: Keep chromium + firefox; drop webkit in PR gates, keep in nightly

**Rationale**:
- Pi dashboard primarily accessed via Chrome/Chromium
- Firefox provides meaningful cross-browser coverage
- Webkit (Safari) has NixOS browser provisioning issues
- Nightly can afford longer runtime for full matrix

**Alternatives Considered**:
- Chromium only → Rejected (misses Firefox-specific issues)
- Full matrix in PR → Rejected (too slow for fast feedback)

**Implementation**:
- PR gates: chromium only (< 5 min target)
- Nightly: chromium + firefox (webkit optional if stable)

---

### Q5: Performance Monitoring Integration

**Question**: Should we integrate with external monitoring (Datadog, Grafana)?

**Decision**: Define budgets only; defer monitoring integration

**Rationale**:
- Out of scope per spec non-goals ("Define budgets only, not full perf infrastructure")
- DeliCasa has existing Grafana stack but test metrics integration is separate project
- Bundle size check in CI is sufficient for now

**Alternatives Considered**:
- Full Lighthouse CI integration → Rejected (scope creep)
- Datadog RUM → Rejected (cost, complexity)

**Future Consideration**:
- Track as follow-up feature if performance issues emerge
- Grafana test metrics dashboard could be valuable for nightly trend analysis

---

## Technology Research

### Zod Schema Validation

**Decision**: Add Zod for runtime API response validation

**Rationale**:
- Lightweight (~50KB), TypeScript-first
- Generates types from schemas (avoids duplication)
- Easy MSW integration for contract tests
- Already used in DeliCasa ecosystem (BridgeServer)

**Implementation Pattern**:
```typescript
// src/infrastructure/api/schemas.ts
import { z } from 'zod';

export const SystemInfoSchema = z.object({
  hostname: z.string(),
  uptime: z.number(),
  cpu_cores: z.number(),
  cpu_usage: z.number(),
  memory_total: z.number(),
  memory_used: z.number(),
  disk_total: z.number(),
  disk_used: z.number(),
  temperature: z.number().nullable(),
});

export type SystemInfo = z.infer<typeof SystemInfoSchema>;
```

**Contract Test Pattern**:
```typescript
// tests/integration/contracts/system.contract.test.ts
import { SystemInfoSchema } from '@/infrastructure/api/schemas';
import { mockSystemResponse } from '../mocks/handlers';

test('MSW mock matches SystemInfo schema', () => {
  const result = SystemInfoSchema.safeParse(mockSystemResponse);
  expect(result.success).toBe(true);
});
```

---

### Playwright Reliability Patterns

**Research Sources**:
- Playwright Best Practices: https://playwright.dev/docs/best-practices
- BrowserStack Selector Guide: https://www.browserstack.com/guide/playwright-selectors-best-practices
- Better Stack Flaky Tests: https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/

**Key Patterns to Adopt**:

1. **Role-based selectors** (priority 1):
   ```typescript
   // Preferred
   await page.getByRole('button', { name: /submit/i }).click();
   // Avoid
   await page.click('.btn-primary');
   ```

2. **Auto-waiting assertions** (priority 1):
   ```typescript
   // Preferred - auto-waits up to timeout
   await expect(page.getByText('Success')).toBeVisible();
   // Avoid - hardcoded timing
   await page.waitForTimeout(500);
   ```

3. **data-testid fallback** (priority 2):
   ```typescript
   // For non-semantic elements
   await page.getByTestId('network-signal-indicator').toBeVisible();
   ```

4. **Trace configuration** (already configured):
   ```typescript
   trace: 'on-first-retry',
   screenshot: 'only-on-failure',
   video: 'on-first-retry',
   ```

---

### NixOS Playwright Patterns

**Research Sources**:
- NixOS Wiki Playwright: https://nixos.wiki/wiki/Playwright
- Playwright NixOS Blog: https://primamateria.github.io/blog/playwright-nixos-webdev/
- Magic Nix Cache: https://github.com/DeterminateSystems/magic-nix-cache-action

**Version Pinning Pattern**:
```nix
# flake.nix assertion
assert pkgs.playwright-driver.version == "1.56.1" ||
  builtins.trace "WARNING: Playwright version mismatch" true;
```

**CI Caching Pattern**:
```yaml
# .github/workflows/test.yml
- uses: DeterminateSystems/magic-nix-cache-action@main
- uses: actions/cache@v4
  with:
    path: /nix/store
    key: nix-${{ hashFiles('flake.lock') }}
```

---

## Data-testid Strategy

**Current State**: No data-testid in component source; E2E tests use role/text/class selectors

**Decision**: Add data-testid to high-value components selectively

**Components to Add data-testid**:
| Component | Element | Proposed testid |
|-----------|---------|-----------------|
| NetworkList | Network item | `network-item-{ssid}` |
| NetworkList | Signal indicator | `signal-strength` |
| MetricCard | Progress bar | `metric-progress-{label}` |
| ThresholdIndicator | Status dot | `threshold-indicator` |
| DoorControls | Open button | `door-open-btn` |
| DoorControls | Close button | `door-close-btn` |
| ConfigEditor | Save button | `config-save-btn` |
| LogFilter | Level select | `log-level-select` |

**Implementation Rule**:
- Add data-testid only when role-based selectors are insufficient
- Document testid naming convention in CLAUDE.md
- Format: `{component}-{element}` or `{component}-{element}-{identifier}`

---

## Summary

All open questions resolved. Key decisions:

1. **OpenAPI**: Leverage existing PiOrchestrator spec
2. **BLE Testing**: Mock at service layer
3. **Live Pi CI**: Manual only (defer automation)
4. **Browser Matrix**: Chromium PR + chromium/firefox nightly
5. **Performance**: Budgets only, defer monitoring

Ready to proceed with implementation plan.
