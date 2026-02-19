# Quickstart: Live Operations Viewer

**Feature**: 057-live-ops-viewer
**Date**: 2026-02-18

## Prerequisites

- Node.js 22+
- SSH access to Pi (for API proxy)
- PiOrchestrator running on Pi port 8082

## Setup

```bash
# 1. Switch to feature branch
git checkout 057-live-ops-viewer

# 2. Install dependencies
npm install

# 3. Start SSH tunnel to Pi API
ssh -L 8082:localhost:8082 pi

# 4. Start dev server (in another terminal)
npm run dev
```

Dashboard at http://localhost:5173

## What This Feature Adds

### New "Operations" Tab
A top-level tab in the dashboard combining:
1. **Sessions List** — Recent sessions with status badges, failure reasons, correlation IDs
2. **Session Detail** — Drill-down with evidence images, inventory delta, debug info
3. **Camera Health** — Card grid of all cameras with online/offline status and diagnostics

### Enhanced Components
- SessionCard gains failure reason and correlation ID display
- EvidencePreviewModal gains raw object key access

## File Map

### New Files
```
src/presentation/components/operations/
├── OperationsView.tsx         # Tab layout: sessions + health
├── SessionListView.tsx        # Session list with status filter
├── SessionDetailView.tsx      # Session drill-down (evidence + delta + debug)
├── CameraHealthDashboard.tsx  # Camera card grid
└── CameraHealthCard.tsx       # Single camera health summary
```

### Modified Files
```
src/App.tsx                                              # Add Operations tab
src/presentation/components/diagnostics/SessionCard.tsx  # Add failure/correlation display
src/presentation/components/diagnostics/EvidencePreviewModal.tsx  # Add object key section
```

## Development Workflow

```bash
# Run tests
VITEST_MAX_WORKERS=1 npm test

# Run lint
npm run lint

# Build check
npm run build

# Run E2E (requires Nix shell for browsers)
nix develop
npm run test:e2e
```

## Key Patterns to Follow

1. **Compose existing hooks** — Don't create new API clients or schemas
2. **Hexagonal architecture** — New components go in `presentation/`, use hooks from `application/`
3. **Graceful degradation** — Handle 404/503 with actionable messages via `isFeatureUnavailable()`
4. **ID display** — All IDs in `font-mono text-xs text-muted-foreground` with copy-to-clipboard
5. **Status badges** — Use `Badge` component with config objects mapping status to variant
6. **Error states** — Use `ErrorDisplay` component, never show blank screens
7. **Resource limits** — `VITEST_MAX_WORKERS=1` for test runs

## Testing Strategy

- **Component tests**: New components get RTL tests with MSW handlers
- **Contract tests**: No new schemas = no new contract tests needed
- **E2E tests**: Operations tab smoke test + session drill-down flow
- **Existing tests**: Must continue passing (no regressions)
