/**
 * IntegrationDiagnosticsPanel Component
 * Feature: 061-integration-diagnostics
 *
 * Read-only diagnostics panel for operators to see integration health
 * without spamming errors. Shows BridgeServer health, controller/sessions
 * fetch status, and last door operation status.
 *
 * All data is read from existing React Query cache — no additional polling.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Activity,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle,
  Server,
  DoorOpen,
  Eye,
  Code,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServiceHealth, useRefreshHealthChecks } from '@/application/hooks/useDiagnostics';
import { useSessions } from '@/application/hooks/useSessions';
import { useDoorStatus, useDoorHistory } from '@/application/hooks/useDoor';
import { isFeatureUnavailable } from '@/infrastructure/api/client';

// ============================================================================
// Status Helpers
// ============================================================================

type DiagStatus = 'ok' | 'degraded' | 'error' | 'unavailable' | 'loading';

interface StatusConfig {
  icon: typeof CheckCircle;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
}

const statusMap: Record<DiagStatus, StatusConfig> = {
  ok: { icon: CheckCircle, variant: 'default', label: 'OK' },
  degraded: { icon: AlertCircle, variant: 'secondary', label: 'Degraded' },
  error: { icon: XCircle, variant: 'destructive', label: 'Error' },
  unavailable: { icon: HelpCircle, variant: 'outline', label: 'N/A' },
  loading: { icon: Activity, variant: 'outline', label: 'Loading' },
};

function StatusBadge({ status, testId }: { status: DiagStatus; testId?: string }) {
  const config = statusMap[status];
  const Icon = config.icon;
  return (
    <Badge
      data-testid={testId}
      variant={config.variant}
      className="flex items-center gap-1 text-xs"
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function formatTime(date: Date | number | string | undefined): string {
  if (!date) return 'Never';
  try {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

// ============================================================================
// Sub-sections
// ============================================================================

function BridgeServerSection() {
  const [showRawJson, setShowRawJson] = useState(false);
  const { data, isLoading, error, dataUpdatedAt } = useServiceHealth('bridgeserver');

  const status: DiagStatus = isLoading
    ? 'loading'
    : error && isFeatureUnavailable(error)
      ? 'unavailable'
      : error
        ? 'error'
        : data?.status === 'healthy'
          ? 'ok'
          : data?.status === 'degraded'
            ? 'degraded'
            : data?.status === 'unhealthy' || data?.status === 'timeout'
              ? 'error'
              : 'unavailable';

  return (
    <div data-testid="diag-bridge" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Server className="h-4 w-4 text-muted-foreground" />
          BridgeServer Health
        </div>
        <StatusBadge status={status} testId="diag-bridge-status" />
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pl-6">
        {data?.response_time_ms !== undefined && (
          <div>Response: {data.response_time_ms}ms</div>
        )}
        {data?.error_message && (
          <div className="text-destructive">{data.error_message}</div>
        )}
        <div>Last checked: {formatTime(dataUpdatedAt)}</div>

        {data?.checks && Object.keys(data.checks).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {Object.entries(data.checks).map(([name, check]) => (
              <Badge
                key={name}
                variant={check.status === 'healthy' ? 'default' : 'destructive'}
                className="text-[10px]"
              >
                {name}: {check.status}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Raw JSON toggle */}
      <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
        <CollapsibleTrigger
          data-testid="diag-bridge-raw-toggle"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pl-6"
        >
          <Code className="h-3 w-3" />
          <span>Raw JSON</span>
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', showRawJson && 'rotate-180')}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre
            data-testid="diag-bridge-raw-json"
            className="mt-1 ml-6 p-2 bg-muted rounded text-[10px] font-mono overflow-x-auto max-h-40"
          >
            {data ? JSON.stringify(data, null, 2) : '{}'}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function SessionsFetchSection() {
  const { data, isLoading, error, dataUpdatedAt, isFetching } = useSessions({
    enabled: true,
    pollingInterval: 10000,
  });

  const status: DiagStatus = isLoading
    ? 'loading'
    : error && isFeatureUnavailable(error)
      ? 'unavailable'
      : error
        ? 'error'
        : data && data.length >= 0
          ? 'ok'
          : 'unavailable';

  const sessionCount = data?.length ?? 0;
  const activeCount = data?.filter((s) => s.status === 'active').length ?? 0;

  return (
    <div data-testid="diag-sessions" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Controller / Sessions
        </div>
        <StatusBadge status={status} testId="diag-sessions-status" />
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pl-6">
        {status === 'ok' && (
          <>
            <div>
              Total: {sessionCount} session{sessionCount !== 1 ? 's' : ''}
              {activeCount > 0 && ` (${activeCount} active)`}
            </div>
          </>
        )}
        {status === 'error' && error && (
          <div className="text-destructive">
            {error instanceof Error ? error.message : 'Fetch failed'}
          </div>
        )}
        {status === 'unavailable' && (
          <div>Sessions endpoint not available on this build</div>
        )}
        <div className="flex items-center gap-2">
          <span>Last fetch: {formatTime(dataUpdatedAt)}</span>
          {isFetching && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

function DoorOperationSection() {
  const { data: doorStatus, isLoading, error, dataUpdatedAt } = useDoorStatus();
  const { data: doorHistory } = useDoorHistory(5, true);

  const status: DiagStatus = isLoading
    ? 'loading'
    : error && isFeatureUnavailable(error)
      ? 'unavailable'
      : error
        ? 'error'
        : doorStatus
          ? 'ok'
          : 'unavailable';

  const lastOperation = doorHistory?.[0];

  return (
    <div data-testid="diag-door" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
          Door Operations
        </div>
        <StatusBadge status={status} testId="diag-door-status" />
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pl-6">
        {status === 'ok' && doorStatus && (
          <div>
            Current state:{' '}
            <span className="font-medium text-foreground">
              {doorStatus.state ?? 'unknown'}
            </span>
          </div>
        )}
        {status === 'unavailable' && (
          <div>Door endpoint not available on this build</div>
        )}
        {status === 'error' && error && (
          <div className="text-destructive">
            {error instanceof Error ? error.message : 'Fetch failed'}
          </div>
        )}
        {lastOperation && (
          <div>
            Last op: {lastOperation.command ?? 'unknown'} at{' '}
            {formatTime(lastOperation.timestamp)} —{' '}
            <span
              className={cn(
                'font-medium',
                lastOperation.result === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-destructive'
              )}
            >
              {lastOperation.result ?? 'unknown'}
            </span>
          </div>
        )}
        <div>Last checked: {formatTime(dataUpdatedAt)}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

export function IntegrationDiagnosticsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { refresh } = useRefreshHealthChecks();

  return (
    <Card data-testid="integration-diagnostics-panel">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Integration Diagnostics
              </CardTitle>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            {isExpanded && (
              <Button
                data-testid="diag-refresh"
                variant="ghost"
                size="sm"
                onClick={() => refresh()}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4 divide-y">
            <BridgeServerSection />
            <div className="pt-4">
              <SessionsFetchSection />
            </div>
            <div className="pt-4">
              <DoorOperationSection />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
