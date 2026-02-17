# Research: Delta Correction Flow

**Feature**: 053-delta-correction-flow
**Date**: 2026-02-16

## R1: Existing Implementation Coverage

**Decision**: This is a test-hardening and gap-filling feature, not greenfield implementation.

**Rationale**: The UI components for the correction flow are already implemented across Features 047-052. However, comprehensive testing coverage is incomplete — particularly for the edit/submit/audit-trail workflow and error edge cases. This feature closes those gaps.

**What exists**:
- All 7 inventory components: DeltaTable, EvidencePanel, ReviewForm, AuditTrail, RunList, RunDetail, SessionLookup
- 4 API endpoints with Zod validation and typed error handling
- 12+ mock fixtures covering all 5 statuses + edge cases
- 105+ contract tests, 80+ component tests, 19 E2E tests
- Delta normalization adapter (flat + categorized formats)

**Alternatives considered**: None — building on existing implementation is the only sensible approach.

---

## R2: Critical Test Gaps

**Decision**: 7 critical gaps must be closed before the feature can be considered complete.

**Rationale**: Analysis of FR-001 through FR-018 against existing test coverage reveals:

| Gap | FR | Description | Layer |
|-----|-----|-------------|-------|
| G1 | FR-004, FR-005 | Add/remove item operations have ZERO tests | Component |
| G2 | FR-007 | Form validation (empty names, negative counts) untested | Component |
| G3 | FR-008 | Confirmation dialog untested | Component |
| G4 | FR-010 | Concurrent review conflict (409) has no E2E test | E2E |
| G5 | FR-015 | Low-confidence banner missing or untested | Component + E2E |
| G6 | FR-016 | Zero-delta empty state untested in E2E | E2E |
| G7 | FR-018 | Full correction workflow E2E (view → edit → submit → verify audit trail) missing | E2E |

**Alternatives considered**: Ship without tests — rejected because Constitution III mandates test discipline.

---

## R3: E2E Test Infrastructure Pattern

**Decision**: Use Playwright route interception (not MSW) for all E2E tests.

**Rationale**: The project uses `serviceWorkers: 'block'` in Playwright config, which prevents MSW from intercepting requests. Instead, E2E tests use `page.route()` via the `mockEndpoint()` helper in `tests/e2e/fixtures/mock-routes.ts`. The `mockedPage` fixture from `test-base.ts` applies default mocks for all standard endpoints.

**Pattern**:
1. Use `mockedPage` fixture (pre-mocked)
2. Override specific endpoints with `page.unroute()` + `mockEndpoint()`
3. Navigate via container picker → tab click → section wait
4. Assert with `data-testid` selectors

**Alternatives considered**: MSW-based E2E — rejected because serviceWorkers are blocked by config.

---

## R4: Correction Flow Mock Strategy

**Decision**: Build on existing mock fixtures; add correction-specific response mocks for the review submit endpoint.

**Rationale**: The existing `mockReviewSuccessResponse`, `mockReviewConflictResponse`, and `mockReviewInvalidResponse` fixtures provide the response envelopes. For E2E tests, we need to mock the POST `/v1/inventory/{runId}/review` endpoint to return these variants based on test scenario. The `mockEndpoint()` helper supports custom handlers with method matching.

**What's needed**:
- E2E helper: `mockReviewSubmit(page, response)` — intercepts POST to review endpoint
- E2E helper: `mockReviewConflict(page)` — returns 409 for conflict scenario
- Fixture: `mockInventoryRunAfterCorrection` — the run state AFTER a correction is submitted (review populated)

**Alternatives considered**: Inline route handlers per test — rejected for DRY; shared helpers are the project convention.

---

## R5: Contract Test Enhancement Strategy

**Decision**: Add explicit contract tests for review error response variants.

**Rationale**: The existing contract tests validate all schema shapes, but don't explicitly verify the review-specific error codes (`REVIEW_CONFLICT`, `REVIEW_INVALID`) against their fixture envelopes. Adding 3-5 targeted tests closes this gap without duplicating existing coverage.

**Tests to add**:
- ReviewResponseSchema validates `mockReviewConflictResponse` (error envelope with conflict code)
- ReviewResponseSchema validates `mockReviewInvalidResponse` (error envelope with invalid code)
- SubmitReviewRequestSchema rejects empty corrections array with override action
- ReviewCorrectionSchema rejects empty name
- ReviewCorrectionSchema rejects negative counts

**Alternatives considered**: Skip — rejected because FR-017 mandates contract test coverage for all variants.

---

## R6: Low-Confidence Banner (FR-015)

**Decision**: Verify whether the existing `InventoryDeltaTable` component already shows a low-confidence banner, and add tests regardless.

**Rationale**: The codebase research mentions `data-testid="low-confidence-banner"` in InventoryDeltaTable, suggesting the feature IS implemented. However, no component or E2E test verifies it. Tests must be added for both the banner appearing (avg confidence < 0.5) and not appearing (avg confidence >= 0.5).

**Fixture**: `mockInventoryRunLowConfidence` already exists with all entries < 0.5.

**Alternatives considered**: None — the banner either exists and needs tests, or doesn't exist and needs implementation + tests.

---

## R7: HANDOFF Document Requirements

**Decision**: Create HANDOFF_053.md documenting the correction flow verification walkthrough.

**Rationale**: The spec deliverables require HANDOFF notes with a manual verification walkthrough. This follows the pattern from `specs/051-inventory-delta-e2e-verify/HANDOFF_051.md`. The HANDOFF should document:
1. How to verify the correction flow end-to-end
2. Which test commands to run
3. Expected test counts by category
4. Known limitations or deferred items

**Alternatives considered**: None — HANDOFF is a required deliverable.
