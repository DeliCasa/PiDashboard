# Pi Dashboard - Claude Code Guidelines

This file provides guidance to Claude Code when working with the Pi Dashboard project.

## Project Overview

Pi Dashboard is a web-based configuration interface for the DeliCasa PiOrchestrator IoT system. It provides:
- WiFi network configuration
- ESP32 device discovery and provisioning
- System health monitoring (CPU, memory, disk, temperature)
- MQTT broker configuration

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style)
- **Theme**: next-themes for dark/light mode
- **Icons**: Lucide React
- **Design System**: DeliCasa design tokens (primary: #8c1815)

## Essential Commands

```bash
# Development
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
```

## Raspberry Pi Access

### SSH Configuration

The Raspberry Pi is accessible via SSH. Configure your `~/.ssh/config`:

```bash
# DeliCasa Raspberry Pi
Host pi
    HostName 192.168.1.124
    User notroot
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
```

**Usage**:
```bash
ssh pi                              # Connect to Pi
ssh pi "command"                    # Run single command
scp file.txt pi:/path/to/dest       # Copy file to Pi
```

### Pi Device Information

| Property | Value |
|----------|-------|
| **Hostname** | `delicasa-pi-001` |
| **LAN IP** | `192.168.1.124` |
| **Tailscale IP** | `100.74.31.25` |
| **User** | `notroot` |
| **OS** | Raspberry Pi OS (Debian-based) |

## Tailscale VPN Integration

The Pi uses Tailscale for secure remote access and to expose the dashboard publicly.

### Tailscale Commands

```bash
# Check Tailscale status
ssh pi "sudo tailscale status"

# Get device info
ssh pi "tailscale status --json"

# Re-authenticate (if logged out)
ssh pi "sudo tailscale up"
# Then visit the URL provided to authenticate
```

### Tailscale Serve & Funnel

**Serve** exposes a local port to your Tailscale network (private).
**Funnel** exposes it to the public internet.

```bash
# Expose port 8082 to Tailnet only
ssh pi "sudo tailscale serve --bg 8082"

# Expose port 8082 publicly via Funnel
ssh pi "sudo tailscale funnel --bg 8082"

# Check current serve/funnel status
ssh pi "sudo tailscale serve status"
ssh pi "sudo tailscale funnel status"

# Reset all serve/funnel configuration
ssh pi "sudo tailscale serve reset"
```

### Public Dashboard URL

When Tailscale Funnel is enabled:
- **Public URL**: `https://raspberrypi.tail345cd5.ts.net/`
- **Tailnet URL**: `https://delicasa-pi-001.tail345cd5.ts.net/`

### Enabling Tailscale Features

If you get errors about serve/funnel not being enabled:
1. Visit the URL provided in the error message
2. Log in with your Tailscale account
3. Enable the feature for the device
4. Re-run the serve/funnel command

## PiOrchestrator Service

The Pi runs the PiOrchestrator Go service that provides the backend API.

### Service Management

```bash
# Check service status
ssh pi "sudo systemctl status piorchestrator"

# Restart service
ssh pi "sudo systemctl restart piorchestrator"

# View logs
ssh pi "journalctl -u piorchestrator -f"

# View recent logs
ssh pi "journalctl -u piorchestrator --since '10 minutes ago'"
```

### Service Ports

| Port | Service | Description |
|------|---------|-------------|
| 8081 | API Server | Main REST API |
| 8082 | Config UI | Web dashboard backend |
| 9090 | Prometheus | Metrics endpoint |

## Deployment

### Build & Deploy to Pi

```bash
# 1. Build the dashboard
cd /home/notroot/Documents/Code/CITi/DeliCasa/pi-dashboard
npm run build

# 2. Copy to Pi
scp -r dist/* pi:/home/notroot/PiOrchestrator/web/dashboard/

# 3. Restart the PiOrchestrator service (if needed)
ssh pi "sudo systemctl restart piorchestrator"
```

### Quick Deploy Script

Create a deploy script for convenience:

```bash
#!/bin/bash
# deploy.sh
npm run build
scp -r dist/* pi:/home/notroot/PiOrchestrator/web/dashboard/
echo "Deployed! Dashboard available at https://raspberrypi.tail345cd5.ts.net/"
```

### Verify Deployment

```bash
# Check if dashboard files exist on Pi
ssh pi "ls -la /home/notroot/PiOrchestrator/web/dashboard/"

# Test the dashboard locally on Pi
ssh pi "curl -s http://localhost:8082 | head -20"

# Test via Tailscale Funnel
curl -s https://raspberrypi.tail345cd5.ts.net/ | head -20
```

## Development Workflow

### Local Development with API Proxy

The Vite dev server proxies `/api` requests to `http://localhost:8082`:

1. SSH tunnel to Pi's API port:
   ```bash
   ssh -L 8082:localhost:8082 pi
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in browser

### Testing Against Live Pi

You can also develop against the live Pi API via Tailscale:

1. Update `vite.config.ts` proxy target:
   ```typescript
   proxy: {
     "/api": {
       target: "https://raspberrypi.tail345cd5.ts.net",
       changeOrigin: true,
     },
   }
   ```

2. Start dev server and test

## API Endpoints

The PiOrchestrator backend provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wifi/scan` | GET | Scan for WiFi networks |
| `/api/wifi/connect` | POST | Connect to a WiFi network |
| `/api/wifi/status` | GET | Get current WiFi status |
| `/api/devices` | GET | List discovered devices |
| `/api/devices/scan` | GET | Trigger device scan |
| `/api/devices/:addr/provision` | POST | Provision a device |
| `/api/system/info` | GET | Get system information |

## Troubleshooting

### Tailscale Issues

**"Logged out" status**:
```bash
ssh pi "sudo tailscale up"
# Visit the auth URL provided
```

**Funnel not working**:
```bash
# Reset and reconfigure
ssh pi "sudo tailscale serve reset"
ssh pi "sudo tailscale funnel --bg 8082"
```

**Check network connectivity**:
```bash
ssh pi "tailscale ping dokku"
ssh pi "curl -I https://dokku.tail1ba2bb.ts.net"
```

### PiOrchestrator Issues

**Service not starting**:
```bash
ssh pi "journalctl -u piorchestrator -n 50"
ssh pi "sudo systemctl status piorchestrator"
```

**Port already in use**:
```bash
ssh pi "ss -tlnp | grep -E '(8081|8082|9090)'"
ssh pi "sudo lsof -i :8082"
```

### SSH Issues

**Connection refused**:
- Verify Pi is powered on
- Check LAN connectivity: `ping 192.168.1.124`
- Try Tailscale IP: `ssh notroot@100.74.31.25`

**Permission denied**:
- Ensure SSH key is added: `ssh-add ~/.ssh/id_ed25519`
- Check authorized_keys on Pi

## Project Structure

```
pi-dashboard/
├── src/
│   ├── components/
│   │   ├── dashboard/          # Feature components
│   │   │   ├── WiFiSection.tsx
│   │   │   ├── DeviceSection.tsx
│   │   │   └── SystemStatus.tsx
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── ThemeProvider.tsx
│   │   └── ThemeToggle.tsx
│   ├── lib/
│   │   └── utils.ts            # Utility functions (cn)
│   ├── hooks/                  # Custom React hooks
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles + design tokens
├── vite.config.ts              # Vite configuration
├── components.json             # shadcn/ui configuration
├── tailwind.config.ts          # Tailwind configuration (if needed)
└── tsconfig.json               # TypeScript configuration
```

## Design System

The dashboard follows the DeliCasa design system:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Primary | `#8c1815` | `#dc6b68` |
| Background | `#fcfcfc` | `#171717` |
| Foreground | `#262626` | `#fafafa` |
| Border | `#e5e5e5` | `#333333` |

### Color Variables

All colors are defined as CSS variables in `src/index.css` and can be used via Tailwind:

```jsx
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```

## Related Projects

- **PiOrchestrator**: `/home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator` - Go backend
- **NextClient**: `/home/notroot/Documents/Code/CITi/DeliCasa/NextClient` - Main web app
- **BridgeServer**: `/home/notroot/Documents/Code/CITi/DeliCasa/BridgeServer` - API gateway

## Important Notes

- Always test changes locally before deploying to Pi
- The Pi runs 24/7 as the IoT controller - avoid breaking deployments
- Tailscale Funnel URLs are public - don't expose sensitive endpoints
- The dashboard proxies to port 8082 (config UI), not 8081 (main API)
