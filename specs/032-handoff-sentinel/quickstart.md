# Quickstart: Handoff Sentinel

**Feature**: 032-handoff-sentinel
**Date**: 2026-01-13

## Overview

Handoff Sentinel automatically detects and helps generate cross-repo handoff documents between PiDashboard and PiOrchestrator. It surfaces unacknowledged handoffs during development and enforces acknowledgment in CI.

## Quick Commands

```bash
# Check for pending handoffs (runs automatically on npm run dev/test)
npm run handoff:detect

# List all handoffs with details
npm run handoff:list

# Generate a new outgoing handoff
npm run handoff:generate

# CI mode - fail if unacknowledged handoffs exist
npm run handoff:detect -- --strict
```

## Detection Flow

### Automatic Detection

When you run `npm run dev` or `npm test`, Handoff Sentinel automatically checks for pending handoffs:

```
$ npm run dev

┌─────────────────────────────────────────────────────────────┐
│ 📬 HANDOFF SENTINEL                                         │
├─────────────────────────────────────────────────────────────┤
│ ⚠️  1 unacknowledged handoff requires attention             │
│                                                             │
│ NEW:                                                        │
│   • 031-backend-gaps (2026-01-12) [api, deploy]            │
│     → PiOrchestrator backend implementation gaps            │
└─────────────────────────────────────────────────────────────┘

> vite

  VITE v7.0.0  ready in 300ms
  ...
```

### Acknowledging Handoffs

To acknowledge a handoff, edit its frontmatter status:

```yaml
# Before
status: new

# After (choose one)
status: acknowledged    # I've seen it, will address later
status: in_progress     # I'm actively working on it
status: done            # Work is complete
status: blocked         # Can't proceed due to external dependency
```

## Generating Outgoing Handoffs

When your Dashboard work requires backend changes:

### Option 1: npm Script

```bash
npm run handoff:generate
```

Interactive prompts:
```
? Feature number: 032
? Short slug: handoff-sentinel
? Summary: Handoff detection and generation system
? Requirement types: [api, deploy]
? Acceptance criteria (comma-separated):
  > WiFi scan returns real networks, Connection works
```

Output: `docs/HANDOFF_032_handoff-sentinel.md`

### Option 2: Claude Code Skill (if available)

```
/handoff-generate 032-handoff-sentinel
```

Claude will interactively gather requirements and generate the handoff document.

## Handoff Document Structure

Every handoff must have YAML frontmatter:

```yaml
---
handoff_id: "032-example"
direction: outgoing           # or "incoming"
from_repo: PiDashboard
to_repo: PiOrchestrator
created_at: "2026-01-13"
status: new
requires:
  - type: api
    description: "Implement real WiFi scanning"
  - type: deploy
    description: "Rebuild with new code"
acceptance:
  - "WiFi scan returns real networks"
verification:
  - "curl /api/wifi/scan shows actual SSIDs"
---

# Handoff: [Title]

[Markdown content...]
```

## Handoff Locations

Detection scans these paths:
- `docs/HANDOFF_*.md`
- `docs/handoffs/**/*.md`
- `specs/**/HANDOFF*.md`
- `specs/**/handoff*.md`

## CI Integration

Add to your CI workflow:

```yaml
# .github/workflows/test.yml
- name: Check handoffs
  run: npm run handoff:detect -- --strict
```

Flags:
- `--strict`: Exit 1 if unacknowledged handoffs exist
- `--quiet`: Suppress output on success
- `--json`: Machine-readable output

## Status Lifecycle

```
new → acknowledged → in_progress → done
         ↓              ↓
      blocked ←─────────┘
         ↓
       done
```

| Status | Meaning | Detection Behavior |
|--------|---------|-------------------|
| `new` | Just created | ⚠️ Surfaces warning |
| `acknowledged` | Seen, not started | ✓ Silent |
| `in_progress` | Being worked on | ⚠️ Surfaces info |
| `done` | Complete | ✓ Silent |
| `blocked` | External blocker | ⚠️ Surfaces warning |

## Common Scenarios

### Scenario 1: New Backend API Needed

1. Implement Dashboard feature that needs new backend endpoint
2. Run `npm run handoff:generate`
3. Fill in API contract details
4. Commit handoff to `docs/HANDOFF_NNN_slug.md`
5. Backend team sees handoff, implements, marks done

### Scenario 2: Incoming API Change

1. PiOrchestrator commits handoff to Dashboard repo
2. You run `npm run dev`, see warning
3. Update your code to use new API
4. Mark handoff as `done` in frontmatter
5. Link your PR in `related_prs`

### Scenario 3: CI Blocking Merge

1. PR fails CI with "unacknowledged handoff"
2. Review the handoff in `docs/HANDOFF_*.md`
3. Either:
   - Address the handoff and mark `done`
   - Mark `acknowledged` if deferring (with justification in notes)
4. Re-run CI

## Configuration (Optional)

Create `handoff.config.json` in project root:

```json
{
  "paths": [
    "docs/HANDOFF_*.md",
    "docs/handoffs/**/*.md",
    "specs/**/HANDOFF*.md"
  ],
  "strictMode": false,
  "outputDir": "docs"
}
```

## Troubleshooting

### "Invalid YAML frontmatter"

Check for:
- Missing `---` delimiters
- Invalid date format (use ISO 8601)
- Typos in enum values (status, direction, type)

### "Duplicate handoff_id"

Two files have the same `handoff_id`. Each must be unique.

### Detection is slow

- Check number of files matching patterns
- Exclude irrelevant directories in config
- Use `--quiet` in CI to skip formatting

## Next Steps

After setup:
1. Run `npm run handoff:list` to see existing handoffs
2. Try `npm run handoff:generate` to create your first outgoing handoff
3. Check your existing `docs/HANDOFF_*.md` files for frontmatter compliance
