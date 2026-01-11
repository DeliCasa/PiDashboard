/**
 * BatchProvisioningSection Component
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Main section component for batch device provisioning.
 * Orchestrates session management, SSE events, and device list.
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StartSessionForm } from './StartSessionForm';
import { SessionProgress } from './SessionProgress';
import { ProvisioningCandidateCard } from './ProvisioningCandidateCard';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { useBatchProvisioningEvents } from '@/application/hooks/useBatchProvisioningEvents';
import {
  startSession,
  stopSession,
  pauseSession,
  resumeSession,
  provisionDevice,
  provisionAll,
  retryDevice,
  skipDevice,
} from '@/infrastructure/api/batch-provisioning';
import { V1ApiError } from '@/infrastructure/api/errors';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BatchProvisioningSectionProps {
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Main batch provisioning section with full workflow support.
 *
 * Features:
 * - Start/stop/pause/resume sessions
 * - Real-time device updates via SSE
 * - Provision individual or all devices
 * - Retry failed devices
 * - Error handling with user-friendly messages
 */
export function BatchProvisioningSection({ className }: BatchProvisioningSectionProps) {
  // Local state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SSE events hook
  const {
    connectionState,
    error: sseError,
    session,
    devices,
    deviceCounts,
    reconnect,
    updateSession,
  } = useBatchProvisioningEvents({
    sessionId,
    enabled: !!sessionId,
    onSessionUpdate: (updatedSession) => {
      // Auto-clear session if closed
      if (updatedSession.state === 'closed') {
        toast.info('Session closed');
      }
    },
    onDeviceDiscovered: (payload) => {
      toast.info(`Device discovered: ${payload.mac}`, {
        description: payload.in_allowlist ? 'Ready to provision' : 'Not in allowlist',
      });
    },
    onDeviceStateChanged: (payload) => {
      if (payload.new_state === 'verified') {
        toast.success(`Device verified: ${payload.mac}`);
      } else if (payload.new_state === 'failed') {
        toast.error(`Device failed: ${payload.mac}`, {
          description: payload.error,
        });
      }
    },
    onError: (code, message) => {
      setError(`${code}: ${message}`);
    },
  });

  // ============ Mutations ============

  // Start session mutation
  const startMutation = useMutation({
    mutationFn: async ({ ssid, password }: { ssid: string; password: string }) => {
      return startSession({ target_ssid: ssid, target_password: password });
    },
    onSuccess: (result) => {
      setSessionId(result.data.session.id);
      updateSession(result.data.session);
      setError(null);
      toast.success('Session started', {
        description: `Target network: ${result.data.session.target_ssid}`,
      });
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to start session';
      setError(message);
      toast.error('Failed to start session', { description: message });
    },
  });

  // Stop session mutation
  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session');
      return stopSession(sessionId);
    },
    onSuccess: (result) => {
      updateSession(result.data.session);
      setSessionId(null);
      toast.success('Session stopped');
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to stop session';
      toast.error('Failed to stop session', { description: message });
    },
  });

  // Pause session mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session');
      return pauseSession(sessionId);
    },
    onSuccess: (result) => {
      updateSession(result.data.session);
      toast.info('Session paused');
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to pause session';
      toast.error('Failed to pause session', { description: message });
    },
  });

  // Resume session mutation
  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session');
      return resumeSession(sessionId);
    },
    onSuccess: (result) => {
      updateSession(result.data.session);
      toast.info('Session resumed');
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to resume session';
      toast.error('Failed to resume session', { description: message });
    },
  });

  // Provision all mutation
  const provisionAllMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session');
      return provisionAll(sessionId, true);
    },
    onSuccess: (result) => {
      toast.success(result.data.message);
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to provision devices';
      toast.error('Failed to provision all', { description: message });
    },
  });

  // Provision single device mutation
  const provisionDeviceMutation = useMutation({
    mutationFn: async (mac: string) => {
      if (!sessionId) throw new Error('No session');
      return provisionDevice(sessionId, mac);
    },
    onSuccess: (result) => {
      toast.info(`Provisioning ${result.data.mac}...`);
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to provision device';
      toast.error('Provisioning failed', { description: message });
    },
  });

  // Retry device mutation
  const retryDeviceMutation = useMutation({
    mutationFn: async (mac: string) => {
      if (!sessionId) throw new Error('No session');
      return retryDevice(sessionId, mac);
    },
    onSuccess: (result) => {
      toast.info(`Retrying ${result.data.mac}...`);
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to retry device';
      toast.error('Retry failed', { description: message });
    },
  });

  // Skip device mutation
  const skipDeviceMutation = useMutation({
    mutationFn: async (mac: string) => {
      if (!sessionId) throw new Error('No session');
      return skipDevice(sessionId, mac);
    },
    onSuccess: (result) => {
      toast.info(`Skipped ${result.data.mac}`);
    },
    onError: (err) => {
      const message = err instanceof V1ApiError ? err.userMessage : 'Failed to skip device';
      toast.error('Skip failed', { description: message });
    },
  });

  // ============ Handlers ============

  const handleStartSession = useCallback(
    async (ssid: string, password: string) => {
      await startMutation.mutateAsync({ ssid, password });
    },
    [startMutation]
  );

  const handleProvisionDevice = useCallback(
    (mac: string) => {
      provisionDeviceMutation.mutate(mac);
    },
    [provisionDeviceMutation]
  );

  const handleRetryDevice = useCallback(
    (mac: string) => {
      retryDeviceMutation.mutate(mac);
    },
    [retryDeviceMutation]
  );

  const handleSkipDevice = useCallback(
    (mac: string) => {
      skipDeviceMutation.mutate(mac);
    },
    [skipDeviceMutation]
  );

  // ============ Computed State ============

  const hasActiveSession = session && session.state !== 'closed';
  const isAnyMutationLoading =
    startMutation.isPending ||
    stopMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending;

  // ============ Render ============

  return (
    <section
      className={cn('space-y-6', className)}
      data-testid="batch-provisioning-section"
      aria-label="Batch Device Provisioning"
    >
      {/* Error Alert */}
      {(error || sseError) && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || sseError}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      {sessionId && (
        <ConnectionStatus
          state={connectionState}
          error={sseError}
          onReconnect={reconnect}
        />
      )}

      {/* Start Session Form or Session Progress */}
      {!hasActiveSession ? (
        <StartSessionForm
          onSubmit={handleStartSession}
          isLoading={startMutation.isPending}
          disabled={false}
        />
      ) : (
        session && (
          <SessionProgress
            session={session}
            connectionState={connectionState}
            deviceCounts={deviceCounts}
            isProvisioningAll={provisionAllMutation.isPending}
            onStop={() => stopMutation.mutate()}
            onPause={() => pauseMutation.mutate()}
            onResume={() => resumeMutation.mutate()}
            onProvisionAll={() => provisionAllMutation.mutate()}
          />
        )
      )}

      {/* Device List */}
      {hasActiveSession && devices.length > 0 && (
        <div className="space-y-2" role="region" aria-label="Discovered devices">
          <h3 className="text-sm font-medium text-muted-foreground" id="devices-heading">
            Devices ({devices.length})
          </h3>
          <ScrollArea className="h-[400px] rounded-md border p-2" aria-labelledby="devices-heading">
            <ul className="space-y-2" role="list">
              {devices.map((device) => (
                <li key={device.mac}>
                  <ProvisioningCandidateCard
                    device={device}
                    onProvision={handleProvisionDevice}
                    onRetry={handleRetryDevice}
                    onSkip={handleSkipDevice}
                    disabled={isAnyMutationLoading}
                  />
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {hasActiveSession && devices.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-12 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">
            Waiting for devices to be discovered on the onboarding network...
          </p>
        </div>
      )}
    </section>
  );
}
