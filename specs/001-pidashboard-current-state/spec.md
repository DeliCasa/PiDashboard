# Feature Specification: PiDashboard Current State Report

**Feature Branch**: `001-pidashboard-current-state`  
**Created**: 2026-02-04  
**Status**: Draft  
**Input**: User description: "Reconstruct PiDashboard state + integration dependencies + CI status

Agent swarm (parallel)
1) agent-ui-map
   - Identify key screens related to evidence capture / camera status / container flows.
   - Map API clients and base URLs; list required endpoints from PiOrchestrator/BridgeServer.
2) agent-tests
   - Run npm test (and lint/build) and summarize PASS/FAIL with commands.
3) agent-ci
   - Inspect CI workflows; identify why PRs are unstable (if failing) and what’s required to make green.
4) agent-integration
   - Produce a dependency checklist: what PiOrchestrator must expose, what BridgeServer must expose, what env vars are needed.

Required outputs
- specs/NNN-pidashboard-current-state/research.md
- specs/NNN-pidashboard-current-state/tasks.md
- docs/INTEGRATION_REQUIREMENTS.md (UI → backend contract expectations)

Hard rules
- Gather facts first; don’t refactor UI unless necessary to run tests/build.

Acceptance
- Clear statement: “UI is blocked by X endpoint / contract / infra” (or “UI ready”)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consolidated current-state report (Priority: P1)

As an engineering lead, I want a single, accurate report of PiDashboard UI scope, backend dependencies, and CI status so I can make integration and release decisions quickly.

**Why this priority**: This provides the minimum viable outcome: a unified view of UI areas, backend contract expectations, and quality gates needed to ship.

**Independent Test**: Can be fully tested by reviewing the delivered report for the three required outputs and verifying it contains UI scope, endpoint dependencies, CI status, and a blocker statement.

**Acceptance Scenarios**:

1. **Given** the current codebase state, **When** the report is produced, **Then** it includes UI scope, backend endpoint dependencies, CI workflows, and a clear blocker statement.
2. **Given** the report, **When** a stakeholder reviews it, **Then** they can identify which backend services must expose which endpoints to satisfy the UI.

---

### User Story 2 - Backend dependency checklist (Priority: P2)

As a backend engineer, I want a checklist of required endpoints and data expectations so I can validate and implement missing contracts without ambiguity.

**Why this priority**: Integration readiness depends on knowing which endpoints and contracts are required and which are optional or have fallbacks.

**Independent Test**: Can be fully tested by validating that the checklist names all required endpoints and identifies owning service responsibilities.

**Acceptance Scenarios**:

1. **Given** the dependency checklist, **When** I compare it to backend services, **Then** I can identify missing or mismatched endpoints.

---

### User Story 3 - CI and quality gate visibility (Priority: P3)

As a QA or release coordinator, I want a summary of automated checks and their current status so I can predict PR stability and required fixes.

**Why this priority**: CI outcomes determine merge readiness and highlight recurring instability or missing prerequisites.

**Independent Test**: Can be fully tested by verifying the report lists the key checks and their pass/fail status.

**Acceptance Scenarios**:

1. **Given** the report, **When** I review the CI section, **Then** I can see which checks are required and whether local runs passed.

---

### Edge Cases

- Backend endpoints exist but return unexpected shapes; report must call out contract mismatches.
- Optional features are missing in the backend; report must distinguish graceful degradation from blockers.
- CI checks are partially run or skipped; report must state what ran and what did not.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The report MUST describe the key UI areas related to evidence capture, camera status, and container workflows.
- **FR-002**: The report MUST enumerate required backend endpoints and identify the owning service for each.
- **FR-003**: The report MUST document the base URL assumptions and integration entry points for API access.
- **FR-004**: The report MUST summarize automated check status and list the commands used to obtain it.
- **FR-005**: The report MUST provide a dependency checklist for backend services and required configuration inputs.
- **FR-006**: The report MUST include a clear blocker statement indicating whether the UI is blocked or ready.
- **FR-007**: The deliverables MUST be created at the specified file paths.

### Key Entities *(include if feature involves data)*

- **Current State Report**: Consolidated summary of UI scope, dependencies, and quality status.
- **Endpoint Dependency**: A required backend route with owning service and expected behavior.
- **Quality Check Result**: The outcome of a required automated check (pass/fail and command).
- **Blocker**: A missing contract or infrastructure dependency that prevents UI readiness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Stakeholders can identify all required backend endpoints for the UI within 5 minutes of reading the report.
- **SC-002**: The report provides an explicit blocker statement in a single sentence.
- **SC-003**: All required deliverables are present at the specified file paths on first review.
- **SC-004**: Automated check status is clearly documented for at least test, lint, and build.
