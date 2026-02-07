# Contracts: Dashboard Resilience & E2E Coverage

**Feature**: 045-dashboard-resilience-e2e

## No New API Contracts

This feature does not add new API endpoints. It enhances the handling of **existing** endpoints when they return error responses.

## Existing Contracts Referenced

All API contracts are already defined in the schema files:

| Endpoint | Schema File | Change |
|----------|-------------|--------|
| `GET /v1/containers` | `v1-containers-schemas.ts` | Hook error handling only |
| `GET /v1/cameras` | `v1-cameras-schemas.ts` | Hook error handling only |
| `GET /dashboard/diagnostics/*` | `diagnostics-schemas.ts` | Already handled |
| `POST /v1/cameras/{id}/evidence` | `diagnostics-schemas.ts` | Already handled |
| `GET /dashboard/diagnostics/sessions` | `diagnostics-schemas.ts` | Already handled |

## Error Response Contract

All V1 API endpoints return this error shape on failure:

```typescript
// 404/503 response (feature unavailable)
{
  success: false,
  error: {
    code: string,     // e.g., "NOT_FOUND", "SERVICE_UNAVAILABLE"
    message: string,
    retryable: boolean
  },
  correlation_id?: string,
  timestamp: string
}
```

The `isFeatureUnavailable()` function in `src/infrastructure/api/client.ts` checks for HTTP status 404 or 503 and returns `true`, signaling the hook to stop retrying and polling.

## E2E Mock Contract

E2E mocks in `mock-routes.ts` must conform to the same V1 API response wrapper:

```typescript
// Success response wrapper
{
  success: true,
  data: T,                    // The actual response data
  correlation_id: string,
  timestamp: string
}

// Error response wrapper
{
  success: false,
  error: {
    code: string,
    message: string,
    retryable: boolean
  },
  correlation_id: string,
  timestamp: string
}
```
