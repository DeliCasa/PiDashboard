/**
 * AllowlistSection Component
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T033
 *
 * Main section for device allowlist management.
 * Combines form, list, and stats display.
 */

import { useState, useCallback } from 'react';
import { AlertCircle, List, RefreshCw, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AllowlistEntryForm } from './AllowlistEntryForm';
import { AllowlistEntryCard } from './AllowlistEntryCard';
import { useAllowlistWithMutations } from '@/application/hooks/useAllowlist';
import { V1ApiError } from '@/infrastructure/api/errors';
import type { DeviceAllowlistEntry } from '@/domain/types/provisioning';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AllowlistSectionProps {
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Device allowlist management section.
 *
 * Features:
 * - View all allowlist entries with status
 * - Add new devices with MAC validation
 * - Edit device descriptions and container IDs
 * - Remove devices from allowlist
 * - View usage statistics
 */
export function AllowlistSection({ className }: AllowlistSectionProps) {
  // editingEntry state reserved for future edit modal implementation
  const [, setEditingEntry] = useState<DeviceAllowlistEntry | null>(null);

  // Allowlist data and mutations
  const {
    entries,
    isLoading,
    isFetching,
    errorMessage,
    refetch,
    stats,
    addEntry,
    // updateEntry reserved for future edit functionality
    updateEntry: _updateEntry,
    removeEntry,
    isAnyPending,
  } = useAllowlistWithMutations({ enabled: true });
  void _updateEntry; // Silence unused warning

  // ============ Handlers ============

  const handleAddEntry = useCallback(
    async (mac: string, description?: string, containerId?: string) => {
      try {
        await addEntry.mutateAsync({
          mac,
          description,
          container_id: containerId,
        });
        toast.success('Device added to allowlist', {
          description: `MAC: ${mac}`,
        });
      } catch (err) {
        const message =
          err instanceof V1ApiError ? err.userMessage : 'Failed to add device';
        toast.error('Failed to add device', { description: message });
        throw err; // Re-throw to let form know it failed
      }
    },
    [addEntry]
  );

  const handleDeleteEntry = useCallback(
    async (mac: string) => {
      try {
        await removeEntry.mutateAsync(mac);
        toast.success('Device removed from allowlist', {
          description: `MAC: ${mac}`,
        });
      } catch (err) {
        const message =
          err instanceof V1ApiError ? err.userMessage : 'Failed to remove device';
        toast.error('Failed to remove device', { description: message });
      }
    },
    [removeEntry]
  );

  const handleEditEntry = useCallback((entry: DeviceAllowlistEntry) => {
    setEditingEntry(entry);
    // For now, just show a toast - full edit modal could be added later
    toast.info(`Editing ${entry.mac}`, {
      description: 'Edit functionality coming soon',
    });
  }, []);

  // ============ Render Helpers ============

  const renderStats = () => (
    <div className="flex items-center gap-4" data-testid="allowlist-stats">
      <Badge variant="outline" className="gap-1">
        <List className="h-3 w-3" />
        {stats.total} total
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          'gap-1',
          stats.used > 0 && 'bg-green-500/10 text-green-600 border-green-500/20'
        )}
      >
        {stats.used} used
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          'gap-1',
          stats.available > 0 && 'bg-blue-500/10 text-blue-600 border-blue-500/20'
        )}
      >
        {stats.available} available
      </Badge>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-3" data-testid="allowlist-loading">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="allowlist-empty"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Shield className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium">No devices in allowlist</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Add device MAC addresses to pre-approve them for batch provisioning.
        Only devices in the allowlist can be provisioned.
      </p>
    </div>
  );

  const renderEntryList = () => (
    <ScrollArea className="h-[400px]" data-testid="allowlist-entries">
      <div className="space-y-2 pr-4">
        {entries.map((entry) => (
          <AllowlistEntryCard
            key={entry.mac}
            entry={entry}
            onDelete={handleDeleteEntry}
            onEdit={handleEditEntry}
            disabled={isAnyPending}
          />
        ))}
      </div>
    </ScrollArea>
  );

  // ============ Main Render ============

  return (
    <section
      className={cn('space-y-6', className)}
      data-testid="allowlist-section"
      aria-label="Device Allowlist Management"
    >
      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="allowlist-error" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Error loading allowlist</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Add Entry Form */}
      <AllowlistEntryForm
        onSubmit={handleAddEntry}
        isLoading={addEntry.isPending}
        disabled={isLoading}
      />

      {/* Allowlist Entries Card */}
      <Card data-testid="allowlist-entries-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <List className="h-5 w-5" />
                Device Allowlist
              </CardTitle>
              <CardDescription>
                Pre-approved devices for batch provisioning
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Stats */}
              {!isLoading && entries.length > 0 && renderStats()}

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="refresh-allowlist-button"
                aria-label="Refresh allowlist"
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            renderLoadingSkeleton()
          ) : entries.length === 0 ? (
            renderEmptyState()
          ) : (
            renderEntryList()
          )}
        </CardContent>
      </Card>
    </section>
  );
}
