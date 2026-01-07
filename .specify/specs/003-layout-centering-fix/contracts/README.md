# Contracts: Layout Centering Fix

> **Feature**: 003-layout-centering-fix
> **Created**: 2026-01-07

---

## Overview

This feature has **no API or interface contracts** because:

1. The fix is CSS-only (Tailwind utility class additions)
2. No new components are created
3. No props interfaces change
4. No API endpoints are affected

---

## Why This Directory Exists

This contracts directory is included for process consistency. All speckit features have a contracts directory even when empty.

---

## Future Considerations

If **Phase 2** of the spec is implemented (optional layout component extraction), the following contract would be added:

### Proposed: PageContainer Component Interface

```typescript
// src/components/layout/PageContainer.tsx
interface PageContainerProps {
  /**
   * Content to be rendered inside the centered container
   */
  children: React.ReactNode;

  /**
   * Additional CSS classes to merge with container classes
   */
  className?: string;

  /**
   * Semantic HTML element to render
   * @default 'div'
   */
  as?: 'div' | 'main' | 'section' | 'article';

  /**
   * Horizontal padding size
   * @default 'default' (px-4)
   */
  padding?: 'none' | 'sm' | 'default' | 'lg';
}
```

**This is deferred** - Phase 1 uses inline utilities only.

---

## Related Documents

- `spec.md` - Full specification
- `data-model.md` - Data model (empty)
- `plan.md` - Implementation plan
