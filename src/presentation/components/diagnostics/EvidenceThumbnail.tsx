/**
 * EvidenceThumbnail Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Displays a single evidence thumbnail with loading and error states.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff, Camera, Clock } from 'lucide-react';
import type { EvidenceCapture } from '@/infrastructure/api/diagnostics-schemas';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/diagnostics-utils';

interface EvidenceThumbnailProps {
  evidence: EvidenceCapture;
  onClick?: () => void;
  className?: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

export function EvidenceThumbnail({ evidence, onClick, className }: EvidenceThumbnailProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const handleLoad = () => {
    setLoadState('loaded');
  };

  const handleError = () => {
    setLoadState('error');
  };

  return (
    <Card
      data-testid={`evidence-thumbnail-${evidence.id}`}
      className={cn(
        'relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
        'w-full aspect-[4/3]',
        className
      )}
      onClick={onClick}
    >
      {/* Loading state */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Skeleton className="w-full h-full" />
        </div>
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground"
          data-testid="thumbnail-error"
        >
          <ImageOff className="h-8 w-8 mb-2" />
          <span className="text-xs">Failed to load</span>
        </div>
      )}

      {/* Actual image */}
      <img
        src={evidence.thumbnail_url}
        alt={`Evidence ${evidence.id}`}
        className={cn(
          'w-full h-full object-cover',
          loadState !== 'loaded' && 'invisible absolute'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* Metadata overlay */}
      {loadState === 'loaded' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{evidence.camera_id}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(evidence.captured_at)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
