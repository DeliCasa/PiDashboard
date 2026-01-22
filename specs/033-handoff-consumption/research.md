# Research: Handoff Consumption Workflow

**Feature**: 033-handoff-consumption
**Date**: 2026-01-13

## Research Areas

### 1. Reuse of Feature 032 Infrastructure

**Question**: How much of Feature 032 (Handoff Sentinel) can be reused?

**Investigation**: Analyzed `scripts/handoff/` directory from Feature 032:

| File | Reusable | Usage in Feature 033 |
|------|----------|---------------------|
| `types.ts` | ✓ Full | `HandoffDocument`, `HandoffFrontmatter`, `DetectionResult` |
| `detect.ts` | ✓ Full | `detectHandoffs()` function for discovery |
| `utils.ts` | ✓ Full | `scanHandoffPaths()`, `parseHandoffFile()` |
| `validate.ts` | ✓ Full | `validateHandoff()`, `validateStatusTransition()` |
| `state.ts` | ✓ Full | State persistence for tracking consumption |
| `generate.ts` | ✓ Partial | Template for outgoing handoff generation |

**Decision**: Import and extend Feature 032 types/functions. Add consumption-specific types in separate `types-consume.ts`.

**Rationale**: Avoids duplication, maintains consistency, leverages tested code.

**Alternatives Considered**:
- Fork Feature 032 code: Rejected (maintenance overhead)
- Implement from scratch: Rejected (redundant effort)

---

### 2. Requirement Extraction Strategy

**Question**: How to parse handoff markdown content to extract actionable requirements?

**Investigation**: Analyzed handoff document structure:
1. YAML frontmatter contains structured `requires[]` array
2. Markdown body contains detailed implementation guidance
3. Headers indicate sections (## Requirements, ## Acceptance Criteria, etc.)

**Decision**: Two-pass extraction:
1. **Structured extraction**: Parse `requires[]` from frontmatter for categorized requirements
2. **Content extraction**: Parse markdown headers/lists for additional context

**Rationale**: Structured data in frontmatter provides reliable categories, markdown content adds details.

**Alternatives Considered**:
- LLM-based extraction: Rejected (adds complexity, non-deterministic)
- Regex-only: Rejected (brittle for varied markdown formats)

---

### 3. Consumption Plan Structure

**Question**: What should the consumption plan contain?

**Investigation**: Based on spec requirements (FR-007, FR-008):
- Summary of what handoff requires
- Categorized requirements checklist
- Impacted files list
- Test plan
- Risk documentation

**Decision**: Use structured markdown with YAML frontmatter for plan metadata:

```yaml
---
handoff_id: "031-backend-gaps"
source_handoff: "docs/HANDOFF_031_PIORCHESTRATOR_BACKEND_GAPS.md"
status: pending
created_at: "2026-01-13T00:00:00Z"
---
```

**Rationale**: Consistent with handoff document format, parseable for status tracking.

**Alternatives Considered**:
- JSON files: Rejected (less readable, harder to edit manually)
- Database: Rejected (over-engineering for file-based workflow)

---

### 4. Requirement Categorization

**Question**: How to map handoff requirements to implementation categories?

**Investigation**: Based on spec (FR-007, FR-010):
- API client compatibility (routes, headers, params)
- DTO/schema/types (Zod schemas, TypeScript types)
- UI behavior (components, data display)
- Telemetry/logging (error messages, debug info)

**Decision**: Map `RequirementType` enum to categories:

| RequirementType | Implementation Category |
|-----------------|------------------------|
| `api`, `route` | API Client |
| (type changes in content) | Schema/Types |
| `ui` | UI Behavior |
| (error handling in content) | Telemetry |
| `test`, `docs` | Test Plan |
| `deploy` | Deployment Notes |

**Rationale**: Aligns with existing `RequirementType` enum from Feature 032.

---

### 5. Implementation Priority Order

**Question**: How to enforce implementation priority?

**Investigation**: Spec defines order (FR-010):
1. API client compatibility
2. DTO/schema/types
3. UI behavior
4. Telemetry/logging

**Decision**: Generate consumption plan checklist in priority order. Each category marked with priority level (P1, P2, P3, P4).

**Rationale**: Guides developers, doesn't block non-linear work if needed.

**Alternatives Considered**:
- Hard enforcement (block later work): Rejected (too rigid for real workflows)
- No guidance: Rejected (miss spec requirement)

---

### 6. Test Requirement Tracking

**Question**: How to track test requirements and prevent premature "done" status?

**Investigation**: Based on spec (FR-013 to FR-015, FR-020):
- Unit tests for API client, schemas
- Integration/smoke tests for critical path
- Must pass before marking done

**Decision**: Consumption plan includes test checklist. Report generator verifies test completion before allowing `done` status.

**Rationale**: Explicit tracking enables enforcement without blocking workflow.

---

### 7. Consumption Report Format

**Question**: What should the consumption report contain?

**Investigation**: Based on spec (FR-018):
- What was requested (summary from handoff)
- What was changed (files modified, commits)
- Verification steps (how to test)
- Follow-ups/blockers

**Decision**: Markdown report with structured sections and links to source handoff.

**Rationale**: Human-readable, serves as audit trail, links back to source.

---

### 8. Outgoing Handoff Generation

**Question**: How to generate outgoing handoffs for blockers?

**Investigation**: Based on spec (FR-019):
- When marking `blocked`, generate outgoing handoff
- Link to blocked incoming handoff

**Decision**: Extend Feature 032 `generate.ts` with `generateBlockerHandoff()` function that:
1. Takes blocked incoming handoff ID
2. Pre-fills blocker reason and requirements
3. Links to source handoff

**Rationale**: Reuses existing generator, maintains format consistency.

---

## Technology Decisions Summary

| Decision | Choice | Confidence |
|----------|--------|------------|
| Base infrastructure | Feature 032 Handoff Sentinel | High |
| Extraction approach | Structured (frontmatter) + content parsing | High |
| Plan format | Markdown with YAML frontmatter | High |
| Categorization mapping | RequirementType enum to categories | High |
| Priority enforcement | Soft (checklist order, not blocking) | Medium |
| Test tracking | Checklist in plan, verification in report | High |
| Report format | Markdown with structured sections | High |
| Blocker handoff | Extend generate.ts | High |

## Open Questions (None)

All research questions resolved. No NEEDS CLARIFICATION items remain.
