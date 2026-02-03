/**
 * Diagnostics Utilities - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Utility functions for diagnostics feature.
 */

/**
 * Stale capture threshold: 5 minutes (per spec FR-009)
 */
export const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Check if a capture timestamp is stale (> 5 minutes old)
 *
 * @param lastCaptureAt - ISO timestamp of last capture
 * @returns true if capture is stale or invalid, false otherwise
 */
export function isStaleCapture(lastCaptureAt: string | undefined): boolean {
  if (!lastCaptureAt) return false;

  try {
    const lastCapture = new Date(lastCaptureAt).getTime();
    if (isNaN(lastCapture)) return false;
    return Date.now() - lastCapture > STALE_THRESHOLD_MS;
  } catch {
    return false;
  }
}

/**
 * Format a timestamp to relative time (e.g., "2 minutes ago")
 *
 * @param isoString - ISO timestamp
 * @returns Relative time string
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Unknown';

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Format a timestamp to locale time string
 *
 * @param isoString - ISO timestamp
 * @returns Formatted time string
 */
export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid time';

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Invalid time';
  }
}
