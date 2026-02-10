/**
 * InventoryRunDetail Component
 * Feature: 048-inventory-review (T016)
 *
 * Detail view for a selected analysis run.
 * Fetches the full run by session ID and renders
 * existing 047 components (delta, evidence, review, audit).
 */

import { ArrowLeft, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
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
import { useSessionDelta } from '@/application/hooks/useInventoryDelta';
import { useContainers } from '@/application/hooks/useContainers';

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

interface InventoryRunDetailProps {
  sessionId: string;
  onBack: () => void;
}

export function InventoryRunDetail({ sessionId, onBack }: InventoryRunDetailProps) {
  const { data, isLoading, isError, refetch } = useSessionDelta(sessionId);
  const { data: containers = [] } = useContainers();

  // Resolve container label from container list
  const container = data ? containers.find((c) => c.id === data.container_id) : undefined;
  const containerLabel = container?.label || 'Unnamed Container';

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
            <p className="mb-3 text-destructive">Failed to load run details</p>
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
    (data.status === 'completed' || data.status === 'needs_review' || data.status === 'approved');
  const showReviewForm = !data.review &&
    (data.status === 'completed' || data.status === 'needs_review');
  const showAuditTrail = !!data.review;

  // Pending state
  if (data.status === 'pending') {
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
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">
              Inventory analysis is being processed...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  if (data.status === 'failed') {
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
        <Card>
          <CardHeader>
            <CardTitle>Analysis Failed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="mb-3 h-8 w-8 text-destructive/50" />
            <p className="mb-2 text-destructive">Inventory analysis failed</p>
            {data.metadata.error_message && (
              <p className="text-sm text-muted-foreground">
                {data.metadata.error_message}
              </p>
            )}
          </CardContent>
        </Card>
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

      <Card>
        <CardHeader>
          <CardTitle>
            <span data-testid="container-label">{containerLabel}</span>
            {data.status === 'approved' && ' — Reviewed'}
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
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.delta ? (
            <InventoryDeltaTable delta={data.delta} />
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
    </div>
  );
}
