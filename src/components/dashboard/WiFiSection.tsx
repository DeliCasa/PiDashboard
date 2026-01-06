import { useState } from "react";
import { Wifi, WifiOff, RefreshCw, Signal, Lock } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface WiFiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
}

interface WiFiStatus {
  client_status: string;
  client_ssid: string;
  client_ip: string;
  ap_status: string;
  ap_ssid: string;
  ap_ip: string;
  connected_devices: number;
}

export function WiFiSection() {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [status, setStatus] = useState<WiFiStatus | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showNetworks, setShowNetworks] = useState(false);

  const scanNetworks = async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/wifi/scan");
      const data = await response.json();
      if (response.ok && data.networks) {
        setNetworks(data.networks);
        setShowNetworks(true);
      }
    } catch (error) {
      console.error("Failed to scan networks:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const connectToNetwork = async () => {
    if (!selectedNetwork) return;
    setIsConnecting(true);
    try {
      const response = await fetch("/api/wifi/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid: selectedNetwork, password }),
      });
      if (response.ok) {
        fetchStatus();
        setPassword("");
        setShowNetworks(false);
      }
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/wifi/status");
      const data = await response.json();
      if (response.ok && data.status) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  };

  // Fetch status on mount
  useState(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  });

  const getSignalIcon = (signal: number) => {
    if (signal > -50) return <Signal className="h-4 w-4 text-green-500" />;
    if (signal > -70) return <Signal className="h-4 w-4 text-yellow-500" />;
    return <Signal className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          WiFi Configuration
        </CardTitle>
        <CardDescription>
          Scan and connect to wireless networks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Connection Status</h4>
          {status ? (
            <div className="space-y-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg p-3",
                  status.client_status === "connected"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {status.client_status === "connected" ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {status.client_status === "connected"
                    ? `Connected to ${status.client_ssid}`
                    : "Not connected"}
                </span>
                {status.client_ip && (
                  <Badge variant="secondary" className="ml-auto">
                    {status.client_ip}
                  </Badge>
                )}
              </div>
              {status.ap_status === "active" && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Access Point: {status.ap_ssid}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {status.connected_devices} devices
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-muted-foreground">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Loading status...</span>
            </div>
          )}
        </div>

        {/* Network Scanner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Available Networks</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={scanNetworks}
              disabled={isScanning}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isScanning && "animate-spin")}
              />
              {isScanning ? "Scanning..." : "Scan"}
            </Button>
          </div>

          {showNetworks && networks.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="network-select">Select Network</Label>
                <Select
                  value={selectedNetwork}
                  onValueChange={setSelectedNetwork}
                >
                  <SelectTrigger id="network-select">
                    <SelectValue placeholder="Choose a network..." />
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map((network) => (
                      <SelectItem key={network.ssid} value={network.ssid}>
                        <div className="flex items-center gap-2">
                          {getSignalIcon(network.signal)}
                          <span>{network.ssid}</span>
                          {network.secured && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({network.signal} dBm)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedNetwork && (
                <div className="space-y-2">
                  <Label htmlFor="wifi-password">Password</Label>
                  <Input
                    id="wifi-password"
                    type="password"
                    placeholder="Enter WiFi password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              <Button
                onClick={connectToNetwork}
                disabled={!selectedNetwork || isConnecting}
                className="w-full"
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            </div>
          )}

          {showNetworks && networks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No networks found. Try scanning again.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
