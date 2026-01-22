/**
 * AutoOnboardPanel Component
 * Feature: 035-auto-onboard-dashboard
 *
 * Container component for all auto-onboard functionality.
 * Integrates with CameraSection (FR-027).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useAutoOnboardStatus,
  useAutoOnboardToggle,
  useAutoOnboardEvents,
  useResetMetrics,
  useCleanupEvents,
} from '@/application/hooks/useAutoOnboard';
import { V1ApiError, getUserMessage } from '@/infrastructure/api/errors';
import { DevModeWarningBanner } from './DevModeWarningBanner';
import { AutoOnboardStatusCard } from './AutoOnboardStatusCard';
import { AutoOnboardMetricsCard } from './AutoOnboardMetricsCard';
import { AutoOnboardConfigCard } from './AutoOnboardConfigCard';
import { AuditEventsPanel } from './AuditEventsPanel';

interface AutoOnboardPanelProps {
  className?: string;
}

export function AutoOnboardPanel({ className }: AutoOnboardPanelProps) {
  // State for filters
  const [macFilter, setMacFilter] = useState('');
  const [sinceFilter, setSinceFilter] = useState<string>('');
  const [eventsOffset, setEventsOffset] = useState(0);

  // Accessibility: aria-live region for status announcements (T070)
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const previousEnabledRef = useRef<boolean | undefined>(undefined);

  // Hooks
  const {
    data: status,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    error: statusError,
    refetch: refetchStatus,
  } = useAutoOnboardStatus();

  const toggleMutation = useAutoOnboardToggle();
  const resetMetricsMutation = useResetMetrics();
  const cleanupMutation = useCleanupEvents();

  // Events query with filters
  const {
    data: events,
    isLoading: isLoadingEvents,
  } = useAutoOnboardEvents(
    {
      mac: macFilter || undefined,
      since: sinceFilter ? new Date(sinceFilter).toISOString() : undefined,
      limit: 20,
      offset: eventsOffset,
    },
    // Only fetch events when panel is visible and status loaded
    !!status
  );

  // Handlers
  const handleToggle = useCallback(
    async (enabled: boolean) => {
      try {
        await toggleMutation.mutateAsync(enabled ? 'enable' : 'disable');
        toast.success(
          enabled ? 'Auto-onboard enabled' : 'Auto-onboard disabled',
          {
            description: enabled
              ? 'ESP-CAM devices will be automatically discovered and paired.'
              : 'Automatic device discovery has been stopped.',
          }
        );
      } catch (error) {
        const message = V1ApiError.isV1ApiError(error)
          ? getUserMessage(error.code)
          : error instanceof Error
            ? error.message
            : 'Unknown error';
        toast.error('Toggle failed', { description: message });
      }
    },
    [toggleMutation]
  );

  const handleResetMetrics = useCallback(async () => {
    try {
      await resetMetricsMutation.mutateAsync();
      toast.success('Metrics reset', { description: 'All counters have been reset to zero.' });
    } catch (error) {
      const message = V1ApiError.isV1ApiError(error)
        ? getUserMessage(error.code)
        : error instanceof Error
          ? error.message
          : 'Unknown error';
      toast.error('Reset failed', { description: message });
    }
  }, [resetMetricsMutation]);

  const handleCleanup = useCallback(
    async (days: number) => {
      try {
        const result = await cleanupMutation.mutateAsync({ days });
        toast.success('Cleanup complete', {
          description: result.message || `Deleted ${result.deleted_count} old events.`,
        });
      } catch (error) {
        const message = V1ApiError.isV1ApiError(error)
          ? getUserMessage(error.code)
          : error instanceof Error
            ? error.message
            : 'Unknown error';
        toast.error('Cleanup failed', { description: message });
      }
    },
    [cleanupMutation]
  );

  const handleMacFilterChange = useCallback((mac: string) => {
    setMacFilter(mac);
    setEventsOffset(0); // Reset pagination on filter change
  }, []);

  const handleSinceFilterChange = useCallback((since: string) => {
    setSinceFilter(since);
    setEventsOffset(0); // Reset pagination on filter change
  }, []);

  // Accessibility: Announce status changes for screen readers (T070)
  useEffect(() => {
    if (status && previousEnabledRef.current !== undefined) {
      if (status.enabled !== previousEnabledRef.current) {
        const announcement = status.enabled
          ? 'Auto-onboard is now enabled. ESP-CAM devices will be automatically discovered.'
          : 'Auto-onboard is now disabled.';
        setStatusAnnouncement(announcement);
        // Clear announcement after it's been read
        const timer = setTimeout(() => setStatusAnnouncement(''), 3000);
        return () => clearTimeout(timer);
      }
    }
    previousEnabledRef.current = status?.enabled;
  }, [status?.enabled, status]);

  // Loading state
  if (isLoadingStatus) {
    return (
      <div
        className={cn('flex items-center justify-center py-6', className)}
        data-testid="auto-onboard-loading"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading auto-onboard status...</span>
      </div>
    );
  }

  // Error state - could be that feature is not available
  if (isStatusError) {
    // Check if it's "not available" error - just hide the panel
    if (
      V1ApiError.isV1ApiError(statusError) &&
      statusError.code === 'ONBOARD_NOT_AVAILABLE'
    ) {
      // Feature not available - don't show anything
      return null;
    }

    // Other errors - show error state with retry
    return (
      <div
        className={cn('py-6 text-center', className)}
        data-testid="auto-onboard-error"
      >
        <AlertCircle className="mx-auto h-6 w-6 text-destructive opacity-70" />
        <p className="mt-2 text-sm text-destructive">
          {V1ApiError.isV1ApiError(statusError)
            ? getUserMessage(statusError.code)
            : 'Failed to load auto-onboard status'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => refetchStatus()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // No status data - feature not available
  if (!status) {
    return null;
  }

  const isDevMode = status.mode === 'dev';

  return (
    <div className={cn('space-y-4', className)} data-testid="auto-onboard-panel">
      {/* Accessibility: Screen reader announcements for status changes (T070) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="status-announcement"
      >
        {statusAnnouncement}
      </div>

      {/* Warning banner when enabled */}
      {status.enabled && <DevModeWarningBanner />}

      {/* Status and Toggle */}
      <AutoOnboardStatusCard
        status={status}
        onToggle={handleToggle}
        isToggling={toggleMutation.isPending}
      />

      {/* Only show additional cards if mode is "dev" */}
      {isDevMode && (
        <>
          {/* Metrics */}
          <AutoOnboardMetricsCard
            metrics={status.metrics}
            onReset={handleResetMetrics}
            isResetting={resetMetricsMutation.isPending}
          />

          {/* Configuration (read-only) */}
          <AutoOnboardConfigCard config={status.config} />

          {/* Audit Events */}
          <AuditEventsPanel
            events={events}
            isLoading={isLoadingEvents}
            macFilter={macFilter}
            onMacFilterChange={handleMacFilterChange}
            sinceFilter={sinceFilter}
            onSinceFilterChange={handleSinceFilterChange}
            onPageChange={setEventsOffset}
            onCleanup={handleCleanup}
            isCleaningUp={cleanupMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
