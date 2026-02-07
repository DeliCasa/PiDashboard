# Research: Evidence UI & CI Remediation

**Feature**: 044-evidence-ci-remediation
**Date**: 2026-02-04
**Status**: Complete

## Research Summary

This document captures technical decisions and findings for Feature 044. All major questions have been resolved through codebase exploration.

---

## R1: Evidence UI Component State

### Question
Are the existing evidence UI components (`EvidencePanel`, `EvidenceThumbnail`, `EvidencePreviewModal`) fully functional with the existing hooks?

### Decision
**Existing infrastructure is complete and functional.** No new components needed.

### Rationale
The codebase exploration revealed:

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `EvidencePanel.tsx` | `src/presentation/components/diagnostics/` | ✅ Complete | Renders evidence grid |
| `EvidenceThumbnail.tsx` | Same | ✅ Complete | URL refresh on expiry |
| `EvidencePreviewModal.tsx` | Same | ✅ Complete | Full-size image view |
| `useEvidenceCapture()` | `src/application/hooks/useEvidence.ts` | ✅ Complete | Mutation hook for capture |
| `useSessionEvidence()` | Same | ✅ Complete | Query with 10s polling |
| `captureFromCamera()` | `src/infrastructure/api/evidence.ts` | ✅ Complete | POST to `/v1/cameras/{id}/evidence` |

### Alternatives Considered
- **Build new evidence components**: Rejected - existing components are production-ready
- **Create evidence capture dialog**: May be useful but not required for spec requirements

### Gap Identified
The existing `EvidencePanel` may need a minor update to add camera-based filtering (FR-008). This is an enhancement, not new development.

---

## R2: CI Version Compatibility

### Question
Will updating Node.js to 22 and Playwright to 1.57.0 break the existing test suite?

### Decision
**Updates are safe.** Node 22 is already used in `test.yml`. Playwright 1.57.0 is the package.json target.

### Rationale

**Node.js Analysis**:
| Workflow | Current Version | Target | Risk |
|----------|----------------|--------|------|
| `test.yml` | 22 | 22 | None (already correct) |
| `handoff-check.yml` | 20 | 22 | Low (aligns with test.yml) |
| `nightly.yml` | 22 | 22 | None |

- Node 22 LTS is stable and widely supported
- No Node 20-specific APIs used in the codebase
- TypeScript 5.9.3 is compatible with Node 22

**Playwright Analysis**:
| Source | Version | Notes |
|--------|---------|-------|
| `package.json` | ^1.57.0 | Target version |
| `flake.nix` | 1.56.1 | Outdated - needs update |
| Nixpkgs unstable | 1.57.0+ | Available |

- Playwright 1.57.0 is a minor version bump (1.56.1 → 1.57.0)
- No breaking API changes between 1.56 and 1.57
- Nix flake update is configuration-only

### Alternatives Considered
- **Keep versions mismatched**: Rejected - causes reproducibility issues in CI
- **Pin to older versions**: Rejected - loses security updates and new features

---

## R3: Lint Fix Strategy

### Question
Can the 21 lint errors be safely fixed by removing unused imports/variables?

### Decision
**Yes, all fixes are safe.** Unused code can be removed without affecting test behavior.

### Rationale

**Error Categories**:

| Category | Count | Files | Safe to Remove |
|----------|-------|-------|----------------|
| Unused test imports (`fireEvent`, `waitFor`) | 4 | 3 test files | ✅ Yes |
| Unused `container` variable | 3 | 2 test files | ✅ Yes |
| Unused `_` bindings | 4 | 1 contract test | ✅ Yes |
| Unused mock fixtures | 9 | 3 mock/test files | ⚠️ Review first |

**Special Case: ConnectionQualityBadge.tsx**
- Error: Fast Refresh violation (exports non-component alongside component)
- Fix: Extract `getConnectionQuality()` utility to `src/lib/connection-quality.ts`
- Risk: Low - utility function is already pure

**Mock Fixture Analysis**:
The unused mock fixtures in test files were likely prepared for tests that were not written. Options:
1. **Remove unused exports** - Cleaner, but loses prepared fixtures
2. **Add `// eslint-disable-next-line`** - Preserves fixtures for future use
3. **Write missing tests** - Beyond scope of this feature

**Decision**: Remove unused exports. If fixtures are needed later, they can be re-added or restored from git history.

### Alternatives Considered
- **Disable lint rule**: Rejected - masks real issues
- **Keep unused code**: Rejected - violates Constitution IV (YAGNI)

---

## R4: Evidence Gallery Filtering

### Question
Does the existing `EvidencePanel` support filtering by camera source (FR-008)?

### Decision
**Minor enhancement needed.** The API supports filtering; the UI needs a filter control.

### Rationale

**API Support**:
```typescript
// evidence.ts line 41-77
export async function listSessionEvidence(
  sessionId: string,
  options?: { limit?: number; cameraId?: string }  // cameraId filter supported
): Promise<EvidenceCapture[]>
```

**UI Gap**:
The `EvidencePanel` component currently passes evidence to the grid without a camera filter dropdown. Adding this requires:
1. Camera list from `usePairedCameras()` hook
2. Select component for camera filter
3. Filter state management (local or URL params)

### Implementation Approach
```tsx
// Minimal enhancement to EvidencePanel
const [filterCameraId, setFilterCameraId] = useState<string | undefined>();
const { data: evidence } = useSessionEvidence(sessionId, { cameraId: filterCameraId });
```

---

## R5: Container ID Handling Verification

### Question
Does the existing codebase correctly treat container IDs as opaque strings?

### Decision
**Yes, ID handling is correct.** No code changes needed.

### Rationale

**Code Review Findings**:

| Location | Finding | Status |
|----------|---------|--------|
| `src/domain/types/containers.ts:20` | Explicit JSDoc: "Opaque container ID (UUID or similar) - never assume semantic meaning" | ✅ Correct |
| `ContainerCard.tsx` | Displays `id` in monospace secondary text | ✅ Correct |
| `PositionSlot.tsx` | Uses position numbers (1-4), not semantic IDs | ✅ Correct |
| `tests/mocks/container-mocks.ts` | Uses proper UUID format | ✅ Correct |
| API handlers | Use `decodeURIComponent()` for URL safety | ✅ Correct |

**No semantic parsing found**:
- No `id.split('-')` or `id.substring()` patterns
- No `parseInt(id)` conversions
- No ID format validation beyond existence check

### Alternatives Considered
None - existing implementation is exemplary.

---

## R6: Test Resource Constraints

### Question
How should `VITEST_MAX_WORKERS=1` be added to CI?

### Decision
**Add to test.yml environment section.**

### Rationale

**Current Configuration**:
- `vitest.config.ts`: Already configured with 50% CPU limit
- CI should override to 1 for reproducibility

**Implementation**:
```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    env:
      VITEST_MAX_WORKERS: 1
```

**Why 1 worker in CI**:
- Reproducible test ordering
- Prevents resource contention on shared runners
- Easier to debug failures
- Local development can still use multiple workers

---

## Summary Table

| Research Item | Decision | Confidence |
|---------------|----------|------------|
| R1: Evidence UI | Use existing components | High |
| R2: Node/Playwright versions | Safe to update | High |
| R3: Lint fixes | Remove unused code | High |
| R4: Evidence filtering | Minor UI enhancement | High |
| R5: ID handling | Already correct | High |
| R6: VITEST_MAX_WORKERS | Add env var to CI | High |

## Open Questions

None. All research items have been resolved.
