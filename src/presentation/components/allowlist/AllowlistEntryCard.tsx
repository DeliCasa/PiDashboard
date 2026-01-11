/**
 * AllowlistEntryCard Component
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T032
 *
 * Card displaying a single device allowlist entry with actions.
 */

import { useState } from 'react';
import {
  Network,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  MoreVertical,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DeviceAllowlistEntry } from '@/domain/types/provisioning';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AllowlistEntryCardProps {
  /** The allowlist entry to display */
  entry: DeviceAllowlistEntry;
  /** Callback when delete is requested */
  onDelete?: (mac: string) => void;
  /** Callback when edit is requested */
  onEdit?: (entry: DeviceAllowlistEntry) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format ISO date to relative or absolute format.
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Card displaying a device allowlist entry with status and actions.
 *
 * Shows:
 * - MAC address
 * - Description (if set)
 * - Container ID (if assigned)
 * - Usage status (used/unused)
 * - Added date
 */
export function AllowlistEntryCard({
  entry,
  onDelete,
  onEdit,
  disabled = false,
  className,
}: AllowlistEntryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    onDelete?.(entry.mac);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card
        className={cn(
          'transition-colors hover:bg-muted/50',
          disabled && 'opacity-60',
          className
        )}
        data-testid="allowlist-entry-card"
      >
        <CardContent className="flex items-center justify-between p-4">
          {/* Left: Device Info */}
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                entry.used ? 'bg-green-500/10' : 'bg-muted'
              )}
            >
              <Network
                className={cn(
                  'h-5 w-5',
                  entry.used ? 'text-green-500' : 'text-muted-foreground'
                )}
              />
            </div>

            {/* Info */}
            <div className="space-y-1">
              {/* MAC Address */}
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-sm font-medium"
                  data-testid="entry-mac"
                >
                  {entry.mac}
                </span>
                {/* Status Badge */}
                <Badge
                  variant={entry.used ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs',
                    entry.used && 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                  )}
                  data-testid="entry-status-badge"
                >
                  {entry.used ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <Clock className="mr-1 h-3 w-3" />
                  )}
                  {entry.used ? 'Used' : 'Pending'}
                </Badge>
              </div>

              {/* Description */}
              {entry.description && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="entry-description"
                >
                  {entry.description}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {/* Container ID */}
                {entry.container_id && (
                  <span className="flex items-center gap-1" data-testid="entry-container">
                    <Package className="h-3 w-3" />
                    {entry.container_id}
                  </span>
                )}

                {/* Added Date */}
                <span className="flex items-center gap-1" data-testid="entry-added-date">
                  <Calendar className="h-3 w-3" />
                  Added {formatDate(entry.added_at)}
                </span>

                {/* Used Date */}
                {entry.used && entry.used_at && (
                  <span className="flex items-center gap-1" data-testid="entry-used-date">
                    <CheckCircle2 className="h-3 w-3" />
                    Used {formatDate(entry.used_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                data-testid="entry-actions-button"
                aria-label="Entry actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(entry)}
                  disabled={disabled}
                  data-testid="edit-entry-action"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  {onEdit && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={disabled}
                    className="text-destructive focus:text-destructive"
                    data-testid="delete-entry-action"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Allowlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-mono font-medium">{entry.mac}</span> from
              the allowlist. The device will not be able to provision until re-added.
              {entry.description && (
                <>
                  <br />
                  <span className="text-foreground">Device: {entry.description}</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
