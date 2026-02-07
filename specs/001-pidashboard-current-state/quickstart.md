# Quickstart: PiDashboard Current State Report

## Purpose
Generate a documentation-only report describing UI scope, backend dependencies, and CI status for evidence capture, camera status, and container workflows.

## Inputs
- `specs/001-pidashboard-current-state/spec.md`
- Repo state (UI components, API clients, workflows)
- CI workflows in `.github/workflows/`

## Outputs
- `specs/001-pidashboard-current-state/research.md`
- `specs/001-pidashboard-current-state/tasks.md`
- `docs/INTEGRATION_REQUIREMENTS.md`

## Steps
1. Review UI components in `src/presentation/components/{diagnostics,cameras,containers}`.
2. Enumerate backend dependencies from `src/infrastructure/api/*` and schema files.
3. Summarize CI workflows from `.github/workflows/` and capture local test/lint/build results.
4. Produce the blocker statement and integration requirements.
