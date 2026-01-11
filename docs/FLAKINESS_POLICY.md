# Test Flakiness Policy

This document defines policies for identifying, tracking, and resolving flaky tests
in the Pi Dashboard test suite.

## Definition

A **flaky test** is a test that produces inconsistent results (pass/fail) when run
multiple times against the same code. Flaky tests undermine CI reliability and
developer confidence.

## Flakiness Detection

### Automatic Detection

1. **CI Retries**: Tests that pass on retry are flagged as potentially flaky
2. **Nightly Matrix**: Cross-browser runs in nightly CI reveal browser-specific flakiness
3. **Shard Inconsistency**: Tests passing in one shard but failing in another

### Manual Detection

1. Running `npm run test:e2e -- --repeat-each=3` locally
2. Comparing local vs CI results
3. Team reports of intermittent failures

## Flakiness Tracking

### GitHub Issues

All confirmed flaky tests are tracked with:
- Label: `flaky-test`
- Title format: `[Flaky] TestFile: Test name`
- Body includes: reproduction steps, suspected cause, fix priority

### Quarantine Process

Severely flaky tests may be temporarily quarantined:

```typescript
// Mark test as flaky with skip and tracking issue
test.skip('flaky test name', async ({ page }) => {
  // See https://github.com/org/repo/issues/123
});

// Or use fixme for tests that need investigation
test.fixme('intermittent failure', async ({ page }) => {
  // Tracking: #124
});
```

## Common Causes & Solutions

### 1. Race Conditions

**Symptom**: Test fails randomly, passes on retry
**Cause**: Not waiting for async operations to complete

```typescript
// Bad: Race condition
await page.click('button');
expect(await page.textContent('.result')).toBe('Success');

// Good: Wait for result
await page.click('button');
await expect(page.locator('.result')).toHaveText('Success');
```

### 2. Timing-Dependent Tests

**Symptom**: Fails more often in CI than locally
**Cause**: Hardcoded timeouts or CI being slower

```typescript
// Bad: Hardcoded timeout
await page.waitForTimeout(1000);

// Good: Wait for condition
await page.waitForSelector('[data-testid="loaded"]');
```

### 3. Test Order Dependencies

**Symptom**: Test passes in isolation, fails in suite
**Cause**: Shared state between tests

```typescript
// Bad: Depends on previous test state
test('second test', async () => {
  // Assumes first test created data
});

// Good: Independent setup
test.beforeEach(async () => {
  // Reset state for each test
});
```

### 4. Browser-Specific Behavior

**Symptom**: Passes in Chromium, fails in Firefox
**Cause**: Browser implementation differences

```typescript
// Use Playwright's cross-browser locators
await page.getByRole('button', { name: 'Submit' }).click();

// Avoid browser-specific selectors
// Bad: page.locator('::-webkit-scrollbar')
```

### 5. Animation/Transition Timing

**Symptom**: Element not clickable, stale element
**Cause**: Animations not completed

```typescript
// Wait for animations to complete
await page.locator('.modal').waitFor({ state: 'visible' });
await expect(page.locator('.modal')).toBeVisible();
```

## Prevention Guidelines

### Writing Robust Tests

1. **Use Playwright's auto-waiting**: Prefer `expect().toHaveText()` over manual waits
2. **Use data-testid**: Stable selectors that don't change with styling
3. **Isolate tests**: Each test should setup its own state
4. **Mock external services**: Network requests should be mocked in E2E

### Code Review Checklist

- [ ] No `waitForTimeout()` with magic numbers
- [ ] Uses semantic locators (role, testid)
- [ ] Has proper beforeEach/afterEach cleanup
- [ ] Network requests are mocked
- [ ] Animations are accounted for

## Flakiness Budget

| Metric | Target | Action Threshold |
|--------|--------|------------------|
| Flaky test rate | < 1% | > 2% triggers review |
| Max retries per test | 2 | Tests requiring more are quarantined |
| Time to fix flaky test | < 1 week | Escalate if exceeded |

## Resolution Priority

| Priority | Criteria | Response Time |
|----------|----------|---------------|
| P0 | Blocks all CI | Same day |
| P1 | Fails > 10% of runs | 2 days |
| P2 | Fails 1-10% of runs | 1 week |
| P3 | Rare flakiness | Sprint planning |

## Monitoring

### CI Dashboard Metrics

Track in GitHub Actions:
- Test pass rate per workflow
- Retry frequency
- Test duration variance

### Weekly Review

During sprint planning:
1. Review `flaky-test` issues
2. Prioritize fixes
3. Update quarantine status
4. Remove fixed tests from tracking

## Known Flaky Areas

### Currently Tracked

| Test File | Test Name | Issue | Status |
|-----------|-----------|-------|--------|
| N/A | N/A | No known flaky tests | N/A |

### Resolved

| Test File | Test Name | Fix | Date |
|-----------|-----------|-----|------|
| N/A | N/A | N/A | N/A |

## Escalation

If flakiness rate exceeds 5%:

1. **Immediate**: Skip nightly browser matrix, focus on chromium
2. **Short-term**: Dedicate 1-2 days to flakiness reduction
3. **Long-term**: Review test architecture and infrastructure

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-07 | Initial policy defined | Feature 005 |
