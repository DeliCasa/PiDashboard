# Research: Layout Centering Fix

> **Feature**: 003-layout-centering-fix
> **Created**: 2026-01-07
> **Status**: Complete

---

## Research Questions

### Q1: Why does Tailwind CSS v4 container not center by default?

**Decision**: Tailwind CSS v4 removed automatic centering from `container` class as a simplification

**Rationale**:
- In v3, the `container` plugin applied `mx-auto` automatically when configured
- In v4, `container` is now a core utility that only applies `width: 100%` and responsive `max-width` breakpoints
- The Tailwind team opted for explicit centering to reduce "magic" behavior and improve predictability
- This aligns with Tailwind's philosophy of utility-first explicit styling

**Alternatives Considered**:
| Option | Pros | Cons |
|--------|------|------|
| Global CSS override | Single change | May conflict with future Tailwind updates |
| Explicit `mx-auto` | Clear, follows conventions | Multiple edits required |
| Custom plugin | Reusable | Overkill for 3-line fix |

**Source**: Tailwind CSS v4 changelog and documentation

---

### Q2: What is the best practice for centering containers in modern CSS?

**Decision**: Use `margin-inline: auto` (or `mx-auto` in Tailwind) for block-level centering

**Rationale**:
- `margin-inline: auto` is the modern logical property equivalent of `margin-left: auto; margin-right: auto`
- Works correctly with RTL (right-to-left) languages
- Supported in all modern browsers (>95% global support)
- Tailwind's `mx-auto` compiles to `margin-left: auto; margin-right: auto` for maximum compatibility

**Alternatives Considered**:
| Method | Use Case | Why Not Chosen |
|--------|----------|----------------|
| Flexbox centering (`justify-center`) | Single flex child | Requires flex container wrapper |
| Grid centering (`place-items-center`) | Grid layouts | Overkill for block centering |
| Absolute positioning | Overlays | Not suitable for flow layout |
| Text-align center | Inline content only | Doesn't work for block elements |

**Source**: MDN Web Docs, CSS-Tricks

---

### Q3: Should we extract layout components or use inline utilities?

**Decision**: Use inline utilities (`mx-auto`) for Phase 1; defer component extraction

**Rationale**:
- Current scope is minimal (3 locations in single file)
- Component extraction adds complexity without immediate benefit
- Inline utilities are searchable via grep and explicit
- Can revisit if pattern proliferates beyond App.tsx

**Alternatives Considered**:
| Approach | When to Use |
|----------|-------------|
| Inline utilities | Current scope (3 instances) |
| CSS global override | If container used in 10+ files |
| PageContainer component | If layout logic grows complex |
| Design system package | If shared across multiple apps |

**Decision Factor**: KISS (Keep It Simple, Stupid) - minimal change for minimal scope

---

### Q4: What testing is required for layout changes?

**Decision**: Manual verification across breakpoints + existing automated tests

**Rationale**:
- Layout changes are purely visual; no logic changes
- Existing TypeScript/lint checks verify code correctness
- Visual regression testing not configured in project
- Manual verification is appropriate for one-time fix

**Verification Matrix**:
| Test Type | Required | Tool |
|-----------|----------|------|
| TypeScript compilation | Yes | `npx tsc --noEmit` |
| Lint | Yes | `npm run lint` |
| Build | Yes | `npm run build` |
| Visual (breakpoints) | Yes | Manual browser resize |
| Accessibility | Yes | Manual keyboard navigation |
| Visual regression | No | Not configured |
| E2E | Optional | Playwright (if tests exist) |

---

### Q5: Are there accessibility concerns with centering changes?

**Decision**: No accessibility impact from margin changes

**Rationale**:
- `margin` is a layout property with no semantic impact
- Tab order determined by DOM order, not visual position
- Focus states unaffected by container centering
- Screen readers ignore visual positioning
- Reduced motion preferences not relevant (no animations involved)

**Verification**:
- Confirm tab order unchanged by testing keyboard navigation
- Confirm focus rings visible on all breakpoints
- Confirm no ARIA attributes affected

---

### Q6: What is the risk of this change breaking existing functionality?

**Decision**: Risk is LOW

**Risk Assessment**:
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Visual regression | Low | Medium | Manual breakpoint testing |
| Build failure | Very Low | Low | TypeScript/lint catches errors |
| Horizontal overflow | Very Low | Medium | Test ultra-wide screens |
| Performance impact | None | None | CSS only, no JS changes |
| Accessibility regression | Very Low | High | Manual keyboard test |

**Rollback Strategy**:
```bash
git checkout src/App.tsx
```
Single file rollback possible; no cascade dependencies.

---

## Technology Decisions Summary

| Decision | Choice | Confidence |
|----------|--------|------------|
| Centering method | `mx-auto` (inline utility) | High |
| Implementation scope | 3 lines in App.tsx | High |
| Component extraction | Deferred (not needed now) | High |
| Testing approach | Manual + existing automated | High |
| CSS approach | Tailwind utility (not global override) | High |

---

## Unresolved Questions

None. All technical questions resolved.

---

## References

1. **Tailwind CSS v4 Documentation**: Container utility changes
2. **MDN margin-inline**: Logical properties for centering
3. **Web.dev CLS**: Cumulative Layout Shift guidelines
4. **shadcn/ui Docs**: Component layout patterns
5. **WCAG 2.1 AA**: Accessibility requirements for focus states
