/**
 * Device Allowlist API Service
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * API client for device allowlist management endpoints.
 * Enables administrators to manage approved device MAC addresses for provisioning.
 */

import type {
  DeviceAllowlistEntry,
  AllowlistEntryRequest,
  AllowlistData,
} from '@/domain/types/provisioning';
import type { V1Result } from '@/domain/types/v1-api';
import { v1Get, v1Post, v1Delete, v1Patch } from './v1-client';
import {
  AllowlistDataSchema,
  DeviceAllowlistEntrySchema,
} from './schemas';
import { z } from 'zod';

// ============================================================================
// Response Data Schemas
// ============================================================================

/**
 * Single entry response schema.
 */
const AllowlistEntryResponseSchema = z.object({
  entry: DeviceAllowlistEntrySchema,
  message: z.string().optional(),
});

/**
 * Delete response schema.
 */
const AllowlistDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// Allowlist Operations
// ============================================================================

/**
 * Get all allowlist entries.
 *
 * @returns List of allowlist entries
 */
export async function listEntries(): Promise<V1Result<AllowlistData>> {
  return v1Get<AllowlistData>('/provisioning/allowlist', {
    requiresAuth: true,
    schema: AllowlistDataSchema,
  });
}

/**
 * Get a specific allowlist entry by MAC address.
 *
 * @param mac - Device MAC address
 * @returns Allowlist entry if found
 */
export async function getEntry(
  mac: string
): Promise<V1Result<{ entry: DeviceAllowlistEntry }>> {
  return v1Get<{ entry: DeviceAllowlistEntry }>(
    `/provisioning/allowlist/${encodeURIComponent(mac)}`,
    {
      requiresAuth: true,
      schema: AllowlistEntryResponseSchema,
    }
  );
}

/**
 * Add a new device to the allowlist.
 *
 * @param request - Allowlist entry data
 * @returns Created allowlist entry
 */
export async function addEntry(
  request: AllowlistEntryRequest
): Promise<V1Result<{ entry: DeviceAllowlistEntry; message?: string }>> {
  return v1Post<{ entry: DeviceAllowlistEntry; message?: string }>(
    '/provisioning/allowlist',
    request,
    {
      requiresAuth: true,
      schema: AllowlistEntryResponseSchema,
    }
  );
}

/**
 * Update an existing allowlist entry.
 *
 * @param mac - Device MAC address
 * @param updates - Fields to update (description, container_id)
 * @returns Updated allowlist entry
 */
export async function updateEntry(
  mac: string,
  updates: Partial<Pick<AllowlistEntryRequest, 'description' | 'container_id'>>
): Promise<V1Result<{ entry: DeviceAllowlistEntry; message?: string }>> {
  return v1Patch<{ entry: DeviceAllowlistEntry; message?: string }>(
    `/provisioning/allowlist/${encodeURIComponent(mac)}`,
    updates,
    {
      requiresAuth: true,
      schema: AllowlistEntryResponseSchema,
    }
  );
}

/**
 * Remove a device from the allowlist.
 *
 * @param mac - Device MAC address
 * @returns Deletion confirmation
 */
export async function removeEntry(
  mac: string
): Promise<V1Result<{ success: boolean; message: string }>> {
  return v1Delete<{ success: boolean; message: string }>(
    `/provisioning/allowlist/${encodeURIComponent(mac)}`,
    {
      requiresAuth: true,
      schema: AllowlistDeleteResponseSchema,
    }
  );
}

/**
 * Add multiple devices to the allowlist.
 *
 * @param entries - Array of allowlist entry requests
 * @returns Bulk operation result
 */
export async function bulkAdd(
  entries: AllowlistEntryRequest[]
): Promise<V1Result<{ added: number; skipped: number; message: string }>> {
  return v1Post<{ added: number; skipped: number; message: string }>(
    '/provisioning/allowlist/bulk',
    { entries },
    {
      requiresAuth: true,
    }
  );
}

/**
 * Remove multiple devices from the allowlist.
 *
 * @param macs - Array of MAC addresses to remove
 * @returns Bulk operation result
 */
export async function bulkRemove(
  macs: string[]
): Promise<V1Result<{ removed: number; not_found: number; message: string }>> {
  return v1Post<{ removed: number; not_found: number; message: string }>(
    '/provisioning/allowlist/bulk-remove',
    { macs },
    {
      requiresAuth: true,
    }
  );
}

/**
 * Clear all entries from the allowlist.
 * WARNING: This is a destructive operation!
 *
 * @param confirm - Must be 'CONFIRM' to proceed
 * @returns Deletion result
 */
export async function clearAll(
  confirm: string
): Promise<V1Result<{ cleared: number; message: string }>> {
  if (confirm !== 'CONFIRM') {
    throw new Error('Must confirm with "CONFIRM" to clear all entries');
  }

  return v1Delete<{ cleared: number; message: string }>(
    '/provisioning/allowlist/all',
    {
      requiresAuth: true,
    }
  );
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Check if a MAC address is in the allowlist.
 *
 * @param mac - Device MAC address
 * @returns true if device is in allowlist
 */
export async function isAllowed(mac: string): Promise<boolean> {
  try {
    await getEntry(mac);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get usage statistics for the allowlist.
 *
 * @returns Usage statistics
 */
export async function getStats(): Promise<
  V1Result<{ total: number; used: number; available: number }>
> {
  return v1Get<{ total: number; used: number; available: number }>(
    '/provisioning/allowlist/stats',
    {
      requiresAuth: true,
    }
  );
}

// ============================================================================
// Bundled API Object
// ============================================================================

/**
 * Device allowlist API service.
 * Provides all allowlist management operations.
 */
export const allowlistApi = {
  // CRUD operations
  list: listEntries,
  get: getEntry,
  add: addEntry,
  update: updateEntry,
  remove: removeEntry,

  // Bulk operations
  bulkAdd,
  bulkRemove,
  clearAll,

  // Helpers
  isAllowed,
  getStats,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type { DeviceAllowlistEntry, AllowlistEntryRequest, AllowlistData };
