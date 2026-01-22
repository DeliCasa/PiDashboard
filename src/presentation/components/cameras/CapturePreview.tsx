/**
 * CapturePreview Component
 * Display captured test images with comparison mode
 */

import { useState } from 'react';
import { X, Download, Maximize2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CapturePreviewProps {
  imageUrl: string | null;
  timestamp?: string;
  isLoading?: boolean;
  onClose?: () => void;
  beforeImage?: string;
  showComparison?: boolean;
  className?: string;
}

export function CapturePreview({
  imageUrl,
  timestamp,
  isLoading,
  onClose,
  beforeImage,
  showComparison = false,
  className,
}: CapturePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compareMode, setCompareMode] = useState<'side' | 'slider'>('side');

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `capture-${timestamp || Date.now()}.jpg`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={cn(
        'flex aspect-video items-center justify-center rounded-lg border-2 border-dashed',
        className
      )}>
        <p className="text-sm text-muted-foreground">No capture available</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-lg bg-muted">
          {showComparison && beforeImage && compareMode === 'side' ? (
            // Side by side comparison
            <div className="grid grid-cols-2 gap-1">
              <div className="relative">
                <img
                  src={beforeImage}
                  alt="Before"
                  className="aspect-video w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
                  Before
                </span>
              </div>
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="After"
                  className="aspect-video w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
                  After
                </span>
              </div>
            </div>
          ) : (
            // Single image view
            <img
              src={imageUrl}
              alt="Capture preview"
              className="aspect-video w-full object-cover"
            />
          )}

          {/* Overlay Actions */}
          <div className="absolute right-2 top-2 flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 opacity-80 hover:opacity-100"
              onClick={() => setIsFullscreen(true)}
              aria-label="View fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 opacity-80 hover:opacity-100"
              onClick={handleDownload}
              aria-label="Download capture"
            >
              <Download className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 opacity-80 hover:opacity-100"
                onClick={onClose}
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{new Date(timestamp).toLocaleString()}</span>
          </div>
        )}

        {/* Comparison Toggle */}
        {showComparison && beforeImage && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={compareMode === 'side' ? 'default' : 'outline'}
              onClick={() => setCompareMode('side')}
            >
              Side by Side
            </Button>
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Capture Preview</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={imageUrl}
              alt="Capture preview fullscreen"
              className="w-full rounded-lg"
            />
            <Button
              className="absolute right-2 top-2"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
          {timestamp && (
            <p className="text-sm text-muted-foreground">
              Captured: {new Date(timestamp).toLocaleString()}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
