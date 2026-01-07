# Spec 003: Layout Centering Fix & Style Reusability

**Status**: Draft
**Created**: 2026-01-07
**Author**: Claude Code (speckit.specify)

---

## 1. Problem Statement

### What "not correctly centered" means

The PiDashboard application uses Tailwind CSS v4's `container` class throughout the layout (header, main content, footer), but **`container` in Tailwind CSS v4 does NOT auto-center by default**. This is a breaking change from Tailwind CSS v3 behavior where `container` included automatic `margin: auto` centering.

**Observed behavior**:
- Content containers (header, main, footer) are left-aligned instead of horizontally centered
- On viewports wider than the container max-width, content appears offset with whitespace on the right side
- One component (`OfflineIndicator`) correctly uses `mx-auto` while all others do not, creating visual inconsistency

### Affected pages/components

| Location | File | Line | Current Classes | Issue |
|----------|------|------|-----------------|-------|
| Header | `src/App.tsx` | 33 | `container flex h-16 items-center justify-between px-4` | Missing `mx-auto` |
| OfflineIndicator | `src/App.tsx` | 50 | `container mx-auto mt-2 px-4` | Correct (anomaly) |
| Main content | `src/App.tsx` | 53 | `container px-4 py-6` | Missing `mx-auto` |
| Footer | `src/App.tsx` | 150 | `container flex items-center justify-between px-4` | Missing `mx-auto` |

### Visual impact

```
+------------------------------------------+
| [Logo] DeliCasa IoT Setup          [Sun] |  <- Header left-aligned
+------------------------------------------+
|                                          |
| [Content area - left aligned]      |     |
|                                   |     |
| Large whitespace on right ->      |     |
|                                          |
+------------------------------------------+
| PiOrchestrator               v1.0.0      |  <- Footer left-aligned
+------------------------------------------+
```

---

## 2. Evidence Map (Current State)

### Entry Point Analysis

| File | Line | Observation |
|------|------|-------------|
| `index.html:6` | `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` | Correct viewport setup |
| `src/main.tsx:8` | `createRoot(document.getElementById('root')!)` | Root mounted without CSS constraints |
| `src/index.css:1` | `@import "tailwindcss";` | Tailwind v4 directive (not v3's `@tailwind` directives) |
| `src/index.css:148-161` | Body styling | No explicit width/height constraints on body |
| `vite.config.ts:3,8` | `import tailwindcss from "@tailwindcss/vite"` | Using Tailwind CSS v4 Vite plugin |

### Layout Mechanism

**Framework**: Tailwind CSS v4.1.18 with `@tailwindcss/vite` plugin
**Component Library**: shadcn/ui (new-york style) with Radix UI primitives
**Theming**: next-themes v0.4.6 with CSS custom properties

**Container behavior in Tailwind v4**:
- `container` class provides: `width: 100%` with responsive `max-width` breakpoints
- Does NOT include: `margin: auto` (centering must be explicit)
- Breakpoint max-widths: sm=640px, md=768px, lg=1024px, xl=1280px, 2xl=1344px

### Root Cause Analysis

**Primary Root Cause**: Tailwind CSS v3 to v4 migration compatibility issue

| Aspect | Tailwind v3 | Tailwind v4 |
|--------|-------------|-------------|
| Container centering | Built-in `mx-auto` | Must add `mx-auto` explicitly |
| Container padding | Configurable in config | Must add `px-*` explicitly |
| Configuration | `tailwind.config.js` required | No config file needed |

**Evidence**:
- No `tailwind.config.js` file exists in project (uses v4 defaults)
- Only `OfflineIndicator` (line 50) has `mx-auto`, suggesting partial awareness of the issue
- All other containers (lines 33, 53, 150) use bare `container px-4` pattern

### Breakpoint Matrix

| Breakpoint | Viewport Width | Container Max-Width | Centered? | Visual Impact |
|------------|----------------|---------------------|-----------|---------------|
| Mobile | <640px | 100% | N/A | No issue (full width) |
| Small (sm) | 640-767px | 640px | **NO** | ~0-127px offset visible |
| Medium (md) | 768-1023px | 768px | **NO** | Content shifted left |
| Large (lg) | 1024-1279px | 1024px | **NO** | Significant whitespace on right |
| XL | 1280-1535px | 1280px | **NO** | ~128-255px whitespace |
| 2XL | 1536px+ | 1344px | **NO** | Large whitespace on right |

### Files Involved in Layout

| File | Role | Impact on Centering |
|------|------|---------------------|
| `src/App.tsx` | Main layout structure | **HIGH** - Contains all container instances |
| `src/index.css` | Global styles & tokens | MEDIUM - No container config |
| `vite.config.ts` | Build configuration | LOW - Correct Tailwind v4 setup |
| `src/components/ui/card.tsx` | Card primitives | LOW - Uses internal padding |
| `src/presentation/components/*` | Feature components | LOW - Inherit parent layout |

---

## 3. Goals / Non-Goals

### Goals

1. **Fix centering**: Ensure all container elements are horizontally centered across all breakpoints
2. **Achieve consistency**: Standardize container usage patterns throughout the codebase
3. **Improve reusability**: Extract common layout patterns into reusable primitives
4. **Maintain accessibility**: Preserve keyboard navigation, focus states, and reduced-motion support
5. **Avoid layout shifts**: Prevent CLS (Cumulative Layout Shift) during page load

### Non-Goals

1. **Full redesign**: No changes to visual identity, color scheme, or branding
2. **Component library changes**: No replacing shadcn/ui with another library
3. **Breakpoint restructuring**: No changing the existing sm/md/lg/xl/2xl breakpoint values
4. **Feature changes**: No adding or removing functionality
5. **Performance optimization**: Not in scope unless directly related to layout

---

## 4. Target Layout Specification

### Content Layout Rules

| Property | Value | Rationale |
|----------|-------|-----------|
| Max content width | `1344px` (2xl breakpoint) | Tailwind v4 default, optimal readability |
| Horizontal centering | `margin: 0 auto` | Center container in viewport |
| Horizontal padding | `16px` (px-4) | Consistent gutter on all breakpoints |
| Minimum content width | None (fluid) | Mobile-first responsive design |

### Breakpoint Behavior

```
Mobile (<640px):
┌────────────────────────────────┐
│ 16px │    Full width    │ 16px │
│      │    content       │      │
└────────────────────────────────┘

Tablet/Desktop (≥640px):
┌─────────────────────────────────────────────────┐
│     │ 16px │  max-width: X  │ 16px │           │
│     │      │  (centered)    │      │           │
│auto │      │                │      │ auto      │
└─────────────────────────────────────────────────┘
```

### Scroll Behavior

- **Primary scroll**: Body element (not inner containers)
- **Sticky header**: `position: sticky; top: 0` with backdrop blur (existing behavior - preserve)
- **No horizontal scroll**: Content must never overflow horizontally

### Ultra-wide Screen Behavior (>1536px)

- Content capped at `max-width: 1344px`
- Equal whitespace on both sides (centered)
- Background extends full viewport width

### Component Layout Hierarchy

```
<body>
  <div id="root">
    <ThemeProvider>
      <div className="min-h-screen bg-background">        <- Full viewport
        <header className="container mx-auto px-4">       <- Centered container
        <main className="container mx-auto px-4 py-6">    <- Centered container
          <Tabs>
            <TabsContent>
              <div className="grid gap-6 lg:grid-cols-2"> <- Responsive grid
        <footer className="container mx-auto px-4">       <- Centered container
```

---

## 5. Style & Reusability Improvements

### 5.1 Recommended Layout Primitives

#### Option A: CSS-Only Fix (Minimal)

Add container centering to global CSS:

```css
/* src/index.css - Add to @theme or after Tailwind import */
@layer base {
  .container {
    margin-inline: auto;
  }
}
```

**Pros**: Single-line fix, no component changes
**Cons**: Overrides Tailwind default globally, may conflict with future Tailwind updates

#### Option B: Utility Class Pattern (Recommended)

Create a standardized container utility and update `App.tsx`:

```tsx
// Pattern: Replace `container px-4` with `container mx-auto px-4`
// This is explicit, follows Tailwind v4 idioms, and is searchable
```

**Pros**: Explicit, no magic, follows Tailwind conventions
**Cons**: Multiple file edits (4 instances in App.tsx)

#### Option C: Layout Components (For Reusability)

Extract layout primitives for future scalability:

```tsx
// src/components/layout/PageContainer.tsx
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("container mx-auto px-4", className)}>
      {children}
    </div>
  );
}
```

**Pros**: Reusable, consistent, easy to modify in future
**Cons**: More files, overhead for current simple use case

### 5.2 Recommendation

**Phase 1**: Use **Option B** (explicit `mx-auto` additions) for immediate fix
**Phase 2**: Consider **Option C** only if layout patterns proliferate in future

### 5.3 Spacing Standardization

Current inconsistent patterns found:

| Pattern | Occurrences | Recommendation |
|---------|-------------|----------------|
| `gap-2` | 12+ | Keep: tight spacing (icons, inline elements) |
| `gap-3` | 5+ | Keep: medium compact spacing |
| `gap-4` | 8+ | Keep: standard spacing (cards, sections) |
| `gap-6` | 6+ | Keep: large spacing (major sections) |
| `space-y-2` | 8+ | Keep: tight vertical stacking |
| `space-y-4` | 10+ | Keep: medium vertical stacking |
| `space-y-6` | 7+ | Keep: section separators |

**No changes needed**: Current spacing scale is consistent with `2/3/4/6` increments.

### 5.4 Identified Duplication (Future Cleanup - Out of Scope)

These patterns are duplicated but **should NOT be addressed in this spec** (to minimize scope):

1. **Icon + Title header pattern**: 7+ instances of `<CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />`
2. **Custom spinner**: 4+ inline `<div className="animate-spin rounded-full border-2...">` instances
3. **Grid breakpoint inconsistency**: `sm:grid-cols-2` vs `md:grid-cols-2` in different components
4. **Status color maps**: Duplicate `Record<Status, string>` objects in MetricCard, CameraCard

These should be addressed in a separate "Style Consistency" spec if desired.

### 5.5 Enforcement Rules

| Rule | Enforcement Method | Status |
|------|-------------------|--------|
| Containers must use `mx-auto` | Code review / grep pattern | Manual |
| No hardcoded pixel widths in components | ESLint arbitrary-value lint | Not configured |
| Spacing uses 4px scale (2/3/4/6/8/12) | Convention only | Manual |

**No new lint rules proposed** for this minimal-scope fix.

---

## 6. Remediation Plan (Phased)

### Phase 0: Reproduce & Measure

**Goal**: Document current state with evidence
**Duration**: 1 session

**Steps**:
1. Run dev server: `npm run dev`
2. Open browser at `http://localhost:5173`
3. Resize to 1440px width (common desktop)
4. Screenshot showing left-alignment issue
5. Open DevTools → measure container offset from viewport edge
6. Record measurements in table format

**Verification**:
- Screenshot saved with timestamp
- Measurements documented (expected: container left edge != viewport center - container width/2)

**Rollback**: N/A (observation only)

### Phase 1: Fix Root Centering Issue

**Goal**: Add `mx-auto` to all container instances
**Duration**: 5 minutes
**Risk**: Low

**Files to change**:

| File | Line | Current | Change To |
|------|------|---------|-----------|
| `src/App.tsx` | 33 | `container flex` | `container mx-auto flex` |
| `src/App.tsx` | 53 | `container px-4 py-6` | `container mx-auto px-4 py-6` |
| `src/App.tsx` | 150 | `container flex` | `container mx-auto flex` |

**Note**: Line 50 (`OfflineIndicator`) already has `mx-auto` - no change needed.

**Verification**:
1. Run dev server
2. Resize to 1440px width
3. Verify content is centered (equal whitespace on both sides)
4. Test all breakpoints: 640px, 768px, 1024px, 1280px, 1536px+
5. Verify no horizontal scrollbar appears

**Rollback strategy**:
```bash
git checkout src/App.tsx  # Revert single file
```

### Phase 2: Extract Layout Primitives (Optional)

**Goal**: Create reusable layout components if needed
**Duration**: 15 minutes
**Risk**: Low
**Condition**: Only proceed if Phase 1 is successful AND future scalability is desired

**Files to create**:
- `src/components/layout/PageContainer.tsx`
- `src/components/layout/index.ts`

**Files to modify**:
- `src/App.tsx` (replace inline patterns with components)

**Verification**:
- Same visual tests as Phase 1
- Verify TypeScript compiles without errors
- Verify no runtime errors in console

**Rollback strategy**:
```bash
git checkout src/App.tsx
rm -rf src/components/layout/
```

### Phase 3: Optional Cleanup

**Goal**: Address style inconsistencies identified during investigation
**Duration**: Variable
**Condition**: Only if explicitly requested by stakeholders

**Candidates**:
1. Standardize grid breakpoints (`sm:grid-cols-2` vs `md:grid-cols-2`)
2. Extract custom spinner as component
3. Centralize status color mappings

**This phase is OUT OF SCOPE for this spec** - create separate spec if needed.

---

## 7. Acceptance Criteria (Measurable)

### Centering Criteria

| Criteria | Measurement | Pass Condition |
|----------|-------------|----------------|
| Desktop centering (1440px) | DevTools ruler | Container margins equal ±1px |
| Tablet centering (768px) | DevTools ruler | Container margins equal ±1px |
| Mobile full width (375px) | Visual inspection | Content spans full width minus padding |
| Ultra-wide centering (1920px) | DevTools ruler | Container centered with equal margins |

### Layout Stability Criteria

| Criteria | Tool | Pass Condition |
|----------|------|----------------|
| No horizontal overflow | Manual resize + DevTools | No horizontal scrollbar at any width 320px-2560px |
| No CLS regression | Lighthouse | CLS score ≤ 0.1 (current baseline) |
| No layout shift on theme toggle | Visual test | Layout does not jump when switching light/dark |

### Accessibility Criteria

| Criteria | Test Method | Pass Condition |
|----------|-------------|----------------|
| Tab order preserved | Keyboard navigation | Tab sequence unchanged from before fix |
| Focus states visible | Keyboard navigation | All interactive elements show focus ring |
| Reduced motion respected | `prefers-reduced-motion` | Animations disabled when preference set |
| Screen reader compatibility | VoiceOver/NVDA spot check | Navigation landmarks preserved |

### Regression Criteria

| Criteria | Test Method | Pass Condition |
|----------|-------------|----------------|
| Build succeeds | `npm run build` | Exit code 0, no errors |
| TypeScript compiles | `npx tsc --noEmit` | Exit code 0, no type errors |
| Lint passes | `npm run lint` | No new errors introduced |

---

## 8. Verification Checklist

### Manual Testing

- [ ] **Mobile (375px)**: Content fills width with 16px padding on each side
- [ ] **Tablet (768px)**: Content centered with equal margins
- [ ] **Desktop (1280px)**: Content centered with equal margins
- [ ] **Ultra-wide (1920px)**: Content centered, max-width capped at 1344px
- [ ] **Header alignment**: Logo and theme toggle properly positioned
- [ ] **Footer alignment**: Text centered within container
- [ ] **Tab content**: All tab panels render correctly
- [ ] **Dark mode**: Layout identical in light and dark themes
- [ ] **Resize animation**: No jumping/shifting when resizing browser

### Automated Testing (If Available)

- [ ] **Existing Playwright tests**: Run full suite, no regressions
- [ ] **Visual regression**: Compare screenshots before/after (if configured)
- [ ] **Lighthouse audit**: Run on localhost, verify CLS ≤ 0.1

### Accessibility Testing

- [ ] **Tab navigation**: Navigate entire app using Tab key
- [ ] **Focus visibility**: All focused elements have visible outline
- [ ] **Skip link**: Main content accessible via skip link (if present)
- [ ] **Landmarks**: Header/main/footer have correct ARIA roles

### Code Quality

- [ ] **Build passes**: `npm run build` succeeds
- [ ] **Lint clean**: `npm run lint` shows no new errors
- [ ] **Type check**: TypeScript compilation succeeds
- [ ] **No console errors**: Browser console clean of errors

---

## 9. Research Brief

### Sources Used

| Source | Decision Informed |
|--------|-------------------|
| Tailwind CSS v4 Documentation (tailwindcss.com) | Container behavior changes from v3 to v4 |
| Tailwind CSS GitHub Issues | Confirmation that `mx-auto` is required in v4 |
| shadcn/ui Documentation | Layout patterns for component library |
| Web.dev CLS Guide | Layout shift prevention best practices |
| MDN margin-inline | CSS logical property for centering |

### Key Insights

1. **Tailwind v4 container change**: The container plugin was simplified in v4; centering must be explicit with `mx-auto` or `margin-inline: auto`

2. **Best practice for centering**: Use `mx-auto` (or `margin-inline: auto`) rather than `text-align: center` or flexbox centering for block containers

3. **CLS prevention**: Ensure container width is deterministic and does not depend on content or async data loading

4. **shadcn/ui convention**: Components assume they receive parent-provided width; centering responsibility is on the parent layout

---

## 10. Open Questions (TBD)

### Resolved

| Question | Resolution |
|----------|------------|
| What Tailwind version is used? | v4.1.18 (confirmed in package.json) |
| Is there a tailwind.config.js? | No (using Tailwind v4 defaults) |
| Why does OfflineIndicator have mx-auto? | Likely added as a one-off fix; indicates awareness of issue |

### Pending

| Question | Resolution Steps |
|----------|------------------|
| Should we create layout components? | Decision: Start with Option B (inline fix). Revisit if more layout patterns emerge. |
| Is visual regression testing set up? | Check for Playwright config and screenshot tests. If not present, rely on manual verification. |
| Are there other pages affected? | `App.tsx` is the only layout file. All routes use the same shell. No additional pages to check. |

---

## Appendix A: Quick Fix Instructions

For developers wanting to apply the fix immediately:

```tsx
// src/App.tsx - Update these 3 lines:

// Line 33 - Header
- <div className="container flex h-16 items-center justify-between px-4">
+ <div className="container mx-auto flex h-16 items-center justify-between px-4">

// Line 53 - Main
- <main className="container px-4 py-6">
+ <main className="container mx-auto px-4 py-6">

// Line 150 - Footer
- <div className="container flex items-center justify-between px-4 text-sm text-muted-foreground">
+ <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
```

---

## Appendix B: Component Duplication Reference

For future "Style Consistency" spec, these patterns were identified as candidates for extraction:

| Pattern | Files | Suggested Component |
|---------|-------|---------------------|
| Icon + Title header | SystemStatus, WiFiSection, DeviceSection, CameraSection, DoorSection, NetworkSection, LogSection | `<SectionHeader icon={Icon} title="..." />` |
| Custom spinner | DeviceSection, CameraSection, DoorControls | `<Spinner size="md" />` |
| Status color mapping | MetricCard, CameraCard, DoorControls | `getStatusColor(status)` utility |
| Empty state display | CameraSection, DeviceSection | `<EmptyState icon={Icon} message="..." />` |
| Details list | ConnectionCard, network components | `<DetailsList items={[{label, value}]} />` |

These are documented for reference but **NOT in scope** for this spec.
