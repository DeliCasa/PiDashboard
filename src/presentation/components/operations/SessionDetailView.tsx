/**
 * SessionDetailView Component - Operations Panel
 * Feature: 057-live-ops-viewer (Phase 4)
 * Feature: 059-real-ops-drilldown - V1 schema reconciliation
 *
 * Displays detailed information for a single session including timestamps,
 * correlation IDs, evidence captures, inventory delta, and debug info.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Info,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSession } from '@/application/hooks/useSessions';
import { useSessionDelta } from '@/application/hooks/useInventoryDelta';
import { getLastRequestId } from '@/infrastructure/api/inventory-delta';
import { formatTime } from '@/lib/diagnostics-utils';
import { EvidencePanel } from '@/presentation/components/diagnostics/EvidencePanel';
import { InventoryEvidencePanel } from '@/presentation/components/inventory/InventoryEvidencePanel';
import { InventoryDeltaTable } from '@/presentation/components/inventory/InventoryDeltaTable';
import { SubsystemErrorBoundary } from '@/presentation/components/common/SubsystemErrorBoundary';
import type { DeltaEntry } from '@/domain/types/inventory';

// ============================================================================
// Props
// ============================================================================

interface SessionDetailViewProps {
  sessionId: string;
  onBack: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map session status to display badge label and variant.
 * Redefined locally to avoid importing an internal helper from SessionCard.
 */
function getStatusBadge(
  status: string,
  isStale?: boolean
): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string } {
  switch (status) {
    case 'active':
      return {
        label: isStale ? 'Stale' : 'Active',
        variant: isStale ? 'destructive' : 'default',
      };
    case 'complete':
      return { label: 'Complete', variant: 'secondary' };
    case 'partial':
      return { label: 'Partial', variant: 'outline', className: 'border-amber-500 text-amber-600 dark:text-amber-400' };
    case 'failed':
      return { label: 'Failed', variant: 'destructive' };
    default:
      return { label: status, variant: 'outline' };
  }
}

/**
 * Format elapsed seconds as human-readable duration.
 */
function formatElapsedDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Inline copy-to-clipboard button for correlation IDs.
 */
function CopyIdButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 shrink-0"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

/**
 * Displays a single correlation ID row with label, value, and copy button.
 */
function CorrelationIdRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className="font-mono text-xs text-muted-foreground truncate">{value}</span>
      <CopyIdButton value={value} label={label} />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SessionDetailView({ sessionId, onBack }: SessionDetailViewProps) {
  const [debugOpen, setDebugOpen] = useState(false);

  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = useSession(sessionId);

  const { data: deltaRun, isLoading: deltaLoading, error: deltaError } = useSessionDelta(sessionId);

  // ---- Loading State ----
  if (sessionLoading) {
    return (
      <div data-testid="session-detail-loading" className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  // ---- Error State ----
  if (sessionError) {
    return (
      <div data-testid="session-detail-error" className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to load session details
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {sessionError instanceof Error ? sessionError.message : 'Unknown error'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchSession()}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Not Found State ----
  if (!session) {
    return (
      <div data-testid="session-detail-not-found" className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Session not found</p>
            <p className="font-mono text-xs text-muted-foreground">{sessionId}</p>
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Derived values ----
  const { label: statusLabel, variant: statusVariant, className: statusClassName } = getStatusBadge(
    session.status,
    session.is_stale
  );

  const hasDeltaEvidence =
    deltaRun?.evidence?.before_image_url && deltaRun?.evidence?.after_image_url;

  // After normalizeDelta via the hook's select, delta is DeltaEntry[] | null
  const deltaEntries = (deltaRun?.delta as DeltaEntry[] | null | undefined) ?? null;

  const lastRequestId = getLastRequestId();

  return (
    <div data-testid="session-detail-view" className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="back-button"
          aria-label="Back to sessions"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">Session Detail</h2>
          <p className="font-mono text-xs text-muted-foreground truncate">
            {session.session_id}
          </p>
        </div>
        <Badge variant={statusVariant} className={statusClassName} data-testid="session-detail-status">
          {session.is_stale && session.status === 'active' && (
            <AlertTriangle className="h-3 w-3 mr-1" />
          )}
          {statusLabel}
        </Badge>
      </div>

      {/* ---- Timestamps & Capture Summary ---- */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Started: {formatTime(session.started_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Duration: {formatElapsedDuration(session.elapsed_seconds)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Camera className="h-4 w-4 shrink-0" />
            <span>
              {session.successful_captures}/{session.total_captures} capture{session.total_captures !== 1 ? 's' : ''}
            </span>
            {session.pair_complete && (
              <Badge variant="outline" className="text-xs border-green-500 text-green-600 dark:text-green-400">
                Paired
              </Badge>
            )}
          </div>
          {session.is_stale && session.status === 'active' && (
            <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 rounded px-2 py-1">
              <AlertTriangle className="h-3 w-3" />
              <span>No capture in &gt;5 minutes</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Correlation IDs ---- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Correlation IDs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CorrelationIdRow label="Session" value={session.session_id} />
          {session.container_id && (
            <CorrelationIdRow label="Container" value={session.container_id} />
          )}
          {deltaRun?.run_id && (
            <CorrelationIdRow label="Run" value={deltaRun.run_id} />
          )}
        </CardContent>
      </Card>

      {/* ---- Error Section (failed sessions with last_error) ---- */}
      {session.status === 'failed' && session.last_error && (
        <Card className="border-destructive/50" data-testid="session-last-error">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Failure Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Reason: </span>
              <span>{session.last_error.failure_reason}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Phase: </span>
              <span>{session.last_error.phase}</span>
            </div>
            {session.last_error.device_id && (
              <div className="text-sm">
                <span className="text-muted-foreground">Device: </span>
                <span className="font-mono text-xs">{session.last_error.device_id}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Occurred: </span>
              <span>{formatTime(session.last_error.occurred_at)}</span>
            </div>
            {session.last_error.correlation_id && (
              <CorrelationIdRow label="Correlation ID" value={session.last_error.correlation_id} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Generic error for failed sessions without last_error ---- */}
      {session.status === 'failed' && !session.last_error && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {deltaRun?.metadata?.error_message ??
                'This session failed. No additional error details available.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---- Evidence & Delta Section (isolated) ---- */}
      <SubsystemErrorBoundary subsystemName="Evidence & Analysis">
        {/* Delta error info card (session loaded but delta failed) */}
        {deltaError && !deltaRun && (
          <Card
            className="border-blue-500/30 bg-blue-500/10"
            data-testid="delta-unavailable"
          >
            <CardContent className="flex items-center gap-3 py-4">
              <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Delta data unavailable — evidence images may still load below.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Evidence panel */}
        {hasDeltaEvidence ? (
          <InventoryEvidencePanel evidence={deltaRun!.evidence!} />
        ) : (
          <EvidencePanel sessionId={session.session_id} />
        )}

        {/* Delta Table Section */}
        {deltaEntries && deltaEntries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Inventory Delta</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryDeltaTable delta={deltaEntries} />
            </CardContent>
          </Card>
        )}

        {/* Delta Loading Skeleton */}
        {deltaLoading && !deltaRun && !deltaError && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Inventory Delta</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full rounded-md" />
            </CardContent>
          </Card>
        )}
      </SubsystemErrorBoundary>

      {/* ---- Debug Info ---- */}
      <Collapsible
        open={debugOpen}
        onOpenChange={setDebugOpen}
        data-testid="session-debug-info"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between px-2 hover:bg-muted/50"
          >
            <span className="text-xs text-muted-foreground">Debug Info</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                debugOpen && 'rotate-180'
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 rounded-md border bg-muted/30 p-3 mt-1">
            <DebugRow label="session_id" value={session.session_id} />
            {session.container_id && (
              <DebugRow label="container_id" value={session.container_id} />
            )}
            {deltaRun?.run_id && (
              <DebugRow label="run_id" value={deltaRun.run_id} />
            )}
            {lastRequestId && (
              <DebugRow label="request_id" value={lastRequestId} />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Debug row showing a label and copyable value.
 */
function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}:</span>
      <code className="font-mono text-xs text-muted-foreground truncate flex-1">
        {value}
      </code>
      <CopyIdButton value={value} label={label} />
    </div>
  );
}
