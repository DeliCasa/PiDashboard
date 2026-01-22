/**
 * AutoOnboardStatusCard Component
 * Feature: 035-auto-onboard-dashboard
 *
 * Displays auto-onboard toggle with status indicators.
 * Uses role="switch" for accessibility (NFR-005).
 */

import { Power, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AutoOnboardStatus } from '@/infrastructure/api/v1-auto-onboard';

interface AutoOnboardStatusCardProps {
  status: AutoOnboardStatus;
  onToggle: (enabled: boolean) => void;
  isToggling: boolean;
  className?: string;
}

export function AutoOnboardStatusCard({
  status,
  onToggle,
  isToggling,
  className,
}: AutoOnboardStatusCardProps) {
  const isDevMode = status.mode === 'dev';
  const canToggle = isDevMode && !isToggling;

  return (
    <Card className={cn('', className)} data-testid="auto-onboard-status-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Power className="h-4 w-4 text-primary" />
              Auto-Onboard
            </CardTitle>
            <CardDescription className="text-xs">
              Automatic ESP-CAM device discovery
            </CardDescription>
          </div>
          <Badge
            variant={status.enabled ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              status.enabled && 'bg-green-600 hover:bg-green-600'
            )}
            data-testid="status-badge"
          >
            {status.enabled ? (status.running ? 'Running' : 'Enabled') : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label
              htmlFor="auto-onboard-toggle"
              className={cn('text-sm font-medium', !isDevMode && 'text-muted-foreground')}
            >
              {status.enabled ? 'Disable Auto-Onboard' : 'Enable Auto-Onboard'}
            </Label>
            {!isDevMode && (
              <p className="text-xs text-muted-foreground" data-testid="mode-not-available">
                Mode not available (requires DEV mode)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isToggling && (
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                data-testid="toggle-loading"
              />
            )}
            <Switch
              id="auto-onboard-toggle"
              checked={status.enabled}
              onCheckedChange={onToggle}
              disabled={!canToggle}
              aria-label={status.enabled ? 'Disable auto-onboard' : 'Enable auto-onboard'}
              data-testid="auto-onboard-toggle"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
