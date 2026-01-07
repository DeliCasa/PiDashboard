/**
 * NetworkSection Component
 * Complete network diagnostics section with connection status and tools
 */

import { Network, Shield, MessageSquare, Server } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useTailscaleStatus,
  useMqttStatus,
  useBridgeServerStatus,
} from '@/application/hooks/useNetwork';
import { ConnectionCard } from './ConnectionCard';
import { PingTool } from './PingTool';
import { cn } from '@/lib/utils';

interface NetworkSectionProps {
  className?: string;
}

export function NetworkSection({ className }: NetworkSectionProps) {
  // Hooks
  const {
    data: tailscale,
    isLoading: tailscaleLoading,
    refetch: refetchTailscale,
  } = useTailscaleStatus();

  const {
    data: mqtt,
    isLoading: mqttLoading,
    refetch: refetchMqtt,
  } = useMqttStatus();

  const {
    data: bridgeServer,
    isLoading: bridgeServerLoading,
    refetch: refetchBridgeServer,
  } = useBridgeServerStatus();

  // Prepare Tailscale details
  const tailscaleDetails = tailscale
    ? [
        { label: 'IP Address', value: tailscale.ip || 'N/A' },
        { label: 'Hostname', value: tailscale.hostname || 'N/A' },
        {
          label: 'Peers Online',
          value: tailscale.peers
            ? `${tailscale.peers.filter((p) => p.online).length}/${tailscale.peers.length}`
            : 'N/A',
        },
      ]
    : [];

  // Prepare MQTT details
  const mqttDetails = mqtt
    ? [
        { label: 'Broker', value: mqtt.broker || 'N/A' },
        { label: 'Port', value: mqtt.port?.toString() || 'N/A' },
        { label: 'Client ID', value: mqtt.clientId || 'N/A' },
      ]
    : [];

  // Prepare BridgeServer details
  const bridgeServerDetails = bridgeServer
    ? [
        { label: 'URL', value: bridgeServer.url || 'N/A' },
        {
          label: 'Latency',
          value: bridgeServer.latency_ms
            ? `${bridgeServer.latency_ms}ms`
            : 'N/A',
        },
        { label: 'Version', value: bridgeServer.version || 'N/A' },
      ]
    : [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Network Diagnostics
          </CardTitle>
          <CardDescription>
            Monitor connectivity to backend services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Connection Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Tailscale VPN */}
            <ConnectionCard
              title="Tailscale VPN"
              description="Secure mesh VPN connection"
              icon={<Shield className="h-4 w-4" />}
              connected={tailscale?.connected ?? false}
              isLoading={tailscaleLoading}
              details={tailscaleDetails}
              onRefresh={() => refetchTailscale()}
            />

            {/* MQTT Broker */}
            <ConnectionCard
              title="MQTT Broker"
              description="Message queue connectivity"
              icon={<MessageSquare className="h-4 w-4" />}
              connected={mqtt?.connected ?? false}
              isLoading={mqttLoading}
              details={mqttDetails}
              onRefresh={() => refetchMqtt()}
            />

            {/* BridgeServer */}
            <ConnectionCard
              title="BridgeServer"
              description="API backend connection"
              icon={<Server className="h-4 w-4" />}
              connected={bridgeServer?.connected ?? false}
              isLoading={bridgeServerLoading}
              details={bridgeServerDetails}
              onRefresh={() => refetchBridgeServer()}
              externalUrl={bridgeServer?.url}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tailscale Peers (if connected) */}
      {tailscale?.connected && tailscale.peers && tailscale.peers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Tailscale Peers
            </CardTitle>
            <CardDescription>Devices in your tailnet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tailscale.peers.map((peer) => (
                <div
                  key={peer.name}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3',
                    peer.online
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-muted'
                  )}
                >
                  <div>
                    <p className="font-medium">{peer.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {peer.ip}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      peer.online ? 'bg-green-500' : 'bg-muted-foreground'
                    )}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ping Tool */}
      <PingTool />
    </div>
  );
}
