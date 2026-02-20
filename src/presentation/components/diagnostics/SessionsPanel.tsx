/**
 * SessionsPanel Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Displays list of active sessions with status and capture information.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FolderOpen, AlertCircle } from 'lucide-react';
import { useSessions, useRefreshSessions } from '@/application/hooks/useSessions';
import { SessionCard } from './SessionCard';
import { cn } from '@/lib/utils';

interface SessionsPanelProps {
  onSessionSelect?: (sessionId: string) => void;
}

export function SessionsPanel({ onSessionSelect }: SessionsPanelProps) {
  const { data: sessions, isLoading, isFetching, error, refetch, dataUpdatedAt } = useSessions();
  const { refresh, isRefreshing } = useRefreshSessions();

  const handleRefresh = () => {
    refresh();
  };

  // Count stale sessions
  const staleCount = sessions?.filter((s) => s.is_stale && s.status === 'active').length ?? 0;

  // Loading state
  if (isLoading) {
    return (
      <Card data-testid="sessions-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Active Sessions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3" data-testid="sessions-loading">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !sessions) {
    return (
      <Card data-testid="sessions-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Active Sessions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8" data-testid="sessions-error">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Failed to fetch sessions</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  const isEmpty = !sessions || sessions.length === 0;

  return (
    <Card data-testid="sessions-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Active Sessions
            {!isEmpty && (
              <Badge variant="secondary" className="ml-2" data-testid="sessions-count">
                {sessions.length}
              </Badge>
            )}
            {staleCount > 0 && (
              <Badge variant="destructive" className="ml-1" data-testid="stale-sessions-count">
                {staleCount} stale
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching || isRefreshing}
            data-testid="refresh-sessions"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', (isFetching || isRefreshing) && 'animate-spin')} />
            Refresh
          </Button>
        </div>
        {dataUpdatedAt > 0 && (
          <p className="text-xs text-muted-foreground mt-1" data-testid="sessions-last-updated">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="sessions-empty">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active sessions</p>
            <p className="text-xs mt-1">Sessions will appear here when evidence capture begins</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="sessions-list">
            {sessions.map((session) => (
              <SessionCard
                key={session.session_id}
                session={session}
                onSelect={onSessionSelect}
                showEvidence
              />
            ))}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Auto-refresh every 10 seconds
        </p>
      </CardContent>
    </Card>
  );
}
