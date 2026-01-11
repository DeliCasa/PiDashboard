/**
 * ProvisioningCandidateCard Component
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Card for displaying and controlling a single provisioning candidate device.
 */

import {
  Wifi,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  SkipForward,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProvisioningCandidate, CandidateState } from '@/domain/types/provisioning';

// ============================================================================
// Types
// ============================================================================

interface ProvisioningCandidateCardProps {
  /** Device candidate data */
  device: ProvisioningCandidate;
  /** Current progress percentage (0-100) for provisioning/verifying states */
  progress?: number;
  /** Handler for provision action */
  onProvision?: (mac: string) => void;
  /** Handler for retry action */
  onRetry?: (mac: string) => void;
  /** Handler for skip action */
  onSkip?: (mac: string) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// State Configuration
// ============================================================================

const stateConfig: Record<
  CandidateState,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: typeof Wifi;
    showProgress: boolean;
  }
> = {
  discovered: {
    label: 'Discovered',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'border-blue-500/50 bg-blue-500/5',
    icon: Wifi,
    showProgress: false,
  },
  provisioning: {
    label: 'Provisioning',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'border-yellow-500/50 bg-yellow-500/5',
    icon: Loader2,
    showProgress: true,
  },
  provisioned: {
    label: 'Provisioned',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'border-cyan-500/50 bg-cyan-500/5',
    icon: CheckCircle2,
    showProgress: false,
  },
  verifying: {
    label: 'Verifying',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'border-purple-500/50 bg-purple-500/5',
    icon: Clock,
    showProgress: true,
  },
  verified: {
    label: 'Verified',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'border-green-500/50 bg-green-500/5',
    icon: CheckCircle2,
    showProgress: false,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'border-red-500/50 bg-red-500/5',
    icon: XCircle,
    showProgress: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get signal strength icon and color based on RSSI value.
 */
function getSignalInfo(rssi: number): { label: string; color: string } {
  if (rssi >= -50) return { label: 'Excellent', color: 'text-green-500' };
  if (rssi >= -60) return { label: 'Good', color: 'text-green-400' };
  if (rssi >= -70) return { label: 'Fair', color: 'text-yellow-500' };
  return { label: 'Weak', color: 'text-red-500' };
}

/**
 * Format MAC address for display.
 */
function formatMac(mac: string): string {
  return mac.toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

/**
 * Card displaying a single provisioning candidate device with status and actions.
 */
export function ProvisioningCandidateCard({
  device,
  progress = 0,
  onProvision,
  onRetry,
  onSkip,
  disabled = false,
  className,
}: ProvisioningCandidateCardProps) {
  const config = stateConfig[device.state];
  const StateIcon = config.icon;
  const signalInfo = getSignalInfo(device.rssi);

  const canProvision = device.state === 'discovered' && device.in_allowlist;
  const canRetry = device.state === 'failed';
  const canSkip = device.state === 'discovered' || device.state === 'failed';
  const isProcessing = device.state === 'provisioning' || device.state === 'verifying';

  return (
    <Card
      className={cn(
        'transition-colors',
        config.bgColor,
        className
      )}
      data-testid="candidate-card"
      data-mac={device.mac}
      data-state={device.state}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Device Info */}
          <div className="flex-1 space-y-2">
            {/* MAC Address and State Badge */}
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm font-medium">
                {formatMac(device.mac)}
              </code>
              <Badge
                variant="outline"
                className={cn('text-xs', config.color)}
              >
                <StateIcon
                  className={cn(
                    'mr-1 h-3 w-3',
                    isProcessing && 'animate-spin'
                  )}
                />
                {config.label}
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {device.in_allowlist ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {device.in_allowlist ? 'In allowlist' : 'Not in allowlist'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Details Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>IP: {device.ip}</span>
              <span className={signalInfo.color}>
                RSSI: {device.rssi} dBm ({signalInfo.label})
              </span>
              <span>FW: {device.firmware_version}</span>
              {device.container_id && (
                <span>Container: {device.container_id}</span>
              )}
            </div>

            {/* Progress Bar for Processing States */}
            {config.showProgress && progress > 0 && (
              <div className="pt-1">
                <Progress
                  value={progress}
                  className="h-1.5"
                  aria-label={`${progress}% ${device.state}`}
                />
              </div>
            )}

            {/* Error Message */}
            {device.error_message && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {device.error_message}
              </div>
            )}

            {/* Retry Count */}
            {device.retry_count > 0 && (
              <span className="text-xs text-muted-foreground">
                Retries: {device.retry_count}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {canProvision && onProvision && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onProvision(device.mac)}
                disabled={disabled}
                className="h-7"
                data-testid="provision-button"
              >
                <Play className="mr-1 h-3 w-3" />
                Provision
              </Button>
            )}

            {!device.in_allowlist && device.state === 'discovered' && (
              <span className="text-xs text-muted-foreground">
                Not in allowlist
              </span>
            )}

            {canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(device.mac)}
                disabled={disabled}
                className="h-7"
                data-testid="retry-button"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            )}

            {canSkip && onSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSkip(device.mac)}
                disabled={disabled}
                className="h-7 text-muted-foreground"
                data-testid="skip-button"
              >
                <SkipForward className="mr-1 h-3 w-3" />
                Skip
              </Button>
            )}

            {device.state === 'verified' && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
