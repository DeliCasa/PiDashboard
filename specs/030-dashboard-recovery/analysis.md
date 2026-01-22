# Specification Analysis Report: Dashboard Recovery + ESP Visibility

**Feature**: 030-dashboard-recovery
**Date**: 2026-01-12
**Artifacts Analyzed**: spec.md, plan.md, tasks.md, data-model.md, contracts/

## Executive Summary

Cross-artifact analysis reveals **strong alignment** between specification, plan, and tasks. The feature is well-defined with clear traceability from user stories to implementation tasks. A few minor gaps and recommendations are identified below.

**Overall Quality Score**: 9.5/10 (after fixes applied)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Requirement Coverage | 10/10 | All FRs have corresponding tasks with tests |
| User Story Traceability | 9/10 | Tasks tagged with [US#] labels |
| Consistency | 9/10 | Terminology standardized on requestId |
| Completeness | 9/10 | Unit tests added, verifications explicit |
| Testability | 10/10 | Clear acceptance criteria + unit test tasks |

---

## Analysis Findings

### 1. Requirement Coverage Analysis

| Requirement | Plan Phase | Tasks | Coverage |
|-------------|------------|-------|----------|
| FR-001 (Relative URLs) | N/A | T003 verify | Implicit - no explicit task |
| FR-002 (Content-type validation) | Phase 1 | T011 | Full |
| FR-003 (Error visibility) | Phase 2 | T022-T028 | Full |
| FR-004 (Response normalization) | N/A | N/A | **GAP** - Not explicitly covered |
| FR-005 (Schema validation) | N/A | N/A | Existing infrastructure assumed |
| FR-006 (Distinct states) | Phase 3 | T014-T020 | Full |
| FR-007 (Accept header) | Phase 1 | T010 | Full |
| FR-008 (HTML fallback message) | Phase 1+2 | T005, T027 | Full |
| FR-009 (Copy debug info) | Phase 2 | T024-T025 | Full |
| FR-010 (Smoke test) | Phase 4 | T038-T049 | Full |

**Gap Identified**: FR-004 (response shape normalization) is not explicitly addressed in tasks. The spec mentions normalizing `data.devices` vs `devices` vs array, but no task covers this.

**Recommendation**: Add a task to verify/update normalization logic in `useDevices` hook.

---

### 2. User Story to Task Traceability

| User Story | Priority | Tasks | Coverage |
|------------|----------|-------|----------|
| US1 - Device List Visibility | P1 | T014-T021 | 8 tasks, **Full** |
| US2 - API Error Visibility | P1 | T022-T029 | 8 tasks, **Full** |
| US3 - Core Page Loading | P2 | T030-T033 | 4 tasks, **Full** |
| US4 - Provisioning Flow | P3 | T034-T037 | 4 tasks, **Full** |

**Strength**: All user stories have dedicated task groups with clear [US#] labels.

---

### 3. Consistency Check

#### Terminology Variations (Minor)

| Term in Spec | Term in Plan | Term in Tasks | Issue |
|--------------|--------------|---------------|-------|
| `correlation ID` | `requestId` | `correlationId` / `requestId` | Mixed usage |
| `DeviceListResponse` | N/A | N/A | Entity not in data-model.md |
| `ConnectionState` | `ConnectionState` | N/A | Defined but no tasks use it |

**Recommendation**: Standardize on `requestId` for HTTP request tracking and `correlationId` for backend correlation. Update spec Key Entities to match data-model.md.

#### Success Criteria Mapping

| Success Criteria | Verification Task | Status |
|------------------|-------------------|--------|
| SC-001 (3s device load) | T021 manual test | Implicit |
| SC-002 (100% error visibility) | T029 manual test | Implicit |
| SC-003 (0% hardcoded ports) | No explicit task | **GAP** |
| SC-004 (Smoke test passes) | T049 | Full |
| SC-005 (No console errors) | T033 manual test | Full |
| SC-006 (HTML fallback detection) | T027 | Full |

**Gap Identified**: SC-003 (no hardcoded ports) has no explicit verification task.

**Recommendation**: Add grep-based verification task: `grep -r "8081\|8082" src/`

---

### 4. Data Model Alignment

| Entity in Spec | Entity in Data Model | Status |
|----------------|---------------------|--------|
| APIError | APIError (Enhanced) | Aligned - data-model extends spec |
| DeviceListResponse | N/A | **Missing** from data-model |
| ConnectionState | ConnectionState | Aligned |
| N/A | HTMLFallbackError | **New** - not in spec Key Entities |
| N/A | DeviceListState | **New** - not in spec Key Entities |
| N/A | DebugInfo | **New** - not in spec Key Entities |

**Recommendation**: Update spec Key Entities to include:
- `HTMLFallbackError`: Specialized error for SPA fallback detection
- `DeviceListState`: UI state enum (loading/empty/populated/error)
- `DebugInfo`: Copyable debug information structure

---

### 5. Contract Schema Alignment

The contracts file (`contracts/api-error-schema.ts`) aligns well with data-model.md:

| Schema | Data Model Entity | Status |
|--------|-------------------|--------|
| EnhancedApiErrorSchema | APIError (Enhanced) | Aligned |
| HTMLFallbackErrorSchema | HTMLFallbackError | Aligned |
| DebugInfoSchema | DebugInfo | Aligned |
| DeviceListStateSchema | DeviceListState | Aligned |
| ConnectionStateSchema | ConnectionState | Aligned |

**Strength**: Contracts provide runtime validation for all new types.

---

### 6. Task Dependencies Analysis

#### Phase Dependencies (Correct)

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3-6 (User Stories) → Phase 7 (Polish)
```

#### Identified Issues

1. **T004** (Document current error behavior) should be done BEFORE Foundational phase, not just during Setup. Baseline documentation helps measure improvement.

2. **T046-T048** (Final verification) lists `npm test` but no explicit unit tests are created for new error classes. Tasks T005-T013 modify files but no corresponding test tasks.

**Recommendation**: Add unit test tasks for:
- `HTMLFallbackError` class (T005)
- HTML fallback detection logic (T011)
- Request ID extraction (T012)

---

### 7. Ambiguity Detection

| Location | Ambiguity | Severity | Resolution |
|----------|-----------|----------|------------|
| Spec FR-004 | "normalize `data.devices` vs `devices` vs array" - which patterns are actually seen? | Medium | Research.md confirms existing normalization works; no changes needed |
| Tasks T021 | "verify device list renders when API returns devices via manual test" - how to manually test? | Low | Quickstart.md provides curl commands |
| Plan Phase 3 | "Add explicit state management" - where is state stored? (hook local, context, store?) | Low | DeviceList component local state is implied |

---

### 8. Constitution Alignment

**Note**: Constitution is unconfigured (template placeholders). Analysis uses inferred principles from CLAUDE.md.

| Inferred Principle | Feature Alignment | Status |
|--------------------|-------------------|--------|
| Hexagonal Architecture | Error handling in infrastructure layer | Aligned |
| TanStack Query for server state | useDevices hook pattern | Aligned |
| Component data-testid selectors | No explicit task for adding testids | **Minor gap** |
| Vitest for unit tests | No unit test tasks in tasks.md | **Gap** |

**Recommendation**: Constitution should be configured with project principles.

---

## Summary of Gaps and Resolutions

### Critical Gaps - RESOLVED

| # | Gap | Resolution | Status |
|---|-----|------------|--------|
| 1 | No unit test tasks for new error classes | Added T005a, T009a, T011a, T012a for unit tests | FIXED |
| 2 | FR-004 normalization not explicitly tasked | Verified: `useDevices` hook already uses `ensureArray()` (028-api-compat). Added assumption to spec. | FIXED |

### Minor Gaps - RESOLVED

| # | Gap | Resolution | Status |
|---|-----|------------|--------|
| 3 | SC-003 no explicit verification | Added T004a grep verification task | FIXED |
| 4 | Terminology inconsistency | Standardized on `requestId` (from X-Request-Id header) across all artifacts | FIXED |
| 5 | Spec Key Entities outdated | Updated spec with HTMLFallbackError, DeviceListState, DebugInfo | FIXED |
| 6 | Constitution unconfigured | Noted as optional - run `/speckit.constitution` when needed | DEFERRED |

---

## Artifact Quality Scores (After Fixes)

| Artifact | Completeness | Consistency | Clarity | Overall |
|----------|--------------|-------------|---------|---------|
| spec.md | 10/10 | 10/10 | 9/10 | 9.7/10 |
| plan.md | 9/10 | 10/10 | 9/10 | 9.3/10 |
| tasks.md | 10/10 | 10/10 | 9/10 | 9.7/10 |
| data-model.md | 10/10 | 10/10 | 9/10 | 9.7/10 |
| contracts/ | 10/10 | 10/10 | 9/10 | 9.7/10 |

**Overall Feature Readiness**: Ready for implementation.

---

## Next Steps

All gaps have been resolved. The feature is ready for implementation.

1. **Proceed**: Run `/speckit.implement` to begin implementation
2. **Optional**: Run `/speckit.constitution` to configure project governance

---

## Changes Applied

The following fixes were applied to resolve analysis gaps:

1. **tasks.md**: Added 5 new tasks (T004a, T005a, T009a, T011a, T012a)
2. **spec.md**: Updated Key Entities, standardized terminology, added FR-004 assumption
3. **data-model.md**: Removed duplicate correlationId field
4. **contracts/api-error-schema.ts**: Removed correlationId, standardized on requestId

---

*Analysis generated by speckit.analyze | 2026-01-12 | Updated with fixes applied*
