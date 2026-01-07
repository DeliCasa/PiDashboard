/**
 * WiFiSection Component
 * Complete WiFi management section with scanning and connection
 */

import { useState } from 'react';
import { Wifi, RefreshCw, KeyRound } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useWifiStatus,
  useWifiScan,
  useWifiNetworks,
  useWifiConnect,
  useWifiDisconnect,
} from '@/application/hooks/useWifi';
import { NetworkList } from './NetworkList';
import { ConnectionStatus } from './ConnectionStatus';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WiFiSectionProps {
  className?: string;
}

export function WiFiSection({ className }: WiFiSectionProps) {
  const [selectedSsid, setSelectedSsid] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Hooks
  const { data: status, isLoading: statusLoading } = useWifiStatus();
  const { data: networks } = useWifiNetworks();
  const scanMutation = useWifiScan();
  const connectMutation = useWifiConnect();
  const disconnectMutation = useWifiDisconnect();

  const handleScan = async () => {
    try {
      await scanMutation.mutateAsync();
      toast.success('Scan complete');
    } catch (error) {
      toast.error('Scan failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleConnect = async () => {
    if (!selectedSsid) return;

    try {
      await connectMutation.mutateAsync({ ssid: selectedSsid, password });
      toast.success(`Connected to ${selectedSsid}`);
      setPassword('');
      setSelectedSsid('');
    } catch (error) {
      toast.error('Connection failed', {
        description: error instanceof Error ? error.message : 'Check password and try again',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast.success('Disconnected from WiFi');
    } catch {
      toast.error('Disconnect failed');
    }
  };

  const selectedNetwork = networks?.find((n) => n.ssid === selectedSsid);
  const requiresPassword = selectedNetwork?.secured ?? false;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          WiFi Configuration
        </CardTitle>
        <CardDescription>Scan and connect to wireless networks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Connection Status</h4>
          <ConnectionStatus
            status={status}
            isLoading={statusLoading}
            onDisconnect={handleDisconnect}
            isDisconnecting={disconnectMutation.isPending}
          />
        </div>

        {/* Network Scanner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Available Networks</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={scanMutation.isPending}
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', scanMutation.isPending && 'animate-spin')}
              />
              {scanMutation.isPending ? 'Scanning...' : 'Scan'}
            </Button>
          </div>

          {/* Network List */}
          {networks && networks.length > 0 && (
            <NetworkList
              networks={networks}
              selectedSsid={selectedSsid}
              connectedSsid={status?.client_status === 'connected' ? status.client_ssid : undefined}
              onSelect={setSelectedSsid}
            />
          )}

          {networks?.length === 0 && !scanMutation.isPending && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No networks found. Click Scan to search.
            </p>
          )}
        </div>

        {/* Connect Form */}
        {selectedSsid && (
          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Connect to {selectedSsid}</h4>

            {requiresPassword && (
              <div className="space-y-2">
                <Label htmlFor="wifi-password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wifi-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter WiFi password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConnect();
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={connectMutation.isPending || (requiresPassword && !password)}
                className="flex-1"
              >
                {connectMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSsid('');
                  setPassword('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
