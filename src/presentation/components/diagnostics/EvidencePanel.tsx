/**
 * EvidencePanel Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Displays evidence thumbnails for a session in a grid layout.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Image, RefreshCw, AlertCircle, ImageOff } from 'lucide-react';
import { useSessionEvidence, useInvalidateEvidence } from '@/application/hooks/useEvidence';
import { EvidenceThumbnail } from './EvidenceThumbnail';
import { EvidencePreviewModal } from './EvidencePreviewModal';
import type { EvidenceCapture } from '@/infrastructure/api/diagnostics-schemas';
import { cn } from '@/lib/utils';

interface EvidencePanelProps {
  sessionId: string;
  className?: string;
}

export function EvidencePanel({ sessionId, className }: EvidencePanelProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceCapture | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: evidence, isLoading, isFetching, error, refetch } = useSessionEvidence(sessionId);
  const { invalidate } = useInvalidateEvidence();

  const handleRefresh = () => {
    invalidate(sessionId);
  };

  const handleThumbnailClick = (ev: EvidenceCapture) => {
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

  return (
    <>
      <Card className={className} data-testid="evidence-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="h-4 w-4" />
              Evidence Captures
              {!isEmpty && (
                <span className="text-xs text-muted-foreground font-normal" data-testid="evidence-count">
                  ({evidence.length})
                </span>
              )}
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="text-center py-4 text-muted-foreground" data-testid="evidence-empty">
              <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No evidence captures yet</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              data-testid="evidence-grid"
            >
              {evidence.map((ev) => (
                <EvidenceThumbnail
                  key={ev.id}
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
