# Data Model: Handoff Sentinel Normalization

**Feature**: 041-handoff-normalization
**Date**: 2026-02-02

## Entities

### Handoff Document (Markdown + YAML Frontmatter)

This feature modifies **data at rest** (markdown files), not runtime data structures. The "data model" is the YAML frontmatter schema enforced by the sentinel.

**Required Frontmatter Fields**:

| Field | Type | Constraint | Example |
|-------|------|-----------|---------|
| `handoff_id` | string | `/^\d{3}-[a-z][a-z0-9-]*$/` | `"031-logs-v1-sse"` |
| `direction` | enum | `"incoming"` or `"outgoing"` | `"incoming"` |
| `from_repo` | string | Outgoing: must be `"PiDashboard"` | `"PiOrchestrator"` |
| `to_repo` | string | Incoming: must be `"PiDashboard"` | `"PiDashboard"` |
| `created_at` | string | ISO 8601 datetime | `"2026-01-13T00:00:00Z"` |
| `status` | enum | `new`, `acknowledged`, `in_progress`, `done`, `blocked` | `"done"` |
| `related_prs` | string[] | Can be empty | `[]` |
| `related_commits` | string[] | Can be empty | `[]` |
| `requires` | object[] | Each: `{ type, description }` | See below |
| `acceptance` | string[] | Can be empty | `[]` |
| `verification` | string[] | Can be empty | `[]` |
| `risks` | string[] | Can be empty | `[]` |
| `notes` | string | Can be empty | `""` |

**Status State Machine**:

```
new → acknowledged → in_progress → done
 │         │              │
 └→ blocked ←─────────────┘
      │
      └→ in_progress → done
```

Terminal state: `done` (no transitions out).

## Files Modified

| File | Field Changed | Old Value | New Value |
|------|--------------|-----------|-----------|
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md` | `status` | `new` | `done` |
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` | `status` | `new` | `acknowledged` |
| `specs/032-handoff-sentinel/contracts/handoff-template.md` | `status` | `new` | `done` |

No structural changes to any file. Only frontmatter `status` field values are updated.
