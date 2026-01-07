/**
 * ConnectionStatus Component
 * Displays current WiFi connection state
 */

import { Wifi, WifiOff, Radio, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WiFiStatus } from '@/domain/types/entities';

interface ConnectionStatusProps {
  status: WiFiStatus | null | undefined;
  isLoading?: boolean;
  onDisconnect?: () => void;
  isDisconnecting?: boolean;
  className?: string;
}

export function ConnectionStatus({
  status,
  isLoading,
  onDisconnect,
  isDisconnecting,
  className,
}: ConnectionStatusProps) {
  if (isLoading || !status) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          <WifiOff className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isLoading ? 'Loading status...' : 'Status unavailable'}
          </span>
        </div>
      </div>
    );
  }

  const isConnected = status.client_status === 'connected';
  const isConnecting = status.client_status === 'connecting';
  const apActive = status.ap_status === 'active';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Client Connection Status */}
      <div
        className={cn(
          'flex items-center justify-between rounded-lg p-3',
          isConnected && 'bg-green-500/10 text-green-600 dark:text-green-400',
          isConnecting && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
          !isConnected && !isConnecting && 'bg-muted text-muted-foreground'
        )}
      >
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4" />
          ) : isConnecting ? (
            <Wifi className="h-4 w-4 animate-pulse" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <div>
            <span className="text-sm font-medium">
              {isConnected
                ? `Connected to ${status.client_ssid}`
                : isConnecting
                ? 'Connecting...'
                : 'Not connected'}
            </span>
            {isConnected && status.client_ip && (
              <p className="text-xs opacity-80">{status.client_ip}</p>
            )}
          </div>
        </div>

        {isConnected && onDisconnect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="text-current hover:bg-green-500/20"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        )}
      </div>

      {/* Access Point Status */}
      {apActive && (
        <div className="flex items-center justify-between rounded-lg bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <div>
              <span className="text-sm font-medium">
                Access Point: {status.ap_ssid}
              </span>
              {status.ap_ip && (
                <p className="text-xs opacity-80">{status.ap_ip}</p>
              )}
            </div>
          </div>
          {status.connected_devices !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {status.connected_devices}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
