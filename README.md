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

## Development

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

## Deployment to Raspberry Pi

The dashboard is designed to be served by the PiOrchestrator Go backend on port 8082.

### Build and Deploy

```bash
# Build the dashboard
npm run build

# Copy to Pi (adjust path as needed)
scp -r dist/* pi:/home/pi/PiOrchestrator/web/dashboard/
```

### API Proxy

During development, the Vite dev server proxies `/api` requests to `http://localhost:8082` (the PiOrchestrator backend).

## Design System

This dashboard uses the DeliCasa design system:

- **Primary Color**: DeliCasa Red (#8c1815)
- **Font**: Geist (system-ui fallback)
- **Border Radius**: 8px default
- **Components**: shadcn/ui (new-york style)

## Project Structure

```
src/
├── components/
│   ├── dashboard/        # Dashboard feature components
│   │   ├── WiFiSection.tsx
│   │   ├── DeviceSection.tsx
│   │   └── SystemStatus.tsx
│   ├── ui/               # shadcn/ui components
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── lib/
│   └── utils.ts          # Utility functions (cn)
├── hooks/                # Custom React hooks
├── App.tsx               # Main application
├── main.tsx              # Entry point
└── index.css             # Global styles + design tokens
```

## License

MIT - DeliCasa Project
