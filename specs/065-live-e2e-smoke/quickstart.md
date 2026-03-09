# Quickstart: Live E2E Smoke Tests

**Feature**: 065-live-e2e-smoke

## Prerequisites

1. PiOrchestrator running on Pi (ports 8081 + 8082)
2. SSH access to Pi configured (`ssh pi` works)
3. Nix development shell available (`nix develop` for Playwright browsers)

## Run Live RPC Smoke Tests

### Step 1: SSH Tunnels (both ports required)

```bash
# Port 8082 = Config UI / REST API
# Port 8081 = Main API / RPC endpoints
ssh -L 8082:localhost:8082 -L 8081:localhost:8081 pi
```

### Step 2: Run Tests

```bash
nix develop
LIVE_RPC=1 VITE_PI_HOST=localhost PLAYWRIGHT_WORKERS=1 npx playwright test --project=live-rpc
```

This starts the Vite dev server with the main config (proxies `/api` → Pi:8082, `/rpc` → Pi:8081) and runs the `live-rpc-smoke.spec.ts` tests.

### Step 3: Collect Evidence

```bash
# Copy screenshots to evidence directory
cp test-results/live-rpc-*.png specs/065-live-e2e-smoke/evidence/screenshots/

# Create/update RESULTS.md (see existing evidence/RESULTS.md for format)
```

## Also Available: REST-only Live Smoke Tests

For basic REST endpoint testing (no RPC), use the existing `live-pi` project:

```bash
LIVE_PI_URL=http://localhost:8082 npx playwright test --project=live-pi
```

This tests system info, WiFi, door, config, and logs via REST — no port 8081 needed.

## Verify

```bash
ls specs/065-live-e2e-smoke/evidence/screenshots/
cat specs/065-live-e2e-smoke/evidence/RESULTS.md
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" on 8082 | Verify SSH tunnel: `curl http://localhost:8082/api/system/info` |
| "Connection refused" on 8081 | Add 8081 tunnel: `ssh -L 8081:localhost:8081 pi` |
| RPC calls return HTML | Port 8082 doesn't proxy RPC — use `LIVE_RPC=1` mode (Vite proxy) |
| Tests skip "endpoint unavailable" | Check PiOrchestrator: `ssh pi "systemctl status piorchestrator"` |
| Session/evidence tests skip | Expected if no active sessions exist on Pi |
| No cameras in list | Verify cameras are powered on and connected to Pi AP |
