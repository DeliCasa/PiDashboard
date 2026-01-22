/**
 * AuditEventsPanel Component
 * Feature: 035-auto-onboard-dashboard
 *
 * Paginated event list with filters (FR-016 through FR-020).
 * Uses Collapsible with expandable event rows.
 */

import { useState } from 'react';
import {
  History,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type {
  OnboardingAuditEntry,
  AuditEventStage,
  AuditEventsData,
} from '@/infrastructure/api/v1-auto-onboard';

interface AuditEventsPanelProps {
  events?: AuditEventsData;
  isLoading: boolean;
  macFilter: string;
  onMacFilterChange: (mac: string) => void;
  sinceFilter?: string;
  onSinceFilterChange: (since: string) => void;
  onPageChange: (offset: number) => void;
  onCleanup: (days: number) => void;
  isCleaningUp: boolean;
  className?: string;
}

const stageBadgeVariants: Record<AuditEventStage, { label: string; className: string }> = {
  discovered: { label: 'Discovered', className: 'bg-blue-500' },
  verified: { label: 'Verified', className: 'bg-cyan-500' },
  registered: { label: 'Registered', className: 'bg-violet-500' },
  paired: { label: 'Paired', className: 'bg-green-500' },
  failed: { label: 'Failed', className: 'bg-red-500' },
  rejected_by_policy: { label: 'Rejected', className: 'bg-amber-500' },
};

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EventRow({ event }: { event: OnboardingAuditEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const stageInfo = stageBadgeVariants[event.stage];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted/50"
        data-testid={`event-row-${event.id}`}
      >
        <div className="flex items-center gap-3">
          <Badge className={cn('text-xs text-white', stageInfo.className)}>
            {stageInfo.label}
          </Badge>
          <span className="font-mono text-sm">{event.mac_address}</span>
          <Badge variant={event.outcome === 'success' ? 'default' : 'destructive'} className="text-xs">
            {event.outcome}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(event.timestamp)}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className="ml-3 border-l-2 border-muted pl-4 py-2 text-sm"
          data-testid={`event-details-${event.id}`}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {event.device_id && (
              <>
                <dt className="text-muted-foreground">Device ID</dt>
                <dd className="font-mono">{event.device_id}</dd>
              </>
            )}
            {event.ip_address && (
              <>
                <dt className="text-muted-foreground">IP Address</dt>
                <dd className="font-mono">{event.ip_address}</dd>
              </>
            )}
            {event.firmware_version && (
              <>
                <dt className="text-muted-foreground">Firmware</dt>
                <dd>{event.firmware_version}</dd>
              </>
            )}
            {event.container_id && (
              <>
                <dt className="text-muted-foreground">Container</dt>
                <dd className="font-mono text-xs">{event.container_id}</dd>
              </>
            )}
            {event.duration_ms !== undefined && (
              <>
                <dt className="text-muted-foreground">Duration</dt>
                <dd>{event.duration_ms}ms</dd>
              </>
            )}
            {event.error_code && (
              <>
                <dt className="text-muted-foreground">Error Code</dt>
                <dd className="text-red-600">{event.error_code}</dd>
              </>
            )}
            {event.error_message && (
              <>
                <dt className="text-muted-foreground">Error Message</dt>
                <dd className="text-red-600">{event.error_message}</dd>
              </>
            )}
          </dl>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AuditEventsPanel({
  events,
  isLoading,
  macFilter,
  onMacFilterChange,
  sinceFilter,
  onSinceFilterChange,
  onPageChange,
  onCleanup,
  isCleaningUp,
  className,
}: AuditEventsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState('90');
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);

  const pagination = events?.pagination;
  const eventList = events?.events ?? [];
  const hasMore = pagination?.has_more ?? false;
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 1;

  const handleCleanup = () => {
    const days = parseInt(cleanupDays, 10);
    if (days >= 1 && days <= 365) {
      onCleanup(days);
      setCleanupDialogOpen(false);
    }
  };

  return (
    <Card className={cn('', className)} data-testid="audit-events-panel">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <div className="text-left">
                <CardTitle className="text-base">Audit Events</CardTitle>
                <CardDescription className="text-xs">
                  {pagination ? `${pagination.total} total events` : 'Onboarding history'}
                </CardDescription>
              </div>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex flex-1 items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter by MAC address"
                  value={macFilter}
                  onChange={(e) => onMacFilterChange(e.target.value)}
                  className="h-8 max-w-xs font-mono text-sm"
                  data-testid="mac-filter-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={sinceFilter ?? ''}
                  onChange={(e) => onSinceFilterChange(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="since-filter-input"
                />
              </div>
              <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={isCleaningUp}
                    data-testid="cleanup-button"
                  >
                    {isCleaningUp ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-4 w-4" />
                    )}
                    Cleanup
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cleanup Old Events</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete audit events older than the specified number of days.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="cleanup-days">Retention period (days)</Label>
                    <Input
                      id="cleanup-days"
                      type="number"
                      min="1"
                      max="365"
                      value={cleanupDays}
                      onChange={(e) => setCleanupDays(e.target.value)}
                      className="mt-2 max-w-[120px]"
                      data-testid="cleanup-days-input"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanup}>Delete Old Events</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Events List */}
            <div className="space-y-1" data-testid="events-list">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : eventList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground" data-testid="no-events">
                  No events found
                </div>
              ) : (
                eventList.map((event) => <EventRow key={event.id} event={event} />)
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > 0 && (
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={pagination.offset === 0}
                    onClick={() => onPageChange(Math.max(0, pagination.offset - pagination.limit))}
                    data-testid="prev-page-button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={!hasMore}
                    onClick={() => onPageChange(pagination.offset + pagination.limit)}
                    data-testid="next-page-button"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
