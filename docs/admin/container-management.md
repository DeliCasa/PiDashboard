# Container Management Guide

**Feature**: 043-container-identity-ui
**Version**: 1.0.0
**Last Updated**: 2026-02-04

This guide covers the container management features in the PiDashboard for organizing and monitoring ESP32-CAM cameras.

## Overview

Containers are logical groupings for cameras. Each container:
- Has an **opaque ID** (system-generated, not user-modifiable)
- Has an optional **human-readable label** (set by admin)
- Supports up to **4 camera positions** (1-4)
- Tracks camera **online/offline status**

## Key Concepts

### Identity Model

The system uses **opaque identifiers** for all entities:

| Entity | ID Format | Example |
|--------|-----------|---------|
| Container | UUID-like | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| Camera | MAC address | `AA:BB:CC:DD:EE:FF` |

**Important**: Never assume meaning from IDs. Use labels for human identification.

### Labels vs IDs

- **Labels**: Optional, human-readable names for easier identification
- **IDs**: System-generated, immutable, used for API operations

| Display Priority | Example |
|------------------|---------|
| Label (if set) | "Kitchen Fridge" |
| Fallback | *Unnamed Container* (italic, muted) |
| ID (always shown) | `f47ac10b...` (monospace, secondary) |

## Using the Container Management UI

### Accessing Containers

1. Open the PiDashboard
2. Click the **Containers** tab
3. The container grid shows all configured containers

### Container Card

Each card displays:
- **Label** (or "Unnamed Container" placeholder)
- **ID** in monospace secondary text
- **Camera count** (e.g., "2/4 cameras")
- **Status indicators**: green (online), yellow (offline)
- **Description preview** (if set)

### Creating a Container

1. Click **Create Container** button
2. (Optional) Enter a **label** (max 100 characters)
3. (Optional) Enter a **description** (max 500 characters)
4. Click **Create**

The system generates an opaque ID automatically.

### Viewing Container Details

Click any container card to open the detail view:

- **2x2 position grid** showing all 4 camera slots
- **Camera assignments** with status indicators
- **Edit** and **Delete** buttons
- **Created/Updated timestamps**

### Assigning a Camera

1. Open container details
2. Click an **empty position slot**
3. Select a camera from the dropdown (shows unassigned cameras only)
4. Click **Assign Camera**

Cameras show their status (online/offline) in the dropdown.

### Unassigning a Camera

1. Open container details
2. Click the **X** button on an occupied position slot
3. Camera returns to the unassigned pool

### Editing a Container

1. Open container details
2. Click **Edit**
3. Update label and/or description
4. Click **Save Changes**

**Note**: Container IDs cannot be changed.

### Deleting a Container

1. Open container details
2. Click the **Delete** button (trash icon)
3. Confirm deletion

**Important**: You must unassign all cameras before deletion. The delete button is disabled for containers with cameras.

## Status Indicators

### Camera Status

| Status | Indicator | Description |
|--------|-----------|-------------|
| Online | Green dot/icon | Camera actively communicating |
| Offline | Yellow/amber dot/icon | Camera not responding |

### Container Card Summary

Cards show aggregated stats:
- Total cameras assigned (e.g., "3/4")
- Online count (green)
- Offline count (yellow)
- "Full" badge when 4 cameras assigned

## Error Handling

### Common Error Messages

| Error | Cause | Resolution |
|-------|-------|------------|
| "Container not found" | Container was deleted | Return to container list |
| "Position already occupied" | Camera at that position | Unassign existing camera first |
| "Camera already assigned" | Camera in another container | Unassign from other container first |
| "Remove all cameras before deleting" | Container has cameras | Unassign all cameras, then delete |

### Network Issues

When the API is unavailable:
1. Loading state shows spinner
2. Error state shows retry button
3. Toast notifications for individual operation failures

## Best Practices

### Labeling Conventions

Suggested label format: `[Location] [Type]`
- "Kitchen Fridge"
- "Garage Freezer"
- "Pantry Unit 1"

### Position Assignment

Position numbers (1-4) map to a 2x2 grid:
```
┌───────┬───────┐
│   1   │   2   │
├───────┼───────┤
│   3   │   4   │
└───────┴───────┘
```

Consider consistent positioning across containers for similar setups.

### Monitoring

- Check the header for unassigned camera count (warning indicator)
- Review offline cameras regularly
- Use refresh button to update status

## API Endpoints

Container management uses the V1 Containers API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/containers` | GET | List all containers |
| `/api/v1/containers` | POST | Create container |
| `/api/v1/containers/:id` | GET | Get container details |
| `/api/v1/containers/:id` | PATCH | Update container |
| `/api/v1/containers/:id` | DELETE | Delete container |
| `/api/v1/containers/:id/cameras` | POST | Assign camera |
| `/api/v1/containers/:id/cameras/:device_id` | DELETE | Unassign camera |
| `/api/v1/cameras/unassigned` | GET | List unassigned cameras |

See [API-TYPE-CONTRACTS.md](../contracts/API-TYPE-CONTRACTS.md) for detailed schema documentation.

## Troubleshooting

### Container Not Loading

1. Check network connectivity
2. Verify PiOrchestrator service is running: `systemctl status piorchestrator`
3. Check browser console for API errors
4. Try refreshing the container list

### Camera Not Showing in Assignment Dialog

1. Camera must be **paired** (not just discovered)
2. Camera must not be assigned to another container
3. Refresh the container detail to update camera list

### Position Grid Not Updating

1. Wait for mutation to complete (loading indicator)
2. Use refresh button on container list
3. Close and reopen container detail dialog

### Delete Button Disabled

Container must be empty before deletion:
1. Unassign all cameras from the container
2. Verify camera count shows "0/4"
3. Delete button becomes enabled
