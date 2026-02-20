/**
 * EvidencePanel Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 * Feature: 044-evidence-ci-remediation (T031-T034) - Camera filter
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Displays evidence thumbnails for a session in a grid layout.
 * Uses CaptureEntry (V1) with base64 inline images instead of presigned URLs.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Image, RefreshCw, AlertCircle, ImageOff, Info } from 'lucide-react';
import { useSessionEvidence, useInvalidateEvidence } from '@/application/hooks/useEvidence';
import { useContainerCameraIds } from '@/application/hooks/useContainers';
import { isFeatureUnavailable } from '@/infrastructure/api/client';
import { EvidenceThumbnail } from './EvidenceThumbnail';
import { EvidencePreviewModal } from './EvidencePreviewModal';
import type { CaptureEntry } from '@/infrastructure/api/diagnostics-schemas';
import { cn } from '@/lib/utils';

interface EvidencePanelProps {
  sessionId: string;
  className?: string;
}

export function EvidencePanel({ sessionId, className }: EvidencePanelProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<CaptureEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCameraId, setFilterCameraId] = useState<string | undefined>(undefined);

  const { data: evidence, isLoading, isFetching, error, refetch } = useSessionEvidence(sessionId);
  const { invalidate } = useInvalidateEvidence();

  // 046-opaque-container-identity: Scope evidence to active container's cameras
  const containerCameraIds = useContainerCameraIds();

  // Apply container scope first, then per-camera filter
  const scopedEvidence = useMemo(() => {
    if (!evidence) return [];
    if (!containerCameraIds) return evidence;
    return evidence.filter((ev) => containerCameraIds.has(ev.device_id));
  }, [evidence, containerCameraIds]);

  // Derive unique camera IDs from scoped evidence for the filter dropdown
  const cameraIds = useMemo(() => {
    if (scopedEvidence.length === 0) return [];
    const ids = new Set(scopedEvidence.map((ev) => ev.device_id));
    return Array.from(ids).sort();
  }, [scopedEvidence]);

  // Apply client-side per-camera filter within scoped results
  const filteredEvidence = useMemo(() => {
    if (!filterCameraId) return scopedEvidence;
    return scopedEvidence.filter((ev) => ev.device_id === filterCameraId);
  }, [scopedEvidence, filterCameraId]);

  const handleRefresh = () => {
    invalidate(sessionId);
  };

  const handleThumbnailClick = (ev: CaptureEntry) => {
    setSelectedEvidence(ev);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvidence(null), 200);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className} data-testid="evidence-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="h-4 w-4" />
              Evidence Captures
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="evidence-loading">
            <Skeleton className="aspect-[4/3] rounded" />
            <Skeleton className="aspect-[4/3] rounded" />
            <Skeleton className="aspect-[4/3] rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !evidence) {
    // Graceful degradation for 404/503 (feature not available)
    if (isFeatureUnavailable(error)) {
      return (
        <Card className={className} data-testid="evidence-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="h-4 w-4" />
              Evidence Captures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4" data-testid="evidence-unavailable">
              <Info className="mx-auto mb-2 h-6 w-6 text-blue-500" />
              <p className="text-xs text-muted-foreground">
                Evidence data is not available on this PiOrchestrator version.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={className} data-testid="evidence-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Image className="h-4 w-4" />
            Evidence Captures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4" data-testid="evidence-error">
            <AlertCircle className="h-6 w-6 mx-auto text-destructive mb-2" />
            <p className="text-xs text-muted-foreground mb-2">Failed to load evidence</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  const isEmpty = !evidence || evidence.length === 0;
  const isScopedEmpty = scopedEvidence.length === 0 && !isEmpty;
  const isFilteredEmpty = filteredEvidence.length === 0 && !isEmpty && !isScopedEmpty;

  return (
    <>
      <Card className={className} data-testid="evidence-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="h-4 w-4" />
              Evidence Captures
              {!isEmpty && !isScopedEmpty && (
                <span className="text-xs text-muted-foreground font-normal" data-testid="evidence-count">
                  ({filteredEvidence.length})
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              {cameraIds.length > 1 && (
                <Select
                  value={filterCameraId ?? 'all'}
                  onValueChange={(val) => setFilterCameraId(val === 'all' ? undefined : val)}
                >
                  <SelectTrigger
                    className="h-7 w-[140px] text-xs"
                    data-testid="evidence-camera-filter"
                  >
                    <SelectValue placeholder="All cameras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cameras</SelectItem>
                    {cameraIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isFetching}
                data-testid="refresh-evidence"
              >
                <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="text-center py-4 text-muted-foreground" data-testid="evidence-empty">
              <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No evidence captures yet</p>
            </div>
          ) : isScopedEmpty ? (
            <div className="text-center py-4 text-muted-foreground" data-testid="evidence-scoped-empty">
              <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No evidence from this container's cameras</p>
            </div>
          ) : isFilteredEmpty ? (
            <div className="text-center py-4 text-muted-foreground" data-testid="evidence-filtered-empty">
              <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No evidence from this camera</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              data-testid="evidence-grid"
            >
              {filteredEvidence
                .filter((ev) => ev.status === 'captured')
                .map((ev) => (
                <EvidenceThumbnail
                  key={ev.evidence_id}
                  evidence={ev}
                  onClick={() => handleThumbnailClick(ev)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EvidencePreviewModal
        evidence={selectedEvidence}
        open={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
