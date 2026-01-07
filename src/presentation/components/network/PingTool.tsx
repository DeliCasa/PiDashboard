/**
 * PingTool Component
 * Network connectivity testing via ping
 */

import { useState } from 'react';
import { Activity, Play, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePing } from '@/application/hooks/useNetwork';
import { toast } from 'sonner';

interface PingToolProps {
  className?: string;
}

interface PingResult {
  host: string;
  success: boolean;
  avg?: number;
  min?: number;
  max?: number;
  loss?: number;
  error?: string;
}

// Common hosts for quick ping
const QUICK_HOSTS = [
  { label: 'Google DNS', host: '8.8.8.8' },
  { label: 'Cloudflare', host: '1.1.1.1' },
  { label: 'BridgeServer', host: 'dokku.tail1ba2bb.ts.net' },
  { label: 'Gateway', host: '192.168.1.1' },
];

export function PingTool({ className }: PingToolProps) {
  const [host, setHost] = useState('');
  const [results, setResults] = useState<PingResult[]>([]);
  const pingMutation = usePing();

  const handlePing = async (targetHost: string) => {
    if (!targetHost.trim()) {
      toast.error('Please enter a host');
      return;
    }

    try {
      const result = await pingMutation.mutateAsync({
        host: targetHost.trim(),
        count: 3,
      });

      const pingResult: PingResult = {
        host: targetHost.trim(),
        success: result.success,
        avg: result.avg_ms,
        min: result.min_ms,
        max: result.max_ms,
        loss: result.packet_loss,
        error: result.error,
      };

      setResults((prev) => [pingResult, ...prev.slice(0, 9)]);

      if (result.success) {
        toast.success(`Ping successful: ${result.avg_ms?.toFixed(1)}ms avg`);
      } else {
        toast.error(`Ping failed: ${result.error || 'No response'}`);
      }
    } catch (error) {
      const pingResult: PingResult = {
        host: targetHost.trim(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      setResults((prev) => [pingResult, ...prev.slice(0, 9)]);
      toast.error('Ping failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePing(host);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Ping Test
        </CardTitle>
        <CardDescription>Test network connectivity to hosts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter hostname or IP..."
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 font-mono"
          />
          <Button
            onClick={() => handlePing(host)}
            disabled={pingMutation.isPending || !host.trim()}
          >
            {pingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Hosts */}
        <div className="flex flex-wrap gap-2">
          {QUICK_HOSTS.map((qh) => (
            <Button
              key={qh.host}
              variant="outline"
              size="sm"
              onClick={() => handlePing(qh.host)}
              disabled={pingMutation.isPending}
            >
              {qh.label}
            </Button>
          ))}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Results
            </h4>
            <div className="max-h-48 space-y-2 overflow-auto">
              {results.map((result, i) => (
                <div
                  key={`${result.host}-${i}`}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-2 text-sm',
                    result.success
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={result.success ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {result.success ? 'OK' : 'FAIL'}
                    </Badge>
                    <span className="font-mono">{result.host}</span>
                  </div>
                  {result.success && result.avg !== undefined ? (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        avg: <span className="font-mono">{result.avg.toFixed(1)}ms</span>
                      </span>
                      <span>
                        min: <span className="font-mono">{result.min?.toFixed(1)}ms</span>
                      </span>
                      <span>
                        max: <span className="font-mono">{result.max?.toFixed(1)}ms</span>
                      </span>
                      {result.loss !== undefined && result.loss > 0 && (
                        <span className="text-yellow-500">
                          loss: {result.loss}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-red-500">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
