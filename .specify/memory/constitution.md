<!--
  Sync Impact Report
  ==================
  Version change: 0.0.0 → 1.0.0 (MAJOR: Initial ratification)

  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (4): Hexagonal Architecture, Contract-First API, Test Discipline, Simplicity
    - Design Pattern Standards
    - Quality Gates
    - Governance
  Removed sections: N/A

  Templates requiring updates:
    ✅ .specify/templates/plan-template.md - Constitution Check section compatible
    ✅ .specify/templates/spec-template.md - Requirements format aligned
    ✅ .specify/templates/tasks-template.md - Test-first pattern enforced

  Follow-up TODOs: None
-->

# PiDashboard Constitution

## Core Principles

### I. Hexagonal Architecture (NON-NEGOTIABLE)

All code MUST follow hexagonal (ports and adapters) architecture with strict layer boundaries:

```
domain/        → Pure business types and entities. NO external dependencies.
application/   → Business logic, React hooks, Zustand stores. Depends ONLY on domain/.
infrastructure/→ External adapters (API clients, Bluetooth, storage). Implements domain contracts.
presentation/  → React components. Depends on application/ hooks, NEVER on infrastructure/.
```

**Rules:**
- Domain types MUST NOT import from any other layer
- Application hooks MUST NOT directly call fetch/axios/external APIs
- Infrastructure adapters MUST implement interfaces defined in domain/
- Presentation components MUST consume data via application hooks only
- Circular dependencies between layers are FORBIDDEN

**Rationale:** Enforces testability, allows infrastructure swapping (mock vs real API), and prevents
coupling that makes refactoring impossible.

### II. Contract-First API (NON-NEGOTIABLE)

All API interactions MUST be validated against Zod schemas before consumption:

**Rules:**
- Every API endpoint MUST have a corresponding Zod schema in `src/infrastructure/api/schemas.ts`
- API responses MUST be parsed through schemas—raw JSON MUST NOT flow into components
- Schema changes REQUIRE updating all consuming hooks and tests
- MSW handlers MUST return data that passes schema validation
- API errors MUST be typed and handled via centralized error types in `src/infrastructure/api/errors.ts`

**Rationale:** Runtime validation catches backend contract breaks before they crash the UI.
Type safety flows from validated data, not from trusting external systems.

### III. Test Discipline (STRICTLY ENFORCED)

Testing is mandatory for all features with minimum coverage gates:

**Coverage Thresholds (CI enforced):**
- Unit tests: 70% minimum for `src/infrastructure/api/` and `src/lib/`
- Component tests: All components in `src/presentation/components/` MUST have test files
- Integration tests: All hooks in `src/application/hooks/` MUST have MSW-backed tests
- E2E tests: Critical user flows MUST have Playwright coverage

**Rules:**
- New API clients MUST include contract tests validating Zod schemas
- New components MUST include render tests with `data-testid` attributes
- Accessibility tests (axe-core) MUST pass for all new UI components
- Tests MUST NOT use `any` type—test data must be typed
- MSW handlers in `tests/mocks/` MUST match real API contracts

**Rationale:** Tests are documentation that runs. They catch regressions, validate contracts, and
enable safe refactoring. Untested code is legacy code.

### IV. Simplicity & YAGNI (MANDATORY)

Code MUST be minimal and focused on current requirements:

**Rules:**
- MUST NOT add features beyond what was explicitly requested
- MUST NOT add "future-proofing" abstractions for hypothetical requirements
- MUST NOT create utility functions for one-time operations
- MUST NOT add comments explaining obvious code—code should be self-documenting
- MUST NOT add error handling for impossible scenarios
- MUST prefer 3 similar lines over 1 premature abstraction
- MUST delete unused code completely—no `_unusedVar` patterns or `// removed` comments

**Rationale:** Complexity is debt. Every abstraction has a cost. Simple code is maintainable code.
The right time to add complexity is when you need it, not before.

## Design Pattern Standards

### State Management Patterns

| Concern | Pattern | Location |
|---------|---------|----------|
| Server state (API data) | TanStack React Query | `src/application/hooks/use*.ts` |
| Client state (UI state) | Zustand stores | `src/application/stores/*.ts` |
| Form state | React Hook Form or controlled components | Component-local |
| URL state | React Router params | Route components |

**Rules:**
- Server state MUST use React Query with proper cache keys and stale times
- Zustand stores MUST NOT duplicate React Query cache data
- Global UI state (theme, sidebar) goes in Zustand; local UI state stays in components

### Component Patterns

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| Composition | Multiple variants needed | Props + children, not inheritance |
| Render Props | Complex state logic sharing | Function children pattern |
| Custom Hooks | Reusable stateful logic | Extract to `application/hooks/` |
| Compound Components | Related component groups | Context + named exports |

**Rules:**
- Components MUST be functions (no class components)
- Props MUST be typed with explicit interfaces (no inline types for public components)
- Components MUST NOT exceed 200 lines—extract logic to hooks if growing
- Components MUST have a single responsibility

### Error Handling Patterns

```typescript
// Infrastructure layer: Typed errors
export class ApiError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}

// Application layer: React Query error handling
const { error } = useQuery({
  queryKey: ['resource'],
  queryFn: fetchResource,
  retry: (failureCount, error) => error.status !== 401 && failureCount < 3,
});

// Presentation layer: Error boundaries + fallback UI
<ErrorBoundary fallback={<ErrorDisplay />}>
  <Component />
</ErrorBoundary>
```

**Rules:**
- API errors MUST be thrown as typed `ApiError` instances
- React Query MUST handle retries for transient failures
- Components MUST have error states—no silent failures
- User-facing errors MUST be actionable (not raw HTTP codes)

## Quality Gates

### Pre-Commit Gates (lint-staged)

- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] ESLint passes with no errors
- [ ] Prettier formatting applied
- [ ] No `console.log` statements (except in tests)
- [ ] No `any` types (except justified with `// eslint-disable-next-line`)

### PR Gates (CI)

- [ ] All unit tests pass
- [ ] All component tests pass
- [ ] All integration tests pass
- [ ] Coverage thresholds met (70%+)
- [ ] E2E smoke tests pass (chromium)
- [ ] Bundle size check passes (no unexpected increases)
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Merge Gates

- [ ] All CI checks green
- [ ] At least one approval (if team > 1)
- [ ] No unresolved review comments
- [ ] Branch up to date with main

## Governance

### Amendment Procedure

1. Propose change in a PR modifying this file
2. Document rationale and impact in PR description
3. Update version number following semantic versioning:
   - MAJOR: Principle removed or fundamentally redefined
   - MINOR: New principle or section added
   - PATCH: Clarifications and wording improvements
4. Ensure all templates remain aligned (see Sync Impact Report)
5. Merge requires explicit approval

### Compliance Review

- All PRs MUST verify code follows Constitution principles
- Complexity MUST be justified via Complexity Tracking in plan.md
- Violations MUST be documented and approved before merge
- Constitution supersedes all other documentation when conflicts arise

### Guidance Documents

- Runtime development guidance: `CLAUDE.md`
- Feature specifications: `specs/[###-feature]/spec.md`
- Implementation plans: `specs/[###-feature]/plan.md`

**Version**: 1.0.0 | **Ratified**: 2025-01-20 | **Last Amended**: 2025-01-20
