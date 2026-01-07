# Requirements Checklist: Layout Centering Fix

> **Feature**: 003-layout-centering-fix
> **Created**: 2026-01-07

---

## Functional Requirements

### FR-1: Container Centering

- [ ] **FR-1.1**: Header container is horizontally centered on viewports ≥640px
- [ ] **FR-1.2**: Main content container is horizontally centered on viewports ≥640px
- [ ] **FR-1.3**: Footer container is horizontally centered on viewports ≥640px
- [ ] **FR-1.4**: All three containers align vertically (left edges match)

### FR-2: Responsive Behavior

- [ ] **FR-2.1**: Mobile (<640px): Content spans full width with 16px padding
- [ ] **FR-2.2**: Tablet (640-1023px): Content centered within viewport
- [ ] **FR-2.3**: Desktop (1024-1279px): Content centered within viewport
- [ ] **FR-2.4**: Wide (1280-1535px): Content centered within viewport
- [ ] **FR-2.5**: Ultra-wide (≥1536px): Content centered, max-width 1344px

### FR-3: No Horizontal Overflow

- [ ] **FR-3.1**: No horizontal scrollbar appears at any viewport width (320px-2560px)
- [ ] **FR-3.2**: Content never extends beyond viewport bounds

---

## Non-Functional Requirements

### NFR-1: Accessibility

- [ ] **NFR-1.1**: Keyboard navigation order unchanged
- [ ] **NFR-1.2**: Focus states remain visible on all interactive elements
- [ ] **NFR-1.3**: Screen reader landmarks (header/main/footer) preserved
- [ ] **NFR-1.4**: Reduced motion preference not affected (no animations changed)

### NFR-2: Performance

- [ ] **NFR-2.1**: No increase in bundle size (CSS class additions only)
- [ ] **NFR-2.2**: No layout shift (CLS) regression
- [ ] **NFR-2.3**: No FOUC (Flash of Unstyled Content)

### NFR-3: Code Quality

- [ ] **NFR-3.1**: TypeScript compilation succeeds
- [ ] **NFR-3.2**: ESLint passes with no new errors
- [ ] **NFR-3.3**: Production build succeeds
- [ ] **NFR-3.4**: No console errors in browser DevTools

### NFR-4: Maintainability

- [ ] **NFR-4.1**: Changes follow Tailwind CSS v4 conventions
- [ ] **NFR-4.2**: No "magic numbers" or hardcoded values introduced
- [ ] **NFR-4.3**: Pattern is consistent across all container instances

---

## Acceptance Criteria

### AC-1: Visual Acceptance

| Viewport | Measurement | Expected |
|----------|-------------|----------|
| 1440px | Left margin = Right margin | ±1px |
| 768px | Left margin = Right margin | ±1px |
| 1920px | Container width | 1344px |
| 1920px | Each side margin | ~288px |

### AC-2: Regression Acceptance

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit` | Exit 0 |
| Lint | `npm run lint` | No errors |
| Build | `npm run build` | Exit 0 |

### AC-3: Theme Acceptance

- [ ] Light mode: Layout centered correctly
- [ ] Dark mode: Layout centered correctly
- [ ] Theme toggle: No layout shift during toggle

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | 🔲 Pending |
| Reviewer | | | 🔲 Pending |

---

## Notes

- This checklist should be completed before merging any PR
- All FR and NFR items must pass
- AC items provide measurable verification criteria
