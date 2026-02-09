# API Contracts: 046 Opaque Container Identity

## No New Endpoints

This feature introduces **no new API endpoints**. All data is sourced from existing Feature 043 contracts:

### Reused Endpoints

| Endpoint | Method | Source | Schema |
|----------|--------|--------|--------|
| `/api/v1/containers` | GET | Feature 043 | `ContainerListResponseSchema` |
| `/api/v1/containers/:id` | GET | Feature 043 | `ContainerResponseSchema` |
| `/api/v1/cameras` | GET | Feature 034 | `CameraListResponseSchema` |

### Reused Schemas

All Zod schemas are defined in:
- `src/infrastructure/api/v1-containers-schemas.ts` (container schemas)
- `src/infrastructure/api/v1-cameras-schemas.ts` (camera schemas)

### Data Flow

```
Container List API --> ContainerDetail.cameras[].device_id
                                    ↓ (cross-reference)
Camera List API ----> Camera.id
                                    ↓ (filter)
                         Scoped Camera View
```

The filtering is entirely client-side. No backend changes are required.
