# Quickstart: Camera Diagnostics Integration

**Feature**: 042-diagnostics-integration
**Date**: 2026-02-03

## Prerequisites

- Node.js 22+
- npm 10+
- PiOrchestrator running (optional - MSW mocks available)

## Setup

```bash
# Clone and install
cd PiDashboard
npm ci

# Start dev server with API proxy
npm run dev
```

## Development with Mocks

The feature uses MSW (Mock Service Worker) for development without a real backend.

### Enable Mocks

Mocks are automatically enabled in test mode. For development:

```typescript
// src/main.tsx (already configured)
if (import.meta.env.DEV && import.meta.env.VITE_MSW_ENABLED) {
  const { worker } = await import('@/tests/mocks/browser');
  await worker.start();
}
```

Start with mocks:
```bash
VITE_MSW_ENABLED=true npm run dev
```

### Mock Handlers

Located in `tests/mocks/handlers/diagnostics.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const diagnosticsHandlers = [
  // Camera diagnostics
  http.get('/api/v1/cameras/:id/diagnostics', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: mockCameraDiagnostics(params.id as string),
    });
  }),

  // Evidence capture
  http.post('/api/v1/cameras/:id/evidence', () => {
    return HttpResponse.json({
      success: true,
      data: mockCapturedEvidence(),
    });
  }),

  // Session detail
  http.get('/api/v1/sessions/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: mockSessionDetail(params.id as string),
    });
  }),
];
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Diagnostics Tests Only

```bash
# Unit tests
npm test -- tests/unit/api/diagnostics.test.ts

# Component tests
npm test -- tests/component/diagnostics/

# Integration tests
npm test -- tests/integration/hooks/useDiagnostics.test.tsx

# Contract tests
npm test -- tests/integration/contracts/diagnostics.contract.test.ts

# E2E tests
npm run test:e2e -- tests/e2e/diagnostics.spec.ts
```

## API Endpoints

### Camera Diagnostics

```bash
# Get diagnostics for a specific camera
curl http://localhost:8082/api/v1/cameras/espcam-b0f7f1/diagnostics

# Expected response
{
  "success": true,
  "data": {
    "camera_id": "espcam-b0f7f1",
    "name": "Kitchen Camera",
    "status": "online",
    "last_seen": "2026-02-03T12:00:00Z",
    "health": {
      "heap": 127700,
      "wifi_rssi": -47,
      "uptime": 3600
    },
    "diagnostics": {
      "connection_quality": "excellent",
      "error_count": 0,
      "firmware_version": "1.2.3"
    }
  }
}
```

### Evidence Capture

```bash
# Capture evidence from camera
curl -X POST http://localhost:8082/api/v1/cameras/espcam-b0f7f1/evidence

# Expected response
{
  "success": true,
  "data": {
    "id": "ev-001",
    "camera_id": "espcam-b0f7f1",
    "session_id": "sess-001",
    "captured_at": "2026-02-03T12:00:00Z",
    "image_base64": "/9j/4AAQSkZJRg..."
  }
}
```

### Session Detail

```bash
# Get session details
curl http://localhost:8082/api/v1/sessions/sess-001

# Expected response
{
  "success": true,
  "data": {
    "id": "sess-001",
    "started_at": "2026-02-03T11:00:00Z",
    "status": "active",
    "capture_count": 5,
    "cameras": ["espcam-b0f7f1", "espcam-c2d3e4"],
    "evidence": [...]
  }
}
```

## Component Structure

```text
src/presentation/components/diagnostics/
├── DiagnosticsPanel.tsx      # Main diagnostics view
├── CameraDiagnosticsCard.tsx # Individual camera card
├── EvidenceCapture.tsx       # Capture button + preview
├── SessionDetail.tsx         # Session info display
└── ConnectionQualityBadge.tsx# RSSI indicator
```

## Hook Usage

```typescript
import { useCameraDiagnostics, useEvidenceCapture, useSessionDetail } from '@/application/hooks';

function CameraDebugPanel({ cameraId }: { cameraId: string }) {
  const { data: diagnostics, isLoading, error } = useCameraDiagnostics(cameraId);
  const { mutate: captureEvidence, isPending } = useEvidenceCapture();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div>
      <DiagnosticsPanel data={diagnostics} />
      <Button onClick={() => captureEvidence(cameraId)} disabled={isPending}>
        Capture Evidence
      </Button>
    </div>
  );
}
```

## Graceful Degradation

Following Feature 037 patterns, handle missing endpoints gracefully:

```typescript
import { isFeatureUnavailable } from '@/infrastructure/api/client';

function DiagnosticsView() {
  const { error } = useCameraDiagnostics(cameraId);

  if (isFeatureUnavailable(error)) {
    // Show placeholder instead of error
    return <DiagnosticsUnavailable />;
  }

  // ... normal rendering
}
```

## Common Issues

### "HTMLFallbackError: Expected JSON but received HTML"

**Cause**: PiOrchestrator endpoint not implemented (returns SPA HTML).

**Solution**: Either:
1. Wait for PiOrchestrator to implement the endpoint
2. Use MSW mocks for development (`VITE_MSW_ENABLED=true`)
3. Feature gracefully degrades with "unavailable" UI

### "Camera not found" (404)

**Cause**: Camera ID doesn't exist or camera was removed.

**Solution**:
1. Refresh camera list
2. Verify camera ID format: `espcam-XXXXXX`
3. Check PiOrchestrator logs for camera registration

### Polling not working when tab hidden

**Expected behavior**: Polling pauses when browser tab is hidden (Feature 034 pattern).

**Verification**:
1. Open DevTools Network tab
2. Switch to another tab
3. Confirm no `/diagnostics` requests while hidden
