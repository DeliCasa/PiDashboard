/**
 * EvidenceThumbnail Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels, 058-presigned-url-refresh
 *
 * Displays a single evidence thumbnail with loading, error, and
 * auto-refresh states for presigned URL expiration recovery.
 */

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff, Camera, Clock, RefreshCw } from "lucide-react";
import type { EvidenceCapture } from "@/infrastructure/api/diagnostics-schemas";
import { evidenceApi } from "@/infrastructure/api/evidence";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/diagnostics-utils";

interface EvidenceThumbnailProps {
  evidence: EvidenceCapture;
  onClick?: () => void;
  className?: string;
}

type LoadState = "loading" | "loaded" | "error" | "refreshing" | "failed";

export function EvidenceThumbnail({
  evidence,
  onClick,
  className,
}: EvidenceThumbnailProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [imageSrc, setImageSrc] = useState<string>(evidence.thumbnail_url);
  const hasAutoRetried = useRef<boolean>(false);

  const handleLoad = () => {
    setLoadState("loaded");
  };

  const handleError = async () => {
    if (hasAutoRetried.current) {
      setLoadState("failed");
      return;
    }

    hasAutoRetried.current = true;
    setLoadState("refreshing");

    try {
      const objectKey = decodeURIComponent(
        new URL(evidence.thumbnail_url).pathname.slice(1)
      );
      const result = await evidenceApi.refreshPresignedUrl(objectKey);

      if (result) {
        setImageSrc(result.url);
        setLoadState("loading");
      } else {
        setLoadState("failed");
      }
    } catch {
      setLoadState("failed");
    }
  };

  const handleRetry = () => {
    hasAutoRetried.current = false;
    setImageSrc(evidence.thumbnail_url);
    setLoadState("loading");
  };

  return (
    <Card
      data-testid={`evidence-thumbnail-${evidence.id}`}
      className={cn(
        "relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
        "w-full aspect-[4/3]",
        className
      )}
      onClick={onClick}
    >
      {/* Loading / refreshing state */}
      {(loadState === "loading" || loadState === "refreshing") && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Skeleton className="w-full h-full" />
        </div>
      )}

      {/* Intermediate error state (brief, before auto-refresh completes) */}
      {loadState === "error" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground"
          data-testid="thumbnail-error"
        >
          <ImageOff className="h-8 w-8 mb-2" />
          <span className="text-xs">Failed to load</span>
        </div>
      )}

      {/* Permanent failure state */}
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

      {/* Actual image */}
      <img
        src={imageSrc}
        alt={`Evidence ${evidence.id}`}
        className={cn(
          "w-full h-full object-cover",
          loadState !== "loaded" && "invisible absolute"
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* Metadata overlay */}
      {loadState === "loaded" && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              <span className="truncate max-w-[80px]">
                {evidence.camera_id}
              </span>
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
