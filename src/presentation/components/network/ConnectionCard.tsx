/**
 * ConnectionCard Component
 * Status card for individual network connections (Tailscale, MQTT, BridgeServer)
 */

import { Circle, RefreshCw, ExternalLink } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ConnectionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  isLoading?: boolean;
  details?: Array<{ label: string; value: string }>;
  onRefresh?: () => void;
  externalUrl?: string;
  className?: string;
}

export function ConnectionCard({
  title,
  description,
  icon,
  connected,
  isLoading,
  details = [],
  onRefresh,
  externalUrl,
  className,
}: ConnectionCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-muted-foreground',
              connected && 'text-primary'
            )}>
              {icon}
            </span>
            {title}
          </div>
          <Badge
            variant={connected ? 'default' : 'destructive'}
            className="gap-1"
          >
            <Circle className={cn(
              'h-2 w-2',
              connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'
            )} />
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {details.length > 0 && (
          <div className="mb-4 space-y-2">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-mono">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
          {externalUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
