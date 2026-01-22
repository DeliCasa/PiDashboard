/**
 * useDocumentVisibility Hook Tests
 * Feature: 034-esp-camera-integration (T010)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDocumentVisibility,
  useVisibilityAwareInterval,
  useVisibilityChange,
} from '@/application/hooks/useDocumentVisibility';

// ============================================================================
// Mock Setup
// ============================================================================

let documentHidden = false;
let visibilityListeners: Array<() => void> = [];

beforeEach(() => {
  documentHidden = false;
  visibilityListeners = [];

  // Mock document.hidden and addEventListener
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => documentHidden,
  });

  vi.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
    if (event === 'visibilitychange') {
      visibilityListeners.push(handler as () => void);
    }
  });

  vi.spyOn(document, 'removeEventListener').mockImplementation((event, handler) => {
    if (event === 'visibilitychange') {
      visibilityListeners = visibilityListeners.filter((h) => h !== handler);
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to simulate visibility change
function triggerVisibilityChange(hidden: boolean) {
  documentHidden = hidden;
  visibilityListeners.forEach((listener) => listener());
}

// ============================================================================
// useDocumentVisibility Tests
// ============================================================================

describe('useDocumentVisibility', () => {
  it('should return true when document is visible', () => {
    documentHidden = false;

    const { result } = renderHook(() => useDocumentVisibility());

    expect(result.current).toBe(true);
  });

  it('should return false when document is hidden', () => {
    documentHidden = true;

    const { result } = renderHook(() => useDocumentVisibility());

    expect(result.current).toBe(false);
  });

  it('should update when visibility changes to hidden', () => {
    const { result } = renderHook(() => useDocumentVisibility());

    expect(result.current).toBe(true);

    act(() => {
      triggerVisibilityChange(true);
    });

    expect(result.current).toBe(false);
  });

  it('should update when visibility changes to visible', () => {
    documentHidden = true;
    const { result } = renderHook(() => useDocumentVisibility());

    expect(result.current).toBe(false);

    act(() => {
      triggerVisibilityChange(false);
    });

    expect(result.current).toBe(true);
  });

  it('should add visibilitychange listener on mount', () => {
    renderHook(() => useDocumentVisibility());

    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  it('should remove visibilitychange listener on unmount', () => {
    const { unmount } = renderHook(() => useDocumentVisibility());

    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });
});

// ============================================================================
// useVisibilityAwareInterval Tests
// ============================================================================

describe('useVisibilityAwareInterval', () => {
  it('should return interval when visible and enabled', () => {
    documentHidden = false;

    const { result } = renderHook(() =>
      useVisibilityAwareInterval({ interval: 10000, enabled: true })
    );

    expect(result.current).toBe(10000);
  });

  it('should return false when hidden', () => {
    documentHidden = true;

    const { result } = renderHook(() =>
      useVisibilityAwareInterval({ interval: 10000, enabled: true })
    );

    expect(result.current).toBe(false);
  });

  it('should return false when disabled', () => {
    documentHidden = false;

    const { result } = renderHook(() =>
      useVisibilityAwareInterval({ interval: 10000, enabled: false })
    );

    expect(result.current).toBe(false);
  });

  it('should default to enabled when not specified', () => {
    documentHidden = false;

    const { result } = renderHook(() =>
      useVisibilityAwareInterval({ interval: 5000 })
    );

    expect(result.current).toBe(5000);
  });

  it('should update when visibility changes', () => {
    const { result } = renderHook(() =>
      useVisibilityAwareInterval({ interval: 10000 })
    );

    expect(result.current).toBe(10000);

    act(() => {
      triggerVisibilityChange(true);
    });

    expect(result.current).toBe(false);

    act(() => {
      triggerVisibilityChange(false);
    });

    expect(result.current).toBe(10000);
  });
});

// ============================================================================
// useVisibilityChange Tests
// ============================================================================

describe('useVisibilityChange', () => {
  it('should call onVisible when document becomes visible', () => {
    documentHidden = true;
    const onVisible = vi.fn();
    const onHidden = vi.fn();

    renderHook(() => useVisibilityChange({ onVisible, onHidden }));

    act(() => {
      triggerVisibilityChange(false);
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
    expect(onHidden).not.toHaveBeenCalled();
  });

  it('should call onHidden when document becomes hidden', () => {
    documentHidden = false;
    const onVisible = vi.fn();
    const onHidden = vi.fn();

    renderHook(() => useVisibilityChange({ onVisible, onHidden }));

    act(() => {
      triggerVisibilityChange(true);
    });

    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onVisible).not.toHaveBeenCalled();
  });

  it('should handle undefined callbacks', () => {
    renderHook(() => useVisibilityChange({}));

    // Should not throw
    act(() => {
      triggerVisibilityChange(true);
      triggerVisibilityChange(false);
    });
  });

  it('should handle only onVisible callback', () => {
    const onVisible = vi.fn();

    renderHook(() => useVisibilityChange({ onVisible }));

    act(() => {
      triggerVisibilityChange(true);
      triggerVisibilityChange(false);
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('should handle only onHidden callback', () => {
    const onHidden = vi.fn();

    renderHook(() => useVisibilityChange({ onHidden }));

    act(() => {
      triggerVisibilityChange(true);
    });

    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it('should cleanup listener on unmount', () => {
    const onVisible = vi.fn();
    const { unmount } = renderHook(() => useVisibilityChange({ onVisible }));

    unmount();

    act(() => {
      triggerVisibilityChange(false);
    });

    // Should not be called after unmount
    expect(onVisible).not.toHaveBeenCalled();
  });
});
