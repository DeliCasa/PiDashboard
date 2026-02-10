# Research: Dashboard Container IDs

**Feature Branch**: `049-dashboard-container-ids`
**Created**: 2026-02-09
**Input**: "Remove any hardcoded 'fridge-1' usage. UI should fetch container list (UUID + label) and operate by UUID."

## Executive Summary

The requested work is **already complete**. Features 043, 046, 047, and 048 collectively eliminated all hardcoded container IDs from production code. The codebase already:

1. Fetches containers via `/api/v1/containers` (Feature 043)
2. Stores selected container UUID in Zustand with localStorage persistence (Feature 046)
3. Displays labels everywhere; UUIDs only in monospace debug style (Features 046, 048)
4. Scopes all inventory queries by UUID (Features 047, 048)

## RQ-1: Where does "fridge-1" appear in the codebase?

**Decision**: No production code contains "fridge-1". One documentation reference exists.

**Findings**:

| Location | Type | Content | Action Required |
|----------|------|---------|-----------------|
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md:388` | Documentation | `AUTO_ONBOARD_TARGET_CONTAINER=fridge-1` (env var example) | **Optional**: Update example to use UUID |
| `specs/046-opaque-container-identity/spec.md:63` | Spec prose | Mentions "fridge-1" as an example of what NOT to do | No action (correct usage) |
| `specs/048-inventory-review/spec.md:70` | Spec prose | Same — describes the anti-pattern to avoid | No action (correct usage) |
| `specs/043-container-identity-ui/` | Multiple spec files | References "fridge-1" as the problem being solved | No action (historical) |

**Verdict**: Zero instances in `src/`. Zero instances in production test fixtures. The handoff doc example is a PiOrchestrator env var — cosmetic only.

## RQ-2: Are there semantic-looking container IDs in test fixtures?

**Decision**: Test fixtures use `kitchen-fridge-001` as a container ID. This is intentional and acceptable.

**Findings**:

| File | ID Used | Context |
|------|---------|---------|
| `tests/e2e/fixtures/mock-routes.ts` | `kitchen-fridge-001` | E2E test container with label "Kitchen Fridge" |
| `tests/e2e/inventory-delta.spec.ts` | `kitchen-fridge-001` | Inventory E2E test container |
| `tests/e2e/accessibility.spec.ts` | `kitchen-fridge-001` | Accessibility test container |
| `tests/mocks/container-mocks.ts` | `550e8400-e29b-41d4-a716-446655440000` | UUID-format mock containers |
| `tests/mocks/inventory-delta-fixtures.ts` | `ctr-c1c2c3c4-e5f6-7890-abcd-ef1234567890` | Synthetic opaque ID |

**Analysis**: The `kitchen-fridge-001` ID appears semantic but is treated as an opaque string. It's used consistently in E2E tests as a test identifier. The contract test at `tests/integration/contracts/containers.contract.test.ts:147` explicitly validates that non-UUID formats like `kitchen-fridge-001` are accepted — proving the system treats IDs as opaque.

**Verdict**: No action needed. IDs are never parsed for semantic meaning. Mixing formats in tests actually validates opaque handling.

## RQ-3: Is the container picker driven by `/api/v1/containers`?

**Decision**: Yes, fully implemented in Feature 046.

**Implementation**:
- **API client**: `src/infrastructure/api/v1-containers.ts` — `v1ContainersApi.list()`
- **Hook**: `src/application/hooks/useContainers.ts` — `useContainers()` with 30s polling
- **Store**: `src/application/stores/activeContainer.ts` — `useActiveContainerId()`
- **Picker**: `src/presentation/components/containers/ContainerPicker.tsx`

**Behavior**:
1. On load, fetches all containers from API
2. Auto-selects first container if none persisted
3. Reconciles stale selections (deleted containers)
4. Persists to `localStorage` key `delicasa-pi-active-container`
5. Gracefully hides on 404/503 (feature unavailable)

## RQ-4: Does the UI store and use UUID in all API calls?

**Decision**: Yes. All container-scoped API calls use the opaque `activeContainerId` from Zustand.

**Verified endpoints**:
- `GET /v1/containers/{containerId}/inventory/latest` — uses `encodeURIComponent(containerId)`
- `GET /v1/containers/{containerId}/inventory/runs` — same
- Container camera operations — all use opaque ID
- `useContainerCameras()` — filters by active container

**No string manipulation or parsing of container IDs occurs anywhere in `src/`.**

## RQ-5: Are labels displayed correctly?

**Decision**: Yes. Label-first display with opaque ID as secondary, per Feature 046 patterns.

**Display Pattern** (used consistently):
```tsx
// Primary: Label
{container.label || <span className="italic">Unnamed Container</span>}
// Secondary: Truncated opaque ID
<span className="font-mono text-xs text-muted-foreground">
  {truncateId(container.id)}
</span>
```

**Verified in**:
- `ContainerPicker.tsx` — dropdown items
- `InventoryRunDetail.tsx` — detail header (resolves label via `useContainers()` lookup)
- `ContainerCard.tsx` — container management cards

## Conclusion

**All requirements are already satisfied by the current codebase.** The requested changes were implemented across Features 043 (container management UI), 046 (opaque container identity), 047 (inventory delta viewer), and 048 (inventory review).

### Remaining Optional Cleanup

1. **Handoff doc cosmetic fix**: Update `fridge-1` example in `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md:388` to use a UUID example
2. **Test fixture consistency**: Optionally rename `kitchen-fridge-001` to a UUID in E2E fixtures (low priority — current usage validates opaque handling)

Neither item affects functionality or correctness.
