/**
 * InventorySection Component
 * Feature: 048-inventory-review (T017)
 *
 * List-detail layout for inventory analysis runs.
 * Shows run list when no run is selected, detail view when a run is selected.
 * Scoped to the active container via useActiveContainerId().
 */

import { useState, useEffect } from 'react';
import { ClipboardList, Package } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { InventoryRunList } from './InventoryRunList';
import { InventoryRunDetail } from './InventoryRunDetail';
import { InventorySessionLookup } from './InventorySessionLookup';
import { useActiveContainerId } from '@/application/stores/activeContainer';
import { useInventoryRuns } from '@/application/hooks/useInventoryDelta';
import { isFeatureUnavailable } from '@/infrastructure/api/client';
import type { RunListFilters, InventoryAnalysisRun } from '@/domain/types/inventory';

interface InventorySectionProps {
  className?: string;
}

export function InventorySection({ className }: InventorySectionProps) {
  const activeContainerId = useActiveContainerId();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RunListFilters>({ limit: 20, offset: 0 });

  const {
    data: runListData,
    isLoading,
    isError,
    error,
    refetch,
  } = useInventoryRuns(activeContainerId, filters);

  // Reset selection when container changes
  useEffect(() => {
    setSelectedRunId(null);
    setSelectedSessionId(null);
    setFilters({ limit: 20, offset: 0 });
  }, [activeContainerId]);

  // No container selected
  if (!activeContainerId) {
    return (
      <Card className={className} data-testid="inventory-section">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground" data-testid="inventory-no-container">
            Select a container to view inventory data
          </p>
        </CardContent>
      </Card>
    );
  }

  // Detail view when a run is selected
  if (selectedRunId && selectedSessionId) {
    return (
      <div className={className} data-testid="inventory-section">
        <InventoryRunDetail
          sessionId={selectedSessionId}
          onBack={() => {
            setSelectedRunId(null);
            setSelectedSessionId(null);
          }}
        />
      </div>
    );
  }

  // List view
  const runs = runListData?.runs ?? [];
  const hasMore = runListData?.pagination.has_more ?? false;
  const unavailable = isError && error ? isFeatureUnavailable(error) : false;

  const handleSelectRun = (runId: string) => {
    const run = runs.find((r) => r.run_id === runId);
    if (run) {
      setSelectedRunId(runId);
      setSelectedSessionId(run.session_id);
    }
  };

  const handleLoadMore = () => {
    setFilters((prev) => ({
      ...prev,
      offset: (prev.offset ?? 0) + (prev.limit ?? 20),
    }));
  };

  const handleRunFound = (run: InventoryAnalysisRun) => {
    setSelectedRunId(run.run_id);
    setSelectedSessionId(run.session_id);
  };

  return (
    <Card className={className} data-testid="inventory-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Inventory Runs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InventorySessionLookup onRunFound={handleRunFound} />
        <InventoryRunList
          runs={runs}
          isLoading={isLoading}
          isError={isError}
          error={error}
          isUnavailable={unavailable}
          hasMore={hasMore}
          onSelectRun={handleSelectRun}
          onLoadMore={handleLoadMore}
          onRetry={() => refetch()}
          onRefresh={() => refetch()}
        />
      </CardContent>
    </Card>
  );
}
