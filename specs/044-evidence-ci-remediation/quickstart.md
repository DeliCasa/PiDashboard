# Quickstart: Evidence UI & CI Remediation

**Feature**: 044-evidence-ci-remediation
**Date**: 2026-02-04

## Overview

This feature has three independent work streams that can be executed in parallel:
1. **CI Remediation** (highest priority) - Fix lint errors and version mismatches
2. **Evidence UI Enhancement** - Wire evidence capture and add gallery filtering
3. **ID Handling Audit** - Verify opaque ID treatment (documentation only)

---

## Prerequisites

```bash
# Ensure you're on the feature branch
git checkout 044-evidence-ci-remediation

# Install dependencies
npm install

# Verify current state
npm run lint    # Should show 21 errors, 1 warning
npm test        # Should pass (2080+ tests)
npm run build   # Should pass
```

---

## Work Stream 1: CI Remediation

### Step 1.1: Fix Node.js Version in handoff-check.yml

**File**: `.github/workflows/handoff-check.yml`

Change line 39 from:
```yaml
node-version: '20'
```
To:
```yaml
node-version: '22'
```

### Step 1.2: Add VITEST_MAX_WORKERS to test.yml

**File**: `.github/workflows/test.yml`

Add to the `unit-tests` job environment:
```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    env:
      VITEST_MAX_WORKERS: 1
```

### Step 1.3: Update Playwright Version in flake.nix

**File**: `flake.nix`

Find the playwright-related section and ensure it references nixpkgs with Playwright 1.57.0. The update approach depends on the current flake structure.

### Step 1.4: Fix ConnectionQualityBadge Fast Refresh

**Current**: `src/presentation/components/diagnostics/ConnectionQualityBadge.tsx` exports both the component and a utility function, violating React Fast Refresh.

**Fix**: Extract the utility to a separate file.

1. Create `src/lib/connection-quality.ts`:
```typescript
/**
 * Determine connection quality from RSSI value
 * @param rssi - WiFi signal strength in dBm
 * @returns Connection quality category
 */
export function getConnectionQuality(rssi: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (rssi >= -50) return 'excellent';
  if (rssi >= -60) return 'good';
  if (rssi >= -70) return 'fair';
  return 'poor';
}
```

2. Update `ConnectionQualityBadge.tsx` to import from the new file:
```typescript
import { getConnectionQuality } from '@/lib/connection-quality';
// Remove the local function definition
```

### Step 1.5: Fix Unused Imports in Test Files

**File**: `tests/component/containers/AssignCameraDialog.test.tsx`
```typescript
// Remove unused fireEvent from import
import { render, screen } from '@testing-library/react';  // Remove fireEvent
```

**File**: `tests/component/containers/CreateContainerDialog.test.tsx`
```typescript
// Remove unused fireEvent, waitFor from import
import { render, screen } from '@testing-library/react';  // Remove fireEvent, waitFor
```

**File**: `tests/component/containers/EditContainerDialog.test.tsx`
```typescript
// Remove unused fireEvent, waitFor from import
import { render, screen } from '@testing-library/react';  // Remove fireEvent, waitFor
```

### Step 1.6: Fix Unused Variables in Test Files

**File**: `tests/component/containers/EmptyState.test.tsx:86`
```typescript
// Change:
const { container } = render(...);
// To:
render(...);  // Remove destructured container
```

**File**: `tests/component/containers/PositionSlot.test.tsx:383,394`
```typescript
// Same pattern - remove unused container destructuring
render(...);  // Instead of const { container } = render(...)
```

**File**: `tests/integration/contracts/camera-diagnostics.contract.test.ts`
```typescript
// Lines 291, 297, 341, 347 - replace _ with void
// Change:
const _ = result.error;
// To:
void result.error;  // Or just remove the line if not needed
```

### Step 1.7: Fix Unused Mock Fixtures

**File**: `tests/integration/hooks/useContainers.test.ts:32-34`
```typescript
// Remove unused imports:
// - mockContainerListResponse
// - mockContainerResponse
// - mockAssignmentResponse
```

**File**: `tests/mocks/handlers/camera-diagnostics.ts:11-12`
```typescript
// Remove or use:
// - mockCapturedEvidenceResponse
// - mockSessionDetailResponse
```

**File**: `tests/mocks/v1-containers-handlers.ts:18-20`
```typescript
// Remove or use:
// - mockContainerDetailWithCamera
// - mockCameraAssignmentOnline
// - mockContainerListResponse
```

### Step 1.8: Verify Fixes

```bash
# Run lint - should pass with 0 errors
npm run lint

# Run tests - should still pass
VITEST_MAX_WORKERS=1 npm test

# Run build - should pass without Fast Refresh warning
npm run build
```

---

## Work Stream 2: Evidence UI Enhancement

### Step 2.1: Verify Evidence Capture Button

The evidence capture functionality already exists via `useEvidenceCapture()` hook. Verify it's wired to the camera detail view:

**Check**: `src/presentation/components/cameras/CameraDetail.tsx` (or similar)

If missing, add:
```typescript
import { useEvidenceCapture } from '@/application/hooks/useEvidence';

// Inside component
const { mutate: captureEvidence, isPending } = useEvidenceCapture(cameraId);

<Button
  onClick={() => captureEvidence()}
  disabled={isPending}
  data-testid="capture-evidence-btn"
>
  {isPending ? 'Capturing...' : 'Capture Evidence'}
</Button>
```

### Step 2.2: Add Camera Filter to Evidence Gallery (FR-008)

**File**: `src/presentation/components/diagnostics/EvidencePanel.tsx`

Add camera filter dropdown:
```typescript
import { usePairedCameras } from '@/application/hooks/usePairedCameras';

// Add state
const [filterCameraId, setFilterCameraId] = useState<string | undefined>();
const { data: cameras } = usePairedCameras();

// Update evidence query to use filter
const { data: evidence } = useSessionEvidence(sessionId, { cameraId: filterCameraId });

// Add filter UI
<Select value={filterCameraId} onValueChange={setFilterCameraId}>
  <SelectTrigger data-testid="evidence-camera-filter">
    <SelectValue placeholder="All cameras" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={undefined}>All cameras</SelectItem>
    {cameras?.map(c => (
      <SelectItem key={c.mac_address} value={c.mac_address}>
        {c.name || c.mac_address}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Step 2.3: Verify Download Functionality (FR-003)

The download functionality exists in `useEvidenceDownload()`. Verify it's available in the preview modal:

```typescript
import { useEvidenceDownload } from '@/application/hooks/useEvidence';

const { download } = useEvidenceDownload();

<Button onClick={() => download(evidence)} data-testid="download-evidence-btn">
  Download
</Button>
```

### Step 2.4: Add Tests for New Functionality

```typescript
// tests/component/diagnostics/EvidencePanel.test.tsx

describe('EvidencePanel camera filter', () => {
  it('filters evidence by selected camera', async () => {
    // Setup MSW handler that respects cameraId query param
    // Render EvidencePanel with filter
    // Select a camera
    // Verify filtered results
  });
});
```

---

## Work Stream 3: ID Handling Audit

### Step 3.1: Document Verification Results

Create or update documentation confirming opaque ID handling:

**Already Verified** (per research.md):
- ✅ `src/domain/types/containers.ts:20` - Explicit JSDoc documentation
- ✅ Container components use monospace for ID display
- ✅ No semantic ID parsing in codebase
- ✅ Mock data uses proper UUID format

### Step 3.2: Add Test for ID Format Independence

Optional: Add a contract test that verifies the UI handles non-UUID IDs correctly:

```typescript
// tests/integration/contracts/containers.contract.test.ts

describe('Container ID format independence', () => {
  it('accepts non-UUID container IDs', () => {
    const nonUuidContainer = {
      id: 'kitchen-fridge-001',  // Non-UUID format
      label: 'Kitchen Fridge',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const result = ContainerSchema.safeParse(nonUuidContainer);
    expect(result.success).toBe(true);
  });
});
```

---

## Verification Checklist

### CI Remediation
- [ ] `npm run lint` returns 0 errors
- [ ] `npm run build` has no Fast Refresh warnings
- [ ] `VITEST_MAX_WORKERS=1 npm test` passes
- [ ] CI workflow versions are consistent (Node 22)

### Evidence UI
- [ ] Evidence capture button visible on camera detail
- [ ] Evidence capture shows loading state
- [ ] Evidence capture handles errors with toast
- [ ] Evidence gallery loads within 3 seconds
- [ ] Evidence gallery supports camera filtering
- [ ] Evidence download works from preview modal

### ID Handling
- [ ] Container IDs display in monospace font
- [ ] Labels display prominently above IDs
- [ ] No ID format assumptions in code

---

## Common Issues

### Lint fix breaks tests
If removing an import breaks a test, the test was likely importing for side effects. Check if the import is needed for mocking or setup.

### Playwright version mismatch persists
After updating `flake.nix`, run:
```bash
nix flake update
nix develop
```

### Evidence capture returns 404
The endpoint `/v1/cameras/{id}/evidence` requires PiOrchestrator backend. If unavailable, the `isFeatureUnavailable()` helper returns graceful degradation.

---

## Success Criteria Verification

| Criteria | Verification Command |
|----------|---------------------|
| SC-001: Capture < 5s | Manual test with timer |
| SC-002: Gallery < 3s | Lighthouse performance audit |
| SC-003: CI 100% pass | Create PR, verify green checks |
| SC-004: Lint 0 errors | `npm run lint` |
| SC-005: ID format-independent | Contract test passes |
| SC-006: No UI-induced failures | E2E tests pass |
| SC-007: data-testid attributes | Grep for `data-testid` in new code |
