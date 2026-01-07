/**
 * DeviceSection Component
 * Complete device provisioning section
 */

import { useState } from 'react';
import { Bluetooth, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDevices, useDeviceScan, useProvisionDevice } from '@/application/hooks/useDevices';
import { isWebBluetoothSupported } from '@/infrastructure/bluetooth/provisioning';
import { DeviceList } from './DeviceList';
import { MQTTConfigForm } from './MQTTConfigForm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MQTTConfig } from '@/domain/types/entities';

interface DeviceSectionProps {
  className?: string;
}

export function DeviceSection({ className }: DeviceSectionProps) {
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [provisioningAddress, setProvisioningAddress] = useState<string | null>(null);
  const [showProvisionDialog, setShowProvisionDialog] = useState(false);

  // Hooks
  const { data: devices = [], isLoading } = useDevices();
  const scanMutation = useDeviceScan();
  const provisionMutation = useProvisionDevice();

  const webBluetoothSupported = isWebBluetoothSupported();

  const handleScan = async () => {
    try {
      await scanMutation.mutateAsync(10);
      toast.success('Scan complete');
    } catch (error) {
      toast.error('Scan failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleProvision = (address: string) => {
    setProvisioningAddress(address);
    setShowProvisionDialog(true);
  };

  const handleProvisionSubmit = async (mqttConfig: MQTTConfig) => {
    if (!provisioningAddress) return;

    try {
      const result = await provisionMutation.mutateAsync({
        address: provisioningAddress,
        mqtt: mqttConfig,
      });

      if (result.success) {
        toast.success('Device provisioned successfully');
        setShowProvisionDialog(false);
        setProvisioningAddress(null);
        setSelectedAddresses((prev) =>
          prev.filter((a) => a !== provisioningAddress)
        );
      } else {
        toast.error('Provisioning failed', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error('Provisioning failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleBatchProvision = () => {
    if (selectedAddresses.length === 0) return;

    // Provision first selected device
    const [firstAddress] = selectedAddresses;
    handleProvision(firstAddress);
  };

  const currentDevice = devices.find((d) => d.address === provisioningAddress);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5 text-primary" />
          Device Provisioning
        </CardTitle>
        <CardDescription>
          Discover and configure ESP32 devices via Bluetooth
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Web Bluetooth Warning */}
        {!webBluetoothSupported && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Web Bluetooth is not supported in this browser. Direct BLE provisioning
              is unavailable. Use Chrome or Edge for full functionality, or the
              backend provisioning API.
            </AlertDescription>
          </Alert>
        )}

        {/* Scan Controls */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Discovered Devices</h4>
          <div className="flex gap-2">
            {selectedAddresses.length > 0 && (
              <Button
                size="sm"
                onClick={handleBatchProvision}
                disabled={provisionMutation.isPending}
              >
                Provision ({selectedAddresses.length})
              </Button>
            )}
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
        </div>

        {/* Device List */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-sm">Loading devices...</p>
          </div>
        ) : (
          <DeviceList
            devices={devices}
            selectedAddresses={selectedAddresses}
            onSelectionChange={setSelectedAddresses}
            onProvision={handleProvision}
          />
        )}
      </CardContent>

      {/* Provisioning Dialog */}
      <Dialog open={showProvisionDialog} onOpenChange={setShowProvisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision Device</DialogTitle>
            <DialogDescription>
              Configure MQTT settings for {currentDevice?.name || provisioningAddress}
            </DialogDescription>
          </DialogHeader>
          <MQTTConfigForm
            onSubmit={handleProvisionSubmit}
            onCancel={() => setShowProvisionDialog(false)}
            isSubmitting={provisionMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
