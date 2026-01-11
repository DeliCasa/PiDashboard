# Quickstart: PiOrchestrator V1 API Sync

> **Feature**: 006-piorchestrator-v1-api-sync  
> **Created**: 2026-01-11

---

## Prerequisites

1. **Node.js 20+** and npm installed
2. **PiOrchestrator** running with V1 API endpoints
3. **NixOS** development environment (for Playwright tests)

---

## Setup

### 1. Clone and Install

```bash
cd /home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard
npm install
```

### 2. Configure Environment

Create `.env.local` for development:

```bash
# Enable V1 API (feature flag)
VITE_USE_V1_API=true

# Enable batch provisioning UI
VITE_BATCH_PROVISIONING=true

# API key for protected endpoints (dev only)
VITE_API_KEY=your-dev-api-key-here

# Optional: Enable WebSocket monitoring
VITE_WS_MONITOR=false
```

### 3. Start Development Server

```bash
npm run dev
```

Dashboard available at: http://localhost:5173

---

## Local Testing with Mock Backend

### Option A: MSW (Mock Service Worker)

Tests use MSW for API mocking. No backend needed for unit/component tests.

```bash
# Run all tests
npm test

# Run contract tests only
npm test tests/integration/contracts

# Run with verbose output
npm test -- --reporter=verbose
```

### Option B: Real PiOrchestrator Backend

1. SSH tunnel to Pi:
   ```bash
   ssh -L 8082:localhost:8082 pi
   ```

2. Start dev server (proxies to Pi):
   ```bash
   npm run dev
   ```

3. Test in browser at http://localhost:5173

---

## API Key Configuration

### Development Mode

Set `VITE_API_KEY` in `.env.local`:

```bash
VITE_API_KEY=dev-api-key-12345
```

Or use sessionStorage in browser console:

```javascript
sessionStorage.setItem('delicasa-api-key', 'your-api-key');
```

### Production (Embedded Dashboard)

Build with API key:

```bash
VITE_API_KEY=production-key npm run build
```

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `VITE_USE_V1_API` | `false` | Use V1 API client with envelope handling |
| `VITE_BATCH_PROVISIONING` | `false` | Show batch provisioning tab |
| `VITE_WS_MONITOR` | `false` | Use WebSocket for system monitoring |

---

## Testing V1 API Integration

### Manual API Testing

```bash
# Test unprotected endpoint
curl http://localhost:8082/api/v1/system/info

# Test protected endpoint (requires API key)
curl -H "X-API-Key: your-key" http://localhost:8082/api/v1/provisioning/batch/start \
  -H "Content-Type: application/json" \
  -d '{"target_ssid":"TestNetwork","target_password":"password"}'

# Test SSE stream
curl -N http://localhost:8082/api/v1/provisioning/batch/events?session_id=sess_abc123
```

### Contract Tests

```bash
# Run provisioning contract tests
npm test tests/integration/contracts/provisioning.contract.test.ts

# Run all contract tests
npm test tests/integration/contracts
```

### E2E Tests

```bash
# Enter Nix shell (sets PLAYWRIGHT_BROWSERS_PATH)
nix develop

# Run E2E tests
npm run test:e2e

# Run specific test
npx playwright test tests/e2e/batch-provisioning.spec.ts --project=chromium
```

---

## Batch Provisioning Flow

### 1. Start Session

Navigate to "Provisioning" tab and fill in:
- **Target SSID**: WiFi network for devices
- **Target Password**: WiFi password

Click "Start Session".

### 2. Wait for Discovery

SSE events will populate the device list as cameras are discovered on the onboarding network.

### 3. Provision Devices

- Click "Provision All" to provision all discovered devices
- Or click individual device cards to provision one at a time

### 4. Monitor Progress

Watch device cards transition through states:
- `discovered` (blue) -> `provisioning` (yellow) -> `verified` (green)
- Failed devices show `failed` (red) with retry button

### 5. Stop Session

Click "Stop Session" when complete.

---

## Troubleshooting

### SSE Connection Fails

1. Check PiOrchestrator is running:
   ```bash
   ssh pi "systemctl status piorchestrator"
   ```

2. Check SSE endpoint responds:
   ```bash
   curl -N http://localhost:8082/api/v1/provisioning/batch/events?session_id=test
   ```

3. Check browser console for connection errors

### API Key Errors

1. Verify key is set:
   ```javascript
   // In browser console
   sessionStorage.getItem('delicasa-api-key')
   ```

2. Check `VITE_API_KEY` in `.env.local`

3. Verify Pi has same key:
   ```bash
   ssh pi "echo \$API_KEY"
   ```

### Contract Validation Failures

Check console for `[API Contract]` warnings:

```
[API Contract] /api/v1/provisioning/batch/start validation failed: data.session.id: Expected string
```

This indicates API response doesn't match expected schema. Either:
- Update schema to match actual API
- Report bug to PiOrchestrator team

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Lint check

# Testing
npm test                 # Run all tests
npm run test:coverage    # Coverage report
npm run test:e2e         # E2E tests

# Specific test suites
npm test tests/unit                    # Unit tests
npm test tests/component               # Component tests
npm test tests/integration             # Integration tests
npm test tests/integration/contracts   # Contract tests

# E2E with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
```

---

## Related Documentation

- [Handoff Document](../../docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md)
- [API Contract](../../docs/API_CONTRACT.md)
- [Feature Spec](./spec.md)
- [Implementation Plan](./plan.md)
- [Tasks](./tasks.md)
