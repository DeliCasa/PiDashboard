# Research: Session Drill-Down E2E Operational Validation

**Feature**: 056-session-drilldown-e2e
**Date**: 2026-02-18

## Executive Summary

Feature 055 delivered the session review drill-down UI with comprehensive component coverage. This research validates the existing implementation against the E2E operational spec (056) and identifies gaps that need fixing before the drill-down can be considered production-ready for operators.

## Research Findings

### R1: Image Load Failure Handling

**Decision**: Add an explicit error state to `InventoryEvidencePanel` when images fail to load

**Current State**: The `onError` handler on `<img>` elements sets `imageLoading.before = false`, which hides the skeleton but leaves a broken `<img>` tag visible. The browser shows its default broken-image icon with no context for the operator.

**Gap**: No visual feedback distinguishing "image not available" from "image loading". No "Image unavailable" placeholder. No test coverage for image load failures.

**Rationale**: Operators need clear feedback when evidence images are broken (expired signed URLs, backend storage issues). A broken browser icon provides no actionable information.

**Alternatives Considered**:
- **Do nothing**: Broken icon is confusing, unacceptable for operators
- **Retry with backoff**: Over-engineering for an evidence review tool; images are either available or not
- **Show error state with placeholder** (chosen): Simple, informative, and testable

---

### R2: Evidence Empty State Next Action

**Decision**: The existing empty state message is adequate; add a brief suggested next action

**Current State**: Shows "No evidence images available for this session" when evidence is null/absent. Has proper `data-testid="evidence-no-images"`. Partial evidence states also handled ("Before image not captured" / "After image not captured").

**Gap**: Spec requires a suggested next action (e.g., "Check if the camera was online during this session"). The current message is descriptive but not actionable.

**Rationale**: Operators benefit from guidance about why evidence may be missing and what to check next.

---

### R3: Session Not Found UX

**Decision**: Differentiate "session not found" from generic API errors

**Current State**: When `useSessionDelta` returns null (404/INVENTORY_NOT_FOUND), `InventoryRunDetail` shows `isError || !data` path → "Failed to load run details" with retry button. This is misleading for a 404 — retrying won't help.

**Gap**: Spec requires a clear "Session not found" message. The current generic error message doesn't distinguish between transient failures (worth retrying) and permanent 404s (session doesn't exist).

**Rationale**: Operators entering session IDs manually via lookup need to know whether to retry or re-check the ID.

**Alternatives Considered**:
- **Generic error for all cases**: Current behavior, confusing for operators
- **Separate null vs error handling** (chosen): Check for `!data && !isError` (null result without error) vs `isError` (actual failure)

---

### R4: E2E Test Coverage Gaps

**Decision**: Add targeted E2E tests for operational edge cases

**Current State**:
- 7 E2E tests in `inventory-review-drilldown.spec.ts` (happy path + error + re-run)
- 5+ tests in `inventory-delta.spec.ts` (run list)
- 8+ tests in `inventory-correction-flow.spec.ts` (correction workflow)

**Gaps Identified**:
1. No E2E test for image load failure → placeholder display
2. No E2E test for `processing` state detail view (only in run list)
3. No E2E test for `pending` state detail view
4. No E2E test for session 404 → "not found" message
5. No E2E test for evidence empty state (both images null)

**Rationale**: E2E tests should verify the operator experience across all status states and failure modes, not just the happy path.

---

### R5: Sensitive Data Audit

**Decision**: No changes needed — existing implementation passes

**Current State**: RunDebugInfo displays only: Run ID, Session ID, Container ID, Provider, Processing Time, Model Version, Request ID. Evidence images use `<img src>` attributes that render the URL but don't display it as text. No bucket paths, signing keys, or internal URLs are shown anywhere in the drill-down.

**Rationale**: The backend serves evidence as pre-signed or proxy URLs. The dashboard never exposes raw storage paths.

---

### R6: Performance Characteristics

**Decision**: Existing loading behavior meets spec targets; no changes needed

**Current State**:
- Loading skeleton appears immediately (React render is synchronous)
- `useSessionDelta` hook has `staleTime: 10_000` (10s cache)
- Text content (timeline, delta, debug info) renders from the same API response
- Evidence images load independently via `<img>` tags with their own loading states

**Rationale**: The single API call pattern (`/v1/sessions/{id}/inventory-delta`) returns all data including evidence URLs. Text content renders as soon as the response arrives. Images load asynchronously. This naturally satisfies "text loads before images."

---

### R7: Stale Processing Detection

**Decision**: No changes needed — fully implemented and tested

**Current State**: `STALE_THRESHOLD_MS = 5 * 60 * 1000` with `useEffect` computing staleness from `data.metadata.created_at`. Shows Alert with "Analysis may be stuck" message and refresh button. Has both positive and negative test coverage.

---

## Summary of Changes Required

| # | Category | Change Type | Effort |
|---|----------|-------------|--------|
| 1 | Image load failure placeholder | Component fix | Small |
| 2 | Evidence empty state next action | Copy tweak | Trivial |
| 3 | Session not found differentiation | Component fix | Small |
| 4 | Image failure component tests | New tests | Small |
| 5 | E2E: image failure scenario | New E2E test | Small |
| 6 | E2E: processing state detail | New E2E test | Small |
| 7 | E2E: pending state detail | New E2E test | Small |
| 8 | E2E: session 404 lookup | New E2E test | Small |
| 9 | E2E: evidence empty state | New E2E test | Small |
| 10 | Sensitive data audit | Verification only | Trivial |
| 11 | Performance validation | Verification only | Trivial |
