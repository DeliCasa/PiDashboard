/**
 * SessionCard Component - DEV Observability Panels
 * Feature: 038-dev-observability-panels
 *
 * Displays individual session information with status and capture details.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Camera, AlertTriangle, Package, ChevronDown, Image, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { SessionWithStale } from '@/infrastructure/api/diagnostics-schemas';
import { EvidencePanel } from './EvidencePanel';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: SessionWithStale;
  onSelect?: (sessionId: string) => void;
  showEvidence?: boolean;
}

/**
 * Format session status as display badge
 */
function getStatusBadge(status: string, isStale?: boolean): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  switch (status) {
    case 'active':
      return { label: isStale ? 'Stale' : 'Active', variant: isStale ? 'destructive' : 'default' };
    case 'completed':
      return { label: 'Completed', variant: 'secondary' };
    case 'cancelled':
      return { label: 'Failed', variant: 'destructive' };
    default:
      return { label: status, variant: 'outline' };
  }
}

/**
 * Format timestamp to locale time string
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Invalid time';
  }
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return formatTime(isoString);
  } catch {
    return 'Unknown';
  }
}

export function SessionCard({ session, onSelect, showEvidence = false }: SessionCardProps) {
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { label: statusLabel, variant: statusVariant } = getStatusBadge(session.status, session.is_stale);
  const isActive = session.status === 'active';
  const hasCaptures = session.capture_count > 0;

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger card click when clicking evidence toggle
    if ((e.target as HTMLElement).closest('[data-evidence-toggle]')) {
      return;
    }
    if (onSelect) {
      onSelect(session.id);
    }
  };

  const handleCopyCorrelation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.delivery_id) return;
    try {
      await navigator.clipboard.writeText(session.delivery_id);
      setCopied(true);
      toast.success('Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card
      data-testid={`session-card-${session.id}`}
      className={cn(
        'transition-all',
        isActive && session.is_stale && 'border-yellow-500/50',
        onSelect && 'cursor-pointer hover:shadow-md hover:border-primary/50'
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono truncate" data-testid="session-id">
            {session.id}
          </CardTitle>
          <Badge variant={statusVariant} data-testid="session-status">
            {session.is_stale && isActive && (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Correlation ID (copy-able delivery_id) */}
        {session.delivery_id && (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="session-card-correlation"
          >
            <Package className="h-4 w-4 shrink-0" />
            <span className="font-mono text-xs truncate">{session.delivery_id}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={handleCopyCorrelation}
              aria-label="Copy correlation ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}

        {/* Started at */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="started-at">
          <Clock className="h-4 w-4" />
          <span>Started: {formatTime(session.started_at)}</span>
        </div>

        {/* Capture info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" data-testid="capture-count">
            <Camera className="h-4 w-4" />
            <span>
              {session.capture_count} capture{session.capture_count !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Last capture timestamp */}
          {hasCaptures && session.last_capture_at && (
            <span
              className={cn(
                'text-xs',
                session.is_stale ? 'text-yellow-500 font-medium' : 'text-muted-foreground'
              )}
              data-testid="last-capture"
            >
              {formatRelativeTime(session.last_capture_at)}
            </span>
          )}
        </div>

        {/* Stale warning */}
        {isActive && session.is_stale && (
          <div
            className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 rounded px-2 py-1"
            data-testid="stale-warning"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>No capture in &gt;5 minutes</span>
          </div>
        )}

        {/* Evidence Collapsible Section */}
        {showEvidence && hasCaptures && (
          <Collapsible open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-0 hover:bg-transparent"
                data-evidence-toggle
                data-testid="toggle-evidence"
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Image className="h-3 w-3" />
                  View Evidence
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isEvidenceOpen && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-2" data-testid="evidence-section">
                <EvidencePanel sessionId={session.id} className="border-0 shadow-none" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
