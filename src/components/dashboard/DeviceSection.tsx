import { useState, useEffect } from "react";
import { Bluetooth, RefreshCw, Settings, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Device {
  name: string;
  address: string;
  rssi: number;
  status: string;
  provisioned: boolean;
}

interface MQTTConfig {
  broker: string;
  port: number;
  username: string;
  password: string;
}

export function DeviceSection() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [mqttConfig, setMqttConfig] = useState<MQTTConfig>({
    broker: "localhost",
    port: 1883,
    username: "",
    password: "",
  });
  const [provisioningDevice, setProvisioningDevice] = useState<string | null>(
    null
  );

  const scanDevices = async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/devices/scan");
      if (response.ok) {
        setTimeout(fetchDevices, 2000);
      }
    } catch (error) {
      console.error("Failed to scan devices:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      const data = await response.json();
      if (response.ok && data.devices) {
        setDevices(data.devices);
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  };

  const provisionDevice = async (address: string) => {
    setProvisioningDevice(address);
    try {
      const response = await fetch(`/api/devices/${address}/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mqtt: mqttConfig }),
      });
      if (response.ok) {
        fetchDevices();
      }
    } catch (error) {
      console.error("Failed to provision device:", error);
    } finally {
      setProvisioningDevice(null);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSignalStrength = (rssi: number) => {
    if (rssi > -50) return { label: "Excellent", color: "text-green-500" };
    if (rssi > -60) return { label: "Good", color: "text-green-400" };
    if (rssi > -70) return { label: "Fair", color: "text-yellow-500" };
    return { label: "Weak", color: "text-red-500" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5 text-primary" />
          Device Provisioning
        </CardTitle>
        <CardDescription>
          Discover and configure ESP32 containers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device Scanner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Discovered Devices</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={scanDevices}
              disabled={isScanning}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isScanning && "animate-spin")}
              />
              {isScanning ? "Scanning..." : "Scan"}
            </Button>
          </div>

          <div className="space-y-2">
            {devices.length > 0 ? (
              devices.map((device) => {
                const signal = getSignalStrength(device.rssi);
                return (
                  <div
                    key={device.address}
                    className="flex items-center justify-between rounded-lg border bg-card p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{device.name}</span>
                        {device.provisioned && (
                          <Badge
                            variant="default"
                            className="bg-green-500/10 text-green-600"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Provisioned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {device.address}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={signal.color}>
                          Signal: {signal.label} ({device.rssi} dBm)
                        </span>
                        <span className="text-muted-foreground">
                          Status: {device.status}
                        </span>
                      </div>
                    </div>
                    {!device.provisioned && (
                      <Button
                        size="sm"
                        onClick={() => provisionDevice(device.address)}
                        disabled={provisioningDevice === device.address}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {provisioningDevice === device.address
                          ? "Configuring..."
                          : "Configure"}
                      </Button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No devices found. Make sure ESP32 devices are in pairing mode.
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* MQTT Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">MQTT Configuration</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mqtt-broker">Broker Address</Label>
              <Input
                id="mqtt-broker"
                placeholder="192.168.1.100"
                value={mqttConfig.broker}
                onChange={(e) =>
                  setMqttConfig({ ...mqttConfig, broker: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mqtt-port">Port</Label>
              <Input
                id="mqtt-port"
                type="number"
                placeholder="1883"
                value={mqttConfig.port}
                onChange={(e) =>
                  setMqttConfig({
                    ...mqttConfig,
                    port: parseInt(e.target.value) || 1883,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mqtt-username">Username (optional)</Label>
              <Input
                id="mqtt-username"
                placeholder="Username"
                value={mqttConfig.username}
                onChange={(e) =>
                  setMqttConfig({ ...mqttConfig, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mqtt-password">Password (optional)</Label>
              <Input
                id="mqtt-password"
                type="password"
                placeholder="Password"
                value={mqttConfig.password}
                onChange={(e) =>
                  setMqttConfig({ ...mqttConfig, password: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
