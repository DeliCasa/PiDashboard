/**
 * CameraCard Component
 * Individual camera status card with health metrics
 */

import { Camera as CameraIcon, Wifi, RefreshCw, Power, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Camera, CameraStatus } from '@/domain/types/entities';

interface CameraCardProps {
  camera: Camera;
  onCapture?: () => void;
  onReboot?: () => void;
  isCapturing?: boolean;
  isRebooting?: boolean;
  className?: string;
}

const statusConfig: Record<CameraStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  online: { label: 'Online', icon: CheckCircle, color: 'text-green-500' },
  offline: { label: 'Offline', icon: XCircle, color: 'text-red-500' },
  error: { label: 'Error', icon: AlertCircle, color: 'text-red-500' },
  rebooting: { label: 'Rebooting', icon: RefreshCw, color: 'text-yellow-500' },
};

function formatUptime(seconds?: number): string {
  if (!seconds) return 'Unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CameraCard({
  camera,
  onCapture,
  onReboot,
  isCapturing,
  isRebooting,
  className,
}: CameraCardProps) {
  const status = statusConfig[camera.status];
  const StatusIcon = status.icon;
  const isOnline = camera.status === 'online';

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Status indicator strip */}
      <div className={cn(
        'absolute left-0 top-0 h-full w-1',
        camera.status === 'online' && 'bg-green-500',
        camera.status === 'offline' && 'bg-red-500',
        camera.status === 'error' && 'bg-red-500',
        camera.status === 'rebooting' && 'bg-yellow-500'
      )} />

      <CardHeader className="pl-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CameraIcon className="h-4 w-4" />
            {camera.name}
          </CardTitle>
          <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
            <StatusIcon className={cn(
              'mr-1 h-3 w-3',
              status.color,
              camera.status === 'rebooting' && 'animate-spin'
            )} />
            {status.label}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {camera.id}
          {camera.ip_address && ` • ${camera.ip_address}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pl-5">
        {/* Health Metrics */}
        {camera.health && isOnline && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* WiFi Signal */}
            <div className="flex items-center gap-2">
              <Wifi className={cn(
                'h-4 w-4',
                camera.health.wifi_rssi > -50 && 'text-green-500',
                camera.health.wifi_rssi <= -50 && camera.health.wifi_rssi > -70 && 'text-yellow-500',
                camera.health.wifi_rssi <= -70 && 'text-red-500'
              )} />
              <span>{camera.health.wifi_rssi} dBm</span>
            </div>

            {/* Free Heap */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">Heap:</span>
              <span>{formatBytes(camera.health.free_heap)}</span>
            </div>

            {/* Resolution */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">Res:</span>
              <span>{camera.health.resolution}</span>
            </div>

            {/* Uptime */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatUptime(camera.health.uptime_seconds)}</span>
            </div>
          </div>
        )}

        {/* Offline Message */}
        {!isOnline && (
          <p className="text-sm text-muted-foreground">
            Last seen: {new Date(camera.lastSeen).toLocaleString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCapture}
            disabled={!isOnline || isCapturing}
            className="flex-1"
          >
            <CameraIcon className={cn('mr-2 h-4 w-4', isCapturing && 'animate-pulse')} />
            {isCapturing ? 'Capturing...' : 'Test Capture'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReboot}
            disabled={!isOnline || isRebooting}
          >
            <Power className={cn('h-4 w-4', isRebooting && 'animate-spin')} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
