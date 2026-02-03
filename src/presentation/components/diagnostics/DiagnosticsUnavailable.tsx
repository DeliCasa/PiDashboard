/**
 * DiagnosticsUnavailable Component
 * Feature: 042-diagnostics-integration (T017)
 *
 * Fallback component displayed when camera diagnostics are not available.
 * Used when backend doesn't support diagnostics or camera is unreachable.
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

interface DiagnosticsUnavailableProps {
  /** Reason for unavailability */
  reason?: 'offline' | 'not-supported' | 'error';
  /** Camera name for context */
  cameraName?: string;
  /** Callback to retry fetching diagnostics */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Messages for different unavailability reasons
 */
const reasonMessages: Record<string, { title: string; description: string }> = {
  offline: {
    title: 'Camera Offline',
    description: 'Diagnostics are not available while the camera is offline.',
  },
  'not-supported': {
    title: 'Diagnostics Not Supported',
    description: 'This camera does not support diagnostics features.',
  },
  error: {
    title: 'Unable to Load',
    description: 'Failed to load diagnostics data. Please try again.',
  },
};

/**
 * DiagnosticsUnavailable displays a fallback when diagnostics cannot be shown
 */
export function DiagnosticsUnavailable({
  reason = 'error',
  cameraName,
  onRetry,
  isRetrying = false,
  className,
}: DiagnosticsUnavailableProps) {
  const message = reasonMessages[reason] || reasonMessages.error;

  return (
    <Card className={cn('', className)} data-testid="diagnostics-unavailable">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <WifiOff
            className="h-10 w-10 text-muted-foreground mb-3"
            aria-hidden="true"
          />
          <h3 className="font-medium text-sm" data-testid="unavailable-title">
            {message.title}
          </h3>
          <p
            className="text-sm text-muted-foreground mt-1 max-w-xs"
            data-testid="unavailable-description"
          >
            {cameraName ? `${cameraName}: ` : ''}
            {message.description}
          </p>
          {onRetry && reason === 'error' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-4"
              data-testid="retry-button"
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', isRetrying && 'animate-spin')}
                aria-hidden="true"
              />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DiagnosticsUnavailable;
