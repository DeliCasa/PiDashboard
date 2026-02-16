/**
 * InventoryRunList Component
 * Feature: 048-inventory-review (T015)
 *
 * Paginated list of analysis runs for a container.
 * Each row shows status badge, timestamp, delta summary, and truncated session ID.
 */

import { Clock, RefreshCw, AlertCircle, ClipboardList, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { RunListItem } from '@/domain/types/inventory';
import type { AnalysisStatus } from '@/infrastructure/api/inventory-delta-schemas';

interface InventoryRunListProps {
  runs: RunListItem[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isUnavailable?: boolean;
  hasMore: boolean;
  onSelectRun: (runId: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onRefresh?: () => void;
}

const statusConfig: Record<AnalysisStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Queued', variant: 'secondary' },
  processing: { label: 'Running', variant: 'secondary' },
  done: { label: 'Completed', variant: 'default' },
  needs_review: { label: 'Needs Review', variant: 'outline' },
  error: { label: 'Failed', variant: 'destructive' },
};

function formatTimestamp(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function formatDeltaSummary(summary: RunListItem['delta_summary']): string {
  if (!summary) return 'No data';
  const parts: string[] = [];
  if (summary.items_changed > 0) parts.push(`${summary.items_changed} changed`);
  if (summary.items_added > 0) parts.push(`${summary.items_added} added`);
  if (summary.items_removed > 0) parts.push(`${summary.items_removed} removed`);
  if (parts.length === 0) return `${summary.total_items} items, no changes`;
  return parts.join(', ');
}

export function InventoryRunList({
  runs,
  isLoading,
  isError,
  isUnavailable,
  hasMore,
  onSelectRun,
  onLoadMore,
  onRetry,
  onRefresh,
}: InventoryRunListProps) {
  // Loading state
  if (isLoading && runs.length === 0) {
    return (
      <div data-testid="run-list-loading" className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Unavailable state (503)
  if (isUnavailable) {
    return (
      <Card data-testid="run-list-unavailable">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Inventory service temporarily unavailable
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card data-testid="run-list-error">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="mb-3 h-10 w-10 text-destructive/50" />
          <p className="mb-3 text-destructive">Failed to load run list</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (runs.length === 0) {
    return (
      <Card data-testid="run-list-empty">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No inventory data available</p>
        </CardContent>
      </Card>
    );
  }

  // Run list
  return (
    <div data-testid="run-list" className="space-y-2">
      {onRefresh && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            data-testid="run-list-refresh"
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      )}
      {runs.map((run, index) => {
        const config = statusConfig[run.status];
        return (
          <div
            key={run.run_id}
            data-testid={`run-list-item-${index}`}
            className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
          >
            <button
              className="w-full text-left"
              onClick={() => onSelectRun(run.run_id)}
              aria-label={`View ${config.label} run from ${formatTimestamp(run.metadata.created_at)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={config.variant} className="shrink-0">
                  {config.label}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(run.metadata.created_at)}
                </span>
              </div>
              <div className="mt-1.5 text-sm text-muted-foreground">
                {formatDeltaSummary(run.delta_summary)}
              </div>
            </button>
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                data-testid={`copy-session-id-${index}`}
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    void navigator.clipboard.writeText(run.session_id).then(
                      () => toast.success('Copied!'),
                      () => toast.error('Copy failed'),
                    );
                  }
                }}
                title={run.session_id}
                aria-label={`Copy session ID ${run.session_id}`}
              >
                <span className="text-muted-foreground font-sans">Session ID: </span>
                {truncateId(run.session_id)}
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onLoadMore}
          data-testid="run-list-load-more"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Load More
        </Button>
      )}
    </div>
  );
}
