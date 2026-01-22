---
handoff_id: "031-backend-gaps"
direction: outgoing
from_repo: PiDashboard
to_repo: PiOrchestrator
created_at: "2026-01-12T00:00:00Z"
status: new
related_prs: []
related_commits: []
requires:
  - type: api
    description: "Implement real WiFi scanning with iw/iwlist"
  - type: api
    description: "Implement real WiFi connection with wpa_supplicant/nmcli"
  - type: deploy
    description: "Install hostapd and dnsmasq for AP mode"
acceptance:
  - "WiFi scan returns real networks from iw wlan0 scan"
  - "WiFi connect actually connects using wpa_supplicant"
  - "AP mode creates working hotspot with hostapd"
verification:
  - "curl /api/wifi/scan returns real SSIDs"
  - "Connect to known network and verify IP assignment"
risks:
  - "Requires root/sudo for WiFi operations"
  - "Different behavior on non-Pi hardware"
notes: "Dashboard logs fix (Issue 4) should be done in PiDashboard, not PiOrchestrator"
---

# Handoff: PiOrchestrator Backend Gaps

**Date**: 2026-01-12
**Source**: PiDashboard Feature 030 Investigation
**Target Project**: PiOrchestrator
**Priority**: High - Dashboard functionality blocked

## Executive Summary

During verification of Feature 030 (Dashboard Recovery), investigation revealed that core dashboard functionality issues are caused by **unimplemented backend features** in PiOrchestrator, not frontend bugs. This document details the gaps and provides implementation guidance.

## Issue 1: WiFi Scanning Returns Mock Data

### Symptom
Dashboard shows fake WiFi networks: "HomeNetwork", "OfficeWiFi", "PublicWiFi"

### Root Cause
**File**: `internal/adapters/network/dual_wifi_manager.go` (lines ~170-195)

```go
// ScanWiFiNetworks scans for available WiFi networks
func (d *DualWiFiManager) ScanWiFiNetworks() ([]*WiFiNetwork, error) {
    d.logger.Info("Scanning for WiFi networks...")

    // In a real implementation, this would use iwlist or iw scan
    // For now, we'll return simulated networks
    networks := []*WiFiNetwork{
        {
            SSID:      "HomeNetwork",
            BSSID:     "aa:bb:cc:dd:ee:ff",
            Frequency: 2437,
            Signal:    -45,
            Security:  "WPA2",
            Channel:   6,
            Quality:   80,
        },
        {
            SSID:      "OfficeWiFi",
            // ... more hardcoded data
        },
    }
    return networks, nil
}
```

### Required Implementation

Replace mock data with real WiFi scanning using `iw` or `iwlist`:

```go
func (d *DualWiFiManager) ScanWiFiNetworks() ([]*WiFiNetwork, error) {
    d.logger.Info("Scanning for WiFi networks...")

    // Use 'iw' command for scanning (requires root/sudo)
    cmd := exec.Command("sudo", "iw", d.clientInterface, "scan")
    output, err := cmd.Output()
    if err != nil {
        // Fallback to iwlist if iw fails
        cmd = exec.Command("sudo", "iwlist", d.clientInterface, "scan")
        output, err = cmd.Output()
        if err != nil {
            return nil, fmt.Errorf("wifi scan failed: %w", err)
        }
        return d.parseIwlistOutput(output)
    }
    return d.parseIwOutput(output)
}

func (d *DualWiFiManager) parseIwOutput(output []byte) ([]*WiFiNetwork, error) {
    // Parse iw scan output format:
    // BSS aa:bb:cc:dd:ee:ff(on wlan0)
    //     SSID: NetworkName
    //     signal: -45.00 dBm
    //     freq: 2437
    //     capability: ESS Privacy
    // ...
}
```

### Prerequisites
- `iw` or `wireless-tools` package installed
- Service runs with sudo/root privileges or appropriate capabilities
- WiFi interface (wlan0) available

### Test Command
```bash
# Verify real scanning works
sudo iw wlan0 scan | grep -E "SSID|signal|freq"
```

---

## Issue 2: WiFi Connect is Simulated

### Symptom
"Connect" button appears to work but doesn't actually connect to networks

### Root Cause
**File**: `internal/adapters/network/dual_wifi_manager.go` (lines ~155-165)

```go
// ConnectToWiFi connects to a WiFi network as a client
func (d *DualWiFiManager) ConnectToWiFi(ssid, password string) error {
    d.logger.Info("Connecting to WiFi network", "ssid", ssid)

    // In a real implementation, this would use wpa_supplicant
    // For now, we'll simulate successful connection
    time.Sleep(2 * time.Second)

    d.clientConnected = true
    d.logger.Info("Connected to WiFi network", "ssid", ssid)

    return nil
}
```

### Required Implementation

Integrate with `wpa_supplicant` or `nmcli` (NetworkManager):

```go
func (d *DualWiFiManager) ConnectToWiFi(ssid, password string) error {
    d.logger.Info("Connecting to WiFi network", "ssid", ssid)

    // Option 1: Using nmcli (NetworkManager)
    cmd := exec.Command("nmcli", "device", "wifi", "connect", ssid, "password", password)
    output, err := cmd.CombinedOutput()
    if err != nil {
        return fmt.Errorf("connection failed: %s - %w", string(output), err)
    }

    // Verify connection
    if err := d.verifyConnection(ssid); err != nil {
        return fmt.Errorf("connection verification failed: %w", err)
    }

    d.clientConnected = true
    return nil
}

// Option 2: Using wpa_supplicant directly
func (d *DualWiFiManager) ConnectViaWpaSupplicant(ssid, password string) error {
    // Generate wpa_supplicant config
    config := fmt.Sprintf(`network={
        ssid="%s"
        psk="%s"
        key_mgmt=WPA-PSK
    }`, ssid, password)

    // Write to /etc/wpa_supplicant/wpa_supplicant.conf
    // Restart wpa_supplicant service
    // ...
}
```

### Test Command
```bash
# Test nmcli connection
nmcli device wifi connect "YourNetwork" password "yourpassword"

# Check connection status
nmcli connection show --active
```

---

## Issue 3: Cameras Show Empty List

### Symptom
Dashboard shows "0 cameras registered"

### Root Cause
This is **expected behavior** - no ESP-CAM devices have been registered with the system.

### Current State
**File**: `internal/api/handlers/camera_v1.go`

```go
func (h *CameraV1Handler) HandleListCameras(c *gin.Context) {
    cameras := camera.GetActiveCameras()  // Returns empty - none registered
    // ...
}
```

### Resolution Options

1. **Register ESP-CAM devices** via the provisioning flow:
   - Use `/api/v1/provisioning/allowlist` to add device MAC addresses
   - Provision ESP-CAMs with the Pi's credentials
   - Cameras auto-register when they connect

2. **Manual camera registration** (if API exists):
   ```bash
   curl -X POST http://localhost:8082/api/v1/cameras/register \
     -H "Content-Type: application/json" \
     -d '{"device_id": "esp-cam-001", "ip": "192.168.1.100", "name": "Kitchen Camera"}'
   ```

3. **Check camera discovery service** is running and scanning for ESP-CAMs on the network

---

## Issue 4: Logs Endpoint Deprecated

### Symptom
Dashboard logs page shows "Waiting for logs..." with 0 entries

### Root Cause
- Dashboard calls: `/api/dashboard/logs` (deprecated, returns empty)
- Backend logs show: `"event":"deprecated_endpoint","successor":"/api/v1/dashboard"`
- New endpoint: `/api/v1/dashboard/logs` (SSE stream)

### Backend Evidence
```json
{"event":"deprecated_endpoint","path":"/api/dashboard/logs","successor":"/api/v1/dashboard"}
```

### Dashboard Fix Required
**File**: `PiDashboard/src/infrastructure/api/logs.ts`

Current (broken):
```typescript
getRecent: async (params?: LogsParams): Promise<LogEntry[]> => {
    const response = await apiClient.get<LogsApiResponse>(buildUrl('/dashboard/logs', params));
    // ...
}
```

Should use SSE stream:
```typescript
streamLogs: (onLog: (entry: LogEntry) => void): EventSource => {
    const eventSource = new EventSource('/api/v1/dashboard/logs');
    eventSource.onmessage = (event) => {
        const entry = JSON.parse(event.data);
        onLog(entry);
    };
    return eventSource;
}
```

### Note
This fix should be done in **PiDashboard**, not PiOrchestrator. The backend V1 endpoint is working.

---

## Issue 5: Access Point Mode Simulation

### Symptom
AP mode may not actually create a hotspot

### Root Cause
**File**: `internal/adapters/network/dual_wifi_manager.go` (lines ~85-95)

```go
func (d *DualWiFiManager) StartAccessPointMode(ctx context.Context) error {
    // Check if hostapd is available
    if !d.isHostapdAvailable() {
        d.logger.Warn("hostapd not available, simulating AP mode")
        d.apActive = true
        d.currentMode = NetworkModeAP
        return nil  // Silently succeeds without actual AP
    }
    // ... real implementation follows
}
```

### Resolution
Install hostapd and dnsmasq:
```bash
sudo apt-get install hostapd dnsmasq
sudo systemctl unmask hostapd
```

---

## Configuration Status

### Current Config (`/home/pi/Documents/Code/PiOrchestrator/.env`)
```bash
MOCK_MODE=false          # ✓ Correct (but WiFi still hardcoded)
LOCAL_API_PORT=8081
AUTO_REGISTER_CAMERAS=true
LOG_LEVEL=debug
```

### Service Status
- **Service**: `piorchestrator.service`
- **Binary**: `/home/pi/Documents/Code/PiOrchestrator/bin/piorch-hex`
- **Source**: Built from `/home/pi/PiOrchestrator-029/`

---

## Implementation Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | WiFi Scanning | Medium | Users can't see real networks |
| P0 | WiFi Connect | Medium | Users can't configure WiFi |
| P1 | Dashboard Logs | Low | Fix in PiDashboard (use V1 SSE) |
| P2 | Camera Registration | Low | Document registration process |
| P3 | AP Mode Dependencies | Low | Install hostapd/dnsmasq |

---

## Testing Checklist

After implementing WiFi:
- [ ] `curl http://localhost:8082/api/wifi/scan` returns real networks
- [ ] Networks match `sudo iw wlan0 scan` output
- [ ] Connect to known network succeeds
- [ ] `/api/wifi/status` shows connected SSID and IP

After dashboard logs fix:
- [ ] Logs page shows real-time entries
- [ ] SSE connection stays open
- [ ] Historical logs load on page open

---

## Files to Modify

### PiOrchestrator
| File | Change |
|------|--------|
| `internal/adapters/network/dual_wifi_manager.go` | Implement real WiFi scanning/connect |
| (optional) Parser functions for iw/iwlist output | New file or same file |

### PiDashboard (Separate PR)
| File | Change |
|------|--------|
| `src/infrastructure/api/logs.ts` | Switch to V1 SSE endpoint |
| `src/application/hooks/useLogs.ts` | Handle SSE stream |

---

## Contact

- **Investigation Source**: PiDashboard Feature 030 verification
- **Related Docs**: `docs/HANDOFF_030_RECOVERY_COMPLETE.md`
- **Dashboard Branch**: `030-dashboard-recovery`
