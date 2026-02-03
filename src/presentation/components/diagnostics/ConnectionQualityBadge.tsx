/**
 * ConnectionQualityBadge Component
 * Feature: 042-diagnostics-integration
 *
 * Displays WiFi connection quality as a colored badge.
 * Quality is derived from RSSI values using DEFAULT_CONNECTION_QUALITY_THRESHOLDS.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type ConnectionQuality,
  DEFAULT_CONNECTION_QUALITY_THRESHOLDS,
} from '@/domain/types/camera-diagnostics';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionQualityBadgeProps {
  /** Connection quality level */
  quality: ConnectionQuality;
  /** Optional RSSI value to display */
  rssi?: number;
  /** Show RSSI value in badge */
  showRssi?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get connection quality from RSSI value
 */
export function getConnectionQuality(rssi: number): ConnectionQuality {
  const { excellent, good, fair } = DEFAULT_CONNECTION_QUALITY_THRESHOLDS;

  if (rssi >= excellent) return 'excellent';
  if (rssi >= good) return 'good';
  if (rssi >= fair) return 'fair';
  return 'poor';
}

/**
 * Quality to color mapping
 */
const qualityColors: Record<ConnectionQuality, string> = {
  excellent: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  good: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  fair: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  poor: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
};

/**
 * Quality to label mapping
 */
const qualityLabels: Record<ConnectionQuality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

/**
 * ConnectionQualityBadge displays WiFi signal quality as a colored badge
 */
export function ConnectionQualityBadge({
  quality,
  rssi,
  showRssi = false,
  className,
}: ConnectionQualityBadgeProps) {
  const isPoor = quality === 'poor';
  const Icon = isPoor ? WifiOff : Wifi;

  return (
    <Badge
      variant="outline"
      className={cn(qualityColors[quality], className)}
      data-testid="connection-quality-badge"
      data-quality={quality}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{qualityLabels[quality]}</span>
      {showRssi && rssi !== undefined && (
        <span className="opacity-70">({rssi} dBm)</span>
      )}
    </Badge>
  );
}

/**
 * Convenience component that calculates quality from RSSI
 */
export function ConnectionQualityFromRssi({
  rssi,
  showRssi = true,
  className,
}: {
  rssi: number;
  showRssi?: boolean;
  className?: string;
}) {
  const quality = getConnectionQuality(rssi);

  return (
    <ConnectionQualityBadge
      quality={quality}
      rssi={rssi}
      showRssi={showRssi}
      className={className}
    />
  );
}
