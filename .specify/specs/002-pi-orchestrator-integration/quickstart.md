# Quickstart: Pi Dashboard Frontend Integration

> **Feature**: 002-pi-orchestrator-integration
> **Generated**: 2026-01-06

---

## Prerequisites

- [ ] Node.js 20+ installed
- [ ] npm available
- [ ] Go 1.23+ installed
- [ ] Access to PiOrchestrator repository
- [ ] SSH access to Raspberry Pi (for deployment)

---

## Phase 1: Local Build and Integration

### Step 1: Build Frontend

```bash
# From PiDashboard directory
cd /home/notroot/Documents/Code/CITi/DeliCasa/PiDashboard

# Install dependencies (if not already done)
npm install

# Build production bundle
npm run build

# Verify build output
ls -la dist/
```

**Expected Output**:
- `dist/index.html`
- `dist/assets/` with JS and CSS files
- Total size ~600KB gzipped

### Step 2: Copy Assets to PiOrchestrator

```bash
# From PiOrchestrator directory
cd /home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator

# Use Makefile target
make copy-assets

# OR manual copy
mkdir -p internal/embedded/web/dashboard
cp -r ../PiDashboard/dist/* internal/embedded/web/dashboard/

# Verify copy
ls -la internal/embedded/web/dashboard/
```

**Expected Output**:
- `index.html`
- `assets/` directory
- PWA manifest and icons

### Step 3: Build PiOrchestrator with Embedded Dashboard

```bash
# From PiOrchestrator directory
make dashboard

# OR build separately
make build-hex

# Verify build
ls -la bin/piorchestrator-hex
```

**Expected Output**: Binary at `bin/piorchestrator-hex` (~32MB)

### Step 4: Verify Dashboard Loads Locally

```bash
# Start PiOrchestrator
./bin/piorchestrator-hex

# OR with development mode
LOG_FORMAT=console MOCK_MODE=true ./bin/piorchestrator-hex
```

**Verification**:
1. Open browser to `http://localhost:8082/`
2. Dashboard should load within 3 seconds
3. All 8 tabs should be visible (System, WiFi, Devices, Cameras, Door, Network, Logs, Config)

---

## Phase 2: Feature Verification

### WiFi Section Verification

1. Navigate to **WiFi** tab
2. Click **Scan Networks**
3. Verify network list appears with signal strength
4. Test connection to a network (if available)
5. Verify status updates after connection

### Device Provisioning Verification

1. Navigate to **Devices** tab
2. Click **Scan for Devices**
3. Verify BLE scan initiates (or shows mock devices in MOCK_MODE)
4. Test provisioning workflow with a device

### Bridge Status Verification

1. Navigate to **Network** tab
2. Verify Tailscale status displays
3. Verify MQTT status displays
4. Verify BridgeServer status displays
5. Test connection test button (if available)

### Theme Toggle Verification

1. Click theme toggle in header
2. Verify theme changes (light ↔ dark)
3. Refresh page
4. Verify theme preference persists

### Binary Size Verification

```bash
# Check binary size
ls -lh bin/piorchestrator-hex

# Get exact size
stat -c%s bin/piorchestrator-hex | awk '{printf "%.2f MB\n", $1/1048576}'
```

**Expected**: ~32MB (exceeds 15MB target but acceptable)

---

## Phase 3: Pi Deployment

### Step 1: Build for ARM64

```bash
# From PiOrchestrator directory
make build-pi-hex

# Verify ARM64 binary
file bin/piorch-hex-arm64
```

**Expected Output**: `ELF 64-bit LSB executable, ARM aarch64`

### Step 2: Deploy to Raspberry Pi

```bash
# Using Makefile target
make deploy-dashboard

# OR manual deployment
scp bin/piorch-hex-arm64 pi:/home/pi/Documents/Code/PiOrchestrator/bin/piorch-hex
ssh pi 'chmod +x /home/pi/Documents/Code/PiOrchestrator/bin/piorch-hex'
ssh pi 'sudo systemctl restart piorchestrator'
```

### Step 3: Verify on Pi

```bash
# Check service status
ssh pi 'sudo systemctl status piorchestrator'

# View logs
ssh pi 'journalctl -u piorchestrator -f'
```

**Verification**:
1. Open browser to `http://192.168.1.124:8082/` (or Pi's IP)
2. All features should work identically to local verification

### Step 4: PWA Installation Verification

1. Open dashboard on mobile device (Chrome Android or Safari iOS)
2. Wait for PWA install prompt
3. Install to home screen
4. Open installed PWA
5. Verify standalone mode (no browser chrome)
6. Disconnect from network
7. Verify cached content loads offline

---

## Verification Checklist

### Local Verification
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Assets copied to PiOrchestrator embedded directory
- [ ] Go binary builds with embedded assets
- [ ] Dashboard loads at `http://localhost:8082/`
- [ ] All 8 tabs accessible
- [ ] Theme toggle works and persists

### API Integration Verification
- [ ] WiFi scan returns data
- [ ] Device scan works (or mock mode)
- [ ] System info displays
- [ ] Logs stream via SSE
- [ ] Bridge status displays

### Pi Deployment Verification
- [ ] ARM64 binary built
- [ ] Binary deployed to Pi
- [ ] Service starts successfully
- [ ] Dashboard accessible over network
- [ ] All features work on Pi

### PWA Verification
- [ ] Install prompt appears
- [ ] PWA installs successfully
- [ ] Standalone mode works
- [ ] Offline functionality works
- [ ] Icon and name display correctly

---

## Troubleshooting

### Dashboard doesn't load

1. Check if PiOrchestrator is running: `ps aux | grep piorch`
2. Check port is bound: `netstat -tlnp | grep 8082`
3. Check logs: `journalctl -u piorchestrator -f`

### API calls fail

1. Check CORS settings in PiOrchestrator
2. Verify endpoints exist: `curl http://localhost:8082/api/system/info`
3. Check browser console for errors

### PWA doesn't install

1. Ensure HTTPS or localhost (PWA requirement)
2. Check manifest.json is served correctly
3. Verify service worker registers

### Theme doesn't persist

1. Check localStorage: `localStorage.getItem('delicasa-pi-theme')`
2. Clear localStorage and retry
3. Check for JavaScript errors

---

## Success Criteria

All boxes checked in Verification Checklist indicates successful integration.
