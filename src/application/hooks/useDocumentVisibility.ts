/**
 * Document Visibility Hook
 * Feature: 034-esp-camera-integration
 *
 * Tracks document visibility state to pause polling when tab is hidden.
 * Uses the Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
 */

import { useState, useEffect } from 'react';

/**
 * Returns the current document visibility state.
 *
 * - `true` when the document is visible (tab is active)
 * - `false` when the document is hidden (tab is in background)
 *
 * Updates automatically when visibility changes.
 *
 * @returns Whether the document is currently visible
 *
 * @example
 * ```tsx
 * const isVisible = useDocumentVisibility();
 *
 * // Use with React Query to pause polling when hidden
 * useQuery({
 *   queryKey: ['cameras'],
 *   queryFn: fetchCameras,
 *   refetchInterval: isVisible ? 10_000 : false,
 * });
 * ```
 */
export function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => {
    // SSR safety: default to visible if document is not available
    if (typeof document === 'undefined') {
      return true;
    }
    return !document.hidden;
  });

  useEffect(() => {
    // SSR safety
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Options for visibility-aware polling.
 */
export interface UseVisibilityPollingOptions {
  /** Polling interval in milliseconds when visible */
  interval: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Returns a refetch interval that pauses when the document is hidden.
 *
 * Convenience wrapper that combines `useDocumentVisibility` with
 * polling interval logic for React Query.
 *
 * @param options - Polling configuration
 * @returns Interval in ms when visible, `false` when hidden or disabled
 *
 * @example
 * ```tsx
 * const refetchInterval = useVisibilityAwareInterval({ interval: 10_000 });
 *
 * useQuery({
 *   queryKey: ['cameras'],
 *   queryFn: fetchCameras,
 *   refetchInterval,
 * });
 * ```
 */
export function useVisibilityAwareInterval(
  options: UseVisibilityPollingOptions
): number | false {
  const { interval, enabled = true } = options;
  const isVisible = useDocumentVisibility();

  if (!enabled || !isVisible) {
    return false;
  }

  return interval;
}

/**
 * Calls a callback when visibility changes.
 *
 * Useful for triggering side effects like analytics or
 * immediate data refresh when the user returns to the tab.
 *
 * @param onVisible - Called when document becomes visible
 * @param onHidden - Called when document becomes hidden
 *
 * @example
 * ```tsx
 * useVisibilityChange({
 *   onVisible: () => refetch(),
 *   onHidden: () => console.log('User left tab'),
 * });
 * ```
 */
export function useVisibilityChange(callbacks: {
  onVisible?: () => void;
  onHidden?: () => void;
}): void {
  const { onVisible, onHidden } = callbacks;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHidden?.();
      } else {
        onVisible?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisible, onHidden]);
}
