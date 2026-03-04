# Quickstart: PiOrchestrator Connect RPC Client

**Feature**: 062-piorch-grpc-client
**Date**: 2026-03-03

## Prerequisites

1. PiOrchestrator running with Connect RPC enabled (spec 087) on port 8081
2. SSH tunnel or LAN access to Pi (192.168.1.124)
3. `@delicasa/wire` updated with device service protos (see Step 1)

## Step 1: Update @delicasa/wire with Service Protos

```bash
# In delicasa-wire repo
cd ../delicasa-wire

# Copy service protos from PiOrchestrator spec 087
cp ../PiOrchestrator/specs/087-connect-rpc-surface/contracts/camera_service.proto \
   proto/delicasa/device/v1/
cp ../PiOrchestrator/specs/087-connect-rpc-surface/contracts/capture_service.proto \
   proto/delicasa/device/v1/
cp ../PiOrchestrator/specs/087-connect-rpc-surface/contracts/session_service.proto \
   proto/delicasa/device/v1/
cp ../PiOrchestrator/specs/087-connect-rpc-surface/contracts/evidence_service.proto \
   proto/delicasa/device/v1/

# Install connect-es codegen plugin
pnpm add -D @connectrpc/protoc-gen-connect-es

# Update buf.gen.yaml to include connect-es plugin (see below)
# Regenerate
pnpm gen
```

**buf.gen.yaml addition** (add after existing `protoc-gen-es` plugin):
```yaml
  - local: protoc-gen-connect-es
    out: gen/ts
    opt:
      - target=ts+dts
      - import_extension=.js
```

## Step 2: Install Dependencies in PiDashboard

```bash
cd ../PiDashboard

# Install updated wire package
npm install file:../delicasa-wire

# Install Connect-Web transport
npm install @connectrpc/connect-web
```

## Step 3: Create RPC Client Module

Create `src/infrastructure/rpc/piorchestrator.ts`:

```typescript
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { CameraService } from "@delicasa/wire/gen/delicasa/device/v1/camera_service_pb";
import { CaptureService } from "@delicasa/wire/gen/delicasa/device/v1/capture_service_pb";
import { SessionService } from "@delicasa/wire/gen/delicasa/device/v1/session_service_pb";
import { EvidenceService } from "@delicasa/wire/gen/delicasa/device/v1/evidence_service_pb";
import { getApiKey } from "../api/auth";

const RPC_BASE_URL = import.meta.env.VITE_PI_RPC_URL || "/rpc";

const transport = createConnectTransport({
  baseUrl: RPC_BASE_URL,
  interceptors: [
    // API key interceptor for protected RPCs
    (next) => async (req) => {
      const apiKey = getApiKey();
      if (apiKey) {
        req.header.set("X-API-Key", apiKey);
      }
      req.header.set("X-Correlation-ID", crypto.randomUUID());
      return next(req);
    },
  ],
});

export const cameraClient = createClient(CameraService, transport);
export const captureClient = createClient(CaptureService, transport);
export const sessionClient = createClient(SessionService, transport);
export const evidenceClient = createClient(EvidenceService, transport);
```

## Step 4: Update Vite Proxy

Add to `vite.config.ts`:

```typescript
proxy: {
  '/api': { target: 'http://192.168.1.124:8082', changeOrigin: true },
  '/rpc': { target: 'http://192.168.1.124:8081', changeOrigin: true },
}
```

## Step 5: Migrate a Hook (Example: useSessions)

```typescript
// Before (REST)
const fetchSessions = async () => {
  const response = await apiClient.get('/v1/sessions');
  return response.data.sessions;
};

// After (RPC)
import { sessionClient } from "@/infrastructure/rpc/piorchestrator";

const fetchSessions = async () => {
  const response = await sessionClient.listSessions({
    correlationId: crypto.randomUUID(),
    limit: 50,
  });
  return response.sessions; // proto-typed OperationSession[]
};
```

## Step 6: Validate on Real Pi

```bash
# Start SSH tunnel for both ports
ssh -L 8081:localhost:8081 -L 8082:localhost:8082 pi

# Start dev server
npm run dev

# Open http://localhost:5173
# Navigate to Operations tab → sessions should load via RPC
# Open Network tab → verify POST requests to /rpc/delicasa.device.v1.SessionService/ListSessions
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| VITE_PI_RPC_URL | No | `/rpc` | Connect RPC base URL. Set for Cloudflare Tunnel or non-default deployment. |
| VITE_API_KEY | No | — | API key for protected RPCs (CaptureImage, ReconcileCameras) |

## Validation Checklist

- [ ] Sessions list loads in Operations tab
- [ ] Session detail opens with metadata
- [ ] Evidence thumbnails render (before/after pairs)
- [ ] Camera list loads in Cameras tab
- [ ] Camera detail shows health metrics
- [ ] No REST calls in Network tab for migrated endpoints
- [ ] No console errors
- [ ] WiFi/door/config tabs still work (REST unchanged)
