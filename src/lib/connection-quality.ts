/**
 * Connection Quality Utilities
 * Feature: 044-evidence-ci-remediation
 *
 * Extracted from ConnectionQualityBadge to fix React Fast Refresh violation.
 * Component files should only export React components.
 */

import {
  type ConnectionQuality,
  DEFAULT_CONNECTION_QUALITY_THRESHOLDS,
} from '@/domain/types/camera-diagnostics';

/**
 * Get connection quality from RSSI value
 * @param rssi - WiFi signal strength in dBm (typically -30 to -90)
 * @returns Connection quality category
 */
export function getConnectionQuality(rssi: number): ConnectionQuality {
  const { excellent, good, fair } = DEFAULT_CONNECTION_QUALITY_THRESHOLDS;

  if (rssi >= excellent) return 'excellent';
  if (rssi >= good) return 'good';
  if (rssi >= fair) return 'fair';
  return 'poor';
}
