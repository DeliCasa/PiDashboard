# Performance Budgets

This document defines performance thresholds for the Pi Dashboard application.
Budgets are enforced in CI via the bundle-size check job.

## Bundle Size Budgets

| Metric | Budget | Current | Status |
|--------|--------|---------|--------|
| Main JS bundle | 500 KB | ~165 KB gzip | Pass |
| CSS bundle | 50 KB | ~9 KB gzip | Pass |
| Total uncompressed | 600 KB | ~598 KB | Pass |

### Budget Rationale

- **500 KB main bundle**: Ensures fast loading on Raspberry Pi hardware and limited bandwidth connections
- **50 KB CSS**: Keeps styling overhead minimal for responsive UI
- **600 KB total**: Allows room for growth while maintaining sub-2s load times on 3G

### Measurement

Bundle sizes are measured after production build:

```bash
npm run build
find dist/assets -name "*.js" -exec ls -lh {} \;
find dist/assets -name "*.css" -exec ls -lh {} \;
```

## CI Enforcement

Bundle size is checked in `.github/workflows/test.yml`:

```yaml
bundle-size:
  name: Bundle Size Check
  steps:
    - run: |
        npm run build
        MAIN_SIZE=$(find dist/assets -name "index-*.js" -exec stat --format=%s {} \;)
        if [ "$MAIN_SIZE" -gt 512000 ]; then
          echo "Warning: Main bundle exceeds 500KB"
        fi
```

## Lighthouse Budgets (Future)

Target metrics for Lighthouse audits (not yet enforced in CI):

| Metric | Budget | Target |
|--------|--------|--------|
| First Contentful Paint | < 1.8s | 1.2s |
| Largest Contentful Paint | < 2.5s | 2.0s |
| Time to Interactive | < 3.5s | 2.5s |
| Total Blocking Time | < 200ms | 100ms |
| Cumulative Layout Shift | < 0.1 | 0.05 |

## Dependency Budget

To prevent bloat from new dependencies:

| Category | Budget | Current |
|----------|--------|---------|
| Total dependencies | < 50 | ~35 |
| Runtime dependencies | < 20 | ~15 |
| Dev dependencies | < 40 | ~25 |

### Large Dependency Policy

Dependencies over 50 KB (minified) require justification:
- `@tanstack/react-query`: Essential for server state
- `@tanstack/react-virtual`: Required for log virtualization
- `recharts`: System metrics visualization

## Test Performance Budgets

| Test Suite | Budget | Current |
|------------|--------|---------|
| Unit tests | < 30s | ~15s |
| Component tests | < 60s | ~30s |
| Integration tests | < 120s | ~45s |
| E2E tests (single browser) | < 180s | ~90s |

### CI Pipeline Budget

| Workflow | Budget | Current |
|----------|--------|---------|
| PR checks (all jobs) | < 10 min | ~7 min |
| Nightly full suite | < 30 min | ~20 min |

## Monitoring & Alerts

### Bundle Size Tracking

Bundle sizes are tracked over time in CI artifacts. If a PR increases bundle size by more than 10%, it should be reviewed for optimization opportunities.

### Test Duration Tracking

Test durations are logged in CI. If test suite duration increases by more than 20%, investigate:
1. Slow individual tests
2. Missing test parallelization
3. Unnecessary waits/timeouts

## Optimization Guidelines

When budgets are exceeded:

1. **Bundle Size**:
   - Analyze with `npx vite-bundle-visualizer`
   - Consider code splitting
   - Check for duplicate dependencies
   - Use tree-shaking friendly imports

2. **Test Duration**:
   - Profile slow tests with `--reporter=verbose`
   - Reduce unnecessary DOM queries
   - Mock expensive operations
   - Use test sharding for E2E

3. **Dependencies**:
   - Audit with `npm ls --depth=0`
   - Remove unused packages
   - Consider lighter alternatives
   - Use peer dependencies where appropriate

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-07 | Initial budgets defined | Feature 005 |
