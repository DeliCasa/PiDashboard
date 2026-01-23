# Research: Project Constitution

**Feature**: 036-project-constitution
**Date**: 2026-01-22
**Status**: Complete

## Research Objectives

This feature codifies existing patterns into formal documentation. Research focused on:
1. Analyzing current Zod schema conventions and patterns
2. Reviewing existing contract documentation
3. Identifying gaps between current practice and specification requirements

---

## Finding 1: Current Zod Schema Organization

### Decision
Maintain current two-file pattern for Zod schemas.

### Rationale
The existing organization (`schemas.ts` for general API schemas + feature-specific files like `v1-cameras-schemas.ts`) aligns with the hexagonal architecture and keeps related schemas together.

### Current State
- **`src/infrastructure/api/schemas.ts`**: 772 lines, covers:
  - System info, WiFi, Config, Door, Logs schemas
  - V1 API envelope schemas (success/error)
  - Batch provisioning schemas
  - SSE event schemas
  - Validation helper functions (`safeParseWithErrors`, `validateOrThrow`, `validateWithFallback`)

- **`src/infrastructure/api/v1-cameras-schemas.ts`**: 197 lines, covers:
  - CameraStatus enum (synchronized with PiOrchestrator)
  - Camera entity schemas
  - CameraDevice schema (paired cameras)
  - Capture/Reboot result schemas
  - Error response schemas

### Alternatives Considered
- **Single monolithic file**: Rejected due to file size and maintainability concerns
- **Per-entity files**: Too fragmented; current feature-based grouping is better

---

## Finding 2: Schema Naming Conventions (Confirmed)

### Decision
Continue using `{Entity}Schema` naming pattern.

### Current Practice (Verified)
```typescript
// Entity schemas
export const CameraDeviceSchema = z.object({...});
export const CameraHealthSchema = z.object({...});
export const DoorStatusSchema = z.object({...});

// Response wrapper schemas
export const CameraListResponseSchema = z.object({...});
export const PairedCamerasResponseSchema = z.object({...});

// Enum schemas
export const CameraStatusSchema = z.enum([...]);
export const CandidateStateSchema = z.enum([...]);
```

### Rationale
Consistent suffixing makes it trivial to distinguish:
- `Schema` = Zod runtime validator
- No suffix = TypeScript type (derived via `z.infer<>`)

---

## Finding 3: Validation Helper Pattern (Confirmed)

### Decision
Three validation helpers exist and cover all use cases.

### Current Implementation
```typescript
// 1. Safe parse with detailed errors (for logging)
export function safeParseWithErrors<T>(schema, data): { success, data } | { success, errors }

// 2. Parse or throw (for required validation)
export function validateOrThrow<T>(schema, data): T

// 3. Parse with fallback (for graceful degradation)
export function validateWithFallback<T>(schema, data, fallback): T
```

### Usage Guidance
| Function | Use When | Example |
|----------|----------|---------|
| `safeParseWithErrors` | Need to log validation failures | API client methods |
| `validateOrThrow` | Data must be valid or fail fast | Critical paths |
| `validateWithFallback` | Can continue with default data | Optional features |

---

## Finding 4: API-TYPE-CONTRACTS.md Exists

### Decision
Reference existing document; enhance constitution with development workflow.

### Current State
`docs/contracts/API-TYPE-CONTRACTS.md` already documents:
- CameraStatus enum values with descriptions
- CameraDevice entity (Go struct + TypeScript schema)
- API response envelope pattern
- Auto-onboard types
- Validation rules for both projects
- Version history

### Gap Identified
Constitution should reference this document and establish the workflow for:
1. When and how to update contracts
2. Coordination between PiOrchestrator and PiDashboard
3. Breaking change response procedure

---

## Finding 5: Contract Testing Pattern

### Decision
Document existing contract test location and structure.

### Current State
Contract tests exist at `tests/integration/contracts/` with pattern:
```typescript
describe('CameraDevice Schema', () => {
  it('validates complete camera device', () => {
    const device = mockCameraDevice;
    const result = CameraDeviceSchema.safeParse(device);
    expect(result.success).toBe(true);
  });
});
```

### Gap Identified
Need to formalize:
- Mock variant testing (all status values, edge cases)
- Mock-schema synchronization requirement
- Test coverage expectations for new schemas

---

## Finding 6: CameraStatus Synchronization Rule

### Decision
Codify the "PiOrchestrator-first" rule for enum additions.

### Current State
The `v1-cameras-schemas.ts` file contains a critical comment:
```typescript
// CRITICAL: This enum MUST match PiOrchestrator's CameraStatus values
// See: PiOrchestrator/internal/domain/entities/camera.go
// See: PiOrchestrator/internal/domain/entities/camera_device.go
```

### Enforcement Mechanism
- Contract tests will fail if PiOrchestrator returns a status not in the enum
- Adding a value prematurely will cause TypeScript errors when the backend doesn't return it

---

## Finding 7: Constitution Already Exists

### Decision
Enhance existing constitution rather than create new document.

### Current State
`.specify/memory/constitution.md` (v1.0.0) covers:
- **I. Hexagonal Architecture** (NON-NEGOTIABLE)
- **II. Contract-First API** (NON-NEGOTIABLE)
- **III. Test Discipline** (STRICTLY ENFORCED)
- **IV. Simplicity & YAGNI** (MANDATORY)
- Design Pattern Standards
- Quality Gates
- Governance

### Gap Analysis
| Spec Requirement | Constitution Coverage | Status |
|------------------|----------------------|--------|
| FR-001: Runtime validation required | Section II | COVERED |
| FR-002: Snake_case field names | Not explicit | NEEDS ADDITION |
| FR-003: {Entity}Schema naming | Not explicit | NEEDS ADDITION |
| FR-004: RFC3339 as z.string() | Not explicit | NEEDS ADDITION |
| FR-005: omitempty → .optional() | Not explicit | NEEDS ADDITION |
| FR-006: Graceful degradation | Section II mentions this | PARTIAL |
| FR-011: Contract tests required | Section III | COVERED |
| FR-015: Enum sync rule | Not mentioned | NEEDS ADDITION |

---

## Recommendations

### 1. Constitution Amendments (Section II)
Add explicit API contract subsection with:
- Zod schema naming conventions
- Field name mapping rules (Go JSON tags → Zod)
- Timestamp handling (RFC3339 → `z.string()`)
- Optional field handling (`omitempty` → `.optional()`)
- Enum synchronization rules

### 2. Developer Checklist
Add to constitution or as separate reference:
```markdown
### New API Integration Checklist
- [ ] Check docs/contracts/API-TYPE-CONTRACTS.md for existing schema
- [ ] Create Zod schema in src/infrastructure/api/*-schemas.ts
- [ ] Schema name follows {Entity}Schema pattern
- [ ] Field names match Go JSON tags exactly (snake_case)
- [ ] Add contract test in tests/integration/contracts/
- [ ] Update mock handlers with valid test data
- [ ] Create React Query hook in src/application/hooks/
```

### 3. Cross-References
Add links between:
- Constitution → API-TYPE-CONTRACTS.md
- CLAUDE.md → Constitution (already exists)
- Spec template → Contract testing requirements

---

## Conclusion

The project already has strong foundations:
- Comprehensive Zod schemas following consistent patterns
- Detailed API contract documentation
- Constitution covering architectural principles

This feature's primary work is **codifying implicit knowledge** into explicit rules in the constitution, specifically around schema conventions and the PiOrchestrator synchronization requirements.

**All NEEDS CLARIFICATION items from Technical Context: RESOLVED**
