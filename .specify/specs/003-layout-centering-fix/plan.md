# Implementation Plan: Layout Centering Fix

> **Feature**: 003-layout-centering-fix
> **Created**: 2026-01-07
> **Status**: Ready for Implementation

---

## Technical Context

| Aspect | Value |
|--------|-------|
| Project Type | Bugfix (CSS-only) |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4.1.18 |
| Scope | 3 lines in 1 file |
| Risk Level | Low |
| Estimated Effort | 15 minutes |

---

## Constitution Check

### Principle 1: Code Quality

- **Status**: ✅ COMPLIANT
- **Notes**: TypeScript/lint unaffected; CSS class string changes only

### Principle 2: Testing Discipline

- **Status**: ✅ COMPLIANT
- **Notes**: Manual verification covers visual changes; no logic changes requiring unit tests

### Principle 3: Security

- **Status**: ✅ COMPLIANT
- **Notes**: No security implications for CSS layout changes

### Principle 4: User Experience

- **Status**: ✅ COMPLIANT (Improvement)
- **Notes**: Fixes centering bug affecting all viewports >640px; improves UX

### Principle 5: Observability

- **Status**: ✅ COMPLIANT
- **Notes**: No observability changes required

### Principle 6: Maintainability

- **Status**: ✅ COMPLIANT
- **Notes**: Follows Tailwind v4 conventions; explicit `mx-auto` is searchable and standard

### Principle 7: Documentation

- **Status**: ✅ COMPLIANT
- **Notes**: CHANGELOG must be updated after implementation

---

## Gate Evaluation

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript strict mode | ✅ | No type changes |
| ESLint zero errors | ✅ | CSS strings don't affect lint |
| Test coverage >70% | ✅ | N/A (no logic changes) |
| CHANGELOG updated | 🔲 | Required after implementation |
| Security audit | ✅ | No new dependencies |

**Overall**: ✅ PASS - Feature can proceed to implementation

---

## Implementation Phases

### Phase 0: Reproduce & Baseline

**Goal**: Document current state before changes
**Effort**: 5 minutes

**Tasks**:

| # | Task | Command/Action |
|---|------|----------------|
| 0.1 | Start dev server | `npm run dev` |
| 0.2 | Open browser | Navigate to `http://localhost:5173` |
| 0.3 | Resize to 1440px | Use DevTools responsive mode |
| 0.4 | Capture baseline | Screenshot showing left-alignment |
| 0.5 | Measure offset | DevTools ruler: measure left margin vs right margin |

**Exit Criteria**:
- [ ] Screenshot saved showing issue
- [ ] Left/right margin measurements documented

---

### Phase 1: Apply Centering Fix

**Goal**: Add `mx-auto` to all container instances
**Effort**: 5 minutes

**Tasks**:

| # | Task | File:Line | Change |
|---|------|-----------|--------|
| 1.1 | Fix header | `src/App.tsx:33` | Add `mx-auto` |
| 1.2 | Fix main | `src/App.tsx:53` | Add `mx-auto` |
| 1.3 | Fix footer | `src/App.tsx:150` | Add `mx-auto` |

**Exact Changes**:

```diff
# Line 33 (Header)
- <div className="container flex h-16 items-center justify-between px-4">
+ <div className="container mx-auto flex h-16 items-center justify-between px-4">

# Line 53 (Main)
- <main className="container px-4 py-6">
+ <main className="container mx-auto px-4 py-6">

# Line 150 (Footer)
- <div className="container flex items-center justify-between px-4 text-sm text-muted-foreground">
+ <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
```

**Exit Criteria**:
- [ ] All 3 lines modified
- [ ] Dev server shows no errors
- [ ] Hot reload reflects changes

---

### Phase 2: Visual Verification

**Goal**: Confirm centering across breakpoints
**Effort**: 10 minutes

**Tasks**:

| # | Task | Viewport | Pass Criteria |
|---|------|----------|---------------|
| 2.1 | Mobile | 375px | Content full-width with 16px padding |
| 2.2 | Tablet | 768px | Centered with equal margins |
| 2.3 | Desktop | 1280px | Centered with equal margins |
| 2.4 | Wide | 1440px | Centered, max-width visible |
| 2.5 | Ultra-wide | 1920px | Centered, ~288px margins each side |
| 2.6 | Header check | All | Logo left, toggle right, centered |
| 2.7 | Footer check | All | Text centered within container |
| 2.8 | Dark mode | All | Layout identical in dark theme |
| 2.9 | Tab panels | All | Each tab content renders correctly |

**Exit Criteria**:
- [ ] All breakpoints pass visual check
- [ ] No horizontal scrollbar at any width
- [ ] Header/footer aligned with main content

---

### Phase 3: Accessibility & Quality Check

**Goal**: Ensure no regressions
**Effort**: 5 minutes

**Tasks**:

| # | Task | Method | Pass Criteria |
|---|------|--------|---------------|
| 3.1 | Tab navigation | Press Tab repeatedly | Same order as before |
| 3.2 | Focus rings | Tab through interactive elements | Visible focus on all |
| 3.3 | TypeScript | `npx tsc --noEmit` | Exit code 0 |
| 3.4 | Lint | `npm run lint` | No new errors |
| 3.5 | Build | `npm run build` | Succeeds |
| 3.6 | Console | DevTools console | No errors |

**Exit Criteria**:
- [ ] Keyboard navigation unchanged
- [ ] Focus states visible
- [ ] TypeScript compiles
- [ ] Lint passes
- [ ] Build succeeds
- [ ] No console errors

---

### Phase 4: Documentation

**Goal**: Update changelog and close out
**Effort**: 5 minutes

**Tasks**:

| # | Task | File | Action |
|---|------|------|--------|
| 4.1 | Update CHANGELOG | `CHANGELOG.md` | Add entry under [Unreleased] |
| 4.2 | Update spec status | `spec.md` | Change to "Implemented" |
| 4.3 | Update plan status | `plan.md` | Mark phases complete |

**CHANGELOG Entry**:

```markdown
### Fixed
- Fixed container centering issue caused by Tailwind CSS v4 migration (containers now use explicit `mx-auto`)
```

**Exit Criteria**:
- [ ] CHANGELOG updated
- [ ] Spec marked implemented
- [ ] Ready for commit

---

## Task Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| Phase 0: Baseline | 5 | 5 min |
| Phase 1: Fix | 3 | 5 min |
| Phase 2: Verification | 9 | 10 min |
| Phase 3: Quality | 6 | 5 min |
| Phase 4: Documentation | 3 | 5 min |
| **Total** | **26** | **30 min** |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Visual regression | Low | Medium | Breakpoint testing in Phase 2 |
| Build failure | Very Low | Low | TypeScript/lint checks in Phase 3 |
| Accessibility regression | Very Low | High | Tab navigation test in Phase 3 |
| Rollback needed | Very Low | Low | Single file `git checkout` |

---

## Rollback Strategy

If issues are discovered post-implementation:

```bash
# Single file rollback
git checkout src/App.tsx

# Verify rollback
npm run dev  # Check layout reverts
```

Time to rollback: <1 minute

---

## Post-Implementation

### Required Updates

1. **CHANGELOG.md**: Add Fixed entry
2. **spec.md**: Update status to "Implemented"
3. **plan.md**: Mark all phases complete

### Verification Sign-off

- [ ] All Phase 2 visual checks pass
- [ ] All Phase 3 quality checks pass
- [ ] CHANGELOG updated
- [ ] Ready for commit/PR

---

## Appendix: Command Reference

```bash
# Development
npm run dev         # Start dev server (port 5173)

# Quality checks
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript check
npm run build       # Production build

# Git
git diff src/App.tsx           # Review changes
git checkout src/App.tsx       # Rollback if needed
git add src/App.tsx CHANGELOG.md
git commit -m "fix: Center containers using mx-auto (Tailwind v4 migration)"
```
