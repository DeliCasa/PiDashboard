/**
 * Active Container Store
 * Feature: 046-opaque-container-identity
 *
 * Zustand store for tracking the operator's currently-selected container.
 * Persists selection to localStorage so it survives page refreshes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

interface ActiveContainerState {
  /** Currently selected container ID (opaque string). null = no selection (global view). */
  activeContainerId: string | null;
  /** Set the active container by ID */
  setActiveContainer: (id: string) => void;
  /** Clear the active container (return to global view) */
  clearActiveContainer: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useActiveContainerStore = create<ActiveContainerState>()(
  persist(
    (set) => ({
      activeContainerId: null,

      setActiveContainer: (id: string) =>
        set({ activeContainerId: id }),

      clearActiveContainer: () =>
        set({ activeContainerId: null }),
    }),
    {
      name: 'delicasa-pi-active-container',
      partialize: (state) => ({
        activeContainerId: state.activeContainerId,
      }),
    }
  )
);

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Get the active container ID.
 * Returns null when no container is selected (global view).
 */
export function useActiveContainerId(): string | null {
  return useActiveContainerStore((state) => state.activeContainerId);
}

/**
 * Get the active container store actions.
 */
export function useActiveContainerActions() {
  const setActiveContainer = useActiveContainerStore((state) => state.setActiveContainer);
  const clearActiveContainer = useActiveContainerStore((state) => state.clearActiveContainer);
  return { setActiveContainer, clearActiveContainer };
}
