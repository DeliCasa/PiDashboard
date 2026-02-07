/**
 * TanStack React Query Client Configuration
 * Optimized for real-time IoT dashboard polling
 */

import { QueryClient } from '@tanstack/react-query';
import { ApiError, NetworkError, TimeoutError } from '@/infrastructure/api/client';

/**
 * Default stale time for queries (10 seconds)
 * Allows caching while still fetching fresh data frequently
 */
const STALE_TIME = 10_000;

/**
 * Default retry count for failed queries
 */
const RETRY_COUNT = 2;

/**
 * Custom retry logic - don't retry on client errors (4xx)
 */
function shouldRetry(failureCount: number, error: Error): boolean {
  // Don't retry if we've hit the limit
  if (failureCount >= RETRY_COUNT) {
    return false;
  }

  // Don't retry on client errors
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }

  // Retry network and server errors
  return error instanceof NetworkError ||
         error instanceof TimeoutError ||
         (error instanceof ApiError && error.status >= 500);
}

/**
 * QueryClient instance with optimized defaults for IoT dashboard
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Prevent unnecessary refetches when switching tabs
      refetchOnMount: true,
    },
    mutations: {
      retry: false, // Don't retry mutations automatically
    },
  },
});

/**
 * Query key factory for type-safe query keys
 */
export const queryKeys = {
  // System
  system: ['system'] as const,
  systemStatus: () => [...queryKeys.system, 'status'] as const,
  systemHealth: () => [...queryKeys.system, 'health'] as const,

  // WiFi
  wifi: ['wifi'] as const,
  wifiStatus: () => [...queryKeys.wifi, 'status'] as const,
  wifiNetworks: () => [...queryKeys.wifi, 'networks'] as const,

  // Devices
  devices: ['devices'] as const,
  deviceList: () => [...queryKeys.devices, 'list'] as const,
  deviceById: (address: string) => [...queryKeys.devices, address] as const,
  provisioningHistory: () => [...queryKeys.devices, 'history'] as const,

  // Cameras
  cameras: ['cameras'] as const,
  cameraList: () => [...queryKeys.cameras, 'list'] as const,
  cameraDiagnostics: () => [...queryKeys.cameras, 'diagnostics'] as const,
  cameraById: (id: string) => [...queryKeys.cameras, id] as const,

  // Door
  door: ['door'] as const,
  doorStatus: () => [...queryKeys.door, 'status'] as const,
  doorHistory: () => [...queryKeys.door, 'history'] as const,

  // Logs
  logs: ['logs'] as const,
  logList: (filters?: { level?: string; search?: string }) =>
    [...queryKeys.logs, filters] as const,

  // Config
  config: ['config'] as const,
  configList: () => [...queryKeys.config, 'list'] as const,
  configByKey: (key: string) => [...queryKeys.config, key] as const,

  // Network
  network: ['network'] as const,
  tailscale: () => [...queryKeys.network, 'tailscale'] as const,
  mqtt: () => [...queryKeys.network, 'mqtt'] as const,
  bridgeServer: () => [...queryKeys.network, 'bridgeserver'] as const,

  // Offline Queue
  offline: ['offline'] as const,
  offlineQueue: () => [...queryKeys.offline, 'queue'] as const,

  // Auto-Onboard (035-auto-onboard-dashboard)
  autoOnboard: ['auto-onboard'] as const,
  autoOnboardStatus: () => [...queryKeys.autoOnboard, 'status'] as const,
  autoOnboardEvents: (filters?: { mac?: string; since?: string; limit?: number; offset?: number }) =>
    [...queryKeys.autoOnboard, 'events', filters] as const,

  // Diagnostics (038-dev-observability-panels)
  diagnostics: ['diagnostics'] as const,
  diagnosticsHealth: () => [...queryKeys.diagnostics, 'health'] as const,
  diagnosticsServiceHealth: (serviceName: string) =>
    [...queryKeys.diagnostics, 'health', serviceName] as const,
  diagnosticsSessions: (filters?: { status?: string }) =>
    [...queryKeys.diagnostics, 'sessions', filters] as const,
  diagnosticsSessionById: (sessionId: string) =>
    [...queryKeys.diagnostics, 'sessions', sessionId] as const,
  diagnosticsEvidence: (sessionId: string) =>
    [...queryKeys.diagnostics, 'evidence', sessionId] as const,

  // Containers (043-container-management)
  containers: ['containers'] as const,
  containerList: () => [...queryKeys.containers, 'list'] as const,
  containerById: (id: string) => [...queryKeys.containers, id] as const,
} as const;

/**
 * Invalidation helper for common patterns
 */
export const invalidateQueries = {
  system: () => queryClient.invalidateQueries({ queryKey: queryKeys.system }),
  wifi: () => queryClient.invalidateQueries({ queryKey: queryKeys.wifi }),
  devices: () => queryClient.invalidateQueries({ queryKey: queryKeys.devices }),
  cameras: () => queryClient.invalidateQueries({ queryKey: queryKeys.cameras }),
  door: () => queryClient.invalidateQueries({ queryKey: queryKeys.door }),
  logs: () => queryClient.invalidateQueries({ queryKey: queryKeys.logs }),
  config: () => queryClient.invalidateQueries({ queryKey: queryKeys.config }),
  network: () => queryClient.invalidateQueries({ queryKey: queryKeys.network }),
  autoOnboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.autoOnboard }),
  diagnostics: () => queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics }),
  containers: () => queryClient.invalidateQueries({ queryKey: queryKeys.containers }),
  all: () => queryClient.invalidateQueries(),
};
