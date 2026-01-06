import { useState, useEffect } from "react";
import { Activity, Cpu, HardDrive, Thermometer, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SystemInfo {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  temperature: number;
  uptime: string;
  hostname: string;
}

export function SystemStatus() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch("/api/system/info");
      const data = await response.json();
      if (response.ok) {
        setSystemInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch system info:", error);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const getUsageColor = (usage: number) => {
    if (usage < 50) return "bg-green-500";
    if (usage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp < 50) return { label: "Normal", color: "text-green-500" };
    if (temp < 70) return { label: "Warm", color: "text-yellow-500" };
    return { label: "Hot", color: "text-red-500" };
  };

  if (!systemInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tempStatus = getTemperatureStatus(systemInfo.temperature);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          System Status
        </CardTitle>
        <CardDescription>
          {systemInfo.hostname} - Uptime: {systemInfo.uptime}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CPU Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">CPU Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {systemInfo.cpu_usage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={systemInfo.cpu_usage}
            className={cn("h-2", getUsageColor(systemInfo.cpu_usage))}
          />
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Memory Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {systemInfo.memory_usage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={systemInfo.memory_usage}
            className={cn("h-2", getUsageColor(systemInfo.memory_usage))}
          />
        </div>

        {/* Disk Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Disk Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {systemInfo.disk_usage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={systemInfo.disk_usage}
            className={cn("h-2", getUsageColor(systemInfo.disk_usage))}
          />
        </div>

        {/* Temperature & Uptime */}
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <Thermometer className={cn("h-4 w-4", tempStatus.color)} />
            <span className="text-sm">
              {systemInfo.temperature.toFixed(1)}°C
            </span>
            <Badge variant="secondary" className={tempStatus.color}>
              {tempStatus.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{systemInfo.uptime}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
