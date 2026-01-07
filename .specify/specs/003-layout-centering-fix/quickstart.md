# Quickstart: Layout Centering Fix

> **Feature**: 003-layout-centering-fix
> **Created**: 2026-01-07
> **Estimated Time**: 15-30 minutes

---

## TL;DR

Add `mx-auto` to 3 container elements in `src/App.tsx`:
- Line 33 (header)
- Line 53 (main)
- Line 150 (footer)

---

## Prerequisites

- [ ] Node.js 20+ installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)

---

## Quick Fix (5 minutes)

### Step 1: Open App.tsx

```bash
code src/App.tsx
# or your preferred editor
```

### Step 2: Apply Changes

Find and replace these 3 lines:

**Line 33 (Header)**:
```tsx
// Before
<div className="container flex h-16 items-center justify-between px-4">

// After
<div className="container mx-auto flex h-16 items-center justify-between px-4">
```

**Line 53 (Main)**:
```tsx
// Before
<main className="container px-4 py-6">

// After
<main className="container mx-auto px-4 py-6">
```

**Line 150 (Footer)**:
```tsx
// Before
<div className="container flex items-center justify-between px-4 text-sm text-muted-foreground">

// After
<div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
```

### Step 3: Verify

```bash
npm run dev
# Open http://localhost:5173
# Resize browser to 1440px width
# Content should be centered
```

---

## Verification Checklist

### Visual Checks

- [ ] **375px (mobile)**: Content fills width with padding
- [ ] **768px (tablet)**: Content centered
- [ ] **1280px (desktop)**: Content centered
- [ ] **1920px (ultra-wide)**: Content centered, max-width applied

### Quality Checks

```bash
# All should pass
npx tsc --noEmit          # TypeScript
npm run lint              # ESLint
npm run build             # Build
```

### Accessibility Check

- [ ] Tab through entire app - order unchanged
- [ ] Focus rings visible on all interactive elements

---

## Commit

```bash
git add src/App.tsx CHANGELOG.md
git commit -m "fix: Center containers using mx-auto (Tailwind v4 migration)

- Added mx-auto to header container (line 33)
- Added mx-auto to main container (line 53)
- Added mx-auto to footer container (line 150)

Fixes centering issue caused by Tailwind CSS v4 container behavior change.
See .specify/specs/003-layout-centering-fix/spec.md for details."
```

---

## Troubleshooting

### Content still not centered?

1. Clear browser cache (Ctrl+Shift+R)
2. Verify Vite hot reload is working
3. Check DevTools for CSS being applied

### TypeScript errors?

This fix doesn't change any TypeScript types. If you see errors:
1. Run `npx tsc --noEmit` to see specific errors
2. Ensure you only modified className strings

### Layout looks broken?

```bash
# Quick rollback
git checkout src/App.tsx
npm run dev
```

---

## Reference

| Document | Purpose |
|----------|---------|
| `spec.md` | Full specification with evidence |
| `research.md` | Technical decisions and rationale |
| `plan.md` | Detailed implementation phases |
| `data-model.md` | Confirms no data changes |

---

## Done!

Once all checks pass:
1. Update `CHANGELOG.md` with Fixed entry
2. Commit changes
3. Create PR if working on branch
