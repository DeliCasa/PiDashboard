# RPC E2E Mock Contract

**Purpose**: Define the Connect RPC endpoints that must be mocked in Playwright E2E tests and the expected request/response shapes.

## Endpoint Inventory

All endpoints use HTTP POST with JSON bodies (Connect protocol, `useBinaryFormat: false`).

### SessionService

| Method | URL Pattern | Request Body | Response Factory |
|--------|-------------|--------------|------------------|
| ListSessions | `/rpc/delicasa.device.v1.SessionService/ListSessions` | `{}` (empty or filter params) | `makeListSessionsResponse()` |
| GetSession | `/rpc/delicasa.device.v1.SessionService/GetSession` | `{ sessionId: string }` | `makeGetSessionResponse()` |

### EvidenceService

| Method | URL Pattern | Request Body | Response Factory |
|--------|-------------|--------------|------------------|
| GetSessionEvidence | `/rpc/delicasa.device.v1.EvidenceService/GetSessionEvidence` | `{ sessionId: string }` | `makeGetSessionEvidenceResponse()` |
| GetEvidencePair | `/rpc/delicasa.device.v1.EvidenceService/GetEvidencePair` | `{ sessionId: string }` | `makeGetEvidencePairResponse()` |

### CameraService

| Method | URL Pattern | Request Body | Response Factory |
|--------|-------------|--------------|------------------|
| ListCameras | `/rpc/delicasa.device.v1.CameraService/ListCameras` | `{}` | `makeListCamerasResponse()` |
| GetCamera | `/rpc/delicasa.device.v1.CameraService/GetCamera` | `{ deviceId: string }` | `makeGetCameraResponse()` |

### CaptureService

| Method | URL Pattern | Request Body | Response Factory |
|--------|-------------|--------------|------------------|
| CaptureImage | `/rpc/delicasa.device.v1.CaptureService/CaptureImage` | `{ cameraId: string }` | `makeCaptureImageResponse()` |

## Error Response Shape

Connect protocol errors use HTTP status codes with JSON body:

```json
{
  "code": "unavailable",
  "message": "Service temporarily unavailable"
}
```

| Error Scenario | HTTP Status | Code | Use Case |
|----------------|-------------|------|----------|
| Service unavailable | 503 | `"unavailable"` | Graceful degradation |
| Not found | 404 | `"not_found"` | Missing resource |
| Internal error | 500 | `"internal"` | Server failure |

## Response Content-Type

All responses: `Content-Type: application/json`

## Default Mock Set

The following endpoints should be added to `applyDefaultMocks()` in `test-base.ts` to provide baseline RPC coverage for all E2E tests:

- `SessionService/ListSessions` → empty sessions (`makeListSessionsResponse({ sessions: [] })`)
- `CameraService/ListCameras` → empty cameras (`makeListCamerasResponse({ cameras: [] })`)
- `EvidenceService/GetSessionEvidence` → 404 not found
- `EvidenceService/GetEvidencePair` → 404 not found
- `CaptureService/CaptureImage` → 404 not found
