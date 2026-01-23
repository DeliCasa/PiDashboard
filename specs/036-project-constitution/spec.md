# Feature Specification: Project Constitution

**Feature Branch**: `036-project-constitution`
**Created**: 2026-01-22
**Status**: Draft
**Input**: User description: "Establish PiDashboard project constitution with API type contracts, Zod schema rules, testing requirements, and development workflow standards."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Adds New API Integration (Priority: P1)

A developer needs to integrate a new PiOrchestrator API endpoint into the dashboard. They follow the documented workflow to ensure type safety and contract compliance.

**Why this priority**: This is the most common development task and the primary reason for establishing standards. Consistent API integration prevents runtime errors and maintains type safety across the codebase.

**Independent Test**: Can be validated by a developer successfully adding a new API endpoint following only the documented checklist, with all contract tests passing.

**Acceptance Scenarios**:

1. **Given** a developer needs to integrate `/api/v1/new-endpoint`, **When** they follow the API integration checklist, **Then** they create Zod schemas, TypeScript types, API client methods, contract tests, and React hooks in the correct order and locations.

2. **Given** a developer creates a Zod schema for a new entity, **When** the schema field names don't match Go JSON tags exactly (snake_case), **Then** contract tests fail with clear error messages indicating the mismatch.

3. **Given** a developer adds a new API client method, **When** they call it without runtime validation, **Then** linting or review processes identify the missing `safeParseWithErrors` call.

---

### User Story 2 - Developer Responds to PiOrchestrator Breaking Change (Priority: P2)

A developer receives a handoff document indicating PiOrchestrator has modified an entity structure. They need to update PiDashboard schemas and components to maintain compatibility.

**Why this priority**: Breaking changes from the backend are inevitable. Having a documented response process prevents extended downtime and reduces debugging time.

**Independent Test**: Can be validated by a developer successfully updating schemas and components in response to a simulated breaking change, with all tests passing afterward.

**Acceptance Scenarios**:

1. **Given** PiOrchestrator adds a new field to `CameraDevice`, **When** the developer updates the Zod schema and TypeScript types, **Then** contract tests pass and the new field is accessible in components.

2. **Given** PiOrchestrator removes a field from an entity, **When** the developer removes it from Zod schema and TypeScript types, **Then** TypeScript compilation fails in any component still referencing the removed field.

3. **Given** PiOrchestrator changes a field type (e.g., string to enum), **When** the developer updates the Zod schema, **Then** existing mock data that doesn't match the new type causes test failures.

---

### User Story 3 - Developer Runs Tests Before Commit (Priority: P2)

A developer completes a code change and needs to verify all quality gates pass before committing.

**Why this priority**: Pre-commit validation prevents broken code from reaching the repository and maintains CI/CD pipeline reliability.

**Independent Test**: Can be validated by running the documented test commands and confirming they catch intentional errors.

**Acceptance Scenarios**:

1. **Given** a developer has made changes, **When** they run `npm test`, **Then** unit, component, and integration tests execute and report pass/fail status.

2. **Given** a developer introduces a TypeScript error, **When** they run `npm run typecheck`, **Then** the command fails with a clear error message pointing to the issue.

3. **Given** a developer creates mock data that doesn't match Zod schemas, **When** contract tests run, **Then** they fail with validation errors indicating the schema mismatch.

---

### User Story 4 - New Team Member Onboards to Project (Priority: P3)

A new developer joins the team and needs to understand project architecture, conventions, and development workflow.

**Why this priority**: Onboarding efficiency directly impacts team velocity. Clear documentation reduces ramp-up time and prevents knowledge silos.

**Independent Test**: Can be validated by a new developer setting up the development environment and making a first contribution following only the documented processes.

**Acceptance Scenarios**:

1. **Given** a new developer clones the repository, **When** they read the constitution document, **Then** they understand the hexagonal architecture, import order rules, and where to place new code.

2. **Given** a new developer needs to add a feature, **When** they follow the documented workflow, **Then** they can complete the task without requiring extensive mentorship.

3. **Given** a developer is unfamiliar with Zod, **When** they read the schema rules section, **Then** they understand how to create schemas that match Go JSON tags.

---

### Edge Cases

- What happens when PiOrchestrator introduces a field type not supported by Zod?
- How does the system handle contract violations in production (graceful degradation documented)?
- What happens when a developer adds an enum value to CameraStatus before PiOrchestrator supports it?
- How are optional fields (`omitempty` in Go) handled when they're sometimes present and sometimes absent?

## Requirements *(mandatory)*

### Functional Requirements

#### API Type Contract Requirements

- **FR-001**: All API response data MUST be validated at runtime using Zod schemas before use in components.
- **FR-002**: Zod schema field names MUST exactly match Go JSON tags (snake_case format).
- **FR-003**: Schema names MUST follow the pattern `{Entity}Schema` (e.g., `CameraDeviceSchema`).
- **FR-004**: RFC3339 timestamps from Go MUST be represented as `z.string()` in Zod schemas.
- **FR-005**: Go fields with `omitempty` tag MUST use `.optional()` in corresponding Zod schema.
- **FR-006**: Contract violations MUST be logged with `[API Contract]` prefix and allow graceful degradation (no crashes).

#### Code Organization Requirements

- **FR-007**: All code MUST follow hexagonal architecture with domain, application, infrastructure, and presentation layers.
- **FR-008**: Import order MUST follow: React imports, external libraries, blank line, internal imports (`@/...`), blank line, type imports.
- **FR-009**: TypeScript types that mirror Go entities MUST be placed in `src/domain/types/entities.ts`.
- **FR-010**: Zod schemas MUST be placed in `src/infrastructure/api/schemas.ts` or feature-specific schema files (e.g., `v1-cameras-schemas.ts`).

#### Testing Requirements

- **FR-011**: Every Zod schema MUST have corresponding contract tests in `tests/integration/contracts/`.
- **FR-012**: All mock data used in tests MUST pass Zod schema validation.
- **FR-013**: Contract tests MUST validate that mock variants match their corresponding schemas.
- **FR-014**: Pre-merge quality gates MUST include: all tests pass, no TypeScript errors, no linting errors, contract tests pass.

#### CameraStatus Synchronization Requirements

- **FR-015**: CameraStatus enum values MUST NOT be added to PiDashboard before PiOrchestrator adds them.
- **FR-016**: When PiOrchestrator adds a new CameraStatus value, PiDashboard Zod schema MUST be updated to match.

### Key Entities

- **Zod Schema**: Runtime type validation definition that mirrors Go struct. Contains field definitions, validation rules, and optional markers. Must exactly match Go JSON serialization.

- **TypeScript Type**: Compile-time type definition inferred from Zod schema using `z.infer<typeof Schema>`. Used throughout application code for type safety.

- **Contract Test**: Automated test that validates mock data matches Zod schemas. Ensures test mocks stay synchronized with API contracts.

- **API Client Method**: Function that calls PiOrchestrator API and validates response using `safeParseWithErrors`. Located in infrastructure layer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can add a new API integration by following the documented checklist without additional guidance, completing the task in a single work session.

- **SC-002**: 100% of API response data is validated at runtime before use in components (measurable via code review checklist).

- **SC-003**: All mock data in the test suite passes Zod schema validation (verified by contract tests).

- **SC-004**: Breaking changes from PiOrchestrator are identified within one development cycle through failing contract tests, not production errors.

- **SC-005**: New team members can set up the development environment and understand project conventions within their first day by following documentation alone.

- **SC-006**: Zero production crashes caused by API contract violations (graceful degradation handles all mismatches).

- **SC-007**: Pre-merge quality gates catch 100% of TypeScript errors, linting violations, and schema mismatches before code reaches main branch.

## Assumptions

- PiOrchestrator Go backend is the single source of truth for all entity structures.
- Developers have access to PiOrchestrator source code or detailed API documentation to verify JSON tag names.
- The handoff system between PiOrchestrator and PiDashboard is established and functional.
- All team members have basic familiarity with TypeScript, React, and Zod.
- The existing test infrastructure (Vitest, Playwright, MSW) is properly configured.

## Dependencies

- PiOrchestrator must provide accurate and up-to-date API documentation or handoff documents.
- API-TYPE-CONTRACTS.md document must exist in `docs/contracts/` and be maintained.
- Handoff system must notify PiDashboard of breaking changes in a timely manner.

## Out of Scope

- Implementation of the actual API endpoints (handled by PiOrchestrator).
- Automated synchronization of Zod schemas from Go code (manual process).
- CI/CD pipeline configuration beyond quality gate definitions.
- Feature flag implementation details beyond the documented pattern.
