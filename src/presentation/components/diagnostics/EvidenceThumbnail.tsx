/**
 * EvidenceThumbnail Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 * Feature: 059-real-ops-drilldown (V1 schema reconciliation)
 *
 * Displays a single evidence thumbnail with loading, error, and
 * placeholder states. Uses base64 inline images from CaptureEntry.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff, Camera, Clock, RefreshCw, HardDrive, Tag } from "lucide-react";
import type { CaptureEntry } from "@/infrastructure/api/diagnostics-schemas";
import { getImageSrc, hasImageData, isS3Only } from "@/infrastructure/api/evidence";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/diagnostics-utils";

interface EvidenceThumbnailProps {
  evidence: CaptureEntry;
  onClick?: () => void;
  className?: string;
}

type LoadState = "loading" | "loaded" | "failed";

/**
 * Format a capture_tag enum value into a human-readable label.
 * e.g. "BEFORE_OPEN" -> "Before Open"
 */
function formatCaptureTag(tag: string): string {
  return tag
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function EvidenceThumbnail({
  evidence,
  onClick,
  className,
}: EvidenceThumbnailProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const imageSrc = getImageSrc(evidence);

  const handleLoad = () => {
    setLoadState("loaded");
  };

  const handleError = () => {
    setLoadState("failed");
  };

  const handleRetry = () => {
    setLoadState("loading");
  };

  // S3-only placeholder: has object_key but no inline image_data
  if (isS3Only(evidence)) {
    return (
      <Card
        data-testid={`evidence-thumbnail-${evidence.evidence_id}`}
        className={cn(
          "relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
          "w-full aspect-[4/3]",
          className
        )}
        onClick={onClick}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground"
          data-testid="thumbnail-s3-only"
        >
          <HardDrive className="h-8 w-8 mb-2" />
          <span className="text-xs">Stored in S3</span>
          <span className="text-[10px] font-mono mt-1 max-w-[90%] truncate opacity-70">
            {evidence.object_key}
          </span>
        </div>
        {/* Capture tag badge */}
        <div className="absolute top-1 left-1">
          <span
            className="inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
            data-testid="capture-tag-badge"
          >
            <Tag className="h-2.5 w-2.5" />
            {formatCaptureTag(evidence.capture_tag)}
          </span>
        </div>
      </Card>
    );
  }

  // No image data and no object_key: image not available
  if (!hasImageData(evidence)) {
    return (
      <Card
        data-testid={`evidence-thumbnail-${evidence.evidence_id}`}
        className={cn(
          "relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
          "w-full aspect-[4/3]",
          className
        )}
        onClick={onClick}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground"
          data-testid="thumbnail-no-image"
        >
          <ImageOff className="h-8 w-8 mb-2" />
          <span className="text-xs">Image not available</span>
        </div>
        {/* Capture tag badge */}
        <div className="absolute top-1 left-1">
          <span
            className="inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
            data-testid="capture-tag-badge"
          >
            <Tag className="h-2.5 w-2.5" />
            {formatCaptureTag(evidence.capture_tag)}
          </span>
        </div>
      </Card>
    );
  }

  // Has inline image_data: render the base64 image
  return (
    <Card
      data-testid={`evidence-thumbnail-${evidence.evidence_id}`}
      className={cn(
        "relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
        "w-full aspect-[4/3]",
        className
      )}
      onClick={onClick}
    >
      {/* Loading state */}
      {loadState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Skeleton className="w-full h-full" />
        </div>
      )}

      {/* Failed state */}
      {loadState === "failed" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground"
          data-testid="thumbnail-error"
        >
          <ImageOff className="h-8 w-8 mb-2" />
          <span className="text-xs">Failed to load</span>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs gap-1"
            data-testid="thumbnail-retry-button"
            onClick={(e) => {
              e.stopPropagation();
              handleRetry();
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Actual image (base64 data URI) */}
      <img
        src={imageSrc}
        alt={`Evidence ${evidence.evidence_id}`}
        className={cn(
          "w-full h-full object-cover",
          loadState !== "loaded" && "invisible absolute"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* Capture tag badge */}
      <div className="absolute top-1 left-1">
        <span
          className="inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
          data-testid="capture-tag-badge"
        >
          <Tag className="h-2.5 w-2.5" />
          {formatCaptureTag(evidence.capture_tag)}
        </span>
      </div>

      {/* Metadata overlay */}
      {loadState === "loaded" && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              <span className="truncate max-w-[80px]">
                {evidence.device_id}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(evidence.created_at)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
