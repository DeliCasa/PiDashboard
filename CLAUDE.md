# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pi Dashboard is a React web application for configuring and monitoring PiOrchestrator IoT devices on Raspberry Pi. It provides WiFi configuration, ESP32 device provisioning via Bluetooth, and real-time system monitoring.

## Essential Commands

```bash
npm run dev       # Start development server (port 5173)
npm run build     # TypeScript compile + Vite build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Architecture

**Tech Stack**: React 19 + Vite 7 + TypeScript + Tailwind CSS v4 + shadcn/ui (new-york style)

**Project Structure** (Hexagonal Architecture):
```
src/
├── domain/              # Core business types and entities
│   └── types/           # Entity and API type definitions
├── application/         # Business logic and state management
│   ├── hooks/           # React Query hooks for API integration
│   └── stores/          # Zustand stores for client state
├── infrastructure/      # External adapters
│   ├── api/             # API client and service adapters
│   ├── bluetooth/       # Web Bluetooth for ESP32 provisioning
│   └── offline/         # IndexedDB offline queue
├── presentation/        # UI layer
│   └── components/      # React components by feature
├── components/ui/       # shadcn/ui primitives
├── lib/                 # Utilities (cn, queryClient)
├── App.tsx              # Main app with tab navigation
├── main.tsx             # Entry point
└── index.css            # Design tokens + theme variables
```

**State Management**:
- TanStack React Query for server state (API data)
- Zustand for client state (UI state, offline queue)

**API Integration**: All `/api/*` requests proxy to `http://localhost:8082` (PiOrchestrator Go backend) during development.

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
npm run build

# 2. Copy to Pi (dashboard is embedded in Go binary)
# The PiOrchestrator serves the dashboard from embedded assets

# 3. If updating PiOrchestrator:
ssh pi "sudo systemctl restart piorchestrator"
```

### Verify Deployment

```bash
# Check if dashboard is accessible
curl -s http://192.168.1.124:8082 | head -20

# Test via Tailscale Funnel (if enabled)
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
| `/api/dashboard/cameras` | GET | List cameras |
| `/api/dashboard/door/status` | GET | Door status |
| `/api/dashboard/bridge/status` | GET | Bridge connection status |
| `/api/dashboard/logs` | GET | SSE log stream |
| `/api/dashboard/config` | GET | Configuration settings |

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

### PiOrchestrator Issues

**Service not starting**:
```bash
ssh pi "journalctl -u piorchestrator -n 50"
ssh pi "sudo systemctl status piorchestrator"
```

**Port already in use**:
```bash
ssh pi "ss -tlnp | grep -E '(8081|8082|9090)'"
```

### SSH Issues

**Connection refused**:
- Verify Pi is powered on
- Check LAN connectivity: `ping 192.168.1.124`
- Try Tailscale IP: `ssh notroot@100.74.31.25`

## Design System

Uses DeliCasa brand colors with CSS custom properties for light/dark theming:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Primary | `#8c1815` | `#dc6b68` |
| Background | `#fcfcfc` | `#171717` |
| Foreground | `#262626` | `#fafafa` |

- **Theme storage key**: `delicasa-pi-theme`
- **Components**: shadcn/ui with Radix UI primitives
- Path alias `@/` maps to `src/` directory

## Related Projects

- **PiOrchestrator**: `/home/notroot/Documents/Code/CITi/DeliCasa/PiOrchestrator` - Go backend
- **NextClient**: `/home/notroot/Documents/Code/CITi/DeliCasa/NextClient` - Main web app
- **BridgeServer**: `/home/notroot/Documents/Code/CITi/DeliCasa/BridgeServer` - API gateway

## Important Notes

- Always test changes locally before deploying to Pi
- The Pi runs 24/7 as the IoT controller - avoid breaking deployments
- Tailscale Funnel URLs are public - don't expose sensitive endpoints
- The dashboard proxies to port 8082 (config UI), not 8081 (main API)
