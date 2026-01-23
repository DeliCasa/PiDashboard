# Data Model: Project Constitution

**Feature**: 036-project-constitution
**Date**: 2026-01-22

## Overview

This feature is **documentation-focused**. The "data model" describes the conceptual entities that the constitution governs, not database tables or API schemas.

---

## Governed Entities

### 1. Zod Schema

**Definition**: A runtime type validation definition that mirrors a Go struct from PiOrchestrator.

**Attributes**:
| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Must follow `{Entity}Schema` pattern |
| fields | object | Must match Go JSON tags (snake_case) |
| optional_markers | boolean[] | Fields with `omitempty` in Go use `.optional()` |
| location | path | `src/infrastructure/api/schemas.ts` or feature-specific file |

**Invariants**:
- Schema field names MUST exactly match Go JSON tags
- Schema names MUST end with `Schema` suffix
- Timestamps MUST be `z.string()` (not `z.date()`)

---

### 2. TypeScript Type

**Definition**: A compile-time type derived from a Zod schema using `z.infer<typeof Schema>`.

**Attributes**:
| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Entity name without `Schema` suffix |
| source | Zod Schema | Derived via `z.infer<typeof XyzSchema>` |
| location | path | `src/domain/types/entities.ts` |

**Invariants**:
- MUST be derived from Zod schema (not manually defined)
- MUST NOT have fields absent from source schema

---

### 3. Contract Test

**Definition**: An automated test that validates mock data matches Zod schemas.

**Attributes**:
| Attribute | Type | Description |
|-----------|------|-------------|
| subject | Zod Schema | The schema being tested |
| mock_data | object | Test fixture that MUST pass validation |
| variants | object[] | Edge case mocks (all statuses, optional fields) |
| location | path | `tests/integration/contracts/` |

**Invariants**:
- Every Zod schema MUST have a corresponding contract test
- All mock variants MUST pass schema validation
- Tests MUST fail if schema/mock drift occurs

---

### 4. API Client Method

**Definition**: A function in the infrastructure layer that calls PiOrchestrator and validates the response.

**Attributes**:
| Attribute | Type | Description |
|-----------|------|-------------|
| endpoint | string | PiOrchestrator API path |
| schema | Zod Schema | Used for response validation |
| validation_mode | enum | `safeParseWithErrors`, `validateOrThrow`, or `validateWithFallback` |
| location | path | `src/infrastructure/api/*.ts` |

**Invariants**:
- MUST validate response before returning
- MUST log validation failures with `[API Contract]` prefix
- MUST NOT crash on validation failure (graceful degradation)

---

### 5. Constitution Principle

**Definition**: A non-negotiable rule that governs all development in the project.

**Attributes**:
| Attribute | Type | Description |
|-----------|------|-------------|
| id | roman numeral | Unique identifier (I, II, III, IV) |
| name | string | Brief descriptive title |
| enforcement | enum | NON-NEGOTIABLE, STRICTLY ENFORCED, MANDATORY |
| rules | string[] | Specific requirements |
| rationale | string | Why this principle exists |

**Current Principles**:
1. **I. Hexagonal Architecture** (NON-NEGOTIABLE)
2. **II. Contract-First API** (NON-NEGOTIABLE)
3. **III. Test Discipline** (STRICTLY ENFORCED)
4. **IV. Simplicity & YAGNI** (MANDATORY)

---

## Relationships

```
┌──────────────────┐     derives      ┌─────────────────┐
│   Zod Schema     │ ───────────────► │ TypeScript Type │
└──────────────────┘                  └─────────────────┘
         │                                     │
         │ validates                           │ used by
         ▼                                     ▼
┌──────────────────┐                  ┌─────────────────┐
│  Contract Test   │                  │    Component    │
└──────────────────┘                  └─────────────────┘
         │
         │ tests
         ▼
┌──────────────────┐
│    Mock Data     │
└──────────────────┘

┌──────────────────┐     calls        ┌─────────────────┐
│ API Client       │ ───────────────► │ PiOrchestrator  │
│ Method           │                  │ (Go Backend)    │
└──────────────────┘                  └─────────────────┘
         │
         │ validates with
         ▼
┌──────────────────┐
│   Zod Schema     │
└──────────────────┘
```

---

## State Transitions

### API Integration Lifecycle

```
[Define in Go] → [Document in API-TYPE-CONTRACTS.md] → [Create Zod Schema]
      │                                                        │
      │                                                        ▼
      │                                               [Create TypeScript Type]
      │                                                        │
      │                                                        ▼
      └──────────────────────────────────────────────► [Create API Client]
                                                               │
                                                               ▼
                                                      [Create Contract Test]
                                                               │
                                                               ▼
                                                      [Create React Hook]
```

### Breaking Change Response

```
[PiOrchestrator Change] → [Handoff Document] → [Update Zod Schema]
                                                        │
                                                        ▼
                                               [Update TypeScript Type]
                                                        │
                                                        ▼
                                               [Run Contract Tests] ─── FAIL ──► [Fix Mocks]
                                                        │
                                                       PASS
                                                        │
                                                        ▼
                                               [Update Components]
                                                        │
                                                        ▼
                                               [Run Full Test Suite]
```

---

## Validation Rules Summary

| Entity | Validation Rule |
|--------|-----------------|
| Zod Schema | Field names match Go JSON tags (snake_case) |
| TypeScript Type | Derived from Zod schema, not manual |
| Contract Test | Mock data passes schema validation |
| API Client | Response validated before use |
| Mock Data | Must match current schema definition |
