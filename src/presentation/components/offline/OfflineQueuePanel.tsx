/**
 * OfflineQueuePanel Component
 * Expandable panel showing queued offline operations
 */

import { useState } from 'react';
import {
  CloudOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  Check,
  X,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useOfflineQueue } from '@/application/hooks/useOffline';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { QueueStatus } from '@/domain/types/entities';

interface OfflineQueuePanelProps {
  className?: string;
}

const statusConfig: Record<
  QueueStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-500',
    icon: <Clock className="h-3 w-3" />,
  },
  syncing: {
    label: 'Syncing',
    color: 'bg-blue-500/10 text-blue-500',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  synced: {
    label: 'Synced',
    color: 'bg-green-500/10 text-green-500',
    icon: <Check className="h-3 w-3" />,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/10 text-red-500',
    icon: <X className="h-3 w-3" />,
  },
};

export function OfflineQueuePanel({ className }: OfflineQueuePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    entries,
    stats,
    sync,
    isSyncing,
    clearSynced,
    retryFailed,
    removeEntry,
  } = useOfflineQueue();

  const handleSync = async () => {
    try {
      const result = await sync();
      toast.success(`Synced ${result.succeeded} of ${result.processed} operations`);
    } catch {
      toast.error('Sync failed');
    }
  };

  const handleClearSynced = async () => {
    await clearSynced();
    toast.success('Cleared synced entries');
  };

  const handleRetryFailed = async () => {
    await retryFailed();
    toast.success('Retrying failed operations');
  };

  const handleRemove = async (id: string) => {
    await removeEntry(id);
    toast.success('Entry removed');
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={className}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <CloudOff className="h-4 w-4" />
                Offline Queue
                <Badge variant="outline" className="ml-2">
                  {entries.length}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
            <CardDescription>
              {stats.pending > 0 && `${stats.pending} pending • `}
              {stats.syncing > 0 && `${stats.syncing} syncing • `}
              {stats.failed > 0 && `${stats.failed} failed • `}
              {stats.synced > 0 && `${stats.synced} synced`}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || stats.pending === 0}
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync All
              </Button>
              {stats.failed > 0 && (
                <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Failed
                </Button>
              )}
              {stats.synced > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearSynced}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Synced
                </Button>
              )}
            </div>

            {/* Queue Entries */}
            <div className="max-h-64 space-y-2 overflow-auto">
              {entries.map((entry) => {
                const config = statusConfig[entry.status];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Badge className={cn('gap-1', config.color)}>
                        {config.icon}
                        {config.label}
                      </Badge>
                      <span className="truncate font-mono text-xs">
                        {entry.operation}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {entry.endpoint}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRemove(entry.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error Details */}
            {entries.some((e) => e.lastError) && (
              <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                <p className="font-medium">Recent Errors:</p>
                {entries
                  .filter((e) => e.lastError)
                  .slice(0, 3)
                  .map((entry) => (
                    <p key={entry.id} className="mt-1 truncate">
                      {entry.operation}: {entry.lastError}
                    </p>
                  ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
