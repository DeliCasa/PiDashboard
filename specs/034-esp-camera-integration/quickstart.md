# Quickstart: ESP Camera Integration

**Feature**: 034-esp-camera-integration
**Date**: 2026-01-14

## Prerequisites

- Node.js 18+ installed
- PiOrchestrator running on port 8082 (or SSH tunnel to Pi)
- At least one ESP32-CAM registered with PiOrchestrator

## Setup

1. **Ensure you're on the feature branch**:
   ```bash
   git checkout 034-esp-camera-integration
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   # Option A: SSH tunnel to Pi (recommended for remote development)
   ssh -L 8082:localhost:8082 pi &
   npm run dev

   # Option B: Direct connection (if on same LAN as Pi)
   npm run dev
   ```

4. **Open in browser**:
   ```
   http://localhost:5173
   ```

## API Verification

Before implementing, verify the V1 endpoints are available on PiOrchestrator:

```bash
# List cameras
curl http://localhost:8082/api/v1/cameras

# Get single camera (replace {id} with actual camera ID)
curl http://localhost:8082/api/v1/cameras/{id}

# Get diagnostics
curl http://localhost:8082/api/v1/cameras/diagnostics

# Test capture
curl -X POST http://localhost:8082/api/v1/cameras/{id}/capture

# Test reboot (use with caution - will actually reboot camera)
curl -X POST http://localhost:8082/api/v1/cameras/{id}/reboot
```

## Development Workflow

### 1. API Client First

Create or update the V1 cameras API client:
- `src/infrastructure/api/v1-cameras.ts`

Test with Vitest:
```bash
npm test -- --filter v1-cameras
```

### 2. Hooks Next

Implement React Query hooks:
- `src/application/hooks/useCameras.ts` (update)
- `src/application/hooks/useCamera.ts` (new)

### 3. Components Last

Update/create UI components:
- `CameraSection.tsx` (update)
- `CameraDetail.tsx` (new)
- `CaptureModal.tsx` (new)
- `RebootDialog.tsx` (new)
- `DiagnosticsView.tsx` (new)

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests (requires MSW mocks or real Pi connection)
```bash
npm run test:e2e
```

### Manual Testing Checklist

- [ ] Camera list loads and shows all cameras
- [ ] Camera status badges reflect actual state (online/offline)
- [ ] Clicking "View" opens camera detail modal
- [ ] Clicking "Capture" shows spinner, then displays image
- [ ] Clicking "Download" downloads the captured image
- [ ] Clicking "Reboot" shows confirmation dialog
- [ ] Confirming reboot sends command and shows feedback
- [ ] Diagnostics page loads JSON without freezing
- [ ] Copy JSON button works
- [ ] Error states show user-friendly messages
- [ ] Polling pauses when tab is hidden

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/infrastructure/api/v1-cameras.ts` | V1 API client |
| `src/application/hooks/useCameras.ts` | Camera list hook |
| `src/application/hooks/useCamera.ts` | Single camera hook |
| `src/lib/download.ts` | Base64 download utility |
| `src/presentation/components/cameras/` | UI components |
| `tests/unit/api/v1-cameras.test.ts` | API client tests |
| `tests/e2e/cameras.spec.ts` | E2E tests |

## Common Issues

### "API route not found" error
- Verify PiOrchestrator is running on port 8082
- Check SSH tunnel is active (if using remote Pi)
- Ensure V1 endpoints are implemented in PiOrchestrator

### Capture takes too long
- ESP32-CAM capture can take 5-20 seconds depending on resolution
- The UI should show loading state during capture
- Timeout is set to 30 seconds

### Image doesn't display
- Verify the base64 string is valid JPEG
- Check browser console for decoding errors
- Ensure `data:image/jpeg;base64,` prefix is added

### Polling not working
- Check `refetchInterval` is set correctly
- Verify `useDocumentVisibility` hook returns true when tab is visible
- Check React Query DevTools for query state

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Radix UI Alert Dialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog)
- [PiOrchestrator V1 API Spec](./contracts/v1-cameras-api.yaml)
