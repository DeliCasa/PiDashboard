# Quickstart: Project Constitution

**Feature**: 036-project-constitution
**Date**: 2026-01-22

## What This Feature Does

This feature formalizes PiDashboard's development standards into the project constitution. It establishes:

1. **API Type Contract Rules** - How to synchronize Zod schemas with PiOrchestrator Go structs
2. **Schema Conventions** - Naming, field mapping, and validation patterns
3. **Testing Requirements** - Contract test expectations for all schemas
4. **Developer Workflows** - Checklists for common tasks

---

## Developer Quick Reference

### Adding a New API Integration

```bash
# 1. Check if contract already exists
cat docs/contracts/API-TYPE-CONTRACTS.md | grep "your_entity"

# 2. Create Zod schema (in appropriate file)
# src/infrastructure/api/schemas.ts         # General schemas
# src/infrastructure/api/v1-cameras-schemas.ts  # Camera-specific

# 3. Create contract test
# tests/integration/contracts/your_entity.contract.test.ts

# 4. Run tests to verify
npm test -- tests/integration/contracts
```

### Zod Schema Checklist

```typescript
// ✅ CORRECT - Matches Go struct
export const CameraDeviceSchema = z.object({
  mac_address: z.string(),           // snake_case from Go JSON tag
  status: CameraStatusSchema,        // Reference to enum schema
  last_seen: z.string(),             // Timestamps as z.string()
  name: z.string().optional(),       // omitempty → .optional()
});

// ❌ WRONG - Common mistakes
export const BadSchema = z.object({
  macAddress: z.string(),            // ❌ camelCase (should be snake_case)
  lastSeen: z.date(),                // ❌ z.date() (should be z.string())
  name: z.string(),                  // ❌ Missing .optional() for omitempty
});
```

### Validation Pattern

```typescript
import { safeParseWithErrors } from '@/infrastructure/api/schemas';

// Always validate API responses
const response = await fetch('/api/v1/espcam/paired');
const json = await response.json();

const validation = safeParseWithErrors(PairedCamerasDataSchema, json.data);
if (!validation.success) {
  console.warn('[API Contract] Validation failed:', validation.errors);
  // Continue with graceful degradation, don't crash
}
```

---

## Key Files

| Purpose | Location |
|---------|----------|
| Constitution | `.specify/memory/constitution.md` |
| API Contracts | `docs/contracts/API-TYPE-CONTRACTS.md` |
| Zod Schemas | `src/infrastructure/api/schemas.ts` |
| Camera Schemas | `src/infrastructure/api/v1-cameras-schemas.ts` |
| Contract Tests | `tests/integration/contracts/` |
| TypeScript Types | `src/domain/types/entities.ts` |

---

## Common Tasks

### When PiOrchestrator Adds a New Field

1. Update Zod schema to include new field
2. TypeScript type auto-updates via `z.infer<>`
3. Run contract tests to verify mock data
4. Update components if needed

### When PiOrchestrator Removes a Field

1. Remove field from Zod schema
2. TypeScript compilation will fail on any usage
3. Fix all compilation errors
4. Update mock data
5. Run full test suite

### When PiOrchestrator Adds a New Enum Value

1. **Wait** for PiOrchestrator to deploy the change
2. Update Zod enum schema to include new value
3. Update mock data to include new value variant
4. Run contract tests

**NEVER** add enum values to PiDashboard before PiOrchestrator.

---

## Test Commands

```bash
# Run all tests
npm test

# Run only contract tests
npm test -- tests/integration/contracts

# Run with coverage
npm run test:coverage

# TypeScript compiles (via build)
npm run build
```

---

## Verification

After constitution updates are complete, verify with:

```bash
# All tests pass
npm test

# Lint passes
npm run lint

# TypeScript compiles + build succeeds
npm run build
```
