/**
 * InventoryEvidencePanel Component
 * Feature: 047-inventory-delta-viewer (T019)
 *
 * Before/after image side-by-side display with optional overlay toggle.
 */

import { useState } from 'react';
import { ImageIcon, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { EvidenceImages } from '@/domain/types/inventory';

interface InventoryEvidencePanelProps {
  evidence: EvidenceImages | null | undefined;
}

export function InventoryEvidencePanel({ evidence }: InventoryEvidencePanelProps) {
  const [showOverlays, setShowOverlays] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState({ before: true, after: true });
  const [imageError, setImageError] = useState({ before: false, after: false });

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
                {imageLoading.before && !imageError.before && (
                  <Skeleton className="aspect-video w-full" />
                )}
                {imageError.before ? (
                  <div
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-muted-foreground"
                    data-testid="evidence-before-error"
                  >
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">Image unavailable</span>
                  </div>
                ) : (
                <img
                  src={evidence.before_image_url}
                  alt="Before inventory"
                  className={cn(
                    'aspect-video w-full object-cover',
                    imageLoading.before && 'hidden'
                  )}
                  data-testid="evidence-before"
                  onClick={() => setFullscreenImage(evidence.before_image_url!)}
                  onLoad={() => setImageLoading((prev) => ({ ...prev, before: false }))}
                  onError={() => {
                    setImageError((prev) => ({ ...prev, before: true }));
                    setImageLoading((prev) => ({ ...prev, before: false }));
                  }}
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
                {imageLoading.after && !imageError.after && (
                  <Skeleton className="aspect-video w-full" />
                )}
                {imageError.after ? (
                  <div
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-muted-foreground"
                    data-testid="evidence-after-error"
                  >
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">Image unavailable</span>
                  </div>
                ) : (
                <img
                  src={evidence.after_image_url}
                  alt="After inventory"
                  className={cn(
                    'aspect-video w-full object-cover',
                    imageLoading.after && 'hidden'
                  )}
                  data-testid="evidence-after"
                  onClick={() => setFullscreenImage(evidence.after_image_url!)}
                  onLoad={() => setImageLoading((prev) => ({ ...prev, after: false }))}
                  onError={() => {
                    setImageError((prev) => ({ ...prev, after: true }));
                    setImageLoading((prev) => ({ ...prev, after: false }));
                  }}
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
    </Card>
  );
}
