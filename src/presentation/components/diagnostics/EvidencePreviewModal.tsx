/**
 * EvidencePreviewModal Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Full-screen image preview modal for evidence captures.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, Clock, Download, ImageOff, X } from 'lucide-react';
import type { EvidenceCapture } from '@/infrastructure/api/diagnostics-schemas';
import { formatTime } from '@/lib/diagnostics-utils';

interface EvidencePreviewModalProps {
  evidence: EvidenceCapture | null;
  open: boolean;
  onClose: () => void;
}

type LoadState = 'loading' | 'loaded' | 'error';

export function EvidencePreviewModal({ evidence, open, onClose }: EvidencePreviewModalProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const handleLoad = () => {
    setLoadState('loaded');
  };

  const handleError = () => {
    setLoadState('error');
  };

  const handleDownload = () => {
    if (!evidence) return;

    const link = document.createElement('a');
    link.href = evidence.full_url;
    link.download = `evidence-${evidence.id}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset load state when evidence changes
  if (!open) {
    if (loadState !== 'loading') {
      setTimeout(() => setLoadState('loading'), 100);
    }
  }

  if (!evidence) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        data-testid="evidence-preview-modal"
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-mono">
            Evidence: {evidence.id}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Image container */}
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
          {/* Loading state */}
          {loadState === 'loading' && (
            <div className="absolute inset-0">
              <Skeleton className="w-full h-full" />
            </div>
          )}

          {/* Error state */}
          {loadState === 'error' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground"
              data-testid="preview-error"
            >
              <ImageOff className="h-12 w-12 mb-2" />
              <span className="text-sm">Failed to load full image</span>
            </div>
          )}

          {/* Actual image */}
          <img
            src={evidence.full_url}
            alt={`Evidence ${evidence.id}`}
            className={`w-full h-full object-contain ${
              loadState !== 'loaded' ? 'invisible absolute' : ''
            }`}
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1" data-testid="preview-camera">
              <Camera className="h-4 w-4" />
              <span>{evidence.camera_id}</span>
            </div>
            <div className="flex items-center gap-1" data-testid="preview-timestamp">
              <Clock className="h-4 w-4" />
              <span>{formatTime(evidence.captured_at)}</span>
            </div>
            {evidence.size_bytes && (
              <span data-testid="preview-size">
                {(evidence.size_bytes / 1024).toFixed(1)} KB
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            data-testid="download-button"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
