<!--
  Sync Impact Report
  ==================
  Version change: 1.0.0 → 1.1.0 (MINOR: API contract subsections added)

  Modified principles:
    - II. Contract-First API: Added subsections II.A through II.D
    - III. Test Discipline: Added subsections III.A and III.B
  Added sections:
    - II.A Zod Schema Conventions (naming, field mapping, optional rules)
    - II.B Enum Synchronization (PiOrchestrator-first rule)
    - II.C API Integration Workflow (7-step checklist)
    - II.D Breaking Change Response (5-step procedure)
    - III.A Contract Testing Requirements (test structure, mock validation)
    - III.B Pre-Commit Test Commands (quick validation, full validation)
    - Appendix A: Quick Start for New Developers (architecture, gotchas, checklist)
  Removed sections: N/A

  Templates requiring updates:
    ✅ .specify/templates/plan-template.md - Constitution Check section compatible
    ✅ .specify/templates/spec-template.md - Requirements format aligned
    ✅ .specify/templates/tasks-template.md - Test-first pattern enforced

  Follow-up TODOs: None
-->

# PiDashboard Constitution

## Core Principles

### I. Hexagonal Architecture (NON-NEGOTIABLE)

All code MUST follow hexagonal (ports and adapters) architecture with strict layer boundaries:

```
domain/        → Pure business types and entities. NO external dependencies.
application/   → Business logic, React hooks, Zustand stores. Depends ONLY on domain/.
infrastructure/→ External adapters (API clients, Bluetooth, storage). Implements domain contracts.
presentation/  → React components. Depends on application/ hooks, NEVER on infrastructure/.
```

**Rules:**
- Domain types MUST NOT import from any other layer
- Application hooks MUST NOT directly call fetch/axios/external APIs
- Infrastructure adapters MUST implement interfaces defined in domain/
- Presentation components MUST consume data via application hooks only
- Circular dependencies between layers are FORBIDDEN

**Rationale:** Enforces testability, allows infrastructure swapping (mock vs real API), and prevents
coupling that makes refactoring impossible.

### II. Contract-First API (NON-NEGOTIABLE)

All API interactions MUST be validated against Zod schemas before consumption:

**Rules:**
- Every API endpoint MUST have a corresponding Zod schema in `src/infrastructure/api/schemas.ts`
- API responses MUST be parsed through schemas—raw JSON MUST NOT flow into components
- Schema changes REQUIRE updating all consuming hooks and tests
- MSW handlers MUST return data that passes schema validation
- API errors MUST be typed and handled via centralized error types in `src/infrastructure/api/errors.ts`

**Rationale:** Runtime validation catches backend contract breaks before they crash the UI.
Type safety flows from validated data, not from trusting external systems.

**Reference:** See `docs/contracts/API-TYPE-CONTRACTS.md` for the canonical type contract documentation between PiOrchestrator and PiDashboard.

#### II.A Zod Schema Conventions

All Zod schemas MUST follow these naming and structural conventions:

**Naming Rules:**
- Schema names MUST use the pattern `{Entity}Schema` (e.g., `CameraDeviceSchema`, `DoorStatusSchema`)
- Response wrapper schemas use `{Entity}ResponseSchema` (e.g., `PairedCamerasResponseSchema`)
- Enum schemas use `{EnumName}Schema` (e.g., `CameraStatusSchema`, `DoorStateSchema`)
- TypeScript types are derived via `z.infer<typeof XyzSchema>` and use the entity name without suffix

**Field Mapping Rules (Go → TypeScript):**
- Field names MUST exactly match Go JSON tags (always `snake_case`)
- Go `string` → `z.string()`
- Go `int`, `int64`, `float64` → `z.number()` with appropriate constraints
- Go `bool` → `z.boolean()`
- Go `time.Time` (RFC3339) → `z.string()` (NOT `z.date()`)
- Go `[]T` → `z.array(Schema)`
- Go `map[string]T` → `z.record(Schema)`

**Optional Field Rules:**
- Go fields with `omitempty` tag → use `.optional()` in Zod schema
- Fields that may be `null` → use `.nullable()` or `.nullish()`

**Example:**
```typescript
// Go struct:
// type CameraDevice struct {
//     MACAddress   string    `json:"mac_address"`
//     Status       string    `json:"status"`
//     LastSeen     time.Time `json:"last_seen"`
//     Name         string    `json:"name,omitempty"`
// }

// Zod schema:
export const CameraDeviceSchema = z.object({
  mac_address: z.string(),          // snake_case matches Go JSON tag
  status: CameraStatusSchema,        // Reference to enum schema
  last_seen: z.string(),             // RFC3339 timestamp as string
  name: z.string().optional(),       // omitempty → .optional()
});

export type CameraDevice = z.infer<typeof CameraDeviceSchema>;
```

#### II.B Enum Synchronization

Enums shared between PiOrchestrator and PiDashboard require strict synchronization:

**PiOrchestrator-First Rule (CRITICAL):**
- Enum values MUST be defined in PiOrchestrator Go code FIRST
- PiDashboard MUST NOT add enum values before PiOrchestrator
- Adding a value prematurely causes TypeScript errors when the backend doesn't return it

**Synchronization Process:**
1. PiOrchestrator adds new enum value to Go code
2. PiOrchestrator documents the change in handoff or API-TYPE-CONTRACTS.md
3. PiDashboard updates Zod enum schema to match
4. Contract tests verify the new value is handled correctly

**Canonical Example - CameraStatus:**
```typescript
// CRITICAL: This enum MUST match PiOrchestrator's CameraStatus values
// See: PiOrchestrator/internal/domain/entities/camera.go
export const CameraStatusSchema = z.enum([
  'online',      // Camera actively communicating
  'offline',     // Camera not responding
  'error',       // Camera in error state
  'rebooting',   // Camera is rebooting (requested)
  'discovered',  // Found via mDNS but not paired
  'pairing',     // Token exchange in progress
  'connecting',  // Joining WiFi network
]);

export type CameraStatus = z.infer<typeof CameraStatusSchema>;
```

**Enforcement:**
- Contract tests fail if PiOrchestrator returns an unknown enum value
- TypeScript compilation fails if code references an undefined enum value
- Code review MUST verify enum synchronization on any enum-related changes

#### II.C API Integration Workflow

When adding a new API endpoint integration, follow this checklist in order:

**API Integration Checklist:**

1. **Check existing contracts** - Review `docs/contracts/API-TYPE-CONTRACTS.md` for existing schema
2. **Create Zod schema** - Add to `src/infrastructure/api/schemas.ts` or feature-specific file
3. **Derive TypeScript type** - Export `type X = z.infer<typeof XSchema>` in the schema file
4. **Add API client method** - Implement in `src/infrastructure/api/*.ts` with validation
5. **Create contract test** - Add test in `tests/integration/contracts/` validating schema
6. **Update mock handlers** - Add MSW handler in `tests/mocks/handlers.ts` with valid test data
7. **Create React Query hook** - Add hook in `src/application/hooks/use*.ts`

**Validation Helper Usage:**

| Helper | Use Case | Behavior |
|--------|----------|----------|
| `safeParseWithErrors(schema, data)` | API client methods | Returns `{ success, data }` or `{ success, errors }` |
| `validateOrThrow(schema, data)` | Critical paths | Throws on validation failure |
| `validateWithFallback(schema, data, fallback)` | Optional features | Returns fallback on failure |

**API Client Pattern:**
```typescript
// src/infrastructure/api/v1-cameras.ts
import { safeParseWithErrors } from './schemas';
import { PairedCamerasDataSchema } from './v1-cameras-schemas';

export const v1CamerasApi = {
  listPaired: async (): Promise<CameraDevice[]> => {
    const response = await apiClient.get('/v1/espcam/paired');

    // REQUIRED: Validate response before use
    const validation = safeParseWithErrors(PairedCamerasDataSchema, response.data);
    if (!validation.success) {
      console.warn('[API Contract] Validation failed:', validation.errors);
      // Graceful degradation - don't crash, but log for debugging
    }

    return response.data?.cameras ?? [];
  },
};
```

**React Query Hook Pattern:**
```typescript
// src/application/hooks/usePairedCameras.ts
import { useQuery } from '@tanstack/react-query';
import { v1CamerasApi } from '@/infrastructure/api/v1-cameras';

export function usePairedCameras() {
  return useQuery({
    queryKey: ['cameras', 'paired'],
    queryFn: v1CamerasApi.listPaired,
    staleTime: 30_000, // 30 seconds
  });
}
```

**File Location Reference:**

| Component | Location | Naming Convention |
|-----------|----------|-------------------|
| Zod schemas | `src/infrastructure/api/schemas.ts` | `{Entity}Schema` |
| Feature schemas | `src/infrastructure/api/{feature}-schemas.ts` | `{Entity}Schema` |
| TypeScript types | Derived in schema files | `type X = z.infer<typeof XSchema>` |
| Domain types | `src/domain/types/entities.ts` | Re-exported if needed |
| API clients | `src/infrastructure/api/{feature}.ts` | `{feature}Api` object |
| React hooks | `src/application/hooks/use{Feature}.ts` | `use{Feature}()` |
| Contract tests | `tests/integration/contracts/{feature}.contract.test.ts` | `describe('{Schema}')` |
| Mock handlers | `tests/mocks/handlers.ts` | MSW handler per endpoint |

#### II.D Breaking Change Response

When PiOrchestrator makes breaking changes to API contracts, follow this procedure:

**Step 1: Review Handoff Document**
- Check `docs/handoffs/incoming/` for change documentation
- Identify affected entities, endpoints, and schemas
- Note any deprecation warnings or migration guidance

**Step 2: Update Zod Schemas**
- Modify Zod schemas in `src/infrastructure/api/*-schemas.ts` to match new structure
- Add new fields, remove deleted fields, update types as needed
- Follow naming conventions from Section II.A

**Step 3: Update TypeScript Types**
- Types derived via `z.infer<>` update automatically
- Check for any manually defined types in `src/domain/types/entities.ts`
- Ensure consistency between schema and type definitions

**Step 4: Run Contract Tests**
- Execute: `npm test -- tests/integration/contracts`
- Tests should FAIL initially (proving the old mocks don't match new schema)
- Update mock data in `tests/mocks/handlers.ts` to match new schema
- Re-run until all contract tests pass

**Step 5: Update Components**
- TypeScript compilation will fail on any code using removed/changed fields
- Fix all compilation errors
- Update UI to handle new fields or changed behavior
- Run full test suite: `npm test`

**Handoff System Integration:**
- Check for pending handoffs: `npm run handoff:detect`
- List handoff details: `npm run handoff:list`
- Reference: See `docs/handoffs/` for handoff system documentation

**Critical Rule:**
- Contract tests exist to catch breaking changes BEFORE they reach production
- If contract tests pass but production breaks, add the missing test case immediately

### III. Test Discipline (STRICTLY ENFORCED)

Testing is mandatory for all features with minimum coverage gates:

**Coverage Thresholds (CI enforced):**
- Unit tests: 70% minimum for `src/infrastructure/api/` and `src/lib/`
- Component tests: All components in `src/presentation/components/` MUST have test files
- Integration tests: All hooks in `src/application/hooks/` MUST have MSW-backed tests
- E2E tests: Critical user flows MUST have Playwright coverage

**Rules:**
- New API clients MUST include contract tests validating Zod schemas
- New components MUST include render tests with `data-testid` attributes
- Accessibility tests (axe-core) MUST pass for all new UI components
- Tests MUST NOT use `any` type—test data must be typed
- MSW handlers in `tests/mocks/` MUST match real API contracts

**Rationale:** Tests are documentation that runs. They catch regressions, validate contracts, and
enable safe refactoring. Untested code is legacy code.

#### III.A Contract Testing Requirements

Every Zod schema MUST have corresponding contract tests:

**Test Location:**
- Contract tests: `tests/integration/contracts/{feature}.contract.test.ts`
- Example: `tests/integration/contracts/cameras.contract.test.ts`

**Contract Test Structure:**
```typescript
// tests/integration/contracts/cameras.contract.test.ts
import { describe, it, expect } from 'vitest';
import { CameraDeviceSchema, CameraStatusSchema } from '@/infrastructure/api/v1-cameras-schemas';
import { mockCameraDevice, mockCameraVariants } from '../mocks/camera-mocks';

describe('CameraDevice Schema', () => {
  it('validates complete camera device', () => {
    const result = CameraDeviceSchema.safeParse(mockCameraDevice);
    expect(result.success).toBe(true);
  });

  it('validates all mock variants match schema', () => {
    for (const [name, data] of Object.entries(mockCameraVariants)) {
      const result = CameraDeviceSchema.safeParse(data);
      expect(result.success, `Variant "${name}" failed validation`).toBe(true);
    }
  });

  it('rejects invalid status values', () => {
    const invalid = { ...mockCameraDevice, status: 'invalid_status' };
    const result = CameraDeviceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

**Mock Data Validation Requirement:**
- ALL mock data used in tests MUST pass Zod schema validation
- Mock variants MUST cover all enum values (e.g., all CameraStatus values)
- Tests MUST fail when mock data drifts from schema

**Mock Variant Pattern:**
```typescript
// tests/mocks/camera-mocks.ts
export const mockCameraDevice: CameraDevice = {
  mac_address: 'AA:BB:CC:DD:EE:FF',
  status: 'online',
  last_seen: '2026-01-22T12:00:00Z',
  // ... all required fields
};

export const mockCameraVariants = {
  online: { ...mockCameraDevice, status: 'online' },
  offline: { ...mockCameraDevice, status: 'offline' },
  error: { ...mockCameraDevice, status: 'error', error_message: 'Connection lost' },
  rebooting: { ...mockCameraDevice, status: 'rebooting' },
  discovered: { ...mockCameraDevice, status: 'discovered' },
  pairing: { ...mockCameraDevice, status: 'pairing' },
  connecting: { ...mockCameraDevice, status: 'connecting' },
};
```

#### III.B Pre-Commit Test Commands

Run these commands before committing code changes:

**Quick Validation (before each commit):**
```bash
# Linting
npm run lint

# Unit and integration tests
npm test

# TypeScript compilation + build
npm run build
```

**Expected Output (success):**
```
$ npm run lint
✓ No ESLint errors

$ npm test
 ✓ tests/unit/... (X tests)
 ✓ tests/component/... (X tests)
 ✓ tests/integration/... (X tests)
 Test Files  X passed
 Tests       X passed

$ npm run build
vite v7.x.x building for production...
✓ X modules transformed.
dist/index.html   X.XX kB
...
✓ built in X.XXs
```

**Contract Tests Only:**
```bash
npm test -- tests/integration/contracts
```

**Full Validation (before PR):**
```bash
# All tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Lint + TypeScript + build verification
npm run lint && npm run build
```

**Handling Test Failures:**
1. Read the error message carefully - it describes what failed
2. For contract test failures: Check if schema or mock data needs updating
3. For TypeScript errors: Fix type mismatches before running tests
4. For component tests: Check component rendering and accessibility
5. Never skip tests with `skip` or `only` in committed code

### IV. Simplicity & YAGNI (MANDATORY)

Code MUST be minimal and focused on current requirements:

**Rules:**
- MUST NOT add features beyond what was explicitly requested
- MUST NOT add "future-proofing" abstractions for hypothetical requirements
- MUST NOT create utility functions for one-time operations
- MUST NOT add comments explaining obvious code—code should be self-documenting
- MUST NOT add error handling for impossible scenarios
- MUST prefer 3 similar lines over 1 premature abstraction
- MUST delete unused code completely—no `_unusedVar` patterns or `// removed` comments

**Rationale:** Complexity is debt. Every abstraction has a cost. Simple code is maintainable code.
The right time to add complexity is when you need it, not before.

## Design Pattern Standards

### State Management Patterns

| Concern | Pattern | Location |
|---------|---------|----------|
| Server state (API data) | TanStack React Query | `src/application/hooks/use*.ts` |
| Client state (UI state) | Zustand stores | `src/application/stores/*.ts` |
| Form state | React Hook Form or controlled components | Component-local |
| URL state | React Router params | Route components |

**Rules:**
- Server state MUST use React Query with proper cache keys and stale times
- Zustand stores MUST NOT duplicate React Query cache data
- Global UI state (theme, sidebar) goes in Zustand; local UI state stays in components

### Component Patterns

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| Composition | Multiple variants needed | Props + children, not inheritance |
| Render Props | Complex state logic sharing | Function children pattern |
| Custom Hooks | Reusable stateful logic | Extract to `application/hooks/` |
| Compound Components | Related component groups | Context + named exports |

**Rules:**
- Components MUST be functions (no class components)
- Props MUST be typed with explicit interfaces (no inline types for public components)
- Components MUST NOT exceed 200 lines—extract logic to hooks if growing
- Components MUST have a single responsibility

### Error Handling Patterns

```typescript
// Infrastructure layer: Typed errors
export class ApiError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}

// Application layer: React Query error handling
const { error } = useQuery({
  queryKey: ['resource'],
  queryFn: fetchResource,
  retry: (failureCount, error) => error.status !== 401 && failureCount < 3,
});

// Presentation layer: Error boundaries + fallback UI
<ErrorBoundary fallback={<ErrorDisplay />}>
  <Component />
</ErrorBoundary>
```

**Rules:**
- API errors MUST be thrown as typed `ApiError` instances
- React Query MUST handle retries for transient failures
- Components MUST have error states—no silent failures
- User-facing errors MUST be actionable (not raw HTTP codes)

## Quality Gates

### Pre-Commit Gates (lint-staged)

- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] ESLint passes with no errors
- [ ] Prettier formatting applied
- [ ] No `console.log` statements (except in tests)
- [ ] No `any` types (except justified with `// eslint-disable-next-line`)

### PR Gates (CI)

- [ ] All unit tests pass
- [ ] All component tests pass
- [ ] All integration tests pass
- [ ] Coverage thresholds met (70%+)
- [ ] E2E smoke tests pass (chromium)
- [ ] Bundle size check passes (no unexpected increases)
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Merge Gates

- [ ] All CI checks green
- [ ] At least one approval (if team > 1)
- [ ] No unresolved review comments
- [ ] Branch up to date with main

## Governance

### Amendment Procedure

1. Propose change in a PR modifying this file
2. Document rationale and impact in PR description
3. Update version number following semantic versioning:
   - MAJOR: Principle removed or fundamentally redefined
   - MINOR: New principle or section added
   - PATCH: Clarifications and wording improvements
4. Ensure all templates remain aligned (see Sync Impact Report)
5. Merge requires explicit approval

### Compliance Review

- All PRs MUST verify code follows Constitution principles
- Complexity MUST be justified via Complexity Tracking in plan.md
- Violations MUST be documented and approved before merge
- Constitution supersedes all other documentation when conflicts arise

### Guidance Documents

- Runtime development guidance: `CLAUDE.md`
- Feature specifications: `specs/[###-feature]/spec.md`
- Implementation plans: `specs/[###-feature]/plan.md`

**Version**: 1.1.0 | **Ratified**: 2025-01-20 | **Last Amended**: 2026-01-22

---

## Appendix A: Quick Start for New Developers

This appendix provides a fast-track introduction to PiDashboard development conventions.

### Architecture Overview

PiDashboard uses **hexagonal architecture** (ports and adapters) with strict layer boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  src/presentation/components/                                   │
│  React components that consume hooks                            │
│  NEVER imports from infrastructure/                             │
├─────────────────────────────────────────────────────────────────┤
│                      APPLICATION LAYER                          │
│  src/application/hooks/     → React Query hooks                 │
│  src/application/stores/    → Zustand client state              │
│  Business logic, depends ONLY on domain/                        │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│  src/infrastructure/api/    → API clients + Zod schemas         │
│  src/infrastructure/bluetooth/ → BLE adapters                   │
│  External adapters, implements domain contracts                 │
├─────────────────────────────────────────────────────────────────┤
│                        DOMAIN LAYER                             │
│  src/domain/types/          → Pure TypeScript types             │
│  NO external dependencies, defines contracts                    │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Component calls hook (e.g., `usePairedCameras()`)
2. Hook calls API client method (e.g., `v1CamerasApi.listPaired()`)
3. API client fetches data and validates with Zod schema
4. Validated data returns to hook → component renders

### Common Gotchas: Zod Schema Mistakes

**Mistake 1: Using camelCase instead of snake_case**
```typescript
// ❌ WRONG
export const CameraSchema = z.object({
  macAddress: z.string(),  // Go uses json:"mac_address"
});

// ✅ CORRECT
export const CameraSchema = z.object({
  mac_address: z.string(),  // Matches Go JSON tag
});
```

**Mistake 2: Using z.date() for timestamps**
```typescript
// ❌ WRONG
export const CameraSchema = z.object({
  last_seen: z.date(),  // Go sends RFC3339 string
});

// ✅ CORRECT
export const CameraSchema = z.object({
  last_seen: z.string(),  // Parse to Date in component if needed
});
```

**Mistake 3: Forgetting .optional() for omitempty fields**
```typescript
// ❌ WRONG - Will fail validation when field is absent
export const CameraSchema = z.object({
  name: z.string(),  // Go has `json:"name,omitempty"`
});

// ✅ CORRECT
export const CameraSchema = z.object({
  name: z.string().optional(),  // Matches omitempty
});
```

**Mistake 4: Adding enum values before PiOrchestrator**
```typescript
// ❌ WRONG - Adding 'maintenance' that doesn't exist in Go
export const CameraStatusSchema = z.enum([
  'online', 'offline', 'maintenance',  // 'maintenance' not in Go!
]);

// ✅ CORRECT - Only values that exist in PiOrchestrator
export const CameraStatusSchema = z.enum([
  'online', 'offline', 'error', 'rebooting',
  'discovered', 'pairing', 'connecting',
]);
```

### First Contribution Checklist

When making your first contribution:

1. **Read this constitution** - Understand the four core principles
2. **Set up local development** - See `CLAUDE.md` for environment setup
3. **Run the test suite** - `npm test` should pass before you start
4. **Follow the API integration workflow** - Section II.C if adding API endpoints
5. **Write contract tests** - Section III.A for new schemas
6. **Run pre-commit checks** - Section III.B before committing

### Additional Resources

| Resource | Purpose | Location |
|----------|---------|----------|
| CLAUDE.md | Runtime development guidance, SSH access, commands | Repository root |
| API-TYPE-CONTRACTS.md | Canonical type contracts with PiOrchestrator | `docs/contracts/` |
| Handoff System | Cross-repo change coordination | `docs/handoffs/` |
| Feature Specs | Detailed feature documentation | `specs/[###-feature]/` |

**Questions?** Review this constitution first, then check `CLAUDE.md`, then ask the team.
