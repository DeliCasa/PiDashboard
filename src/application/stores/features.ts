/**
 * Feature Flag Store
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Zustand store for managing feature flags.
 * Enables gradual rollout of new features like V1 API, batch provisioning, etc.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/**
 * Available feature flags.
 */
export interface FeatureFlags {
  /** Use V1 API client with envelope handling */
  useV1Api: boolean;
  /** Show batch provisioning tab and features */
  useBatchProvisioning: boolean;
  /** Use WebSocket for system monitoring (vs polling) */
  useWebSocketMonitor: boolean;
  /** Show device allowlist management */
  useAllowlistManagement: boolean;
  /** Enable session recovery features */
  useSessionRecovery: boolean;
}

/**
 * Feature flag store state and actions.
 */
interface FeatureFlagsState extends FeatureFlags {
  /** Enable a feature */
  enableFeature: (feature: keyof FeatureFlags) => void;
  /** Disable a feature */
  disableFeature: (feature: keyof FeatureFlags) => void;
  /** Toggle a feature */
  toggleFeature: (feature: keyof FeatureFlags) => void;
  /** Set multiple features at once */
  setFeatures: (features: Partial<FeatureFlags>) => void;
  /** Reset all features to defaults */
  resetFeatures: () => void;
}

// ============================================================================
// Default Feature Flags
// ============================================================================

/**
 * Get default feature flags based on environment variables.
 */
function getDefaultFlags(): FeatureFlags {
  return {
    useV1Api: import.meta.env.VITE_USE_V1_API === 'true',
    useBatchProvisioning: import.meta.env.VITE_BATCH_PROVISIONING === 'true',
    useWebSocketMonitor: import.meta.env.VITE_WS_MONITOR === 'true',
    useAllowlistManagement: import.meta.env.VITE_ALLOWLIST_MANAGEMENT === 'true',
    useSessionRecovery: import.meta.env.VITE_SESSION_RECOVERY === 'true',
  };
}

// ============================================================================
// Feature Flag Store
// ============================================================================

/**
 * Feature flag store with persistence.
 *
 * In development, persists to localStorage so flags survive page refresh.
 * In production, only uses environment variables.
 */
export const useFeatureFlags = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      // Initial state from environment
      ...getDefaultFlags(),

      // Actions
      enableFeature: (feature) =>
        set((state) => ({ ...state, [feature]: true })),

      disableFeature: (feature) =>
        set((state) => ({ ...state, [feature]: false })),

      toggleFeature: (feature) =>
        set((state) => ({ ...state, [feature]: !state[feature] })),

      setFeatures: (features) =>
        set((state) => ({ ...state, ...features })),

      resetFeatures: () =>
        set(() => getDefaultFlags()),
    }),
    {
      name: 'delicasa-feature-flags',
      // Only persist in development mode
      skipHydration: !import.meta.env.DEV,
      // Only persist feature flags, not actions
      partialize: (state) => ({
        useV1Api: state.useV1Api,
        useBatchProvisioning: state.useBatchProvisioning,
        useWebSocketMonitor: state.useWebSocketMonitor,
        useAllowlistManagement: state.useAllowlistManagement,
        useSessionRecovery: state.useSessionRecovery,
      }),
    }
  )
);

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Check if V1 API is enabled.
 */
export function useV1ApiEnabled(): boolean {
  return useFeatureFlags((state) => state.useV1Api);
}

/**
 * Check if batch provisioning is enabled.
 */
export function useBatchProvisioningEnabled(): boolean {
  return useFeatureFlags((state) => state.useBatchProvisioning);
}

/**
 * Check if WebSocket monitoring is enabled.
 */
export function useWebSocketMonitorEnabled(): boolean {
  return useFeatureFlags((state) => state.useWebSocketMonitor);
}

/**
 * Check if allowlist management is enabled.
 */
export function useAllowlistManagementEnabled(): boolean {
  return useFeatureFlags((state) => state.useAllowlistManagement);
}

/**
 * Check if session recovery is enabled.
 */
export function useSessionRecoveryEnabled(): boolean {
  return useFeatureFlags((state) => state.useSessionRecovery);
}

// ============================================================================
// Non-Hook Feature Checks
// ============================================================================

/**
 * Check feature flags outside of React components.
 * Useful for conditional imports, API calls, etc.
 */
export const featureFlags = {
  /**
   * Check if V1 API should be used.
   */
  isV1ApiEnabled: (): boolean => {
    return useFeatureFlags.getState().useV1Api;
  },

  /**
   * Check if batch provisioning is enabled.
   */
  isBatchProvisioningEnabled: (): boolean => {
    return useFeatureFlags.getState().useBatchProvisioning;
  },

  /**
   * Check if WebSocket monitoring is enabled.
   */
  isWebSocketMonitorEnabled: (): boolean => {
    return useFeatureFlags.getState().useWebSocketMonitor;
  },

  /**
   * Check if allowlist management is enabled.
   */
  isAllowlistManagementEnabled: (): boolean => {
    return useFeatureFlags.getState().useAllowlistManagement;
  },

  /**
   * Check if session recovery is enabled.
   */
  isSessionRecoveryEnabled: (): boolean => {
    return useFeatureFlags.getState().useSessionRecovery;
  },
};
