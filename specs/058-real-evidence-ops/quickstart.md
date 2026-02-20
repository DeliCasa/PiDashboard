# Quickstart: 058-real-evidence-ops

**Date**: 2026-02-19
**Branch**: `058-real-evidence-ops`

## Prerequisites

- Node.js 22+
- SSH access to Pi (`ssh pi`)
- PiOrchestrator running on Pi with MinIO enabled
- At least one session with evidence captures in MinIO

## Verify Environment

```bash
# Check PiOrchestrator is running
ssh pi "sudo systemctl status piorchestrator" | head -5

# Check sessions exist
curl -s http://192.168.1.124:8082/api/dashboard/diagnostics/sessions | jq '.data | length'
# Expected: > 0

# Check evidence exists for a session (replace session ID)
curl -s http://192.168.1.124:8082/api/dashboard/diagnostics/sessions/SESS_ID/evidence | jq '.data | length'
# Expected: > 0

# Check presign endpoint works
curl -s "http://192.168.1.124:8082/api/dashboard/diagnostics/images/presign?key=test&expiresIn=60" | jq '.success'
# Expected: true or false (endpoint exists)

# Check MinIO has objects
ssh pi "mc ls minio/delicasa-evidence/ --recursive" | head -5
# Expected: evidence files listed
```

## Local Development

```bash
# 1. Checkout feature branch
git checkout 058-real-evidence-ops

# 2. Install dependencies
npm install

# 3. SSH tunnel to Pi API (in separate terminal)
ssh -L 8082:localhost:8082 pi

# 4. Start dev server
npm run dev
# Open http://localhost:5173

# 5. Navigate to Operations tab to verify sessions load
```

## Run Tests

```bash
# Unit + component tests
VITEST_MAX_WORKERS=1 npm test

# Lint
npm run lint

# Build check
npm run build

# E2E (requires nix develop for Playwright)
nix develop
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```

## Key Files to Modify

### Error Boundaries & Isolation
- `src/presentation/components/operations/OperationsView.tsx` — wrap subsystems
- `src/presentation/components/operations/SessionListView.tsx` — add `isFeatureUnavailable()`
- `src/presentation/components/operations/SessionDetailView.tsx` — isolate delta vs session errors

### Image Auto-Refresh
- `src/presentation/components/diagnostics/EvidenceThumbnail.tsx` — add refresh-on-error
- `src/presentation/components/diagnostics/EvidencePreviewModal.tsx` — add refresh-on-error
- `src/presentation/components/inventory/InventoryEvidencePanel.tsx` — add refresh-on-error + debug panel
- `src/infrastructure/api/evidence.ts` — fix `getFreshUrl()` to actually call refresh

### Actionable Error Messages
- `src/presentation/components/operations/SessionListView.tsx` — context-specific errors
- `src/presentation/components/operations/SessionDetailView.tsx` — subsystem-specific errors
- `src/presentation/components/diagnostics/EvidencePanel.tsx` — evidence-specific errors

### Debug Panel
- `src/presentation/components/inventory/InventoryEvidencePanel.tsx` — add object key display

## Validation Workflow

After implementation, verify against real data:

```bash
# 1. Open dashboard at http://localhost:5173 (with SSH tunnel)
# 2. Navigate to Operations tab
# 3. Verify sessions load from real API
# 4. Open a session with evidence
# 5. Verify thumbnails render from presigned URLs
# 6. Open debug panel → copy object key
# 7. Verify in MinIO:
ssh pi "mc stat minio/delicasa-evidence/OBJECT_KEY"
```
