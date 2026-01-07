/**
 * DeviceList Component
 * Displays discovered BLE devices with status badges
 */

import { Bluetooth, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Device, DeviceStatus } from '@/domain/types/entities';

interface DeviceListProps {
  devices: Device[];
  selectedAddresses: string[];
  onSelectionChange: (addresses: string[]) => void;
  onProvision: (address: string) => void;
  className?: string;
}

const statusConfig: Record<DeviceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Check }> = {
  discovered: { label: 'Discovered', variant: 'outline', icon: Bluetooth },
  connecting: { label: 'Connecting', variant: 'secondary', icon: Loader2 },
  provisioning: { label: 'Provisioning', variant: 'secondary', icon: Loader2 },
  provisioned: { label: 'Provisioned', variant: 'default', icon: Check },
  online: { label: 'Online', variant: 'default', icon: Check },
  offline: { label: 'Offline', variant: 'secondary', icon: AlertCircle },
  error: { label: 'Error', variant: 'destructive', icon: AlertCircle },
};

function getSignalStrength(rssi: number): { bars: number; color: string } {
  if (rssi > -50) return { bars: 4, color: 'text-green-500' };
  if (rssi > -60) return { bars: 3, color: 'text-green-500' };
  if (rssi > -70) return { bars: 2, color: 'text-yellow-500' };
  return { bars: 1, color: 'text-red-500' };
}

function SignalIndicator({ rssi }: { rssi: number }) {
  const { bars, color } = getSignalStrength(rssi);
  return (
    <div className="flex items-end gap-0.5" title={`${rssi} dBm`}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            'w-1 rounded-sm',
            bar <= bars ? color.replace('text-', 'bg-') : 'bg-muted',
            bar === 1 && 'h-1',
            bar === 2 && 'h-2',
            bar === 3 && 'h-3',
            bar === 4 && 'h-4'
          )}
        />
      ))}
    </div>
  );
}

export function DeviceList({
  devices,
  selectedAddresses,
  onSelectionChange,
  onProvision,
  className,
}: DeviceListProps) {
  const toggleSelection = (address: string) => {
    if (selectedAddresses.includes(address)) {
      onSelectionChange(selectedAddresses.filter((a) => a !== address));
    } else {
      onSelectionChange([...selectedAddresses, address]);
    }
  };

  const selectAll = () => {
    const unprovisionedAddresses = devices
      .filter((d) => !d.provisioned)
      .map((d) => d.address);
    onSelectionChange(unprovisionedAddresses);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  if (devices.length === 0) {
    return (
      <div className={cn('py-8 text-center text-muted-foreground', className)}>
        <Bluetooth className="mx-auto h-8 w-8 opacity-50" />
        <p className="mt-2 text-sm">No devices found</p>
        <p className="text-xs">Start a scan to discover nearby ESP32 devices</p>
      </div>
    );
  }

  const unprovisionedCount = devices.filter((d) => !d.provisioned).length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selection Controls */}
      {unprovisionedCount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedAddresses.length} of {unprovisionedCount} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              disabled={selectedAddresses.length === unprovisionedCount}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              disabled={selectedAddresses.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Device Cards */}
      <div className="space-y-2">
        {devices.map((device) => {
          const config = statusConfig[device.status];
          const StatusIcon = config.icon;
          const isSelected = selectedAddresses.includes(device.address);
          const canSelect = !device.provisioned && device.status !== 'provisioning';

          return (
            <div
              key={device.address}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                isSelected && 'border-primary bg-primary/5'
              )}
            >
              {/* Selection Checkbox */}
              {canSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelection(device.address)}
                  aria-label={`Select ${device.name}`}
                />
              )}

              {/* Signal Indicator */}
              <SignalIndicator rssi={device.rssi} />

              {/* Device Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{device.name}</span>
                  <Badge variant={config.variant} className="text-xs">
                    <StatusIcon className={cn(
                      'mr-1 h-3 w-3',
                      device.status === 'connecting' || device.status === 'provisioning' ? 'animate-spin' : ''
                    )} />
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {device.address}
                  {device.firmware_version && ` • v${device.firmware_version}`}
                </p>
              </div>

              {/* Action Button */}
              {!device.provisioned && device.status === 'discovered' && (
                <Button
                  size="sm"
                  onClick={() => onProvision(device.address)}
                >
                  Provision
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
