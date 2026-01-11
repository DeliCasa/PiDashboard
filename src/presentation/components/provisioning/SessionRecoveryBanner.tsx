/**
 * SessionRecoveryBanner Component
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T038
 *
 * Banner displayed when there are recoverable provisioning sessions.
 * Allows field technicians to resume interrupted sessions.
 */

import { useState } from 'react';
import {
  Clock,
  Loader2,
  PlayCircle,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { BatchProvisioningSession, SessionData } from '@/domain/types/provisioning';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SessionRecoveryBannerProps {
  /** Recoverable sessions to display */
  sessions: BatchProvisioningSession[];
  /** Whether the sessions are being loaded */
  isLoading?: boolean;
  /** Callback when resume is requested */
  onResume?: (sessionId: string) => Promise<SessionData>;
  /** Callback when discard is requested */
  onDiscard?: (sessionId: string) => Promise<void>;
  /** Callback when the banner is dismissed */
  onDismiss?: () => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format ISO date to relative time.
 */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Get session state badge variant.
 */
function getStateBadgeVariant(state: string): 'default' | 'secondary' | 'outline' {
  switch (state) {
    case 'active':
      return 'default';
    case 'paused':
      return 'secondary';
    default:
      return 'outline';
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Banner showing recoverable sessions with resume/discard options.
 *
 * Features:
 * - Shows most recent recoverable session prominently
 * - Displays session state, target network, and device counts
 * - Allows resuming or discarding sessions
 * - Dismissable banner
 */
export function SessionRecoveryBanner({
  sessions,
  isLoading = false,
  onResume,
  onDiscard,
  onDismiss,
  disabled = false,
  className,
}: SessionRecoveryBannerProps) {
  const [isResuming, setIsResuming] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show loading state while checking for sessions
  if (isLoading) {
    return (
      <Alert className={cn('relative', className)} data-testid="recovery-banner-loading">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking for recoverable sessions...</AlertTitle>
      </Alert>
    );
  }

  // Don't render if no sessions or dismissed
  if (sessions.length === 0 || dismissed) {
    return null;
  }

  const session = sessions[0]; // Most recent session

  const handleResume = async () => {
    if (!onResume || disabled || isResuming) return;

    setIsResuming(true);
    try {
      await onResume(session.id);
    } finally {
      setIsResuming(false);
    }
  };

  const handleDiscard = async () => {
    if (!onDiscard || disabled || isDiscarding) return;

    setIsDiscarding(true);
    try {
      await onDiscard(session.id);
      setShowDiscardDialog(false);
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <>
      <Alert
        className={cn('relative', className)}
        data-testid="session-recovery-banner"
      >
        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={handleDismiss}
          aria-label="Dismiss recovery banner"
          data-testid="dismiss-banner-button"
        >
          <X className="h-4 w-4" />
        </Button>

        <RefreshCw className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Resume Previous Session?
          <Badge
            variant={getStateBadgeVariant(session.state)}
            className="text-xs"
            data-testid="session-state-badge"
          >
            {session.state}
          </Badge>
        </AlertTitle>
        <AlertDescription className="space-y-3">
          {/* Session Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span data-testid="session-target-ssid">
              Target: <strong>{session.target_ssid}</strong>
            </span>
            <span className="flex items-center gap-1" data-testid="session-updated-time">
              <Clock className="h-3 w-3" />
              Updated {formatRelativeTime(session.updated_at)}
            </span>
          </div>

          {/* Device Counts */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" data-testid="device-count-discovered">
              {session.device_count} discovered
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                session.provisioned_count > 0 &&
                  'bg-blue-500/10 text-blue-600 border-blue-500/20'
              )}
              data-testid="device-count-provisioned"
            >
              {session.provisioned_count} provisioned
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                session.verified_count > 0 &&
                  'bg-green-500/10 text-green-600 border-green-500/20'
              )}
              data-testid="device-count-verified"
            >
              {session.verified_count} verified
            </Badge>
            {session.failed_count > 0 && (
              <Badge
                variant="outline"
                className="bg-red-500/10 text-red-600 border-red-500/20"
                data-testid="device-count-failed"
              >
                {session.failed_count} failed
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleResume}
              disabled={disabled || isResuming || isDiscarding}
              data-testid="resume-session-button"
            >
              {isResuming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Resume Session
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiscardDialog(true)}
              disabled={disabled || isResuming || isDiscarding}
              data-testid="discard-session-button"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Discard
            </Button>
          </div>

          {/* Multiple sessions indicator */}
          {sessions.length > 1 && (
            <p className="text-xs text-muted-foreground" data-testid="multiple-sessions-note">
              {sessions.length - 1} more recoverable session{sessions.length > 2 ? 's' : ''} available
            </p>
          )}
        </AlertDescription>
      </Alert>

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently close the session for{' '}
              <span className="font-medium">{session.target_ssid}</span>. Any
              unprovisioned devices will need to start a new session.
              {session.provisioned_count > 0 && (
                <>
                  <br />
                  <span className="text-foreground">
                    {session.provisioned_count} device
                    {session.provisioned_count > 1 ? 's' : ''} already provisioned will
                    not be affected.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDiscarding}
              data-testid="cancel-discard-button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              disabled={isDiscarding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-discard-button"
            >
              {isDiscarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discarding...
                </>
              ) : (
                'Discard Session'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
