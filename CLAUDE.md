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

### Advanced: Custom API Origin

For testing against a different backend (e.g., staging server), you can override the API origin:

```bash
# Set custom API origin for development
VITE_API_ORIGIN=http://staging-server:8082 npm run dev
```

Note: This is for development only. In production, the dashboard uses same-origin relative URLs (`/api/...`) since it's served from PiOrchestrator on port 8082.

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

## Testing Infrastructure

### Test Commands

```bash
npm test                    # Run unit/integration tests (Vitest)
npm run test:coverage       # Run tests with coverage report
npm run test:e2e            # Run E2E tests with Playwright
npm run test:all            # Run all tests (unit + E2E)
```

### Test Resource Constraints (MANDATORY)

**Tests MUST NOT consume all available system resources.** Both Vitest and Playwright are configured to use at most **half of available CPU cores** to prevent system unresponsiveness.

| Test Runner | Default Workers | Override Env Var |
|-------------|-----------------|------------------|
| Vitest | 50% of CPUs (min 1) | `VITEST_MAX_WORKERS=N` |
| Playwright | 50% of CPUs (min 1) | `PLAYWRIGHT_WORKERS=N` |

**Rules for AI agents and automated tooling:**
- NEVER run tests with unlimited parallelism
- PREFER single-threaded execution (`VITEST_MAX_WORKERS=1`) when debugging
- Use `--maxWorkers=1` or similar flags when spawning test subprocesses
- On CI, tests run with 1 worker for reproducibility

**Override examples:**
```bash
# Single-threaded (safest, slowest)
VITEST_MAX_WORKERS=1 npm test
PLAYWRIGHT_WORKERS=1 npm run test:e2e

# Explicitly set worker count
VITEST_MAX_WORKERS=4 npm test
```

**Rationale:** Uncontrolled test parallelism can freeze the system, corrupt test results, and cause flaky failures. Resource constraints ensure stable, reproducible test runs.

### Test Structure (Feature 005)

```
tests/
├── unit/                   # Unit tests
│   ├── api/                # API client tests
│   ├── bluetooth/          # BLE provisioning tests
│   ├── lib/                # Utility tests
│   └── offline/            # Offline queue tests
├── component/              # Component tests (React Testing Library)
│   ├── config/             # ConfigEditor tests
│   ├── devices/            # DeviceList tests
│   ├── door/               # DoorControls tests
│   ├── logs/               # LogFilter tests
│   ├── system/             # MetricCard, ThresholdIndicator tests
│   └── wifi/               # NetworkList tests
├── integration/            # Integration tests
│   ├── contracts/          # API contract tests (Zod validation)
│   ├── hooks/              # React Query hook tests
│   ├── mocks/              # MSW handlers and types
│   └── offline/            # Offline sync/conflict tests
├── e2e/                    # E2E tests (Playwright)
│   ├── fixtures/           # Test base and mock routes
│   ├── accessibility.spec.ts   # WCAG 2.1 AA compliance (axe-core)
│   ├── resilience.spec.ts      # Network failure scenarios
│   └── *.spec.ts           # Feature-specific E2E tests
├── mocks/                  # Test mocks
│   ├── bluetooth.ts        # Web Bluetooth API mock
│   └── bluetooth-utils.ts  # BLE test utilities
└── setup/                  # Test setup files
```

### Test Coverage Summary

| Category | Tests | Description |
|----------|-------|-------------|
| Unit | 170+ | API clients (V1 cameras), BLE provisioning, utilities |
| Component | 200+ | UI components with data-testid selectors (incl. cameras: 114 tests) |
| Integration | 90+ | Hook tests, contract tests, offline queue |
| E2E | 130+ | Smoke, accessibility, resilience, camera flows |

### CI/CD Workflows

**PR Workflow** (`.github/workflows/test.yml`):
- Unit & component tests (fast)
- Contract tests (API schema validation)
- E2E smoke tests (chromium only)
- Coverage check (70% threshold)
- Bundle size check

**Nightly Workflow** (`.github/workflows/nightly.yml`):
- Full test suite
- Multi-browser matrix (Chromium, Firefox)
- E2E sharding (2 shards per browser)
- Accessibility tests (axe-core)
- Resilience/network failure tests

### Contract Testing

API responses are validated against Zod schemas in `src/infrastructure/api/schemas.ts`:
- SystemInfoSchema
- WifiSchemas (status, network, scan)
- ConfigSchemas (item, section, response)
- DoorSchemas (state, status, command)
- LogsSchemas (entry, response)

### Known Accessibility Violations (T078)

The following a11y issues are tracked for remediation:
- `color-contrast`: yellow-500, green-500, muted colors need fixes
- `aria-progressbar-name`: Progress component needs aria-label
- `button-name`: Switch/Select components need aria-labels

### Running E2E Tests on NixOS

The project uses Nix flake for Playwright browser management:

```bash
# Enter Nix development shell (sets PLAYWRIGHT_BROWSERS_PATH)
nix develop

# Run E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/accessibility.spec.ts --project=chromium
```

## Handoff Sentinel

Cross-repo handoff detection and generation for PiDashboard ⇄ PiOrchestrator workflow.

### Handoff Commands

```bash
npm run handoff:detect    # Check for pending handoffs (runs on dev/test)
npm run handoff:list      # List all handoffs with details
npm run handoff:generate  # Generate a new outgoing handoff (interactive)
```

### CI Flags

```bash
npm run handoff:detect -- --quiet   # Suppress output on success
npm run handoff:detect -- --strict  # Exit 1 if pending handoffs exist
npm run handoff:detect -- --json    # Machine-readable JSON output
```

### Handoff Locations

Detection scans these paths:
- `docs/HANDOFF_*.md`
- `docs/handoffs/**/*.md`
- `specs/**/HANDOFF*.md`
- `specs/**/handoff*.md`

### Handoff Status Lifecycle

| Status | Meaning | Detection Behavior |
|--------|---------|-------------------|
| `new` | Just created | Shows warning |
| `acknowledged` | Seen, not started | Silent |
| `in_progress` | Being worked on | Shows info |
| `done` | Complete | Silent |
| `blocked` | External blocker | Shows warning |

### Claude Code Skill

Use `/handoff-generate` to interactively create outgoing handoffs with Claude assistance.

## Important Notes

- Always test changes locally before deploying to Pi
- The Pi runs 24/7 as the IoT controller - avoid breaking deployments
- Tailscale Funnel URLs are public - don't expose sensitive endpoints
- The dashboard proxies to port 8082 (config UI), not 8081 (main API)
- Run `npm test` before committing to ensure tests pass
- **Tests MUST NOT consume all system resources** - use `VITEST_MAX_WORKERS=1` for single-threaded tests

## Active Technologies
- TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, Zustand 5.x, Zod 3.x, Radix UI (001-api-compat-integration)
- N/A (API proxied to PiOrchestrator Go backend) (001-api-compat-integration)
- TypeScript ~5.9.3 + React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (030-dashboard-recovery)
- TypeScript ~5.9.3, Node.js (via npm scripts) + gray-matter (YAML frontmatter), glob (file patterns), chalk (terminal colors) (032-handoff-sentinel)
- JSON file for detection state (`.handoff-state.json`), Markdown files for handoffs (032-handoff-sentinel)
- TypeScript ~5.9.3, Node.js (via npm scripts) + gray-matter (YAML frontmatter), chalk (terminal), Feature 032 Handoff Sentinel infrastructure (033-handoff-consumption)
- Markdown files (consumption plans, reports), JSON state files (033-handoff-consumption)
- TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, Zod 3.x, Document Visibility API (034-esp-camera-integration)
- V1 Cameras API (`/api/v1/cameras/*`), Base64 JPEG encoding, AlertDialog/Collapsible UI patterns (034-esp-camera-integration)
- TypeScript ~5.9.3 + React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4 (035-auto-onboard-dashboard)
- N/A (API-driven, no local persistence) (035-auto-onboard-dashboard)
- TypeScript 5.7+, React 19.2.0 + Zod 3.x, TanStack React Query 5.x, Vitest, Playwright (036-project-constitution)
- N/A (documentation feature) (036-project-constitution)
- TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4 (037-api-resilience)
- TypeScript ~5.9.3 with React 19.2.0 + TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4 (038-dev-observability-panels)
- TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, MSW 2.x, Vitest, Zod 3.x (039-msw-hook-tests)
- N/A (test infrastructure only) (039-msw-hook-tests)
- TypeScript ~5.9.3 + React 19.2.0, TanStack React Query 5.x, Vitest 3.2.4, MSW 2.8.0, Zod 3.x (040-test-reliability-hardening)
- N/A (mock fixtures are TypeScript files, handoff docs are Markdown) (040-test-reliability-hardening)
- N/A (Markdown file edits only; sentinel runs via TypeScript ~5.9.3 + tsx) + gray-matter (YAML frontmatter parsing), Zod (schema validation) (041-handoff-normalization)
- Markdown files with YAML frontmatter, `.handoff-state.json` (auto-regenerated) (041-handoff-normalization)
- N/A (API-driven, PiOrchestrator backend handles persistence) (043-container-identity-ui)
- N/A (API-driven, PiOrchestrator/BridgeServer backends handle persistence) (044-evidence-ci-remediation)
- TypeScript ~5.9.3 + React 19.2.0 + TanStack React Query 5.x, Zustand 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4 (046-opaque-container-identity)
- localStorage (active container selection), React Query cache (server state) (046-opaque-container-identity)
- TypeScript ~5.9.3 + React 19.2.0 + TanStack React Query 5.x, Zod 3.x, Zustand 5.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner (047-inventory-delta-viewer)
- N/A (API-driven; PiOrchestrator/BridgeServer handle persistence). Active container selection via localStorage (Zustand persist, feature 046). (047-inventory-delta-viewer)
- TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, Zod 3.x, Zustand 5.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner (048-inventory-review)
- N/A (API-driven; active container selection via localStorage/Zustand from feature 046) (048-inventory-review)
- TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner (050-id-taxonomy-ui-docs)
- N/A (no data model changes) (050-id-taxonomy-ui-docs)
- TypeScript ~5.9.3 (analysis target; no new code) + React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4 (051-inventory-delta-e2e-verify)
- N/A (documentation-only feature) (051-inventory-delta-e2e-verify)
- TypeScript ~5.9.3 + React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner (051-inventory-delta-e2e-verify)
- N/A (API-driven; active container via localStorage/Zustand from Feature 046) (052-delta-viewer-e2e)
- N/A (API-driven; active container selection via localStorage/Zustand from Feature 046) (056-session-drilldown-e2e)
- N/A (API-driven; PiOrchestrator + MinIO handle persistence) (058-real-evidence-ops)

## Recent Changes
- 001-api-compat-integration: Added TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, Zustand 5.x, Zod 3.x, Radix UI
- 034-esp-camera-integration: Migrated camera management to V1 Cameras API with:
  - Camera list with visibility-aware polling (pauses when tab hidden)
  - Base64 image capture with preview and download
  - Camera detail modal with health metrics
  - Reboot with confirmation dialog and toast feedback
  - Diagnostics view with JSON display, search filter, and copy functionality
  - 136+ component/API tests, E2E test coverage
- TypeScript ~5.9.3, React 19.2.0 + TanStack React Query 5.x, Zustand 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4 (034-esp-camera-integration)
- N/A (API-driven, no local persistence for this feature) (034-esp-camera-integration)

## Recent Changes
- 059-real-ops-drilldown: Added TypeScript ~5.9.3 + React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
- 058-real-evidence-ops: Added TypeScript ~5.9.3 + React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
- 057-live-ops-viewer: Added TypeScript ~5.9.3 + React 19.2.0, TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4, lucide-react, sonner
  - `isFeatureUnavailable()` helper for 404/503 graceful degradation
  - Enhanced E2E mock infrastructure (`mockEndpoint`, error scenario presets)
  - Camera resilience tests: loading, success, empty, error, network failure
  - WiFi graceful degradation: silent 404/503 handling, no console errors
  - Door/System error state handling with retry buttons
  - Updated CI workflows with resilience test coverage
  - Added data-testid attributes for reliable E2E testing
