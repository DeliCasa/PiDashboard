# Quickstart: 046 Opaque Container Identity

**Branch**: `046-opaque-container-identity` | **Date**: 2026-02-08

## What This Feature Does

Adds a **container picker** to the dashboard header that scopes camera and evidence views to the selected container. Ensures all container IDs are treated as opaque strings throughout the codebase.

## New Files

| File | Layer | Purpose |
|------|-------|---------|
| `src/application/stores/activeContainer.ts` | Application | Zustand store for active container selection with localStorage persistence |
| `src/presentation/components/containers/ContainerPicker.tsx` | Presentation | Dropdown picker showing containers by label, placed in header |

## Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `ContainerPicker` to header; pass active container context to `CameraSection` |
| `src/application/hooks/useContainers.ts` | Add `useContainerCameras()` derived hook for scoped camera filtering |
| `src/presentation/components/cameras/CameraSection.tsx` | Accept optional `containerCameraIds` filter; show scoped view when active |
| `src/presentation/components/diagnostics/EvidencePanel.tsx` | Filter evidence by active container's camera IDs |
| `src/presentation/components/allowlist/AllowlistEntryForm.tsx` | Update placeholder from "container-001" to UUID example |

## How It Works

1. **Container Picker** (`ContainerPicker.tsx`):
   - Fetches container list via existing `useContainers()` hook
   - Displays as `<Select>` in header between branding and theme toggle
   - Shows `label` prominently, `id` in monospace secondary
   - Writes selection to Zustand store → persisted in `localStorage`

2. **Active Container Store** (`activeContainer.ts`):
   - Stores `activeContainerId: string | null`
   - Actions: `setActiveContainer(id)`, `clearActiveContainer()`
   - Persisted under key `delicasa-pi-active-container`

3. **Camera Scoping** (derived hook):
   - `useContainerCameras()` returns cameras filtered to active container's assignments
   - Falls back to all cameras when no container selected
   - `CameraSection` uses this filtered list instead of raw `useCameras()`

4. **Evidence Scoping**:
   - `EvidencePanel` reads active container's camera IDs
   - Filters evidence entries to only those from container's cameras
   - Falls back to all evidence when no container selected

## Development Setup

```bash
# Start dev server with API proxy to Pi
ssh -L 8082:localhost:8082 pi  # in one terminal
npm run dev                     # in another terminal

# Run tests
VITEST_MAX_WORKERS=1 npm test

# Lint
npm run lint
```

## Key Patterns

- **Zustand with persist**: See `src/application/stores/features.ts` for the existing pattern
- **Select component**: See `src/presentation/components/containers/AssignCameraDialog.tsx` for shadcn/ui Select usage
- **Client-side filtering**: See `useUnassignedCameras()` in `useContainers.ts` for the existing cross-reference pattern
- **Opaque ID display**: All IDs use `font-mono text-xs text-muted-foreground` — see `ContainerCard.tsx`
