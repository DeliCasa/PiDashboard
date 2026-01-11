/**
 * SessionProgress Component
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Displays batch provisioning session status and progress.
 */

import { Square, Play, Pause, RefreshCw, Clock, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BatchProvisioningSession, SessionState } from '@/domain/types/provisioning';
import { ConnectionDot } from '../common/ConnectionStatus';
import type { SSEConnectionState } from '@/domain/types/sse';

// ============================================================================
// Types
// ============================================================================

interface SessionProgressProps {
  /** Current session data */
  session: BatchProvisioningSession;
  /** SSE connection state */
  connectionState: SSEConnectionState;
  /** Device count breakdown */
  deviceCounts: {
    discovered: number;
    provisioning: number;
    provisioned: number;
    verifying: number;
    verified: number;
    failed: number;
    total: number;
  };
  /** Whether provision all is in progress */
  isProvisioningAll?: boolean;
  /** Handler for stop session */
  onStop?: () => void;
  /** Handler for pause session */
  onPause?: () => void;
  /** Handler for resume session */
  onResume?: () => void;
  /** Handler for provision all */
  onProvisionAll?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// State Configuration
// ============================================================================

const stateConfig: Record<SessionState, { label: string; color: string; icon: typeof Circle }> = {
  discovering: { label: 'Discovering', color: 'bg-blue-500', icon: RefreshCw },
  active: { label: 'Active', color: 'bg-green-500', icon: Play },
  paused: { label: 'Paused', color: 'bg-yellow-500', icon: Pause },
  closing: { label: 'Closing', color: 'bg-orange-500', icon: Square },
  closed: { label: 'Closed', color: 'bg-muted', icon: Square },
};

// ============================================================================
// Component
// ============================================================================

/**
 * Session progress display with controls and device counts.
 */
export function SessionProgress({
  session,
  connectionState,
  deviceCounts,
  isProvisioningAll = false,
  onStop,
  onPause,
  onResume,
  onProvisionAll,
  className,
}: SessionProgressProps) {
  const config = stateConfig[session.state];
  const StateIcon = config.icon;

  // Calculate progress percentage
  const completedCount = deviceCounts.verified + deviceCounts.failed;
  const progressPercent =
    deviceCounts.total > 0 ? Math.round((completedCount / deviceCounts.total) * 100) : 0;

  const isActive = session.state === 'active' || session.state === 'discovering';
  const isPaused = session.state === 'paused';
  const isClosed = session.state === 'closed' || session.state === 'closing';

  return (
    <Card className={cn('w-full', className)} data-testid="session-progress">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Session Progress</CardTitle>
            <Badge
              variant="outline"
              className={cn('text-xs', config.color.replace('bg-', 'text-'))}
            >
              <StateIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
            <ConnectionDot state={connectionState} />
          </div>
          <span className="text-xs text-muted-foreground">
            ID: {session.id.slice(-8)}
          </span>
        </div>
        <CardDescription>
          Target Network: <strong>{session.target_ssid}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completion</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress
            value={progressPercent}
            className="h-2"
            aria-label={`${progressPercent}% complete`}
          />
        </div>

        {/* Device Counts */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <CountBadge
            label="Discovered"
            count={deviceCounts.discovered}
            variant="default"
          />
          <CountBadge
            label="Provisioning"
            count={deviceCounts.provisioning}
            variant="warning"
          />
          <CountBadge
            label="Provisioned"
            count={deviceCounts.provisioned}
            variant="info"
          />
          <CountBadge
            label="Verifying"
            count={deviceCounts.verifying}
            variant="warning"
          />
          <CountBadge
            label="Verified"
            count={deviceCounts.verified}
            icon={CheckCircle2}
            variant="success"
          />
          <CountBadge
            label="Failed"
            count={deviceCounts.failed}
            icon={XCircle}
            variant="destructive"
          />
        </div>

        {/* Session Controls */}
        {!isClosed && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {/* Provision All */}
            {isActive && deviceCounts.discovered > 0 && onProvisionAll && (
              <Button
                onClick={onProvisionAll}
                disabled={isProvisioningAll}
                size="sm"
                data-testid="provision-all-button"
              >
                {isProvisioningAll ? (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Play className="mr-1 h-3 w-3" />
                    Provision All ({deviceCounts.discovered})
                  </>
                )}
              </Button>
            )}

            {/* Pause/Resume */}
            {isActive && onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                data-testid="pause-button"
              >
                <Pause className="mr-1 h-3 w-3" />
                Pause
              </Button>
            )}
            {isPaused && onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                data-testid="resume-button"
              >
                <Play className="mr-1 h-3 w-3" />
                Resume
              </Button>
            )}

            {/* Stop */}
            {(isActive || isPaused) && onStop && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onStop}
                data-testid="stop-button"
              >
                <Square className="mr-1 h-3 w-3" />
                Stop Session
              </Button>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Started: {new Date(session.created_at).toLocaleTimeString()}
          </span>
          {session.expires_at && (
            <span>
              Expires: {new Date(session.expires_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface CountBadgeProps {
  label: string;
  count: number;
  icon?: typeof Circle;
  variant: 'default' | 'info' | 'warning' | 'success' | 'destructive';
}

function CountBadge({ label, count, icon: Icon, variant }: CountBadgeProps) {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    destructive: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg p-2',
        variantClasses[variant]
      )}
    >
      <div className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        <span className="text-lg font-bold">{count}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </div>
  );
}
