# Feature Specification: Wire vNEXT Integration & Test Hardening

**Feature Branch**: `063-wire-vnext-integration`
**Created**: 2026-03-06
**Status**: Draft
**Input**: Adopt @delicasa/wire v0.4.0 device service descriptors; keep Connect transport fix; centralize protobuf-safe fixtures; harden integration tests

## User Scenarios & Testing *(mandatory)*

### User Story 1 - RPC Client Uses Canonical Wire Package Descriptors (Priority: P1)

The PiDashboard's Connect RPC clients (cameras, sessions, evidence) import service descriptors from `@delicasa/wire` v0.4.0. The import paths in `clients.ts` and the three adapter files trigger TypeScript module resolution errors because the package uses ES module subpath exports. This story ensures all RPC imports resolve cleanly against the wire package's published type declarations, and the existing transport-level AbortSignal compatibility shim remains intact.

**Why this priority**: Without valid module resolution, the project cannot type-check or build. This is the foundation for all other RPC functionality.

**Independent Test**: Run the project's type-check and build commands — both must complete with zero errors related to wire package imports.

**Acceptance Scenarios**:

1. **Given** the PiDashboard project with the wire package installed, **When** a developer runs the type checker, **Then** no errors are reported for imports from the wire package's generated code paths.
2. **Given** the transport module, **When** the Connect transport creates a request, **Then** the AbortSignal is stripped from the fetch init to maintain test environment compatibility.
3. **Given** the four service clients (camera, capture, session, evidence), **When** each client is instantiated, **Then** it binds to the correct device service descriptor from the wire package.

---

### User Story 2 - Centralized Protobuf-Safe Test Fixtures (Priority: P2)

Test mock handlers currently hand-craft proto-JSON payloads inline, which is brittle and diverges from the wire package's canonical format. The wire package ships factory functions and vector fixtures that produce valid proto-JSON. This story replaces hand-crafted handler payloads with the wire package's own fixture builders, ensuring mock responses always match the protobuf schema.

**Why this priority**: Brittle fixtures cause false test failures and mask real regressions. Centralizing on the wire package's own factories is the primary quality improvement.

**Independent Test**: Run all integration tests — handlers produce valid proto-JSON payloads that pass through the Connect deserializer without errors.

**Acceptance Scenarios**:

1. **Given** the RPC mock handlers, **When** a test registers camera/session/evidence handlers, **Then** the response payloads are generated using the wire package's factory functions (e.g., camera factory, session factory, evidence factory).
2. **Given** a factory-generated payload, **When** the Connect transport deserializes it, **Then** the result matches the domain type after adapter conversion with no field mismatches.
3. **Given** a developer needs a custom fixture variation, **When** they call a factory with override parameters, **Then** the resulting payload merges defaults with overrides correctly.

---

### User Story 3 - Transport Wrapper Unit Test (Priority: P2)

The AbortSignal stripping and late-bound fetch in the transport module are critical for test compatibility but have no dedicated unit test. A regression here silently breaks all RPC integration tests. This story adds a focused unit test verifying both behaviors.

**Why this priority**: The transport shim is a single point of failure for all RPC test infrastructure. A dedicated test prevents silent regressions.

**Independent Test**: Run the transport unit test in isolation — it verifies signal stripping and fetch interception without requiring a full integration test stack.

**Acceptance Scenarios**:

1. **Given** a fetch request with an AbortSignal attached, **When** the transport's custom fetch wrapper processes it, **Then** the signal is removed from the outgoing request init.
2. **Given** a fetch request without an AbortSignal, **When** the transport's custom fetch wrapper processes it, **Then** the request is passed through unmodified.
3. **Given** a mock service worker is registered as a fetch interceptor, **When** the transport sends a request, **Then** the interceptor receives it (verifying late-binding works).

---

### User Story 4 - All Integration Tests Pass (Priority: P1)

The existing camera, session, and evidence integration tests must continue passing after the fixture migration and any cleanup of experimental patches. No test regressions are acceptable.

**Why this priority**: Test stability is a hard gate for merge readiness. Equal priority with P1 since it validates the entire change set.

**Independent Test**: Run the full test suite — all existing integration tests pass with no new failures or warnings.

**Acceptance Scenarios**:

1. **Given** the migrated RPC handlers using wire factory fixtures, **When** camera integration tests run, **Then** all camera list, detail, and error scenarios pass.
2. **Given** the migrated RPC handlers, **When** session integration tests run, **Then** all session list, detail, stale detection, and error scenarios pass.
3. **Given** the migrated RPC handlers, **When** evidence integration tests run, **Then** all evidence pair, session evidence, and empty/error scenarios pass.
4. **Given** the full test suite, **When** it runs, **Then** zero test regressions compared to the main branch baseline.

---

### User Story 5 - Cleanup of Experimental Patches (Priority: P3)

If any experimental global fetch hacks or AbortSignal monkey-patches exist in test setup files, they should be removed in favor of the transport-level fix. The audit should confirm that no such patches exist (current evidence suggests they don't) and document that the transport-level approach is the canonical solution.

**Why this priority**: This is a hygiene task. Current evidence shows no test-setup patches exist, so this is primarily a verification step.

**Independent Test**: Audit test setup files for signal or fetch patches — none should be present. The transport-level fix is the only compatibility shim.

**Acceptance Scenarios**:

1. **Given** the test setup files, **When** audited for global fetch or AbortSignal patches, **Then** none are found.
2. **Given** the transport module's fetch wrapper, **When** reviewed, **Then** it contains a clear comment documenting why the signal stripping exists and that it is the canonical approach.

---

### Edge Cases

- What happens when the wire package's factory produces a field the adapter doesn't expect (forward compatibility)? Adapters should ignore unknown fields gracefully.
- How does the system handle enum values added in future wire versions that the adapter doesn't map? Unmapped enums should fall through to a safe default (e.g., "unknown").
- What if proto-JSON field casing changes between wire versions (snake_case vs camelCase)? The Connect transport handles casing normalization — adapters consume camelCase output.
- What happens if a factory function produces a BigInt field but the adapter expects a number? The adapter must handle the `bigint`-to-`number` conversion explicitly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST resolve all wire package generated code imports without type-check errors, using appropriate module resolution settings.
- **FR-002**: System MUST maintain the AbortSignal stripping behavior in the Connect transport's custom fetch wrapper for test environment compatibility.
- **FR-003**: System MUST use the wire package's factory functions to generate mock RPC response payloads in test handlers instead of hand-crafted JSON objects.
- **FR-004**: System MUST pass all existing integration tests (cameras, sessions, evidence) without regressions after the fixture migration.
- **FR-005**: System MUST include a dedicated unit test for the transport module's fetch wrapper verifying AbortSignal stripping and late-bound fetch behavior.
- **FR-006**: System MUST NOT contain any global fetch or AbortSignal patches in test setup files — the transport-level fix is the sole compatibility mechanism.
- **FR-007**: System MUST produce a handoff document summarizing the integration approach and decisions made.
- **FR-008**: System MUST pass the linter with zero errors after all changes.

### Key Entities

- **Wire Package**: Provides protobuf-generated service descriptors, type declarations, factory functions for testing, and vector fixtures for all device services (camera, capture, session, evidence).
- **Connect Transport**: The HTTP transport configured with JSON format, AbortSignal stripping, and correlation ID interceptor.
- **RPC Mock Handlers**: Request handlers that intercept Connect RPC POST requests and return proto-JSON responses for testing.
- **Adapter Layer**: Functions that convert proto-JSON (camelCase, enum numbers/strings, Timestamp objects) to PiDashboard domain types.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The project builds successfully with zero errors related to wire package imports.
- **SC-002**: All existing integration tests pass with zero regressions — same pass count or higher than the main branch baseline.
- **SC-003**: A dedicated transport unit test exists and passes, covering signal stripping and fetch interception.
- **SC-004**: All RPC mock handlers use wire factory functions — no hand-crafted proto-JSON objects remain in the RPC handler file.
- **SC-005**: The linter passes with zero errors.
- **SC-006**: A handoff document is produced and committed.

## Assumptions

- The wire package v0.4.0 is already installed and its factory functions are stable and tested upstream.
- The wire package's testing subpath export is available and works with the project's bundler module resolution.
- The current TypeScript diagnostic errors (cannot find module for wire imports) are caused by module resolution configuration, not missing files — the generated JavaScript files exist in the package.
- No global fetch or AbortSignal patches exist in test setup files (confirmed by audit).
- The PiOrchestrator Connect RPC endpoints may not yet be deployed (404 expected in production), but the client-side code and tests must be correct against the wire package contract.
- The existing REST API endpoints and their tests remain untouched — this feature only affects the RPC layer.
