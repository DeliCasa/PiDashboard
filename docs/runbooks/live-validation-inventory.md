# Operator Runbook: Live Inventory Validation

Post-deploy validation checklist for the PiDashboard inventory correction workflow.

## Prerequisites

- Node.js 22+
- Playwright installed: `npm ci` in the PiDashboard directory
- Network access to the deployment (Tailscale or LAN)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LIVE_E2E` | Yes | — | Set to `1` to enable live tests |
| `LIVE_BASE_URL` | No | `https://raspberrypi.tail345cd5.ts.net` | Deployment URL |
| `LIVE_TEST_CONTAINER_ID` | No | First available | Target a specific container (recommended for data safety) |

## Quick Automated Validation (< 1 min)

```bash
LIVE_E2E=1 LIVE_BASE_URL=https://raspberrypi.tail345cd5.ts.net \
  PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-inventory
```

## Interpreting Results

| Result | Meaning | Action |
|--------|---------|--------|
| All PASS | Correction workflow works end-to-end | Deploy is healthy |
| All SKIP | Backend not reachable or no data | Check skip reason in output |
| Some SKIP | Partial data (e.g., no reviewable delta) | Expected if no fresh analysis data |
| FAIL | Workflow broken against real backend | Investigate — see Troubleshooting |

## Manual Walkthrough (< 5 min)

1. Open the dashboard URL in a browser
2. Navigate to the **Inventory** tab
3. Select a container — verify the delta table loads
4. View delta entries — verify items, counts, and confidence scores display
5. Submit a test correction — edit one count, add a note, confirm
6. Verify the audit trail shows the correction with your note
7. Check for error states — verify no blank screens or raw error dumps

## Troubleshooting

| Failure | Likely Cause | Action |
|---------|-------------|--------|
| "Backend unreachable" | Service down or network issue | `ssh pi "sudo systemctl status piorchestrator"` |
| "No containers found" | BridgeServer not registered | Check BridgeServer container registration |
| "No inventory data" | No analysis runs yet | Trigger an analysis scan from BridgeServer |
| "Delta already reviewed" | All runs already reviewed | Need fresh analysis data for correction test |
| "Schema validation error" | Version mismatch | Verify PiDashboard and BridgeServer are on matching versions |
| Console errors in test | UI rendering issue | Check browser console, review Playwright trace artifacts |

## Data Safety

Live correction tests submit real reviews. Use `LIVE_TEST_CONTAINER_ID` to target a designated test container and avoid modifying production inventory data.

## Pass/Fail Checklist

- [ ] Dashboard loads without errors
- [ ] Inventory tab shows container data
- [ ] Delta table renders with items and counts
- [ ] Edit mode allows count changes and notes
- [ ] Submit + confirm completes without error
- [ ] Audit trail shows correction details
- [ ] No console errors during navigation
