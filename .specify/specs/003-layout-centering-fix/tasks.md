# Tasks: Layout Centering Fix

> **Feature**: 003-layout-centering-fix
> **Created**: 2026-01-07
> **Status**: Ready for Implementation
> **Total Tasks**: 14
> **Estimated Effort**: 30 minutes

---

## User Story Mapping

This feature addresses a single bug fix with one user story:

| ID | User Story | Priority | Tasks |
|----|------------|----------|-------|
| US1 | Fix container centering across all breakpoints | P1 | 8 |
| - | Setup & Verification | - | 6 |

---

## Phase 1: Setup & Baseline

**Goal**: Reproduce issue and establish baseline measurements
**Exit Criteria**: Screenshot and measurements documented

- [ ] T001 Start development server with `npm run dev` in project root
- [ ] T002 Open browser at `http://localhost:5173` and resize to 1440px width
- [ ] T003 [P] Capture baseline screenshot showing left-alignment issue
- [ ] T004 [P] Measure container offset using DevTools (left margin vs right margin)

---

## Phase 2: Implementation (US1 - Fix Container Centering)

**Goal**: Add `mx-auto` to all container elements in App.tsx
**Exit Criteria**: All containers centered on viewports ≥640px

### Core Fix

- [ ] T005 [US1] Add `mx-auto` to header container in `src/App.tsx:33`
  - Change: `container flex` → `container mx-auto flex`
- [ ] T006 [US1] Add `mx-auto` to main container in `src/App.tsx:53`
  - Change: `container px-4 py-6` → `container mx-auto px-4 py-6`
- [ ] T007 [US1] Add `mx-auto` to footer container in `src/App.tsx:150`
  - Change: `container flex` → `container mx-auto flex`

### Verification

- [ ] T008 [US1] Verify centering at mobile breakpoint (375px) - content fills width with 16px padding
- [ ] T009 [US1] Verify centering at tablet breakpoint (768px) - equal margins on both sides
- [ ] T010 [US1] Verify centering at desktop breakpoint (1280px) - equal margins on both sides
- [ ] T011 [US1] Verify centering at ultra-wide breakpoint (1920px) - content centered, max-width 1344px
- [ ] T012 [US1] Verify no horizontal scrollbar appears at any width (320px-2560px)

---

## Phase 3: Quality Assurance

**Goal**: Ensure no regressions introduced
**Exit Criteria**: All quality checks pass

- [ ] T013 Run TypeScript check with `npx tsc --noEmit` - expect exit code 0
- [ ] T014 [P] Run lint check with `npm run lint` - expect no new errors
- [ ] T015 [P] Run build with `npm run build` - expect success
- [ ] T016 Verify tab navigation order unchanged (keyboard test)
- [ ] T017 Verify focus rings visible on all interactive elements
- [ ] T018 Verify no JavaScript console errors in DevTools

---

## Phase 4: Documentation & Completion

**Goal**: Update documentation and prepare for commit
**Exit Criteria**: CHANGELOG updated, ready for commit

- [ ] T019 Update `CHANGELOG.md` with Fixed entry under [Unreleased]
- [ ] T020 Update `spec.md` status from "Draft" to "Implemented"
- [ ] T021 Commit changes with message: `fix: Center containers using mx-auto (Tailwind v4 migration)`

---

## Task Summary

| Phase | Task Count | Parallelizable |
|-------|------------|----------------|
| Phase 1: Setup | 4 | 2 |
| Phase 2: Implementation | 8 | 0 |
| Phase 3: Quality | 6 | 2 |
| Phase 4: Documentation | 3 | 0 |
| **Total** | **21** | **4** |

---

## Dependencies

```
T001 → T002 → T003, T004 (baseline)
         ↓
T005, T006, T007 (can be done together - same file)
         ↓
T008, T009, T010, T011, T012 (verification - sequential)
         ↓
T013 → T014, T015 (quality - partial parallel)
    → T016, T017, T018 (accessibility - sequential)
         ↓
T019 → T020 → T021 (documentation - sequential)
```

### Critical Path

```
T001 → T002 → T005 → T006 → T007 → T008 → T013 → T019 → T021
```

Minimum sequential tasks: 9 (others can be parallelized)

---

## Parallel Execution Opportunities

### Baseline Phase
```bash
# Can run in parallel after T002:
T003: Screenshot capture
T004: Margin measurement
```

### Quality Phase
```bash
# Can run in parallel after T013:
T014: npm run lint
T015: npm run build
```

---

## Implementation Strategy

### MVP Scope (Recommended)

**MVP = US1 (All tasks)** - This is a simple bugfix that should be completed atomically.

No phased delivery recommended; complete all tasks in one session.

### Incremental Delivery

Not applicable - this is a single atomic fix with immediate verification.

---

## Rollback Strategy

If any issue discovered:

```bash
# Rollback single file
git checkout src/App.tsx

# Verify rollback
npm run dev
# Confirm layout reverts to previous state
```

Time to rollback: < 1 minute

---

## Task Details

### T005: Fix Header Container

**File**: `src/App.tsx`
**Line**: 33

```diff
- <div className="container flex h-16 items-center justify-between px-4">
+ <div className="container mx-auto flex h-16 items-center justify-between px-4">
```

### T006: Fix Main Container

**File**: `src/App.tsx`
**Line**: 53

```diff
- <main className="container px-4 py-6">
+ <main className="container mx-auto px-4 py-6">
```

### T007: Fix Footer Container

**File**: `src/App.tsx`
**Line**: 150

```diff
- <div className="container flex items-center justify-between px-4 text-sm text-muted-foreground">
+ <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
```

### T019: CHANGELOG Entry

**File**: `CHANGELOG.md`

```markdown
## [Unreleased]

### Fixed
- Fixed container centering issue caused by Tailwind CSS v4 migration (containers now use explicit `mx-auto`)
```

### T021: Commit Message

```bash
git add src/App.tsx CHANGELOG.md
git commit -m "fix: Center containers using mx-auto (Tailwind v4 migration)

- Added mx-auto to header container (line 33)
- Added mx-auto to main container (line 53)
- Added mx-auto to footer container (line 150)

Fixes centering issue caused by Tailwind CSS v4 container behavior change.
See .specify/specs/003-layout-centering-fix/spec.md for details.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Acceptance Criteria

### US1: Container Centering Fixed

| Criteria | Verification | Status |
|----------|--------------|--------|
| Header centered at 1440px | Equal left/right margins ±1px | 🔲 |
| Main content centered at 1440px | Equal left/right margins ±1px | 🔲 |
| Footer centered at 1440px | Equal left/right margins ±1px | 🔲 |
| No horizontal overflow | No scrollbar 320px-2560px | 🔲 |
| Build passes | `npm run build` exits 0 | 🔲 |
| Lint passes | `npm run lint` no errors | 🔲 |
| TypeScript passes | `npx tsc --noEmit` exits 0 | 🔲 |
| Tab order unchanged | Manual keyboard test | 🔲 |

---

## Notes

- **No tests required**: This is a CSS-only fix with manual visual verification
- **Single file change**: All modifications in `src/App.tsx`
- **Low risk**: Rollback is trivial (single file revert)
- **No new dependencies**: Using existing Tailwind utilities
