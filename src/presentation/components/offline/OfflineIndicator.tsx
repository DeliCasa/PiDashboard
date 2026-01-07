/**
 * OfflineIndicator Component
 * Banner showing offline status and pending operations
 */

import { WifiOff, CloudOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnlineStatus, useOfflineQueue } from '@/application/hooks/useOffline';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const { stats, sync, isSyncing } = useOfflineQueue();

  const handleSync = async () => {
    try {
      const result = await sync();
      if (result.succeeded > 0) {
        toast.success(`Synced ${result.succeeded} operations`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} operations failed to sync`);
      }
    } catch (error) {
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Don't show if online and no pending operations
  if (isOnline && stats.pending === 0 && stats.failed === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg px-4 py-2',
        isOnline
          ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
          : 'bg-red-500/10 text-red-700 dark:text-red-300',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isOnline ? (
          <CloudOff className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? 'Pending sync' : 'You are offline'}
        </span>
        {stats.pending > 0 && (
          <Badge variant="outline" className="text-xs">
            {stats.pending} pending
          </Badge>
        )}
        {stats.failed > 0 && (
          <Badge variant="destructive" className="text-xs">
            {stats.failed} failed
          </Badge>
        )}
      </div>

      {isOnline && (stats.pending > 0 || stats.failed > 0) && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-7"
        >
          {isSyncing ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          Sync now
        </Button>
      )}
    </div>
  );
}
