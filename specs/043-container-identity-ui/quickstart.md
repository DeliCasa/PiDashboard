# Quickstart: Container Identity Model UI

**Feature**: 043-container-identity-ui
**Date**: 2026-02-04

## Overview

This feature adds container management UI with proper opaque identity model support. Containers display human-readable labels prominently while treating IDs as opaque strings.

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Domain types | ✅ Complete | `src/domain/types/containers.ts` |
| Zod schemas | ✅ Complete | `src/infrastructure/api/v1-containers-schemas.ts` |
| API client | ✅ Complete | `src/infrastructure/api/v1-containers.ts` |
| React Query hooks | ✅ Complete | `src/application/hooks/useContainers.ts` |
| UI components | ✅ Complete | `src/presentation/components/containers/` |
| Contract tests | ❌ Missing | `tests/integration/contracts/containers.contract.test.ts` |
| Component tests | ❌ Missing | `tests/component/containers/` |
| E2E tests | ❌ Missing | `tests/e2e/containers.spec.ts` |
| Admin docs | ❌ Missing | `docs/admin/container-management.md` |

## Quick Development Guide

### Access Containers UI

1. Start dev server: `npm run dev`
2. Navigate to Containers tab (Package icon)
3. Click "Create Container" to add a new container

### Key Files to Understand

```bash
# Core hooks (start here for data flow)
src/application/hooks/useContainers.ts

# API client (understand API interactions)
src/infrastructure/api/v1-containers.ts

# Main UI component
src/presentation/components/containers/ContainerSection.tsx
```

### Using Container Hooks

```typescript
import {
  useContainers,
  useCreateContainer,
  useAssignCamera,
} from '@/application/hooks/useContainers';

// List containers with polling
const { data: containers, isLoading } = useContainers();

// Create container
const createMutation = useCreateContainer();
await createMutation.mutateAsync({ label: 'Kitchen Fridge' });

// Assign camera
const assignMutation = useAssignCamera();
await assignMutation.mutateAsync({
  containerId: 'container-id',
  data: { device_id: 'AA:BB:CC:DD:EE:FF', position: 1 },
});
```

### Label-First Display Pattern

The UI follows a strict label-first display pattern:

```typescript
// From ContainerCard.tsx
const hasLabel = container.label && container.label.trim().length > 0;

// Display: Label prominent, ID secondary
<CardTitle>
  {hasLabel ? container.label : (
    <span className="text-muted-foreground italic">Unnamed Container</span>
  )}
</CardTitle>
<CardDescription className="font-mono text-xs">
  {container.id}  {/* Always shown, never interpreted */}
</CardDescription>
```

## Testing Guide

### Run Existing Tests

```bash
# All tests
npm test

# Watch mode during development
npm test -- --watch
```

### Writing Container Tests

Create `tests/component/containers/ContainerCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { ContainerCard } from '@/presentation/components/containers/ContainerCard';
import { mockContainerDetail } from '@/../tests/mocks/container-mocks';

describe('ContainerCard', () => {
  it('displays label prominently when present', () => {
    render(<ContainerCard container={mockContainerDetail} />);
    expect(screen.getByText('Kitchen Fridge')).toBeInTheDocument();
  });

  it('shows "Unnamed Container" when no label', () => {
    const unlabeled = { ...mockContainerDetail, label: undefined };
    render(<ContainerCard container={unlabeled} />);
    expect(screen.getByText('Unnamed Container')).toBeInTheDocument();
  });

  it('displays opaque ID in monospace', () => {
    render(<ContainerCard container={mockContainerDetail} />);
    const idElement = screen.getByText(mockContainerDetail.id);
    expect(idElement).toHaveClass('font-mono');
  });
});
```

### Mock Data Pattern

Create `tests/mocks/container-mocks.ts`:

```typescript
import type { ContainerDetail, CameraAssignment } from '@/infrastructure/api/v1-containers';

export const mockCameraAssignment: CameraAssignment = {
  device_id: 'AA:BB:CC:DD:EE:FF',
  position: 1,
  assigned_at: '2026-02-04T10:30:00Z',
  status: 'online',
  name: 'Front Camera',
};

export const mockContainerDetail: ContainerDetail = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  label: 'Kitchen Fridge',
  description: 'Main refrigerator in kitchen',
  created_at: '2026-02-04T10:00:00Z',
  updated_at: '2026-02-04T10:30:00Z',
  cameras: [mockCameraAssignment],
  camera_count: 1,
  online_count: 1,
};

export const mockContainerVariants = {
  empty: { ...mockContainerDetail, cameras: [], camera_count: 0, online_count: 0 },
  full: { ...mockContainerDetail, camera_count: 4, online_count: 2 },
  unlabeled: { ...mockContainerDetail, label: undefined },
  allOffline: { ...mockContainerDetail, online_count: 0 },
};
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/containers` | GET | List all containers |
| `/api/v1/containers` | POST | Create container |
| `/api/v1/containers/:id` | GET | Get container by ID |
| `/api/v1/containers/:id` | PATCH | Update container |
| `/api/v1/containers/:id` | DELETE | Delete empty container |
| `/api/v1/containers/:id/cameras` | POST | Assign camera |
| `/api/v1/containers/:id/cameras/:deviceId` | DELETE | Unassign camera |

See `contracts/containers-api.yaml` for full OpenAPI specification.

## Common Tasks

### Add a New Container

1. Click "Create Container" button
2. Enter optional label (e.g., "Kitchen Fridge")
3. Enter optional description
4. Click "Create"

### Assign Camera to Container

1. Click on a container card to open details
2. Click "Assign" button on an empty position slot
3. Select an unassigned camera from dropdown
4. Select target position (1-4)
5. Click "Assign Camera"

### Remove Camera from Container

1. Open container details
2. Click the "X" button on the camera's position slot
3. Camera returns to unassigned pool

### Delete Container

1. Unassign all cameras first (delete button is disabled otherwise)
2. Open container details
3. Click delete button
4. Confirm deletion

## Troubleshooting

### "Container Not Found" Error
The container may have been deleted. Refresh the container list.

### "Position Occupied" Error
That position already has a camera. Unassign the existing camera first.

### "Camera Already Assigned" Error
The camera is assigned to another container. Unassign it from the other container first.

### Container Delete Button Disabled
The container has cameras assigned. Unassign all cameras before deleting.
