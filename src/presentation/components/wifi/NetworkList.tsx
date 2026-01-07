/**
 * NetworkList Component
 * Displays discovered WiFi networks with signal indicators
 */

import { Wifi, Lock, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WiFiNetwork } from '@/domain/types/entities';

interface NetworkListProps {
  networks: WiFiNetwork[];
  selectedSsid?: string;
  connectedSsid?: string;
  onSelect: (ssid: string) => void;
  className?: string;
}

function getSignalStrength(signal: number): {
  bars: number;
  color: string;
  label: string;
} {
  if (signal > -50) return { bars: 4, color: 'text-green-500', label: 'Excellent' };
  if (signal > -60) return { bars: 3, color: 'text-green-500', label: 'Good' };
  if (signal > -70) return { bars: 2, color: 'text-yellow-500', label: 'Fair' };
  return { bars: 1, color: 'text-red-500', label: 'Weak' };
}

function SignalBars({ signal }: { signal: number }) {
  const { bars, color } = getSignalStrength(signal);

  return (
    <div className="flex items-end gap-0.5" title={`${signal} dBm`}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            'w-1 rounded-sm transition-colors',
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

export function NetworkList({
  networks,
  selectedSsid,
  connectedSsid,
  onSelect,
  className,
}: NetworkListProps) {
  // Sort by signal strength
  const sortedNetworks = [...networks].sort((a, b) => b.signal - a.signal);

  if (sortedNetworks.length === 0) {
    return (
      <div className={cn('py-8 text-center text-muted-foreground', className)}>
        <Wifi className="mx-auto h-8 w-8 opacity-50" />
        <p className="mt-2 text-sm">No networks found</p>
        <p className="text-xs">Try scanning again</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {sortedNetworks.map((network) => {
        const isSelected = network.ssid === selectedSsid;
        const isConnected = network.ssid === connectedSsid;
        const { color } = getSignalStrength(network.signal);

        return (
          <button
            key={network.ssid}
            onClick={() => onSelect(network.ssid)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected && 'bg-accent',
              isConnected && 'border border-green-500/50 bg-green-500/10'
            )}
          >
            <SignalBars signal={network.signal} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{network.ssid}</span>
                {network.secured && (
                  <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={color}>{network.signal} dBm</span>
                {network.encryption && network.encryption !== 'open' && (
                  <span className="uppercase">{network.encryption}</span>
                )}
                {isConnected && (
                  <span className="text-green-500">Connected</span>
                )}
              </div>
            </div>

            {isSelected && !isConnected && (
              <Signal className={cn('h-4 w-4', color)} />
            )}
          </button>
        );
      })}
    </div>
  );
}
