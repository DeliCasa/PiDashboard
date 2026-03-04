# Research: PiOrchestrator Connect RPC Client Migration

**Feature**: 062-piorch-grpc-client
**Date**: 2026-03-03

## R1: Service Descriptor Availability in @delicasa/wire v0.2.0

**Decision**: Add device service protos to `@delicasa/wire` and regenerate with `protoc-gen-connect-es`.

**Rationale**: Wire v0.2.0 has device message types (`Camera`, `OperationSession`, `EvidenceCapture`, `EvidencePair`) under `proto/delicasa/device/v1/` but zero service definitions. The service protos (with `service` + `rpc` blocks) only exist in PiOrchestrator's `specs/087-connect-rpc-surface/contracts/`. Since wire is the shared contract package and its `./gen/*` wildcard export would automatically cover new generated files, adding the service protos there is the cleanest path.

**Alternatives considered**:
- *Generate stubs locally in PiDashboard*: Would require buf toolchain in PiDashboard's build, creating a maintenance burden. Rejected.
- *Hand-write service descriptors*: Error-prone and defeats the purpose of proto-first contracts. Rejected.
- *Use raw fetch to RPC URLs*: Loses type safety from `createClient`. Rejected.

**Implementation**:
1. Copy the 4 service proto files from PiOrchestrator spec 087 into wire's `proto/delicasa/device/v1/`
2. Add `protoc-gen-connect-es` plugin to wire's `buf.gen.yaml`
3. Run `buf generate` — produces `*_service_pb.ts` files with `GenService` descriptors
4. Bump wire to v0.2.1 (or use current HEAD)
5. PiDashboard imports: `@delicasa/wire/gen/delicasa/device/v1/camera_service_pb`

## R2: Connect-Web Transport for PiDashboard

**Decision**: Use `@connectrpc/connect-web`'s `createConnectTransport` (same pattern as NextClient).

**Rationale**: PiDashboard runs in the browser. `connect-web` provides browser-compatible HTTP/1.1 transport for the Connect protocol. PiOrchestrator's RPC surface uses Connect JSON (not gRPC binary), which is exactly what `createConnectTransport` produces.

**Key difference from NextClient**: PiDashboard uses `X-API-Key` header (not JWT). The auth interceptor is simpler — just reads the API key from the existing `getApiKey()` utility and sets the header.

**Dependencies to add**:
- `@connectrpc/connect-web` ^2.1.x
- `@connectrpc/connect` ^2.1.x (may come as transitive from wire or connect-web)
- `@bufbuild/protobuf` ^2.2.x (peer of wire)

## R3: Proto Field Names vs JSON Field Names

**Decision**: Use protobuf-generated types for RPC calls (camelCase) and wire Zod schemas for REST boundary validation (snake_case). For RPC responses, the protobuf-es generated types handle serialization automatically.

**Rationale**: Connect protocol with `protoc-gen-es` v2 uses protobuf's canonical JSON mapping, which means proto `snake_case` field names become `camelCase` in TypeScript (e.g., `device_id` → `deviceId`, `session_id` → `sessionId`). The wire Zod schemas use `snake_case` because they validate raw HTTP/JSON responses. For RPC, the generated message classes handle serialization, so the Zod schemas are used only at the presentation boundary (converting proto objects to UI-friendly shapes).

**Mapping strategy**:
- RPC call → returns proto message object (camelCase fields, typed)
- Adapter function → converts proto message to domain type (if needed)
- Zod validation at UI boundary → validates the final shape consumed by components

## R4: Vite Proxy Configuration for RPC

**Decision**: Add a `/rpc` proxy rule pointing to `http://192.168.1.124:8081` (port 8081) alongside the existing `/api` proxy to port 8082.

**Rationale**: RPC lives on port 8081 (main API server), not port 8082 (dashboard backend). In production, PiOrchestrator's composite handler routes `/rpc/*` to the Connect mux on the same port, so same-origin works. In development, Vite needs a separate proxy rule.

**Configuration**:
```typescript
// vite.config.ts
proxy: {
  '/api': { target: PI_API_ORIGIN, ... },  // existing (port 8082)
  '/rpc': { target: PI_RPC_ORIGIN, ... },  // new (port 8081)
}
```

**Environment variable**: `VITE_PI_RPC_URL` — when set, used as the Connect transport baseUrl instead of relative `/rpc/`. Default (unset) → uses Vite proxy in dev, same-origin in production.

## R5: Error Mapping Strategy

**Decision**: Create a `mapConnectError` function modeled on NextClient's `error-mapper.ts`, adapted for PiDashboard's error UI patterns.

**Rationale**: Connect errors have a `code` field (enum values like `Code.NotFound`, `Code.Unavailable`). PiDashboard's existing error handling uses `isFeatureUnavailable()` for 404/503 graceful degradation. The mapper translates Connect error codes to the same error states:
- `Code.NotFound` → feature unavailable (graceful degradation)
- `Code.Unavailable` → service down (retry affordance)
- `Code.Unauthenticated` / `Code.PermissionDenied` → auth error
- `Code.DeadlineExceeded` → timeout (retry)
- `Code.Internal` → generic error

## R6: Hooks Migration Strategy

**Decision**: Replace API client calls inside existing hooks, keeping hook signatures and query keys stable.

**Rationale**: Hooks are the application layer — they should be unaware of whether the transport is REST or RPC (hexagonal architecture). The migration replaces the `queryFn` implementation inside each hook while preserving `queryKey`, `staleTime`, and all React Query configuration. Components don't change at all.

**Hooks to migrate**:
| Hook | Current API call | New RPC call |
|------|-----------------|--------------|
| `useSessions` | `sessionsApi.listSessions()` | `sessionClient.listSessions({...})` |
| `useSession(id)` | `sessionsApi.getSession(id)` | `sessionClient.getSession({sessionId: id, ...})` |
| `useEvidencePair(sessionId)` | `evidenceApi.getEvidencePair(sessionId)` | `evidenceClient.getEvidencePair({sessionId, ...})` |
| `useSessionEvidence(sessionId)` | `evidenceApi.getSessionEvidence(sessionId)` | `evidenceClient.getSessionEvidence({sessionId, ...})` |
| `useCameras` | `v1CamerasApi.listCameras()` | `cameraClient.listCameras({...})` |
| `useCamera(id)` | `v1CamerasApi.getCamera(id)` | `cameraClient.getCamera({deviceId: id, ...})` |
| `useCaptureTest(id)` | `v1CamerasApi.captureImage(id)` | `captureClient.captureImage({cameraId: id, ...})` |

**Hooks NOT migrated** (no RPC equivalent): `useCameraDiagnostics`, `useRebootCamera`, `useCameraReconcile` (ReconcileCameras exists but is protected — evaluate separately).

## R7: Wire Package Update Workflow

**Decision**: Update wire locally (add service protos + connect plugin), then install updated wire in PiDashboard.

**Rationale**: Since wire is a local monorepo package (`file:../delicasa-wire`), changes are picked up on `npm install`. No npm publish needed.

**Steps**:
1. Add 4 service proto files to `delicasa-wire/proto/delicasa/device/v1/`
2. Install `@connectrpc/protoc-gen-connect-es` as dev dep in wire
3. Add connect-es plugin to `buf.gen.yaml`
4. Run `pnpm gen` to regenerate
5. In PiDashboard: `npm install file:../delicasa-wire`
6. Import service descriptors: `import { CameraService } from "@delicasa/wire/gen/delicasa/device/v1/camera_service_pb"`
