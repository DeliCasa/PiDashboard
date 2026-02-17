# Research: Live Dashboard Inventory Validation

**Feature**: 054-live-dashboard-inventory-validation
**Date**: 2026-02-17

## R1: Playwright Preflight Pattern

**Decision**: Use `test.beforeAll()` + `test.skip(condition, reason)` to skip the entire `test.describe()` suite.

**Rationale**: This is the established pattern in the codebase (`live-smoke.spec.ts:17-20`). It produces clean "Skipped" entries in Playwright reports with visible skip reasons. Individual `test.skip()` per test is redundant; `test.fixme()` is for known broken tests, not conditional execution.

**Alternatives considered**:
- `test.fixme()` — marks tests as expected to fail, not suitable for environment-conditional execution
- Per-test `if (!env) { test.skip() }` — already used in `live-smoke.spec.ts` as a redundant guard; the `beforeAll` pattern is cleaner

## R2: Screenshot Capture Strategy

**Decision**: Use `page.screenshot({ path: 'descriptive-name.png' })` at key workflow steps, combined with `test.step()` for structured reporting.

**Rationale**: The config already sets `screenshot: 'only-on-failure'` for default tests. Live tests need explicit checkpoints. `test.step()` creates a collapsible hierarchy in HTML reports (e.g., "1. Navigate to delta → 2. Edit count → 3. Submit correction").

**Key pattern**:
```typescript
await test.step('View delta table', async () => {
  await expect(page.locator('[data-testid="inventory-delta-table"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/live-delta-view.png' });
});
```

## R3: Playwright Conditional Projects

**Decision**: Extend existing `...(condition ? [...] : [])` array spread pattern for a `live-inventory` project.

**Rationale**: Already proven in `playwright.config.ts:118-129` for `live-pi`. The `live-inventory` project uses `LIVE_E2E=1` + `LIVE_BASE_URL` (separate from `LIVE_PI_URL` for backward compatibility).

**Config addition**:
- Gated on `process.env.LIVE_E2E === '1'`
- `testMatch: '**/live-inventory-correction.spec.ts'`
- Longer timeouts (real network), `trace: 'on'`, `screenshot: 'on'`
- No webServer (live deployment, not local dev server)

## R4: CI Workflow Integration

**Decision**: Add `workflow_dispatch` inputs (`run_live: boolean`, `live_base_url: string`) and a conditional `live-e2e` job to `test.yml`.

**Rationale**: Keeps all test jobs visible in one workflow. The job only runs on manual trigger with `run_live: true`. Follows GitHub Actions `workflow_dispatch` input pattern.

**YAML addition**:
```yaml
workflow_dispatch:
  inputs:
    run_live:
      description: 'Run live inventory E2E tests'
      required: false
      default: false
      type: boolean
    live_base_url:
      description: 'Live deployment URL'
      required: false
      default: 'https://raspberrypi.tail345cd5.ts.net'
      type: string
```

## R5: Inventory API Endpoints for Preflight

**Decision**: Preflight probes two endpoints: `GET /v1/containers` (reachability + container list) and `GET /v1/containers/{id}/inventory/latest` (inventory data availability).

**Rationale**: These are the minimum endpoints needed to verify the stack is working. The containers endpoint proves PiOrchestrator/BridgeServer connectivity. The inventory/latest endpoint proves the inventory analysis pipeline is operational.

**Endpoint details**:

| Endpoint | Purpose in Preflight | Success Criteria |
|----------|---------------------|------------------|
| `GET /api/v1/containers` | Backend reachability + container list | 200 + `data.containers.length > 0` |
| `GET /api/v1/containers/{id}/inventory/latest` | Inventory API availability | 200 + valid `InventoryAnalysisRun` |

**Error mapping for skip reasons**:
- Connection refused → "Backend unreachable at [URL]"
- 404 on containers → "Containers API not available (404)"
- 503 on containers → "Backend returned 503 — service unavailable"
- 200 but empty containers → "No containers found"
- 404 on inventory/latest → "No inventory data for container [ID]"

## R6: Container Selection for Live Tests

**Decision**: Support `LIVE_TEST_CONTAINER_ID` env var to target a specific container. If not set, preflight picks the first container from `GET /v1/containers`.

**Rationale**: Live correction tests modify real data. Using a designated container prevents accidentally corrupting production records. The active container store (`useActiveContainerStore` in Zustand with localStorage persistence) uses opaque string IDs.

**Container selection in tests**: Navigate to Containers tab → click on the target container → verify active container is set → switch to Inventory tab.

## R7: Data Safety for Live Correction Tests

**Decision**: Document that live tests submit real corrections. Tests should be idempotent — if a delta is already reviewed, SKIP with reason. Handle 409 conflicts gracefully (refresh + retry once).

**Rationale**: The backend returns 409 (REVIEW_CONFLICT) if a run has already been reviewed. The correction submission API is idempotent from the backend perspective. The runbook must document which container to use for testing.

**Alternatives considered**:
- Automated cleanup after test — requires backend API for "undo correction" which doesn't exist
- Test data seeding — out of scope (would require BridgeServer changes)
- Read-only live tests only — insufficient, the correction workflow is the primary validation target
