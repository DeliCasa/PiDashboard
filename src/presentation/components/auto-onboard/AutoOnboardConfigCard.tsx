/**
 * AutoOnboardConfigCard Component
 * Feature: 035-auto-onboard-dashboard
 *
 * Displays read-only configuration settings (FR-022, FR-023).
 * Uses Collapsible for space efficiency.
 */

import { Settings, ChevronDown, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AutoOnboardConfig } from '@/infrastructure/api/v1-auto-onboard';
import { useState } from 'react';

interface AutoOnboardConfigCardProps {
  config: AutoOnboardConfig;
  className?: string;
}

export function AutoOnboardConfigCard({ config, className }: AutoOnboardConfigCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className={cn('', className)} data-testid="auto-onboard-config-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <div className="text-left">
                <CardTitle className="text-base">Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Read-only settings from PiOrchestrator
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs" data-testid="read-only-badge">
                <Lock className="mr-1 h-3 w-3" />
                Read-only
              </Badge>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <dl className="grid gap-3 text-sm" data-testid="config-details">
              {/* Rate Limiting */}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Max per minute</dt>
                <dd className="font-medium" data-testid="config-max-per-minute">
                  {config.max_per_minute}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Burst size</dt>
                <dd className="font-medium" data-testid="config-burst-size">
                  {config.burst_size}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Verification timeout</dt>
                <dd className="font-medium" data-testid="config-timeout">
                  {config.verification_timeout_sec}s
                </dd>
              </div>

              {/* Subnet Allowlist */}
              <div className="border-t pt-3">
                <dt className="mb-2 text-muted-foreground">Subnet allowlist</dt>
                <dd className="flex flex-wrap gap-1" data-testid="config-subnets">
                  {config.subnet_allowlist.length > 0 ? (
                    config.subnet_allowlist.map((subnet) => (
                      <Badge key={subnet} variant="secondary" className="font-mono text-xs">
                        {subnet}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No subnets configured</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
