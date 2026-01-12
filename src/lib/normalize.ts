/**
 * Data Normalization Utilities
 * Feature: 028-api-compat
 *
 * Defensive helpers to ensure API responses are safely typed,
 * preventing crashes when backend returns unexpected shapes.
 *
 * These utilities complement PiOrchestrator's 028 compatibility fixes,
 * providing client-side resilience for edge cases.
 */

/**
 * Ensures a value is an array, safely handling null, undefined, and non-array values.
 *
 * @param value - Any value that should be treated as an array
 * @returns An array of type T[], guaranteed to be iterable
 *
 * @example
 * // With proper array
 * ensureArray([1, 2, 3]) // => [1, 2, 3]
 *
 * // With null/undefined (legacy API behavior)
 * ensureArray(null) // => []
 * ensureArray(undefined) // => []
 *
 * // With non-array (defensive)
 * ensureArray({ key: 'value' }) // => []
 */
export function ensureArray<T>(value: T[] | null | undefined | unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

/**
 * Ensures a value is an object, safely handling null, undefined, and non-object values.
 *
 * @param value - Any value that should be treated as an object
 * @returns The object or null if the value isn't a proper object
 *
 * @example
 * // With proper object
 * ensureObject({ key: 'value' }) // => { key: 'value' }
 *
 * // With null/undefined
 * ensureObject(null) // => null
 * ensureObject(undefined) // => null
 *
 * // With arrays or primitives
 * ensureObject([1, 2]) // => null
 * ensureObject('string') // => null
 */
export function ensureObject<T extends Record<string, unknown>>(
  value: T | null | undefined | unknown
): T | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  return null;
}

/**
 * Safely extracts a list from an API response, checking multiple common field names.
 *
 * PiOrchestrator V1 API wraps data in envelopes, but field names vary by endpoint.
 * This helper tries common list field names in priority order.
 *
 * @param response - API response object
 * @param fieldNames - Array of field names to try (default: common list fields)
 * @returns Extracted array, guaranteed to be iterable
 *
 * @example
 * // From different endpoint responses
 * extractList({ entries: [1, 2] }) // => [1, 2]
 * extractList({ devices: [1, 2] }) // => [1, 2]
 * extractList({ sessions: [1, 2] }) // => [1, 2]
 * extractList({ data: [1, 2] }) // => [1, 2]
 * extractList({ items: [1, 2] }) // => [1, 2]
 *
 * // Custom field priority
 * extractList({ records: [1] }, ['records']) // => [1]
 */
export function extractList<T>(
  response: Record<string, unknown> | null | undefined,
  fieldNames: string[] = ['entries', 'devices', 'sessions', 'logs', 'data', 'items', 'records']
): T[] {
  if (!response || typeof response !== 'object') {
    return [];
  }

  for (const fieldName of fieldNames) {
    const value = response[fieldName];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

/**
 * Safely extracts a nested data object from V1 API response envelope.
 *
 * @param response - API response with potential nested structure
 * @param path - Dot-separated path to extract (default: 'data')
 * @returns Extracted value or null
 *
 * @example
 * extractData({ data: { entries: [] } }) // => { entries: [] }
 * extractData({ success: true, data: null }) // => null
 */
export function extractData<T>(
  response: Record<string, unknown> | null | undefined,
  path: string = 'data'
): T | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const parts = path.split('.');
  let current: unknown = response;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }

  // Normalize undefined to null for consistent return type
  return (current ?? null) as T | null;
}

/**
 * Normalizes an API response for list endpoints, handling common patterns.
 *
 * This is a convenience function that combines ensureArray with field extraction.
 *
 * @param response - Raw API response
 * @param listField - The field name containing the list (e.g., 'entries', 'devices')
 * @returns Normalized object with guaranteed array
 *
 * @example
 * // API returned null for entries (legacy behavior)
 * normalizeListResponse({ entries: null, count: 0 }, 'entries')
 * // => { entries: [], count: 0 }
 *
 * // API returned proper array
 * normalizeListResponse({ entries: [1, 2], count: 2 }, 'entries')
 * // => { entries: [1, 2], count: 2 }
 */
export function normalizeListResponse<
  T,
  K extends string,
  R extends Record<K, T[] | null | undefined> & Record<string, unknown>
>(response: R | null | undefined, listField: K): R & Record<K, T[]> {
  if (!response) {
    return { [listField]: [] } as R & Record<K, T[]>;
  }

  return {
    ...response,
    [listField]: ensureArray<T>(response[listField]),
  } as R & Record<K, T[]>;
}

/**
 * Type guard to check if a value is a non-empty array.
 *
 * @param value - Any value to check
 * @returns true if value is an array with at least one element
 */
export function isNonEmptyArray<T>(value: T[] | null | undefined | unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Default values for common API response fields.
 * Use these when creating fallback response objects.
 */
export const DEFAULT_LIST_RESPONSE = {
  entries: [] as unknown[],
  devices: [] as unknown[],
  sessions: [] as unknown[],
  count: 0,
} as const;
