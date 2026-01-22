# Data Model: Handoff Sentinel

**Feature**: 032-handoff-sentinel
**Date**: 2026-01-13

## Entities

### 1. Handoff Document

A markdown file with YAML frontmatter containing cross-repo integration requirements.

**Identity**: `handoff_id` (unique across repository)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `handoff_id` | string | Yes | Unique identifier, format: `NNN-slug` (e.g., "031-backend-gaps") |
| `direction` | enum | Yes | "incoming" or "outgoing" |
| `from_repo` | string | Yes | Source repository name |
| `to_repo` | string | Yes | Target repository name |
| `created_at` | datetime | Yes | ISO 8601 timestamp |
| `status` | enum | Yes | Lifecycle state (see State Machine) |
| `related_prs` | string[] | No | Array of PR URLs |
| `related_commits` | string[] | No | Array of commit SHAs |
| `requires` | Requirement[] | No | Array of requirement objects |
| `acceptance` | string[] | No | Array of acceptance criteria |
| `verification` | string[] | No | Array of verification steps |
| `risks` | string[] | No | Array of risk descriptions |
| `notes` | string | No | Free-form notes |

**Validation Rules**:
- `handoff_id` must match pattern `/^\d{3}-[a-z][a-z0-9-]*$/`
- `created_at` must be valid ISO 8601 datetime
- `from_repo` and `to_repo` must be non-empty strings
- If `direction` is "outgoing", `from_repo` must be "PiDashboard"
- If `direction` is "incoming", `to_repo` must be "PiDashboard"

---

### 2. Requirement

Nested object within Handoff Document describing a specific requirement.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | Yes | Category: "api", "route", "ui", "deploy", "test", "docs" |
| `description` | string | Yes | What needs to be done |

**Example**:
```yaml
requires:
  - type: api
    description: Implement /api/wifi/scan with real hardware
  - type: deploy
    description: Rebuild PiOrchestrator binary with new code
```

---

### 3. Detection State

Local state file tracking handoff visibility across detection runs.

**Identity**: File path (`.handoff-state.json`)

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Schema version (currently 1) |
| `lastRun` | datetime | ISO timestamp of last detection |
| `seen` | Map<string, SeenEntry> | Map of handoff_id to seen metadata |

**SeenEntry Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Status at last observation |
| `lastSeen` | datetime | When this handoff was last seen |
| `contentHash` | string | MD5 hash of file content for change detection |

**Example**:
```json
{
  "version": 1,
  "lastRun": "2026-01-13T10:30:00Z",
  "seen": {
    "031-backend-gaps": {
      "status": "new",
      "lastSeen": "2026-01-13T10:30:00Z",
      "contentHash": "a1b2c3d4e5f6"
    }
  }
}
```

---

### 4. Detection Result

Output of a detection run (in-memory, returned by detector).

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | datetime | When detection ran |
| `handoffs` | Handoff[] | All parsed handoff documents |
| `pending` | Handoff[] | Handoffs requiring attention (new, in_progress, blocked) |
| `newSinceLastRun` | Handoff[] | Handoffs not seen in previous run |
| `errors` | ValidationError[] | Parsing/validation errors encountered |
| `summary` | Summary | Aggregated counts |

**Summary Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total handoffs scanned |
| `new` | number | Count with status "new" |
| `inProgress` | number | Count with status "in_progress" |
| `blocked` | number | Count with status "blocked" |
| `done` | number | Count with status "done" |
| `acknowledged` | number | Count with status "acknowledged" |

---

### 5. Validation Error

Error encountered during frontmatter parsing or validation.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `file` | string | Path to problematic file |
| `line` | number | Line number (if applicable) |
| `field` | string | Field name that failed validation |
| `message` | string | Human-readable error description |
| `code` | string | Error code for programmatic handling |

**Error Codes**:
- `INVALID_YAML`: YAML parsing failed
- `MISSING_FIELD`: Required field not present
- `INVALID_FORMAT`: Field value doesn't match expected format
- `INVALID_ENUM`: Value not in allowed enum list
- `DUPLICATE_ID`: Same handoff_id used in multiple files

---

## State Machine: Handoff Status

```
                    ┌──────────────┐
                    │     new      │ ← Initial state when created
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │acknowledged│ │in_progress │ │  blocked   │
     └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
            │              │              │
            │              │              │
            └──────────────┼──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │     done     │ ← Terminal state
                    └──────────────┘
```

**Transitions**:
| From | To | Trigger |
|------|----|---------
| new | acknowledged | Developer marks as seen |
| new | in_progress | Developer starts work |
| new | blocked | External dependency blocking |
| acknowledged | in_progress | Developer starts work |
| acknowledged | blocked | External dependency blocking |
| in_progress | done | Work completed |
| in_progress | blocked | Hit unexpected blocker |
| blocked | in_progress | Blocker resolved |
| blocked | done | Work completed despite blocker |

**Invalid Transitions**:
- `done` → any (terminal state)
- any → `new` (cannot reset to initial)

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        Repository                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    docs/                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐                     │   │
│  │  │ HANDOFF_031  │  │ HANDOFF_030  │  ...                │   │
│  │  │    .md       │  │    .md       │                     │   │
│  │  └──────────────┘  └──────────────┘                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ scanned by                       │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Detection Script                      │   │
│  │  • Parses frontmatter                                   │   │
│  │  • Validates schema                                     │   │
│  │  • Compares to state                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │
│  │Detection Result│ │Detection State │ │ Terminal Output│      │
│  │  (in-memory)   │ │(.handoff-state)│ │   (stdout)     │      │
│  └────────────────┘ └────────────────┘ └────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Locations

| Entity | Storage | Path Pattern |
|--------|---------|--------------|
| Handoff Document | Markdown files | `docs/HANDOFF_*.md`, `specs/**/HANDOFF*.md` |
| Detection State | JSON file | `.handoff-state.json` (gitignored) |
| Detection Result | In-memory | N/A (returned by function) |
| Config (optional) | JSON file | `handoff.config.json` |
