/**
 * EvidencePreviewModal Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 * Feature: 057-live-ops-viewer (Phase 4) - Debug Info section
 * Feature: 059-real-ops-drilldown - V1 CaptureEntry schema reconciliation
 *
 * Full-screen image preview modal for evidence captures.
 * Displays base64-encoded images from CaptureEntry with download and debug info.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Camera,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ImageOff,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CaptureEntry } from '@/infrastructure/api/diagnostics-schemas';
import { formatTime } from '@/lib/diagnostics-utils';
import { getImageSrc } from '@/infrastructure/api/evidence';
import { evidenceApi } from '@/infrastructure/api/evidence';

interface EvidencePreviewModalProps {
  evidence: CaptureEntry | null;
  open: boolean;
  onClose: () => void;
}

type LoadState = 'loading' | 'loaded' | 'failed';

export function EvidencePreviewModal({ evidence, open, onClose }: EvidencePreviewModalProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [debugOpen, setDebugOpen] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(
    evidence ? getImageSrc(evidence) : ''
  );

  // Reset imageSrc when evidence changes
  useEffect(() => {
    if (evidence) {
      setImageSrc(getImageSrc(evidence));
      setLoadState('loading');
    }
  }, [evidence?.evidence_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => setLoadState('loading'), 100);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleLoad = () => {
    setLoadState('loaded');
  };

  const handleError = () => {
    setLoadState('failed');
  };

  const handleRetry = () => {
    if (!evidence) return;
    setImageSrc(getImageSrc(evidence));
    setLoadState('loading');
  };

  const handleDownload = () => {
    if (!evidence?.image_data) return;
    const blob = evidenceApi.captureEntryToBlob(evidence);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const filename = evidenceApi.getCaptureFilename(evidence);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyObjectKey = async () => {
    if (!evidence?.object_key) return;
    try {
      await navigator.clipboard.writeText(evidence.object_key);
      setKeyCopied(true);
      toast.success('Object key copied');
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!evidence) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        data-testid="evidence-preview-modal"
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-mono">
            Evidence: {evidence.evidence_id}
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

          {/* Permanent error state */}
          {loadState === 'failed' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground"
              data-testid="preview-error"
            >
              <ImageOff className="h-12 w-12 mb-2" />
              <span className="text-sm">Image unavailable</span>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleRetry}
                data-testid="preview-retry-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}

          {/* Actual image */}
          <img
            src={imageSrc}
            alt={`Evidence ${evidence.evidence_id}`}
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
              <span>{evidence.device_id}</span>
            </div>
            <div className="flex items-center gap-1" data-testid="preview-timestamp">
              <Clock className="h-4 w-4" />
              <span>{formatTime(evidence.created_at)}</span>
            </div>
            {evidence.image_size_bytes && (
              <span data-testid="preview-size">
                {(evidence.image_size_bytes / 1024).toFixed(1)} KB
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

        {/* Debug Info */}
        <Collapsible
          open={debugOpen}
          onOpenChange={setDebugOpen}
          data-testid="evidence-debug-info"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between px-2 hover:bg-muted/50"
            >
              <span className="text-xs text-muted-foreground">Debug Info</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  debugOpen && 'rotate-180'
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 mt-1">
              <div>
                <span className="text-xs text-muted-foreground">Object Key</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="font-mono text-xs break-all flex-1">
                    {evidence.object_key ?? 'N/A'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={handleCopyObjectKey}
                    aria-label="Copy object key"
                  >
                    {keyCopied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span>Status: {evidence.status}</span>
                {evidence.capture_tag && (
                  <span className="ml-3">Tag: {evidence.capture_tag}</span>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
}
