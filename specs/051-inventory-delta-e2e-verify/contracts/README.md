# Contracts: 051 — Live E2E Inventory Delta Display

## API Contract

Full endpoint documentation with request/response shapes, error codes, and polling behavior:
→ [`../artifacts/api-contract.md`](../artifacts/api-contract.md)

## Key Contract Changes

This feature aligns PiDashboard's Zod schemas with BridgeServer's actual inventory API:

### Status Enum Alignment

| BridgeServer Value | PiDashboard Zod Value | Display Label |
|---|---|---|
| `pending` | `pending` | Queued |
| `processing` | `processing` | Running |
| `done` | `done` | Completed / Approved (derived) |
| `needs_review` | `needs_review` | Needs Review |
| `error` | `error` | Failed |

### Removed Fields
- `correlation_id` — not available in BridgeServer inventory schema

### Newly Displayed Fields
- `rationale` on DeltaEntry — exists in schema, now rendered in delta table

## Source Contract References

| Contract Source | Location |
|---|---|
| BridgeServer entity | `BridgeServer/src/domain/entities/inventory-analysis.entity.ts` |
| BridgeServer routes | `BridgeServer/src/interfaces/http/inventory-analysis.routes.ts` |
| BridgeServer DB schema | `BridgeServer/drizzle/schema.ts:1172-1241` |
| PiDashboard Zod schemas | `src/infrastructure/api/inventory-delta-schemas.ts` |
| PiDashboard contract tests | `tests/integration/contracts/inventory-delta.contract.test.ts` |
