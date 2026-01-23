/**
 * CameraDetail Component
 * Modal for displaying detailed camera information
 *
 * Feature: 034-esp-camera-integration (T033-T038)
 */

import {
  Camera,
  Wifi,
  Clock,
  Cpu,
  Server,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCamera } from '@/application/hooks/useCamera';
import type { Camera as CameraType, CameraStatus } from '@/domain/types/entities';

interface CameraDetailProps {
  cameraId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewList?: () => void;
}

const statusConfig: Record<CameraStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  online: { label: 'Online', icon: CheckCircle, color: 'text-green-500' },
  offline: { label: 'Offline', icon: XCircle, color: 'text-red-500' },
  error: { label: 'Error', icon: AlertCircle, color: 'text-red-500' },
  rebooting: { label: 'Rebooting', icon: RefreshCw, color: 'text-yellow-500' },
  discovered: { label: 'Discovered', icon: Wifi, color: 'text-blue-500' },
  pairing: { label: 'Pairing', icon: RefreshCw, color: 'text-blue-500' },
  connecting: { label: 'Connecting', icon: RefreshCw, color: 'text-yellow-500' },
};

function formatUptime(seconds?: number): string {
  if (!seconds) return 'Unknown';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getWifiSignalLevel(rssi: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (rssi > -50) return 'excellent';
  if (rssi > -60) return 'good';
  if (rssi > -70) return 'fair';
  return 'poor';
}

function WifiSignalBadge({ rssi }: { rssi: number }) {
  const level = getWifiSignalLevel(rssi);
  const colors = {
    excellent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    good: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    poor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Badge className={cn('font-mono', colors[level])}>
      {rssi} dBm ({level})
    </Badge>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" data-testid="camera-detail-loading">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function NotFoundState({ onViewList }: { onViewList?: () => void }) {
  return (
    <div className="py-8 text-center" data-testid="camera-detail-not-found">
      <AlertCircle className="mx-auto h-12 w-12 text-destructive opacity-70" />
      <h3 className="mt-4 text-lg font-semibold">Camera Not Found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        This camera may have been removed or the ID is incorrect.
      </p>
      {onViewList && (
        <Button variant="outline" className="mt-4" onClick={onViewList}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Camera List
        </Button>
      )}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="py-8 text-center" data-testid="camera-detail-error">
      <AlertCircle className="mx-auto h-12 w-12 text-destructive opacity-70" />
      <h3 className="mt-4 text-lg font-semibold">Failed to Load Camera</h3>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function CameraContent({ camera }: { camera: CameraType }) {
  const status = statusConfig[camera.status];
  const StatusIcon = status.icon;
  const isOnline = camera.status === 'online';

  return (
    <div className="space-y-6" data-testid="camera-detail-content">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            isOnline ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'
          )}>
            <Camera className={cn('h-6 w-6', isOnline ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{camera.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{camera.id}</p>
          </div>
        </div>
        <Badge variant={isOnline ? 'default' : 'secondary'}>
          <StatusIcon className={cn('mr-1 h-3 w-3', status.color, camera.status === 'rebooting' && 'animate-spin')} />
          {status.label}
        </Badge>
      </div>

      {/* Network Information */}
      <div className="rounded-lg border p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Server className="h-4 w-4" />
          Network Information
        </h4>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">IP Address</dt>
            <dd className="font-mono">{camera.ip_address || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">MAC Address</dt>
            <dd className="font-mono">{camera.mac_address || camera.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last Seen</dt>
            <dd>{new Date(camera.lastSeen).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      {/* Health Metrics (T035) */}
      {camera.health && isOnline && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Cpu className="h-4 w-4" />
            Health Metrics
          </h4>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Wifi className="h-3 w-3" />
                WiFi Signal
              </dt>
              <dd className="mt-1">
                {camera.health.wifi_rssi !== undefined ? (
                  <WifiSignalBadge rssi={camera.health.wifi_rssi} />
                ) : (
                  'Unknown'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Free Memory</dt>
              <dd className="font-mono">
                {camera.health.free_heap !== undefined
                  ? formatBytes(camera.health.free_heap)
                  : 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Uptime
              </dt>
              <dd>{formatUptime(camera.health.uptime_seconds)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Resolution</dt>
              <dd>{camera.health.resolution || 'Unknown'}</dd>
            </div>
            {camera.health.firmware_version && (
              <div>
                <dt className="text-muted-foreground">Firmware</dt>
                <dd className="font-mono">v{camera.health.firmware_version}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Last Capture Thumbnail (T036a) */}
      {camera.health?.last_capture && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4" />
            Last Capture
          </h4>
          <p className="text-sm text-muted-foreground">
            {new Date(camera.health.last_capture).toLocaleString()}
          </p>
        </div>
      )}

      {/* Error Display (T036) */}
      {camera.health?.last_error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4" data-testid="camera-last-error">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            Last Error
          </h4>
          <p className="text-sm">{camera.health.last_error}</p>
        </div>
      )}
    </div>
  );
}

export function CameraDetail({ cameraId, open, onOpenChange, onViewList }: CameraDetailProps) {
  const { data: camera, isLoading, isError, error, refetch } = useCamera(cameraId, open);

  // Check for 404
  const isNotFound = error && 'code' in error && error.code === 'CAMERA_NOT_FOUND';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Camera Details</DialogTitle>
          <DialogDescription>
            Detailed information and health metrics
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState />
        ) : isNotFound ? (
          <NotFoundState onViewList={onViewList} />
        ) : isError && error ? (
          <ErrorState error={error as Error} onRetry={() => refetch()} />
        ) : camera ? (
          <CameraContent camera={camera} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
