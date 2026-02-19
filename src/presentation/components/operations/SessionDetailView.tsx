/**
 * SessionDetailView Component - Operations Panel
 * Feature: 057-live-ops-viewer (Phase 4)
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
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSession } from '@/application/hooks/useSessions';
import { useSessionDelta } from '@/application/hooks/useInventoryDelta';
import { getLastRequestId } from '@/infrastructure/api/inventory-delta';
import { formatTime, formatRelativeTime } from '@/lib/diagnostics-utils';
import { EvidencePanel } from '@/presentation/components/diagnostics/EvidencePanel';
import { InventoryEvidencePanel } from '@/presentation/components/inventory/InventoryEvidencePanel';
import { InventoryDeltaTable } from '@/presentation/components/inventory/InventoryDeltaTable';
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
): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  switch (status) {
    case 'active':
      return {
        label: isStale ? 'Stale' : 'Active',
        variant: isStale ? 'destructive' : 'default',
      };
    case 'completed':
      return { label: 'Completed', variant: 'secondary' };
    case 'cancelled':
      return { label: 'Failed', variant: 'destructive' };
    default:
      return { label: status, variant: 'outline' };
  }
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

  const { data: deltaRun, isLoading: deltaLoading } = useSessionDelta(sessionId);

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
  const { label: statusLabel, variant: statusVariant } = getStatusBadge(
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
            {session.id}
          </p>
        </div>
        <Badge variant={statusVariant} data-testid="session-detail-status">
          {statusLabel}
        </Badge>
      </div>

      {/* ---- Timestamps ---- */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Started: {formatTime(session.started_at)}</span>
          </div>
          {session.last_capture_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Last capture: {formatTime(session.last_capture_at)}{' '}
                <span className="text-xs">
                  ({formatRelativeTime(session.last_capture_at)})
                </span>
              </span>
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
          <CorrelationIdRow label="Session" value={session.id} />
          {session.delivery_id && (
            <CorrelationIdRow label="Delivery" value={session.delivery_id} />
          )}
          {deltaRun?.run_id && (
            <CorrelationIdRow label="Run" value={deltaRun.run_id} />
          )}
        </CardContent>
      </Card>

      {/* ---- Error Section (cancelled/failed sessions) ---- */}
      {session.status === 'cancelled' && (
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
                'This session was cancelled. No additional error details available.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---- Evidence Section ---- */}
      {hasDeltaEvidence ? (
        <InventoryEvidencePanel evidence={deltaRun!.evidence!} />
      ) : (
        <EvidencePanel sessionId={session.id} />
      )}

      {/* ---- Delta Table Section ---- */}
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

      {/* ---- Delta Loading Skeleton ---- */}
      {deltaLoading && !deltaRun && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inventory Delta</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full rounded-md" />
          </CardContent>
        </Card>
      )}

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
            <DebugRow label="session_id" value={session.id} />
            {session.delivery_id && (
              <DebugRow label="delivery_id" value={session.delivery_id} />
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
