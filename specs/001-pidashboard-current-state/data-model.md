# Data Model: PiDashboard Current State Report

## Entities

### CurrentStateReport
- **description**: Consolidated snapshot of UI scope, backend dependencies, and CI status.
- **fields**:
  - scope: summary of UI areas covered
  - dependencies: list of endpoint dependencies grouped by owner
  - ci_status: test/lint/build outcomes with commands
  - blockers: explicit blocker statement

### EndpointDependency
- **description**: Backend endpoint required by the UI.
- **fields**:
  - owner_service: PiOrchestrator | BridgeServer
  - method: HTTP method
  - path: endpoint path
  - purpose: UI feature dependency
  - status: required | optional | fallback

### QualityCheckResult
- **description**: Outcome of an automated check.
- **fields**:
  - command: command used
  - status: pass | fail | not_run
  - notes: failure reason or warnings

### Blocker
- **description**: Missing contract or infrastructure dependency blocking UI readiness.
- **fields**:
  - summary: single-sentence statement
  - impacted_features: list of affected UI areas

## Relationships
- CurrentStateReport includes many EndpointDependency entries.
- CurrentStateReport includes many QualityCheckResult entries.
- CurrentStateReport includes zero or more Blocker entries.
