/**
 * InventoryEvidencePanel Component
 * Feature: 047-inventory-delta-viewer (T019), 058-presigned-url-refresh
 *
 * Before/after image side-by-side display with optional overlay toggle.
 * Per-image auto-refresh on presigned URL expiration/error.
 */

import { useState, useRef } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, ImageIcon, ImageOff, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EvidenceImages } from '@/domain/types/inventory';
import { evidenceApi } from '@/infrastructure/api/evidence';

interface InventoryEvidencePanelProps {
  evidence: EvidenceImages | null | undefined;
}

function extractObjectKey(url: string): string {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    return url;
  }
}

export function InventoryEvidencePanel({ evidence }: InventoryEvidencePanelProps) {
  const [showOverlays, setShowOverlays] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState({ before: true, after: true });
  const [imageError, setImageError] = useState({ before: false, after: false });
  const [imageRefreshing, setImageRefreshing] = useState({ before: false, after: false });
  const [imageSrc, setImageSrc] = useState({
    before: evidence?.before_image_url ?? '',
    after: evidence?.after_image_url ?? '',
  });
  const hasAutoRetried = useRef({ before: false, after: false });

  const handleImageError = async (slot: 'before' | 'after') => {
    const originalUrl = slot === 'before'
      ? evidence?.before_image_url
      : evidence?.after_image_url;

    if (hasAutoRetried.current[slot]) {
      setImageError((prev) => ({ ...prev, [slot]: true }));
      setImageLoading((prev) => ({ ...prev, [slot]: false }));
      return;
    }

    hasAutoRetried.current[slot] = true;
    setImageRefreshing((prev) => ({ ...prev, [slot]: true }));

    try {
      const objectKey = extractObjectKey(originalUrl ?? '');
      const result = await evidenceApi.refreshPresignedUrl(objectKey);

      if (result) {
        setImageSrc((prev) => ({ ...prev, [slot]: result.url }));
        setImageRefreshing((prev) => ({ ...prev, [slot]: false }));
        setImageLoading((prev) => ({ ...prev, [slot]: true }));
      } else {
        setImageError((prev) => ({ ...prev, [slot]: true }));
        setImageRefreshing((prev) => ({ ...prev, [slot]: false }));
        setImageLoading((prev) => ({ ...prev, [slot]: false }));
      }
    } catch {
      setImageError((prev) => ({ ...prev, [slot]: true }));
      setImageRefreshing((prev) => ({ ...prev, [slot]: false }));
      setImageLoading((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const handleRetry = (slot: 'before' | 'after') => {
    const originalUrl = slot === 'before'
      ? evidence?.before_image_url ?? ''
      : evidence?.after_image_url ?? '';

    hasAutoRetried.current[slot] = false;
    setImageError((prev) => ({ ...prev, [slot]: false }));
    setImageSrc((prev) => ({ ...prev, [slot]: originalUrl }));
    setImageLoading((prev) => ({ ...prev, [slot]: true }));
  };

  if (!evidence || (!evidence.before_image_url && !evidence.after_image_url)) {
    return (
      <div className="py-4 text-center text-muted-foreground" data-testid="evidence-no-images">
        No evidence images available for this session.
        Check if the camera was online during this session.
      </div>
    );
  }

  const hasOverlays = evidence.overlays &&
    ((evidence.overlays.before && evidence.overlays.before.length > 0) ||
     (evidence.overlays.after && evidence.overlays.after.length > 0));

  return (
    <Card data-testid="evidence-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Evidence Images</CardTitle>
          {hasOverlays && (
            <div className="flex items-center gap-2">
              <Switch
                id="overlay-toggle"
                checked={showOverlays}
                onCheckedChange={setShowOverlays}
                data-testid="overlay-toggle"
                aria-label="Toggle detection overlays"
              />
              <Label htmlFor="overlay-toggle" className="text-sm">
                Show overlays
              </Label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Before Image */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Before</p>
            {evidence.before_image_url ? (
              <div className="relative cursor-pointer overflow-hidden rounded-md border">
                {(imageLoading.before || imageRefreshing.before) && !imageError.before && (
                  <Skeleton className="aspect-video w-full" />
                )}
                {imageError.before ? (
                  <div
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-muted-foreground"
                    data-testid="evidence-before-error"
                  >
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">Image unavailable</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry('before')}
                      data-testid="evidence-before-retry"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                ) : (
                <img
                  src={imageSrc.before}
                  alt="Before inventory"
                  className={cn(
                    'aspect-video w-full object-cover',
                    (imageLoading.before || imageRefreshing.before) && 'hidden'
                  )}
                  data-testid="evidence-before"
                  onClick={() => setFullscreenImage(imageSrc.before)}
                  onLoad={() => setImageLoading((prev) => ({ ...prev, before: false }))}
                  onError={() => handleImageError('before')}
                />
                )}
                {showOverlays && evidence.overlays?.before?.map((overlay, i) => (
                  <div
                    key={i}
                    className="absolute border-2 border-green-500 bg-green-500/10"
                    style={{
                      left: overlay.bounding_box.x,
                      top: overlay.bounding_box.y,
                      width: overlay.bounding_box.width,
                      height: overlay.bounding_box.height,
                    }}
                    data-testid={`overlay-before-${i}`}
                  >
                    <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-green-500 px-1 text-xs text-white">
                      {overlay.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="flex aspect-video flex-col items-center justify-center gap-2 rounded-md border bg-muted"
                data-testid="evidence-before-missing"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">Before image not captured</span>
              </div>
            )}
          </div>

          {/* After Image */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">After</p>
            {evidence.after_image_url ? (
              <div className="relative cursor-pointer overflow-hidden rounded-md border">
                {(imageLoading.after || imageRefreshing.after) && !imageError.after && (
                  <Skeleton className="aspect-video w-full" />
                )}
                {imageError.after ? (
                  <div
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-muted-foreground"
                    data-testid="evidence-after-error"
                  >
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">Image unavailable</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry('after')}
                      data-testid="evidence-after-retry"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                ) : (
                <img
                  src={imageSrc.after}
                  alt="After inventory"
                  className={cn(
                    'aspect-video w-full object-cover',
                    (imageLoading.after || imageRefreshing.after) && 'hidden'
                  )}
                  data-testid="evidence-after"
                  onClick={() => setFullscreenImage(imageSrc.after)}
                  onLoad={() => setImageLoading((prev) => ({ ...prev, after: false }))}
                  onError={() => handleImageError('after')}
                />
                )}
                {showOverlays && evidence.overlays?.after?.map((overlay, i) => (
                  <div
                    key={i}
                    className="absolute border-2 border-blue-500 bg-blue-500/10"
                    style={{
                      left: overlay.bounding_box.x,
                      top: overlay.bounding_box.y,
                      width: overlay.bounding_box.width,
                      height: overlay.bounding_box.height,
                    }}
                    data-testid={`overlay-after-${i}`}
                  >
                    <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-blue-500 px-1 text-xs text-white">
                      {overlay.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="flex aspect-video flex-col items-center justify-center gap-2 rounded-md border bg-muted"
                data-testid="evidence-after-missing"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">After image not captured</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Fullscreen Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-4xl" data-testid="evidence-modal">
          <DialogTitle className="sr-only">Evidence Image</DialogTitle>
          {fullscreenImage && (
            <img
              src={fullscreenImage}
              alt="Evidence full view"
              className="w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Info Section */}
      {(evidence.before_image_url || evidence.after_image_url) && (
        <Collapsible
          open={debugOpen}
          onOpenChange={setDebugOpen}
          data-testid="evidence-debug-info"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between px-4 hover:bg-muted/50"
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
            <div className="space-y-3 rounded-md border bg-muted/30 p-3 mx-4 mb-4 mt-1">
              {evidence.before_image_url && (
                <DebugKeyRow
                  label="Before object key"
                  objectKey={extractObjectKey(evidence.before_image_url)}
                  rawUrl={evidence.before_image_url}
                />
              )}
              {evidence.after_image_url && (
                <DebugKeyRow
                  label="After object key"
                  objectKey={extractObjectKey(evidence.after_image_url)}
                  rawUrl={evidence.after_image_url}
                />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}

function DebugKeyRow({
  label,
  objectKey,
  rawUrl,
}: {
  label: string;
  objectKey: string;
  rawUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(objectKey);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <code
          className="font-mono text-xs text-muted-foreground truncate flex-1"
          data-testid={`debug-key-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {objectKey}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={handleCopy}
          data-testid={`debug-copy-${label.toLowerCase().replace(/\s+/g, '-')}`}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        <a
          href={rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`debug-open-raw-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" asChild>
            <span>
              <ExternalLink className="h-3 w-3" />
            </span>
          </Button>
        </a>
      </div>
    </div>
  );
}
