# Quickstart: Handoff Consumption Workflow

**Feature**: 033-handoff-consumption
**Date**: 2026-01-13

## Overview

The Handoff Consumption Workflow helps you systematically consume incoming handoffs from PiOrchestrator. It discovers unresolved handoffs, generates structured consumption plans, guides implementation, and produces audit reports.

## Prerequisites

- Feature 032 (Handoff Sentinel) must be installed
- Node.js and npm available
- At least one incoming handoff with valid YAML frontmatter

## Quick Commands

```bash
# Discover unresolved incoming handoffs
npm run handoff:consume -- --discover

# Generate consumption plan for a specific handoff
npm run handoff:consume -- --plan 031-backend-gaps

# View consumption plan
cat specs/031-backend-gaps-consumption/plan.md

# Mark requirement as complete
npm run handoff:consume -- --complete 031-backend-gaps REQ-001

# Generate consumption report (marks handoff done)
npm run handoff:consume -- --close 031-backend-gaps

# Mark as blocked (generates outgoing handoff)
npm run handoff:consume -- --block 031-backend-gaps "Backend endpoint not implemented"
```

## Workflow Steps

### Step 1: Discover Incoming Handoffs

```bash
npm run handoff:consume -- --discover
```

Output:
```
┌───────────────────────────────────────────────────────────────┐
│ 📥 INCOMING HANDOFFS                                          │
├───────────────────────────────────────────────────────────────┤
│ NEW (consume first):                                          │
│   ⚠️ 031-backend-gaps (2026-01-12) [api, deploy]             │
│      → PiOrchestrator Backend Gaps                            │
│      docs/HANDOFF_031_PIORCHESTRATOR_BACKEND_GAPS.md         │
│                                                               │
│ IN PROGRESS:                                                  │
│   🔄 028-api-compat (2026-01-10) [api]                       │
│      → API Compatibility                                      │
└───────────────────────────────────────────────────────────────┘
```

### Step 2: Generate Consumption Plan

```bash
npm run handoff:consume -- --plan 031-backend-gaps
```

This creates `specs/031-backend-gaps-consumption/plan.md` with:
- Summary of requirements
- Categorized checklist (API → Schema → UI → Logging)
- Impacted files list
- Test plan
- Risk documentation

### Step 3: Implement Changes

Work through the consumption plan checklist in priority order:

1. **P1: API Client Compatibility**
   - Update routes, headers, params
   - Handle error responses

2. **P2: Schema/Types**
   - Update Zod schemas
   - Update TypeScript types
   - Ensure validation matches contract

3. **P3: UI Behavior**
   - Update components
   - Fix data display issues
   - Handle loading/error states

4. **P4: Telemetry/Logging**
   - Add helpful error messages
   - Debug logging for contract mismatches

Mark items complete as you go:
```bash
npm run handoff:consume -- --complete 031-backend-gaps REQ-001
```

### Step 4: Write Tests

Follow the test plan in the consumption plan:

```bash
# Run tests to verify implementation
npm test

# Run specific test file
npm test -- tests/unit/api/client.test.ts
```

### Step 5: Close the Loop

When all requirements are complete and tests pass:

```bash
npm run handoff:consume -- --close 031-backend-gaps
```

This:
1. Verifies all requirements marked complete
2. Runs verification commands from test plan
3. Updates handoff status to `done`
4. Generates consumption report at `docs/handoffs/CONSUMPTION_REPORT_031-backend-gaps.md`

### Handling Blockers

If you cannot complete a handoff due to backend gaps:

```bash
npm run handoff:consume -- --block 031-backend-gaps "WiFi scan endpoint returns mock data"
```

This:
1. Updates handoff status to `blocked`
2. Generates outgoing handoff to PiOrchestrator
3. Creates consumption report with blocker details

## File Locations

| Artifact | Location |
|----------|----------|
| Source Handoffs | `docs/HANDOFF_*.md` |
| Consumption Plans | `specs/<handoff_id>-consumption/plan.md` |
| Consumption Reports | `docs/handoffs/CONSUMPTION_REPORT_<handoff_id>.md` |
| Outgoing Handoffs | `docs/HANDOFF_<feature>_<slug>.md` |

## Consumption Plan Status

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Implementation underway |
| `testing` | Writing/running tests |
| `review` | Awaiting review |
| `done` | Complete |
| `blocked` | Cannot proceed |

## Example Workflow

```bash
# 1. See what needs to be consumed
npm run handoff:consume -- --discover

# 2. Pick the first incoming handoff
npm run handoff:consume -- --plan 031-backend-gaps

# 3. Read the plan and implement changes
cat specs/031-backend-gaps-consumption/plan.md
# ... make code changes ...

# 4. Mark requirements complete as you go
npm run handoff:consume -- --complete 031-backend-gaps REQ-001
npm run handoff:consume -- --complete 031-backend-gaps REQ-002

# 5. Write and run tests
npm test

# 6. Close the handoff when done
npm run handoff:consume -- --close 031-backend-gaps

# 7. Check consumption report
cat docs/handoffs/CONSUMPTION_REPORT_031-backend-gaps.md
```

## Troubleshooting

### "No incoming handoffs found"

- Check handoff files have valid YAML frontmatter
- Verify `direction: incoming` and `to_repo: PiDashboard`
- Run `npm run handoff:detect` to see validation errors

### "Cannot close: tests failing"

- All verification commands must pass before closing
- Run `npm test` to see failing tests
- Fix tests or mark as blocked if backend issue

### "Consumption plan already exists"

- Plan won't be regenerated if it exists
- Delete existing plan to regenerate: `rm specs/<id>-consumption/plan.md`

## Integration with Handoff Sentinel

This feature extends Feature 032 (Handoff Sentinel):

- Uses same scanning infrastructure (`npm run handoff:detect`)
- Uses same frontmatter schema
- Consumption workflow adds:
  - `npm run handoff:consume` commands
  - Consumption plans in `specs/`
  - Consumption reports in `docs/handoffs/`
