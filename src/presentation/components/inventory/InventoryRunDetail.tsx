/**
 * InventoryRunDetail Component
 * Feature: 048-inventory-review (T016)
 *
 * Detail view for a selected analysis run.
 * Fetches the full run by session ID and renders
 * existing 047 components (delta, evidence, review, audit).
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, Loader2, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryDeltaTable } from './InventoryDeltaTable';
import { InventoryEvidencePanel } from './InventoryEvidencePanel';
import { InventoryReviewForm } from './InventoryReviewForm';
import { InventoryAuditTrail } from './InventoryAuditTrail';
import { SessionStatusTimeline } from './SessionStatusTimeline';
import { RunDebugInfo } from './RunDebugInfo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSessionDelta, useRerunAnalysis } from '@/application/hooks/useInventoryDelta';
import { useContainers } from '@/application/hooks/useContainers';
import { V1ApiError } from '@/infrastructure/api/errors';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

interface InventoryRunDetailProps {
  sessionId: string;
  onBack: () => void;
}

export function InventoryRunDetail({ sessionId, onBack }: InventoryRunDetailProps) {
  const { data, isLoading, isError, error: queryError, refetch } = useSessionDelta(sessionId);
  const rerunMutation = useRerunAnalysis(data?.run_id ?? '');
  const [rerunHidden, setRerunHidden] = useState(false);
  const { data: containers = [] } = useContainers();

  // Resolve container label from container list
  const container = data ? containers.find((c) => c.id === data.container_id) : undefined;
  const containerLabel = container?.label || 'Unnamed Container';

  // Stale analysis check — computed in effect to avoid impure render calls
  const [isStaleProcessing, setIsStaleProcessing] = useState(false);
  useEffect(() => {
    if (!data || data.status !== 'processing') {
      setIsStaleProcessing(false);
      return;
    }
    const elapsed = Date.now() - new Date(data.metadata.created_at).getTime();
    setIsStaleProcessing(elapsed > STALE_THRESHOLD_MS);
  }, [data]);

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="run-detail-loading" className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="run-detail-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to list
        </Button>
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    const isAuthError = V1ApiError.isV1ApiError(queryError) && queryError.isAuthError();

    return (
      <div data-testid="run-detail-error" className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="run-detail-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to list
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive/50" />
            {isAuthError ? (
              <p
                className="mb-3 text-center text-destructive"
                data-testid="auth-error-banner"
              >
                Authentication error — the device may need re-authorization.
                Check the Pi&apos;s connection to BridgeServer.
              </p>
            ) : (
              <p className="mb-3 text-destructive">Failed to load run details</p>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Content
  const showEvidence = data.evidence &&
    (data.status === 'done' || data.status === 'needs_review');
  const showReviewForm = !data.review &&
    (data.status === 'done' || data.status === 'needs_review');
  const showAuditTrail = !!data.review;
  const showDebugInfo = data.status === 'done' || data.status === 'needs_review' || data.status === 'error';

  // Pending/Processing state
  if (data.status === 'pending' || data.status === 'processing') {
    return (
      <div data-testid="run-detail" className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="run-detail-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to list
        </Button>
        <SessionStatusTimeline run={data} />
        <Card>
          <CardHeader>
            <CardTitle>Analysis In Progress</CardTitle>
            <CardDescription>
              <span className="text-xs text-muted-foreground">Container ID: </span>
              <span data-testid="container-id" className="font-mono text-xs text-muted-foreground">
                {truncateId(data.container_id)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">
              Inventory analysis is being processed...
            </p>
            {isStaleProcessing && (
              <Alert data-testid="stale-analysis-warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Analysis may be stuck — started over 5 minutes ago</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="ml-2"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Refresh
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (data.status === 'error') {
    const handleCopyError = async () => {
      const details = JSON.stringify({
        run_id: data.run_id,
        session_id: data.session_id,
        container_id: data.container_id,
        error_message: data.metadata.error_message ?? null,
      }, null, 2);
      await navigator.clipboard.writeText(details);
      toast.success('Copied error details');
    };

    const handleRerun = async () => {
      const result = await rerunMutation.mutateAsync();
      if (!result.supported) {
        setRerunHidden(true);
      }
    };

    return (
      <div data-testid="run-detail" className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="run-detail-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to list
        </Button>
        <SessionStatusTimeline run={data} />
        <Card>
          <CardHeader>
            <CardTitle>Analysis Failed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
            <AlertCircle className="h-8 w-8 text-destructive/50" />
            <p className="text-destructive">Inventory analysis failed</p>
            {data.metadata.error_message && (
              <p className="text-sm text-muted-foreground">
                {data.metadata.error_message}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyError}
                data-testid="copy-error-details"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Error Details
              </Button>
              {!rerunHidden && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRerun}
                  disabled={rerunMutation.isPending}
                  data-testid="rerun-btn"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {rerunMutation.isPending ? 'Requesting...' : 'Request Re-run'}
                </Button>
              )}
              {rerunHidden && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="rerun-unsupported"
                >
                  Contact support with the details below.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <RunDebugInfo run={data} />
      </div>
    );
  }

  return (
    <div data-testid="run-detail" className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        data-testid="run-detail-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to list
      </Button>

      <SessionStatusTimeline run={data} />

      <Card>
        <CardHeader>
          <CardTitle>
            <span data-testid="container-label">{containerLabel}</span>
            {data.status === 'done' && data.review && ' — Reviewed'}
            {data.status === 'needs_review' && ' — Needs Review'}
          </CardTitle>
          <CardDescription>
            <span className="text-xs text-muted-foreground">Container ID: </span>
            <span
              data-testid="container-id"
              className="font-mono text-xs text-muted-foreground"
            >
              {truncateId(data.container_id)}
            </span>
            <span className="mx-1 text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">Run: </span>
            <span
              data-testid="run-id"
              className="font-mono text-xs text-muted-foreground"
            >
              {truncateId(data.run_id)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.delta && data.delta.length > 0 ? (
            <InventoryDeltaTable delta={data.delta} />
          ) : showReviewForm ? (
            <p
              className="py-4 text-center text-muted-foreground"
              data-testid="delta-empty-reviewable"
            >
              No inventory changes detected
            </p>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No delta data available
            </p>
          )}

          {showEvidence && (
            <InventoryEvidencePanel evidence={data.evidence} />
          )}

          {showReviewForm && (
            <InventoryReviewForm run={data} />
          )}

          {showAuditTrail && (
            <InventoryAuditTrail review={data.review} />
          )}
        </CardContent>
      </Card>

      {showDebugInfo && (
        <RunDebugInfo run={data} />
      )}
    </div>
  );
}
