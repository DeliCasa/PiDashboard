# Data Model: Handoff Consumption Workflow

**Feature**: 033-handoff-consumption
**Date**: 2026-01-13

## Overview

This document defines the data structures for the handoff consumption workflow. It extends the Feature 032 (Handoff Sentinel) types with consumption-specific entities.

## Inherited Entities (from Feature 032)

These types are imported from `scripts/handoff/types.ts`:

- `HandoffDocument` - Parsed handoff with frontmatter and content
- `HandoffFrontmatter` - YAML frontmatter fields
- `HandoffStatus` - Status enum (new, acknowledged, in_progress, done, blocked)
- `RequirementType` - Requirement categories (api, route, ui, deploy, test, docs)
- `Requirement` - Type + description pair
- `DetectionResult` - Discovery output with pending/errors

## New Entities

### WorkItemCategory

Implementation domain categories for prioritization.

```typescript
type WorkItemCategory =
  | 'api_client'     // Routes, headers, params, error handling
  | 'schema'         // Zod schemas, TypeScript types, validation
  | 'ui'             // Components, data display, user interactions
  | 'logging'        // Telemetry, error messages, debug info
  | 'testing'        // Unit tests, integration tests, e2e tests
  | 'deployment'     // Config, environment, deployment notes
```

**Priority Order**: api_client (P1) → schema (P2) → ui (P3) → logging (P4) → testing (P5) → deployment (P6)

### ExtractedRequirement

A single actionable requirement extracted from a handoff.

```typescript
interface ExtractedRequirement {
  id: string;                    // Auto-generated: "REQ-001", "REQ-002"
  category: WorkItemCategory;    // Implementation domain
  description: string;           // What needs to be done
  source: RequirementSource;     // Where it came from
  priority: number;              // 1-6 based on category
  completed: boolean;            // Checklist status
  tests: string[];               // Required test descriptions
  files: string[];               // Likely impacted files
}

interface RequirementSource {
  type: 'frontmatter' | 'content';
  field?: string;                // e.g., "requires[0]", "acceptance[2]"
  line?: number;                 // For content-sourced items
}
```

### ConsumptionPlanFrontmatter

YAML frontmatter for consumption plan files.

```typescript
interface ConsumptionPlanFrontmatter {
  handoff_id: string;            // Source handoff ID
  source_handoff: string;        // Path to source handoff file
  status: ConsumptionStatus;     // Plan status
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
  requirements_total: number;    // Total requirement count
  requirements_done: number;     // Completed requirement count
}

type ConsumptionStatus =
  | 'pending'      // Not started
  | 'in_progress'  // Implementation underway
  | 'testing'      // Implementing tests
  | 'review'       // Awaiting review
  | 'done'         // Complete
  | 'blocked';     // Cannot proceed
```

### ConsumptionPlan

Complete consumption plan document.

```typescript
interface ConsumptionPlan {
  frontmatter: ConsumptionPlanFrontmatter;
  summary: string;               // Overview from handoff
  requirements: ExtractedRequirement[];
  risks: RiskItem[];
  testPlan: TestPlanItem[];
  impactedFiles: FileImpact[];
}

interface RiskItem {
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

interface TestPlanItem {
  category: 'unit' | 'integration' | 'e2e';
  description: string;
  file: string;                  // Test file path
  status: 'pending' | 'written' | 'passing' | 'failing';
}

interface FileImpact {
  path: string;
  changeType: 'create' | 'modify' | 'delete';
  reason: string;
}
```

### ConsumptionReportFrontmatter

YAML frontmatter for consumption report files.

```typescript
interface ConsumptionReportFrontmatter {
  handoff_id: string;            // Source handoff ID
  consumption_plan: string;      // Path to consumption plan
  status: 'done' | 'blocked';    // Final status
  completed_at: string;          // ISO 8601 timestamp
  related_commits: string[];     // Git commit hashes
  related_prs: string[];         // PR URLs
  blocker_handoff?: string;      // If blocked, outgoing handoff ID
}
```

### ConsumptionReport

Complete consumption report document.

```typescript
interface ConsumptionReport {
  frontmatter: ConsumptionReportFrontmatter;
  requestSummary: string;        // What was requested
  changesSummary: ChangeSummary; // What was changed
  verification: VerificationResult[];
  followUps: string[];           // Any remaining items
}

interface ChangeSummary {
  filesModified: FileChange[];
  testsAdded: number;
  testsModified: number;
  linesAdded: number;
  linesRemoved: number;
}

interface FileChange {
  path: string;
  changeType: 'create' | 'modify' | 'delete';
  summary: string;
}

interface VerificationResult {
  command: string;               // Verification command
  expected: string;              // Expected outcome
  actual?: string;               // Actual outcome (if run)
  passed: boolean;
}
```

## Entity Relationships

```
HandoffDocument (Feature 032)
    │
    ├──[parse]──> ConsumptionPlan
    │                 │
    │                 ├── ExtractedRequirement[]
    │                 ├── RiskItem[]
    │                 ├── TestPlanItem[]
    │                 └── FileImpact[]
    │
    └──[close]──> ConsumptionReport
                      │
                      ├── ChangeSummary
                      ├── VerificationResult[]
                      └──[if blocked]──> Outgoing HandoffDocument
```

## State Transitions

### Consumption Plan Status

```
pending ──> in_progress ──> testing ──> review ──> done
    │           │              │          │
    └───────────┴──────────────┴──────────┴──> blocked
```

### Handoff Status (via Feature 032)

```
new ──> acknowledged ──> in_progress ──> done
                             │
                             └──> blocked
```

## Validation Rules

1. **ConsumptionPlan**:
   - `handoff_id` must match existing handoff
   - `source_handoff` path must exist
   - `requirements_done` <= `requirements_total`

2. **ExtractedRequirement**:
   - `priority` must be 1-6
   - `category` must match priority order
   - `id` must be unique within plan

3. **ConsumptionReport**:
   - Cannot have status `done` if `related_commits` empty
   - If status `blocked`, `blocker_handoff` must be set
   - `verification` array must have all passing for `done` status

4. **FileImpact**:
   - `path` must be relative to repo root
   - `changeType: 'create'` only for non-existing files
   - `changeType: 'delete'` only for existing files
