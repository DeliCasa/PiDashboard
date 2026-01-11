/**
 * API Key Management Module
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Manages API key storage and retrieval for protected V1 endpoints.
 * Uses in-memory storage primarily, with sessionStorage fallback for dev mode.
 *
 * Security considerations:
 * - Never stored in localStorage (persists across sessions)
 * - sessionStorage only used in dev mode (cleared on tab close)
 * - In-memory storage preferred for production
 * - API key never logged or exposed in error messages
 */

// ============================================================================
// Internal State
// ============================================================================

/**
 * In-memory API key storage.
 * Highest priority, not persisted anywhere.
 */
let inMemoryKey: string | null = null;

/**
 * Storage key for sessionStorage (dev mode only).
 */
const STORAGE_KEY = 'delicasa-api-key';

// ============================================================================
// API Key Management Functions
// ============================================================================

/**
 * Get the current API key.
 *
 * Priority order:
 * 1. In-memory (set via setApiKey)
 * 2. Environment variable (VITE_API_KEY)
 * 3. sessionStorage (dev mode only)
 *
 * @returns The API key or null if not configured
 */
export function getApiKey(): string | null {
  // 1. Check in-memory first (highest priority)
  if (inMemoryKey) {
    return inMemoryKey;
  }

  // 2. Check build-time environment variable
  const envKey = import.meta.env.VITE_API_KEY as string | undefined;
  if (envKey) {
    return envKey;
  }

  // 3. Check sessionStorage (development only)
  if (import.meta.env.DEV) {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      // sessionStorage may not be available in some contexts
      return null;
    }
  }

  return null;
}

/**
 * Set the API key.
 *
 * In development mode, also persists to sessionStorage so the key
 * survives page refreshes (but not tab closes).
 *
 * @param key - The API key to store
 */
export function setApiKey(key: string): void {
  inMemoryKey = key;

  // Persist to sessionStorage in dev mode for convenience
  if (import.meta.env.DEV) {
    try {
      sessionStorage.setItem(STORAGE_KEY, key);
    } catch {
      // sessionStorage may not be available
    }
  }
}

/**
 * Clear the stored API key.
 *
 * Removes from both in-memory storage and sessionStorage.
 */
export function clearApiKey(): void {
  inMemoryKey = null;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage may not be available
  }
}

/**
 * Check if an API key is currently configured.
 *
 * @returns true if an API key is available
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

// ============================================================================
// Auth Requirement Helpers
// ============================================================================

/**
 * Check if the current environment requires authentication.
 *
 * Development mode may optionally bypass auth for testing.
 * Production always requires auth for protected endpoints.
 *
 * @returns true if auth is required
 */
export function isAuthRequired(): boolean {
  // Check if dev mode bypass is enabled
  if (import.meta.env.DEV) {
    const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';
    if (bypassAuth) {
      return false;
    }
  }

  return true;
}

/**
 * Check if the current environment is in development mode.
 *
 * @returns true if running in development
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Get headers with API key for authenticated requests.
 *
 * @param existingHeaders - Optional existing headers to merge
 * @returns Headers object with API key if available
 * @throws Error if auth is required but no API key is configured
 */
export function getAuthHeaders(existingHeaders?: HeadersInit): HeadersInit {
  const apiKey = getApiKey();

  if (!apiKey && isAuthRequired()) {
    throw new Error('API key required but not configured');
  }

  const headers: Record<string, string> = {};

  // Merge existing headers
  if (existingHeaders) {
    if (existingHeaders instanceof Headers) {
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(existingHeaders)) {
      existingHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, existingHeaders);
    }
  }

  // Add API key header
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate API key format.
 * API keys should be non-empty strings.
 *
 * @param key - The key to validate
 * @returns true if the key format is valid
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Remove whitespace
  const trimmed = key.trim();

  // Minimum length check
  if (trimmed.length < 8) {
    return false;
  }

  // Maximum length check (prevent obviously wrong input)
  if (trimmed.length > 256) {
    return false;
  }

  return true;
}

/**
 * Mask an API key for safe logging/display.
 * Shows only the first 4 and last 4 characters.
 *
 * @param key - The key to mask
 * @returns Masked key like "abcd****efgh"
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return '****';
  }

  const first = key.slice(0, 4);
  const last = key.slice(-4);
  return `${first}****${last}`;
}
