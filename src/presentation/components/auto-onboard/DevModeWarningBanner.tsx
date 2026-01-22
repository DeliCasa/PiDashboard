/**
 * DevModeWarningBanner Component
 * Feature: 035-auto-onboard-dashboard
 *
 * Alert banner displayed when auto-onboard is enabled (DEV MODE).
 * Uses role="alert" for accessibility (FR-004).
 */

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface DevModeWarningBannerProps {
  className?: string;
}

export function DevModeWarningBanner({ className }: DevModeWarningBannerProps) {
  return (
    <Alert
      variant="destructive"
      role="alert"
      className={cn('mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20', className)}
      data-testid="dev-mode-warning-banner"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">DEV MODE Active</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        Auto-onboard is enabled. ESP-CAM devices on the network will be automatically
        discovered and paired. This should only be used during development.
      </AlertDescription>
    </Alert>
  );
}
