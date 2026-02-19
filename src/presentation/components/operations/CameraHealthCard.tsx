/**
 * CameraHealthCard Component
 *
 * Displays health and diagnostics for a single camera in a card format.
 * Shows status, connection quality, error info, and collapsible diagnostics.
 */

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Cpu,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/diagnostics-utils";
import {
  ConnectionQualityBadge,
  ConnectionQualityFromRssi,
} from "@/presentation/components/diagnostics/ConnectionQualityBadge";
import type { CameraDiagnostics, CameraStatus } from "@/domain/types/camera-diagnostics";

interface CameraHealthCardProps {
  camera: CameraDiagnostics;
}

const statusBadgeVariant: Record<CameraStatus, "default" | "destructive" | "outline"> = {
  online: "default",
  offline: "destructive",
  error: "destructive",
  rebooting: "outline",
  discovered: "outline",
  pairing: "outline",
  connecting: "outline",
};

export function CameraHealthCard({ camera }: CameraHealthCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isOffline = camera.status === "offline";
  const diag = camera.diagnostics;

  return (
    <Card
      data-testid="camera-health-card"
      className={cn(
        "transition-colors",
        isOffline && "border-yellow-500/50"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{camera.name}</CardTitle>
          <Badge
            data-testid="camera-status-badge"
            variant={statusBadgeVariant[camera.status]}
          >
            {camera.status}
          </Badge>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {camera.camera_id}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Last seen */}
        <div
          data-testid="camera-last-seen"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Clock className="h-3 w-3" />
          <span>Last seen: {formatRelativeTime(camera.last_seen)}</span>
        </div>

        {/* Connection quality */}
        {diag?.connection_quality ? (
          <ConnectionQualityBadge
            quality={diag.connection_quality}
            rssi={camera.health?.wifi_rssi}
            showRssi={camera.health?.wifi_rssi !== undefined}
          />
        ) : camera.health?.wifi_rssi !== undefined ? (
          <ConnectionQualityFromRssi rssi={camera.health.wifi_rssi} />
        ) : null}

        {/* Error info */}
        {diag && diag.error_count > 0 && (
          <div
            data-testid="camera-error-info"
            className="flex items-start gap-2 rounded bg-destructive/10 p-2 text-xs text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <div>
              <span className="font-medium">
                {diag.error_count} error{diag.error_count !== 1 ? "s" : ""}
              </span>
              {diag.last_error && (
                <p className="mt-0.5 text-destructive/80">{diag.last_error}</p>
              )}
            </div>
          </div>
        )}

        {/* Collapsible diagnostics */}
        {diag ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger
              data-testid="camera-diagnostics-toggle"
              className="flex w-full items-center justify-center gap-1 pt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Cpu className="h-3 w-3" />
              <span>Diagnostics</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 space-y-1 border-t pt-2">
              {diag.firmware_version && (
                <DiagRow label="Firmware" value={diag.firmware_version} />
              )}
              {diag.resolution && (
                <DiagRow label="Resolution" value={diag.resolution} />
              )}
              {diag.avg_capture_time_ms !== undefined && (
                <DiagRow
                  label="Avg capture"
                  value={`${diag.avg_capture_time_ms}ms`}
                />
              )}
              {camera.ip_address && (
                <DiagRow label="IP" value={camera.ip_address} />
              )}
              {camera.mac_address && (
                <DiagRow label="MAC" value={camera.mac_address} />
              )}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>Diagnostics not available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
