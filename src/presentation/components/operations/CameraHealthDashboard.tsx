/**
 * CameraHealthDashboard Component
 *
 * Self-contained dashboard showing all camera health statuses in a grid.
 * Polls every 30s, handles loading/error/empty states with graceful degradation.
 */

import { Camera, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useCameraDiagnosticsList } from "@/application/hooks/useCameraDiagnostics";
import { isFeatureUnavailable } from "@/infrastructure/api/client";
import { CameraHealthCard } from "./CameraHealthCard";

export function CameraHealthDashboard() {
  const { data: cameras, isLoading, error, refetch } =
    useCameraDiagnosticsList(true, 30_000);

  const onlineCount = cameras?.filter((c) => c.status === "online").length ?? 0;
  const offlineCount = cameras
    ? cameras.length - onlineCount
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="camera-health-loading" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="aspect-[4/3] w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    if (isFeatureUnavailable(error)) {
      return (
        <div
          data-testid="camera-health-error"
          className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6 text-center text-sm text-blue-700 dark:text-blue-400"
        >
          Camera health data is not available. The orchestrator may need
          updating.
        </div>
      );
    }

    return (
      <div
        data-testid="camera-health-error"
        className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center"
      >
        <p className="text-sm text-destructive">
          Failed to load camera health data.
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (!cameras || cameras.length === 0) {
    return (
      <div
        data-testid="camera-health-empty"
        className="flex flex-col items-center gap-2 py-12 text-muted-foreground"
      >
        <Camera className="h-10 w-10" />
        <p className="text-sm">No cameras registered</p>
      </div>
    );
  }

  // Data state
  return (
    <div data-testid="camera-health-dashboard" className="space-y-4">
      {/* Summary bar */}
      <div
        data-testid="camera-summary"
        className="flex items-center gap-3"
      >
        <span className="text-sm font-medium">
          {cameras.length} camera{cameras.length !== 1 ? "s" : ""}
        </span>
        <Badge
          variant="outline"
          className="bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400"
        >
          {onlineCount} online
        </Badge>
        {offlineCount > 0 && (
          <Badge
            variant="outline"
            className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400"
          >
            {offlineCount} offline
          </Badge>
        )}
      </div>

      {/* Camera grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cameras.map((camera) => (
          <CameraHealthCard key={camera.camera_id} camera={camera} />
        ))}
      </div>
    </div>
  );
}
