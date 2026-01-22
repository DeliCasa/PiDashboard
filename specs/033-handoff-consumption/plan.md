# Implementation Plan: Handoff Consumption Workflow

**Branch**: `033-handoff-consumption` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-handoff-consumption/spec.md`

## Summary

Implement a structured workflow for consuming incoming handoffs from PiOrchestrator. The system discovers unresolved handoffs, extracts actionable requirements into consumption plans, guides prioritized implementation (API → schemas → UI → logging), requires test verification, and produces consumption reports documenting closure. Builds on Feature 032 (Handoff Sentinel) infrastructure.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, Node.js (via npm scripts)
**Primary Dependencies**: gray-matter (YAML frontmatter), chalk (terminal), Feature 032 Handoff Sentinel infrastructure
**Storage**: Markdown files (consumption plans, reports), JSON state files
**Testing**: Vitest (unit tests), Playwright (E2E)
**Target Platform**: Node.js CLI (npm scripts), cross-platform
**Project Type**: Single project (scripts extending Feature 032)
**Performance Goals**: Discovery <5 seconds, Plan generation <30 seconds
**Constraints**: Must not duplicate Handoff Sentinel functionality, reuse existing types/utilities
**Scale/Scope**: ~10-50 handoff documents, ~5 concurrent developers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file is a template without specific project rules. Applying general best practices:

| Gate | Status | Notes |
|------|--------|-------|
| Library-First | PASS | Consumption scripts as standalone modules extending Feature 032 |
| CLI Interface | PASS | Scripts use text I/O (stdin/args → stdout/stderr), JSON output |
| Test-First | PASS | Unit tests for parser, plan generator, report generator |
| Integration Testing | PASS | Contract tests for consumption plan schema |
| Simplicity | PASS | Extends existing infrastructure, no unnecessary abstractions |

**Constitution Status**: PASS - No violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/033-handoff-consumption/
├── plan.md              # This file
├── research.md          # Phase 0 output - design decisions
├── data-model.md        # Phase 1 output - consumption plan schema
├── quickstart.md        # Phase 1 output - usage guide
├── contracts/           # Phase 1 output - schemas
│   ├── consumption-plan-schema.yaml
│   └── consumption-report-template.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
scripts/
├── handoff/
│   ├── detect.ts        # [Feature 032] Detection script
│   ├── generate.ts      # [Feature 032] Handoff generator
│   ├── validate.ts      # [Feature 032] Frontmatter validation
│   ├── types.ts         # [Feature 032] TypeScript interfaces
│   ├── state.ts         # [Feature 032] State persistence
│   ├── utils.ts         # [Feature 032] Shared utilities
│   │
│   ├── consume.ts       # [NEW] Main consumption workflow script
│   ├── extract.ts       # [NEW] Requirement extraction & categorization
│   ├── plan-generator.ts # [NEW] Consumption plan generator
│   ├── report.ts        # [NEW] Consumption report generator
│   └── types-consume.ts # [NEW] Consumption-specific types

tests/
├── unit/
│   └── handoff/
│       ├── detect.test.ts        # [Existing]
│       ├── consume.test.ts       # [NEW]
│       ├── extract.test.ts       # [NEW]
│       ├── plan-generator.test.ts # [NEW]
│       └── report.test.ts        # [NEW]
└── integration/
    └── handoff/
        └── consumption-workflow.test.ts # [NEW]

docs/
├── handoffs/
│   └── CONSUMPTION_REPORT_<handoff_id>.md  # [NEW] Generated reports
│
├── HANDOFF_*.md         # [Existing] Handoff documents

specs/
├── <handoff_id>-consumption/
│   └── plan.md          # [NEW] Generated consumption plans
```

**Structure Decision**: Extension of Feature 032 scripts in `/scripts/handoff/` directory. New scripts for consumption workflow (`consume.ts`, `extract.ts`, `plan-generator.ts`, `report.ts`). Consumption plans stored in `specs/<handoff_id>-consumption/`, reports in `docs/handoffs/`.

## Complexity Tracking

No violations to justify. Implementation extends existing infrastructure with minimal new abstractions.
