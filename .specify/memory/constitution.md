# PiDashboard Constitution

## Core Principles

### I. Hexagonal Architecture
All code follows hexagonal (ports & adapters) architecture with strict layer separation:
- `domain/` - Pure business types and entities (no external dependencies)
- `application/` - Use cases, hooks, and stores (business orchestration)
- `infrastructure/` - External adapters (API clients, storage, Bluetooth)
- `presentation/` - UI components and pages
Dependencies flow inward only. Domain MUST NOT import from infrastructure or presentation.

### II. Test-First (NON-NEGOTIABLE)
- Contract tests MUST be written before API client implementation
- Component tests MUST cover all interactive UI elements
- Integration tests MUST verify hook behavior with mocked services
- E2E tests MUST cover critical user flows
- Red-Green-Refactor cycle: tests fail first, then implement, then refactor

### III. Type Safety
- All API responses MUST be validated with Zod schemas at runtime
- TypeScript strict mode is enabled and MUST NOT be weakened
- No `any` types without explicit justification comment
- All new types MUST be defined in `domain/types/`

### IV. Backward Compatibility
- New features MUST be behind feature flags until stable
- Legacy endpoints MUST continue to work during migration
- Breaking changes require explicit migration plan and user notification
- Polling fallbacks MUST exist for real-time features (SSE, WebSocket)

### V. Observability
- All API requests MUST log correlation IDs when available
- Connection status (SSE, WebSocket) MUST be visible to users
- Errors MUST display user-friendly messages with expandable technical details
- Console debugging MUST be available in development mode

### VI. Simplicity
- YAGNI: Only implement what is explicitly required
- Prefer native browser APIs (EventSource, WebSocket) over libraries
- No premature abstractions - three similar lines is better than premature DRY
- Feature flags control rollout, not runtime branching

## Security Requirements

- API keys MUST NOT be stored in localStorage (use sessionStorage or in-memory)
- API keys MUST NOT be logged to console
- Protected endpoints MUST fail gracefully with clear auth error messages
- MAC address validation MUST occur before submission to prevent injection

## Performance Standards

- SSE connection MUST NOT increase memory usage by more than 5MB over 1 hour (measured via DevTools heap snapshot)
- UI MUST handle 50 devices without frame drops (< 16ms frame time)
- Bundle size increase for new features MUST be < 20KB gzipped
- WebSocket reconnection MUST occur within 5 seconds

## Quality Gates

Before any phase is marked complete:
1. All new code has corresponding tests
2. `npm run lint` passes with no new warnings
3. `npm run build` succeeds
4. Coverage threshold (70%) is maintained
5. No TypeScript errors

## Governance

- This constitution supersedes default practices
- Amendments require documentation in this file with rationale
- All PRs/reviews MUST verify compliance with these principles
- Complexity deviations MUST be justified in code comments

**Version**: 1.0.0 | **Ratified**: 2026-01-11 | **Last Amended**: 2026-01-11
