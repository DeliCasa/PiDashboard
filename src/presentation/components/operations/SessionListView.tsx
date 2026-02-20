/**
 * SessionListView Component - Operations Panel
 *
 * Displays a filterable, refreshable list of sessions with status tabs.
 * Uses useSessions hook for data fetching and useRefreshSessions for manual refresh.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw, AlertCircle, FolderOpen, Info } from 'lucide-react';
import { useSessions, useRefreshSessions } from '@/application/hooks/useSessions';
import { isFeatureUnavailable } from '@/infrastructure/api/client';
import { SessionCard } from '@/presentation/components/diagnostics/SessionCard';
import type { SessionWithStale } from '@/infrastructure/api/diagnostics-schemas';
import { cn } from '@/lib/utils';

interface SessionListViewProps {
  onSessionSelect: (sessionId: string) => void;
}

/**
 * Map tab values to the query status parameter.
 * "failed" in the UI corresponds to "cancelled" in the API.
 */
const TAB_STATUS_MAP: Record<string, 'active' | 'completed' | 'cancelled' | 'all'> = {
  all: 'all',
  active: 'active',
  completed: 'completed',
  failed: 'cancelled',
};

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
] as const;

export function SessionListView({ onSessionSelect }: SessionListViewProps) {
  const [statusFilter, setStatusFilter] = useState('all');

  const queryStatus = TAB_STATUS_MAP[statusFilter] ?? 'all';
  const { data, isLoading, isError, error, isFetching, refetch } = useSessions({
    status: queryStatus,
    limit: 20,
  });

  const { refresh, isRefreshing } = useRefreshSessions();

  const sessions = data ?? [];

  const handleRefresh = () => {
    refresh();
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="session-list-view" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsSkeleton />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <div data-testid="session-list-loading" className="space-y-3">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    // Graceful degradation for 404/503 (feature not available on this PiOrchestrator version)
    if (isFeatureUnavailable(error)) {
      return (
        <div data-testid="session-list-view" className="space-y-4">
          <div
            data-testid="session-list-unavailable"
            className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6 text-center text-sm text-blue-700 dark:text-blue-400"
          >
            <Info className="mx-auto mb-2 h-6 w-6" />
            Sessions not available on this PiOrchestrator version.
          </div>
        </div>
      );
    }

    // Actionable error for other failures
    return (
      <div data-testid="session-list-view" className="space-y-4">
        <div
          data-testid="session-list-error"
          className="flex flex-col items-center justify-center gap-3 py-12 text-center"
        >
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Unable to load sessions — PiOrchestrator may be unreachable. Check the service status or retry.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="session-list-view" className="space-y-4">
      <Tabs
        value={statusFilter}
        onValueChange={setStatusFilter}
        data-testid="session-status-filter"
      >
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {data && (
                  <SessionCountBadge
                    count={getCountForTab(tab.value, sessions)}
                    isActive={statusFilter === tab.value}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="session-refresh-btn"
            aria-label="Refresh sessions"
          >
            <RefreshCw
              className={cn('h-4 w-4', (isFetching || isRefreshing) && 'animate-spin')}
            />
          </Button>
        </div>

        {/* All tabs render the same filtered list from the hook */}
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <SessionList
              sessions={sessions}
              onSessionSelect={onSessionSelect}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * Renders the session list or an empty state.
 */
function SessionList({
  sessions,
  onSessionSelect,
}: {
  sessions: SessionWithStale[];
  onSessionSelect: (sessionId: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div
        data-testid="session-list-empty"
        className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      >
        <FolderOpen className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No sessions recorded yet — verify the system is running.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onSelect={onSessionSelect}
        />
      ))}
    </div>
  );
}

/**
 * Small count badge shown next to each tab label.
 */
function SessionCountBadge({ count, isActive }: { count: number; isActive: boolean }) {
  if (count === 0) return null;
  return (
    <Badge
      variant={isActive ? 'default' : 'secondary'}
      className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs"
    >
      {count}
    </Badge>
  );
}

/**
 * Skeleton for the tab bar during loading.
 */
function TabsSkeleton() {
  return <Skeleton className="h-9 w-64 rounded-lg" />;
}

/**
 * Count sessions matching a given tab filter.
 * When the query already filters by status, the full array is the count.
 * For "all", we count by sub-status for individual tab badges.
 */
function getCountForTab(
  tab: string,
  sessions: Array<{ status: string }>,
): number {
  switch (tab) {
    case 'all':
      return sessions.length;
    case 'active':
      return sessions.filter((s) => s.status === 'active').length;
    case 'completed':
      return sessions.filter((s) => s.status === 'completed').length;
    case 'failed':
      return sessions.filter((s) => s.status === 'cancelled').length;
    default:
      return 0;
  }
}
