# Implementation Plan: DEV Observability Panels

**Branch**: `038-dev-observability-panels` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-dev-observability-panels/spec.md`

## Summary

Add DEV observability panels enabling operators to validate system health in <60 seconds. Implements a DEV Diagnostics page with health status for BridgeServer, PiOrchestrator, and MinIO, plus session/evidence panels with capture timestamps and secure thumbnail viewing via BridgeServer /view endpoints.

**Technical Approach**:
- New tab in App.tsx with DEV Diagnostics components
- React Query hooks for health check polling (5s interval)
- Zod schemas for health/session/evidence API contracts
- BridgeServer proxy pattern for evidence thumbnails (no storageKey exposure)

## Technical Context

**Language/Version**: TypeScript ~5.9.3 with React 19.2.0
**Primary Dependencies**: TanStack React Query 5.x, Zod 3.x, shadcn/ui (Radix UI), Tailwind CSS v4
**Storage**: N/A (API-driven, no local persistence for this feature)
**Testing**: Vitest (unit/component/integration), Playwright (E2E), MSW (API mocking)
**Target Platform**: Web browser (Chrome, Firefox), served from PiOrchestrator port 8082
**Project Type**: Web application (React SPA)
**Performance Goals**: Health status visible in <60s, health checks complete in <5s, thumbnails load in <3s
**Constraints**: No Docker Compose, BridgeServer /view endpoint required for evidence, DEV-focused (not production-ready)
**Scale/Scope**: Single operator use, <10 concurrent sessions, <100 evidence items per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hexagonal Architecture

| Requirement | Status | Notes |
|-------------|--------|-------|
| Domain types in `domain/types/` | PASS | ServiceHealth, Session, EvidenceCapture entities |
| Application hooks in `application/hooks/` | PASS | useHealthChecks, useSessions, useEvidence hooks |
| Infrastructure adapters in `infrastructure/api/` | PASS | diagnosticsApi, sessionsApi, evidenceApi clients |
| Presentation in `presentation/components/` | PASS | DiagnosticsSection, SessionsPanel, EvidencePanel |
| No circular dependencies | PASS | Standard data flow: component → hook → api → schema |

### II. Contract-First API

| Requirement | Status | Notes |
|-------------|--------|-------|
| Zod schemas for all endpoints | PASS | ServiceHealthSchema, SessionSchema, EvidenceSchema |
| Schema validation before consumption | PASS | safeParseWithErrors in API clients |
| MSW handlers match schemas | PASS | Contract tests validate mock data |
| Typed error handling | PASS | Use existing ApiError, isFeatureUnavailable patterns |

### III. Test Discipline

| Requirement | Status | Notes |
|-------------|--------|-------|
| Contract tests for schemas | PASS | tests/integration/contracts/diagnostics.contract.test.ts |
| Component tests with data-testid | PASS | DiagnosticsSection, SessionsPanel, EvidencePanel tests |
| Hook tests with MSW | PASS | useHealthChecks, useSessions, useEvidence tests |
| E2E tests for critical flows | PASS | tests/e2e/diagnostics.spec.ts |

### IV. Simplicity & YAGNI

| Requirement | Status | Notes |
|-------------|--------|-------|
| No future-proofing abstractions | PASS | Direct polling, no complex state machines |
| No premature optimization | PASS | Simple 5s/10s polling intervals |
| Focused on spec requirements | PASS | Only implements FR-001 through FR-014 |

**Constitution Gate**: PASS - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/038-dev-observability-panels/
├── plan.md              # This file
├── research.md          # Phase 0: API endpoint research
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Developer quick start
├── contracts/           # Phase 1: API contract schemas
│   ├── health-check.yaml
│   └── sessions.yaml
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── types/
│       └── diagnostics.ts           # ServiceHealth, Session, EvidenceCapture types
├── application/
│   └── hooks/
│       ├── useDiagnostics.ts        # useHealthChecks, useServiceHealth
│       ├── useSessions.ts           # useSessions, useSessionEvidence
│       └── useEvidence.ts           # useEvidenceThumbnail, useEvidencePreview
├── infrastructure/
│   └── api/
│       ├── diagnostics-schemas.ts   # Zod schemas for health/session/evidence
│       ├── diagnostics.ts           # Health check API client
│       ├── sessions.ts              # Sessions API client
│       └── evidence.ts              # Evidence API client (BridgeServer proxy)
└── presentation/
    └── components/
        └── diagnostics/
            ├── DiagnosticsSection.tsx   # Main tab component
            ├── ServiceHealthCard.tsx    # Individual service health display
            ├── SessionsPanel.tsx        # Active sessions list
            ├── SessionCard.tsx          # Individual session display with capture info
            ├── EvidencePanel.tsx        # Evidence captures with thumbnails
            ├── EvidenceThumbnail.tsx    # Secure thumbnail component
            └── EvidencePreviewModal.tsx # Full image modal view

tests/
├── unit/
│   └── api/
│       ├── diagnostics.test.ts
│       ├── sessions.test.ts
│       └── evidence.test.ts
├── component/
│   └── diagnostics/
│       ├── DiagnosticsSection.test.tsx
│       ├── ServiceHealthCard.test.tsx
│       ├── SessionsPanel.test.tsx
│       ├── SessionCard.test.tsx
│       ├── EvidencePanel.test.tsx
│       ├── EvidenceThumbnail.test.tsx
│       └── EvidencePreviewModal.test.tsx
├── integration/
│   ├── contracts/
│   │   └── diagnostics.contract.test.ts
│   └── hooks/
│       ├── useDiagnostics.test.ts
│       ├── useSessions.test.ts
│       └── useEvidence.test.ts
└── e2e/
    └── diagnostics.spec.ts

docs/
└── dev-diagnostics.md               # Operator documentation
```

**Structure Decision**: Follows existing hexagonal architecture pattern with feature-specific components in `diagnostics/` subdirectory. Matches established patterns from cameras, door, and system features.

## Complexity Tracking

> No violations requiring justification. Feature follows existing patterns.

| Area | Approach | Justification |
|------|----------|---------------|
| Health polling | React Query 5s interval | Matches existing system status pattern |
| Session data | React Query 10s interval | Matches existing camera polling pattern |
| Evidence thumbnails | BridgeServer proxy | Spec requirement: no storageKey exposure |
| Error handling | isFeatureUnavailable + graceful degradation | Matches Feature 037 patterns |
