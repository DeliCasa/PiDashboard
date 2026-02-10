# Quickstart: Dashboard Container IDs

**Feature**: 049-dashboard-container-ids
**Prerequisites**: Features 043, 046, 047, 048 (all merged to main)

## What This Feature Validates

- No hardcoded "fridge-1" in production code
- Container picker fetches list (UUID + label) from `/api/v1/containers`
- UI stores and queries by UUID, displays label
- Inventory review screens show label with UUID in debug style

## Status: Already Complete

All functional requirements were implemented across prior features:

| Requirement | Implemented By | Key Files |
|-------------|---------------|-----------|
| Container picker from API | Feature 043/046 | `ContainerPicker.tsx`, `useContainers.ts` |
| UUID in state + API calls | Feature 046 | `activeContainer.ts`, `v1-containers.ts` |
| Label display | Feature 046/048 | `ContainerPicker.tsx`, `InventoryRunDetail.tsx` |
| UUID in debug views only | Feature 046 | `truncateId()` with `font-mono text-xs text-muted-foreground` |
| No "fridge-1" in src/ | Feature 043 (T026) | Verified by codebase search |

## Verification

```bash
# Confirm no "fridge-1" in production code
grep -r "fridge-1" src/
# Expected: zero results

# Run tests
VITEST_MAX_WORKERS=1 npm test
PLAYWRIGHT_WORKERS=1 npm run test:e2e
```

## Optional Cleanup (T001, T002)

See `tasks.md` for two cosmetic tasks:
1. Update handoff doc env var example from `fridge-1` to UUID
2. Optionally normalize E2E test container IDs to UUID format

## Key Architecture (Reference)

```
src/
├── application/stores/activeContainer.ts    # Zustand: activeContainerId (UUID | null)
├── application/hooks/useContainers.ts       # React Query: useContainers() with 30s polling
├── infrastructure/api/v1-containers.ts      # API client: /api/v1/containers
├── presentation/components/containers/
│   └── ContainerPicker.tsx                  # Header dropdown: label + truncated UUID
└── presentation/components/inventory/
    ├── InventorySection.tsx                 # Scoped by activeContainerId
    └── InventoryRunDetail.tsx               # Resolves container label from useContainers()
```
