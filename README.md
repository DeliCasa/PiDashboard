# DeliCasa Pi Dashboard

Web dashboard for configuring and monitoring PiOrchestrator IoT devices.

## Features

- **WiFi Configuration** - Scan and connect to wireless networks
- **Device Provisioning** - Discover and configure ESP32 containers via Bluetooth
- **System Monitoring** - Real-time CPU, memory, disk, and temperature monitoring
- **MQTT Setup** - Configure MQTT broker settings for device communication
- **Dark/Light Theme** - Follows DeliCasa design system with theme toggle

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Icons**: Lucide React
- **Theme**: next-themes

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Raspberry Pi Access

### SSH Configuration

Add to your `~/.ssh/config`:

```bash
Host pi
    HostName 192.168.1.124
    User notroot
    IdentityFile ~/.ssh/id_ed25519
```

### Device Information

| Property | Value |
|----------|-------|
| Hostname | `delicasa-pi-001` |
| LAN IP | `192.168.1.124` |
| Tailscale IP | `100.74.31.25` |
| User | `notroot` |

## Tailscale Integration

The Pi uses Tailscale for secure remote access.

### Check Status

```bash
ssh pi "sudo tailscale status"
```

### Enable Public Access (Funnel)

```bash
# Expose dashboard publicly
ssh pi "sudo tailscale funnel --bg 8082"

# Check funnel status
ssh pi "sudo tailscale funnel status"
```

### Public URLs

- **Funnel URL**: `https://raspberrypi.tail345cd5.ts.net/`
- **Tailnet URL**: `https://delicasa-pi-001.tail345cd5.ts.net/`

## Deployment

### Build & Deploy

```bash
# 1. Build
npm run build

# 2. Deploy to Pi
scp -r dist/* pi:/home/notroot/PiOrchestrator/web/dashboard/

# 3. Verify
curl -s https://raspberrypi.tail345cd5.ts.net/ | head -5
```

### Quick Deploy Script

```bash
#!/bin/bash
npm run build && scp -r dist/* pi:/home/notroot/PiOrchestrator/web/dashboard/
echo "Deployed to https://raspberrypi.tail345cd5.ts.net/"
```

## Development with Live API

### Option 1: SSH Tunnel

```bash
# Terminal 1: Create tunnel
ssh -L 8082:localhost:8082 pi

# Terminal 2: Start dev server
npm run dev
```

### Option 2: Direct Tailscale

Update `vite.config.ts`:

```typescript
proxy: {
  "/api": {
    target: "https://raspberrypi.tail345cd5.ts.net",
    changeOrigin: true,
  },
}
```

## PiOrchestrator Service

```bash
# Check status
ssh pi "sudo systemctl status piorchestrator"

# View logs
ssh pi "journalctl -u piorchestrator -f"

# Restart
ssh pi "sudo systemctl restart piorchestrator"
```

### Service Ports

| Port | Service |
|------|---------|
| 8081 | Main API |
| 8082 | Dashboard UI |
| 9090 | Prometheus metrics |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wifi/scan` | GET | Scan WiFi networks |
| `/api/wifi/connect` | POST | Connect to network |
| `/api/wifi/status` | GET | WiFi status |
| `/api/devices` | GET | List devices |
| `/api/devices/scan` | GET | Scan for devices |
| `/api/system/info` | GET | System info |

## Design System

Uses DeliCasa design tokens:

- **Primary**: `#8c1815` (light) / `#dc6b68` (dark)
- **Font**: Geist, system-ui fallback
- **Border Radius**: 8px default
- **Components**: shadcn/ui (new-york style)

## Project Structure

```
src/
├── components/
│   ├── dashboard/        # Feature components
│   │   ├── WiFiSection.tsx
│   │   ├── DeviceSection.tsx
│   │   └── SystemStatus.tsx
│   ├── ui/               # shadcn/ui components
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── lib/utils.ts          # Utility functions
├── App.tsx               # Main application
├── main.tsx              # Entry point
└── index.css             # Styles + design tokens
```

## Troubleshooting

### Tailscale "Logged out"

```bash
ssh pi "sudo tailscale up"
# Visit auth URL provided
```

### Port in Use

```bash
ssh pi "ss -tlnp | grep 8082"
```

### Service Not Starting

```bash
ssh pi "journalctl -u piorchestrator -n 50"
```

## Related Projects

- [PiOrchestrator](https://github.com/DeliCasa/PiOrchestrator) - Go backend
- [NextClient](https://github.com/DeliCasa/NextClient) - Main web app
- [BridgeServer](https://github.com/DeliCasa/BridgeServer) - API gateway

## License

MIT - DeliCasa Project
