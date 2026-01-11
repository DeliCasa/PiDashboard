/**
 * Batch Provisioning API Service
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * API client for batch device provisioning endpoints.
 * Enables field technicians to provision multiple ESP-CAM devices simultaneously.
 */

import type {
  BatchProvisioningSession,
  ProvisioningCandidate,
  StartSessionRequest,
  StartSessionData,
  SessionData,
  DevicesData,
  DeviceOperationData,
  ProvisionAllData,
  StopSessionData,
  NetworkStatus,
} from '@/domain/types/provisioning';
import type { V1Result } from '@/domain/types/v1-api';
import { v1Get, v1Post, buildV1Url } from './v1-client';
import {
  StartSessionDataSchema,
  SessionDataSchema,
  DevicesDataSchema,
  DeviceOperationDataSchema,
  ProvisionAllDataSchema,
  StopSessionDataSchema,
} from './schemas';

// ============================================================================
// Session Management
// ============================================================================

/**
 * Start a new batch provisioning session.
 *
 * @param request - Session configuration with target WiFi credentials
 * @returns Session data and correlation ID
 */
export async function startSession(
  request: StartSessionRequest
): Promise<V1Result<StartSessionData>> {
  return v1Post<StartSessionData>('/provisioning/batch/start', request, {
    requiresAuth: true,
    schema: StartSessionDataSchema,
  });
}

/**
 * Get session status and details.
 *
 * @param sessionId - The session ID
 * @param includeDevices - Whether to include device list (default: true)
 * @returns Session data with optional devices
 */
export async function getSession(
  sessionId: string,
  includeDevices = true
): Promise<V1Result<SessionData>> {
  const endpoint = buildV1Url(`/provisioning/batch/${sessionId}`, {
    include_devices: includeDevices,
  });
  return v1Get<SessionData>(endpoint, {
    requiresAuth: true,
    schema: SessionDataSchema,
  });
}

/**
 * Stop (close) a provisioning session.
 *
 * @param sessionId - The session ID to stop
 * @returns Final session state
 */
export async function stopSession(
  sessionId: string
): Promise<V1Result<StopSessionData>> {
  return v1Post<StopSessionData>(`/provisioning/batch/${sessionId}/stop`, undefined, {
    requiresAuth: true,
    schema: StopSessionDataSchema,
  });
}

/**
 * Pause a provisioning session.
 *
 * @param sessionId - The session ID to pause
 * @returns Updated session state
 */
export async function pauseSession(
  sessionId: string
): Promise<V1Result<SessionData>> {
  return v1Post<SessionData>(`/provisioning/batch/${sessionId}/pause`, undefined, {
    requiresAuth: true,
    schema: SessionDataSchema,
  });
}

/**
 * Resume a paused provisioning session.
 *
 * @param sessionId - The session ID to resume
 * @returns Updated session state
 */
export async function resumeSession(
  sessionId: string
): Promise<V1Result<SessionData>> {
  return v1Post<SessionData>(`/provisioning/batch/${sessionId}/resume`, undefined, {
    requiresAuth: true,
    schema: SessionDataSchema,
  });
}

// ============================================================================
// Device Operations
// ============================================================================

/**
 * Get all devices in a session.
 *
 * @param sessionId - The session ID
 * @returns List of provisioning candidates
 */
export async function getDevices(
  sessionId: string
): Promise<V1Result<DevicesData>> {
  return v1Get<DevicesData>(`/provisioning/batch/${sessionId}/devices`, {
    requiresAuth: true,
    schema: DevicesDataSchema,
  });
}

/**
 * Provision a single device.
 *
 * @param sessionId - The session ID
 * @param mac - Device MAC address
 * @returns Device operation result
 */
export async function provisionDevice(
  sessionId: string,
  mac: string
): Promise<V1Result<DeviceOperationData>> {
  return v1Post<DeviceOperationData>(
    `/provisioning/batch/${sessionId}/devices/${encodeURIComponent(mac)}/provision`,
    undefined,
    {
      requiresAuth: true,
      schema: DeviceOperationDataSchema,
    }
  );
}

/**
 * Provision all eligible devices in the session.
 *
 * @param sessionId - The session ID
 * @param onlyAllowlisted - Only provision devices in the allowlist (default: true)
 * @returns Provision all result with counts
 */
export async function provisionAll(
  sessionId: string,
  onlyAllowlisted = true
): Promise<V1Result<ProvisionAllData>> {
  return v1Post<ProvisionAllData>(
    `/provisioning/batch/${sessionId}/provision-all`,
    { only_allowlisted: onlyAllowlisted },
    {
      requiresAuth: true,
      schema: ProvisionAllDataSchema,
    }
  );
}

/**
 * Retry provisioning a failed device.
 *
 * @param sessionId - The session ID
 * @param mac - Device MAC address
 * @returns Device operation result
 */
export async function retryDevice(
  sessionId: string,
  mac: string
): Promise<V1Result<DeviceOperationData>> {
  return v1Post<DeviceOperationData>(
    `/provisioning/batch/${sessionId}/devices/${encodeURIComponent(mac)}/retry`,
    undefined,
    {
      requiresAuth: true,
      schema: DeviceOperationDataSchema,
    }
  );
}

/**
 * Skip a device (mark as not provisioning).
 *
 * @param sessionId - The session ID
 * @param mac - Device MAC address
 * @returns Device operation result
 */
export async function skipDevice(
  sessionId: string,
  mac: string
): Promise<V1Result<DeviceOperationData>> {
  return v1Post<DeviceOperationData>(
    `/provisioning/batch/${sessionId}/devices/${encodeURIComponent(mac)}/skip`,
    undefined,
    {
      requiresAuth: true,
      schema: DeviceOperationDataSchema,
    }
  );
}

// ============================================================================
// Network Status
// ============================================================================

/**
 * Get onboarding network status.
 *
 * @returns Network status information
 */
export async function getNetworkStatus(): Promise<V1Result<NetworkStatus>> {
  return v1Get<NetworkStatus>('/provisioning/network/status', {
    requiresAuth: true,
  });
}

// ============================================================================
// Bundled API Object
// ============================================================================

/**
 * Batch provisioning API service.
 * Provides all batch provisioning operations.
 */
export const batchProvisioningApi = {
  // Session management
  startSession,
  getSession,
  stopSession,
  pauseSession,
  resumeSession,

  // Device operations
  getDevices,
  provisionDevice,
  provisionAll,
  retryDevice,
  skipDevice,

  // Network
  getNetworkStatus,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type {
  BatchProvisioningSession,
  ProvisioningCandidate,
  StartSessionRequest,
  StartSessionData,
  SessionData,
  DevicesData,
  DeviceOperationData,
  ProvisionAllData,
  StopSessionData,
  NetworkStatus,
};
