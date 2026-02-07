# Research: PiDashboard Current State Report

**Updated**: 2026-02-04
**Investigation Method**: Parallel agent swarm (4 agents)

---

## Executive Summary

**Blocker Statement**: UI is blocked by backend availability of container and diagnostics endpoints (`/api/v1/containers/*`, `/api/dashboard/diagnostics/*`, `/api/v1/cameras/:id/evidence`); without these, container management and evidence capture are non-functional, while other areas (cameras, WiFi, door, system) degrade gracefully with fallback patterns.

---

## Agent Findings

### Agent 1: UI Screen Mapping

#### Evidence Capture (Feature 038, 042)
- **Location**: `src/presentation/components/diagnostics/`
- **Components**: `DiagnosticsSection.tsx`, `EvidencePanel.tsx`, `SessionsPanel.tsx`, `EvidenceThumbnail.tsx`, `EvidencePreviewModal.tsx`, `SessionCard.tsx`
- **Purpose**: Session evidence captures (images from ESP32-CAM), service health status, session history
- **Polling**: Auto-refresh every 5 seconds
- **API Dependencies**:
  - `evidenceApi.listSessionEvidence()` - List evidence for session
  - `evidenceApi.refreshPresignedUrl()` - Refresh S3 presigned URLs
  - `evidenceApi.captureFromCamera()` - Capture evidence from camera
  - `sessionsApi.listSessions()` - List sessions by status
  - `sessionsApi.getSession()` - Get session details

#### Camera Status (Feature 034)
- **Location**: `src/presentation/components/cameras/`
- **Components**: `CameraSection.tsx`, `CameraCard.tsx`, `CameraDetail.tsx`, `CapturePreview.tsx`, `RebootDialog.tsx`, `DiagnosticsView.tsx`
- **Purpose**: ESP camera list with visibility-aware polling, image capture, reboot, diagnostics
- **Polling**: Pauses when tab hidden (Document Visibility API)
- **API Dependencies**:
  - `v1CamerasApi.list()` - List cameras (V1 with legacy fallback)
  - `v1CamerasApi.capture()` - Capture JPEG image
  - `v1CamerasApi.reboot()` - Reboot camera
  - `v1CamerasApi.getDiagnostics()` - Extended diagnostics
  - `v1CamerasApi.listPaired()` - Paired ESP-CAM devices

#### Container Flows (Feature 043)
- **Location**: `src/presentation/components/containers/`
- **Components**: `ContainerSection.tsx`, `ContainerCard.tsx`, `ContainerDetail.tsx`, `PositionSlot.tsx`, `CreateContainerDialog.tsx`, `EditContainerDialog.tsx`, `AssignCameraDialog.tsx`, `EmptyState.tsx`
- **Purpose**: Container lifecycle (CRUD), camera position assignments, online/offline tracking
- **API Dependencies**:
  - `v1ContainersApi.list()` - List containers with camera assignments
  - `v1ContainersApi.getById()` - Container detail
  - `v1ContainersApi.create()` - Create container
  - `v1ContainersApi.update()` - Update label/description
  - `v1ContainersApi.delete()` - Delete empty container
  - `v1ContainersApi.assignCamera()` - Assign camera to position
  - `v1ContainersApi.unassignCamera()` - Remove camera

---

### Agent 2: Test Results

#### Unit/Integration Tests
- **Command**: `VITEST_MAX_WORKERS=1 npm test`
- **Status**: PASS ✓
- **Results**: 2080 tests passed, 0 failed, 2 skipped (2082 total)
- **Duration**: 209.89s
- **Test Files**: 95 passed

#### Lint
- **Command**: `npm run lint`
- **Status**: FAIL ✗
- **Summary**: 22 problems (21 errors, 1 warning)
- **Key Issues**:
  | Category | Count | Files |
  |----------|-------|-------|
  | Unused variables (test files) | 18 | `tests/component/containers/*.test.tsx`, `tests/integration/**` |
  | react-refresh/only-export-components | 1 | `ConnectionQualityBadge.tsx` |
  | react-hooks/incompatible-library | 1 | `LogStream.tsx` (TanStack Virtual warning) |
  | Unused mock imports | 2 | `tests/mocks/*.ts` |

#### Build
- **Command**: `npm run build`
- **Status**: PASS ✓
- **Output**:
  | Asset | Size | Gzip |
  |-------|------|------|
  | `index.html` | 1.24 kB | 0.61 kB |
  | `index-*.css` | 70.27 kB | 11.96 kB |
  | `index-*.js` | 794.62 kB | 226.20 kB |
- **Warning**: Main chunk exceeds 500 kB (consider code-splitting)

---

### Agent 3: CI Workflow Analysis

#### Workflow Summary

| Workflow | Trigger | Key Jobs | Status |
|----------|---------|----------|--------|
| `test.yml` | push/PR to main/dev | unit-tests, contract-tests, e2e-smoke, lint, typecheck, coverage | PR gate |
| `nightly.yml` | 3 AM UTC daily | full tests, multi-browser E2E (2 shards), a11y, resilience | Nightly |
| `handoff-check.yml` | PR with handoff changes | handoff detection | PR gate |

#### Identified Instability Causes

1. **Node.js Version Mismatch**
   - `handoff-check.yml` uses Node.js 20, all others use Node.js 22
   - Impact: Inconsistent npm/TypeScript behavior

2. **Playwright Version Sync Risk**
   - `flake.nix` pins Playwright 1.56.1
   - `package.json` specifies `@playwright/test: ^1.57.0`
   - Impact: Potential browser binary incompatibility on NixOS

3. **Missing Vitest Worker Limit in CI**
   - `VITEST_MAX_WORKERS` not explicitly set in workflows
   - Defaults to 50% CPUs, may cause resource contention

4. **Security Audit Non-Blocking**
   - `continue-on-error: true` on npm audit
   - Vulnerabilities detected but don't fail CI

#### Remediation Steps (Priority Order)

| Priority | Issue | Fix |
|----------|-------|-----|
| High | Node.js 20 in handoff-check | Change to `node-version: '22'` |
| High | Playwright version sync | Sync flake.nix with package.json |
| High | Vitest worker limit | Add `VITEST_MAX_WORKERS=1` to test.yml |
| Medium | E2E timeouts | Extend from 30s to 45s |
| Low | Security audit | Make blocking or document acceptance |

---

### Agent 4: Integration Dependencies

See `docs/INTEGRATION_REQUIREMENTS.md` for full endpoint inventory.

#### Critical Endpoints (Blockers)

| Endpoint | Service | Status | Impact |
|----------|---------|--------|--------|
| `/api/v1/containers/*` | PiOrchestrator | Required | Container management non-functional without this |
| `/api/dashboard/diagnostics/sessions/*` | BridgeServer (proxy) | Required | Session evidence non-functional |
| `/api/v1/cameras/:id/evidence` | BridgeServer (proxy) | Required | Evidence capture non-functional |
| `/api/dashboard/diagnostics/images/presign` | BridgeServer (proxy) | Required | Evidence preview requires presigned URLs |

#### Graceful Degradation Endpoints

| Endpoint | Service | Behavior on 404/503 |
|----------|---------|---------------------|
| `/api/wifi/*` | PiOrchestrator | Returns empty/default |
| `/api/dashboard/mqtt/status` | PiOrchestrator | Returns `{ connected: false }` |
| `/api/dashboard/tailscale/ping` | PiOrchestrator | Silent failure |
| `/api/v1/cameras/*` (V1) | PiOrchestrator | Falls back to legacy `/api/dashboard/cameras/*` |

#### Environment Variables Required

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_API_KEY` | V1 API authentication | Conditional (dev bypass available) |
| `VITE_BYPASS_AUTH` | Dev-only auth bypass | No (default: false) |
| `VITE_USE_V1_API` | Enable V1 API client | No (default: false) |
| `VITE_BATCH_PROVISIONING` | Batch provisioning UI | No (default: false) |

---

## Technical Decisions

### Decision 1: Technical context baselined from repo state
**Decision**: Use current stack as documented in `CLAUDE.md` (React 19, Vite 7, TS 5.9, Tailwind v4, TanStack Query, Zustand, Zod).
**Rationale**: Report is documentation-only; no new stack choices required.

### Decision 2: Scope limited to evidence, camera, container workflows
**Decision**: Limit UI mapping and dependency list to diagnostics/evidence, camera status/capture, and container management.
**Rationale**: Matches requested agent scope and acceptance criteria.

### Decision 3: Backend dependency owners separated by service
**Decision**: Attribute endpoints to PiOrchestrator or BridgeServer (via proxy) based on API clients.
**Rationale**: Required to identify integration blockers accurately.

### Decision 4: Lint failures are non-blocking for documentation
**Decision**: Document lint errors but don't fix them in this feature.
**Rationale**: This is a documentation/research feature; lint fixes are separate work.

---

## API Client Architecture

- **Base URL**: `/api` (proxied to PiOrchestrator in dev, same-origin in prod)
- **V1 Envelope**: All V1 endpoints return `{ success: boolean, data?: T, error?: { code, message, retryable } }`
- **Error Handling**: `V1ApiError` with codes (`NOT_FOUND`, `CAMERA_OFFLINE`, `CAPTURE_TIMEOUT`)
- **Timeouts**: 10s default, 30s for camera capture
- **Retries**: 3 attempts with exponential backoff for 5xx errors
- **Auth**: `X-API-Key` header for protected endpoints, bypass available in dev

---

## Quality Gate Summary

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| Tests | `VITEST_MAX_WORKERS=1 npm test` | PASS | 2080/2082 passed |
| Lint | `npm run lint` | FAIL | 22 problems (mostly unused vars in tests) |
| Build | `npm run build` | PASS | 794 kB bundle (chunk size warning) |
| E2E | `npm run test:e2e` | Not Run | Requires Nix environment |

---

## Deliverables Status

| File | Status | Notes |
|------|--------|-------|
| `specs/001-pidashboard-current-state/research.md` | ✓ Updated | This file |
| `specs/001-pidashboard-current-state/tasks.md` | ✓ Exists | Task tracking complete |
| `docs/INTEGRATION_REQUIREMENTS.md` | ✓ Exists | Full endpoint inventory |
