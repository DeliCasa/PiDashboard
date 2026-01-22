# Implementation Plan: Handoff Sentinel

**Branch**: `032-handoff-sentinel` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-handoff-sentinel/spec.md`

## Summary

Implement a cross-repo handoff detection and generation system for PiDashboard ⇄ PiOrchestrator workflow. The system scans for incoming handoff documents, surfaces unacknowledged items during dev/test workflows, generates standardized outgoing handoffs, and integrates with CI for enforcement. Uses Node.js scripts with YAML frontmatter parsing, npm script hooks, and optional Claude Code skill integration.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, Node.js (via npm scripts)
**Primary Dependencies**: gray-matter (YAML frontmatter), glob (file patterns), chalk (terminal colors)
**Storage**: JSON file for detection state (`.handoff-state.json`), Markdown files for handoffs
**Testing**: Vitest (unit tests), Playwright (E2E for any UI components)
**Target Platform**: Node.js CLI (npm scripts), cross-platform (macOS, Linux, Windows)
**Project Type**: Single project (scripts + optional React components)
**Performance Goals**: Detection completes in <5 seconds, Generation in <2 seconds
**Constraints**: Must not add significant startup overhead to `npm run dev/test`
**Scale/Scope**: ~10-50 handoff documents per repo, ~5 concurrent developers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file is a template without specific project rules. Applying general best practices:

| Gate | Status | Notes |
|------|--------|-------|
| Library-First | PASS | Detection/generation as standalone scripts, independently testable |
| CLI Interface | PASS | Scripts use text I/O (stdin/args → stdout/stderr), JSON output supported |
| Test-First | PASS | Unit tests for parser, detector, generator before implementation |
| Integration Testing | PASS | Contract tests for frontmatter schema validation |
| Simplicity | PASS | No unnecessary abstractions, direct file operations |

**Constitution Status**: PASS - No violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/032-handoff-sentinel/
├── plan.md              # This file
├── research.md          # Phase 0 output - tech decisions
├── data-model.md        # Phase 1 output - handoff schema
├── quickstart.md        # Phase 1 output - usage guide
├── contracts/           # Phase 1 output - frontmatter schema
│   └── handoff-schema.yaml
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
scripts/
├── handoff/
│   ├── detect.ts        # Main detection script
│   ├── generate.ts      # Handoff generator
│   ├── validate.ts      # Frontmatter validation
│   ├── types.ts         # TypeScript interfaces
│   └── utils.ts         # Shared utilities (glob, parse)
└── smoke_030_dashboard_recovery.sh  # Existing (unrelated)

tests/
├── unit/
│   └── handoff/
│       ├── detect.test.ts
│       ├── generate.test.ts
│       └── validate.test.ts
└── integration/
    └── handoff/
        └── lifecycle.test.ts

.claude/
└── skills/
    └── handoff-generate.md  # Optional Claude Code skill

# Configuration
.handoff-state.json      # Detection state (gitignored)
handoff.config.json      # Optional configuration overrides
```

**Structure Decision**: Scripts-based approach in `/scripts/handoff/` directory. Node.js scripts invoked via npm, TypeScript for type safety. No React components needed for MVP (terminal output only). Detection state stored in `.handoff-state.json` (local, not committed).

## Complexity Tracking

No violations to justify. Implementation follows simplicity principle with direct file operations and CLI scripts.
