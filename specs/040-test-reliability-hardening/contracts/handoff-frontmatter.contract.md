---
handoff_id: "040-frontmatter-contract"
direction: "outgoing"
from_repo: "PiDashboard"
to_repo: "PiOrchestrator"
created_at: "2026-02-01T00:00:00Z"
status: "done"
related_prs: []
related_commits: []
requires: []
acceptance: []
verification: []
risks: []
notes: ""
---

# Contract: Handoff Document Frontmatter

**Validated by**: `npm run handoff:detect`
**Schema**: `specs/032-handoff-sentinel/contracts/handoff-schema.yaml`

## Required YAML Frontmatter

All handoff files matching sentinel scan patterns must have this frontmatter:

```yaml
---
handoff_id: "NNN-slug"
direction: "incoming" | "outgoing"
from_repo: string
to_repo: string
created_at: "YYYY-MM-DDTHH:MM:SSZ"
status: "new" | "acknowledged" | "in_progress" | "done" | "blocked"
related_prs: []
related_commits: []
requires: []
acceptance: []
verification: []
risks: []
notes: ""
---
```

## Files Requiring Updates

| File | handoff_id | direction | from_repo | to_repo | status |
| ---- | ---------- | --------- | --------- | ------- | ------ |
| `docs/HANDOFF_028_API_COMPAT_COMPLETE.md` | `028-api-compat-complete` | incoming | PiOrchestrator | PiDashboard | done |
| `docs/HANDOFF_029_ROUTE_NORMALIZATION.md` | `029-route-normalization` | outgoing | PiDashboard | PiOrchestrator | new |
| `docs/HANDOFF_030_DASHBOARD_RECOVERY.md` | `030-dashboard-recovery` | outgoing | PiDashboard | PiOrchestrator | done |
| `docs/HANDOFF_030_RECOVERY_COMPLETE.md` | `030-recovery-complete` | outgoing | PiDashboard | PiOrchestrator | done |
| `docs/HANDOFF_PIORCH_DASHBOARD_INTEGRATION.md` | `027-piorchestrator-integration` | incoming | PiOrchestrator | PiDashboard | acknowledged |
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260113-001.md` | `031-logs-v1-sse` | incoming | PiOrchestrator | PiDashboard | new |
| `docs/handoffs/incoming/HANDOFF-PIO-PID-20260122-AUTO-ONBOARD.md` | `035-auto-onboard-api` | incoming | PiOrchestrator | PiDashboard | new |
| `specs/032-handoff-sentinel/contracts/handoff-template.md` | `000-template-example` | outgoing | PiDashboard | PiOrchestrator | new |

## Validation Rules

1. `handoff_id` MUST match pattern `^\d{3}-[a-z][a-z0-9-]*$`
2. `handoff_id` MUST be unique across all handoff files
3. Outgoing: `from_repo` MUST be `"PiDashboard"`
4. Incoming: `to_repo` MUST be `"PiDashboard"`
5. `status` MUST be one of: `new`, `acknowledged`, `in_progress`, `done`, `blocked`
6. `created_at` MUST be valid ISO 8601

## Verification

```bash
npm run handoff:detect          # must exit 0 with 0 errors
npm run handoff:detect --strict # must exit 0
```
