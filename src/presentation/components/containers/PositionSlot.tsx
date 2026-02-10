/**
 * PositionSlot Component
 * Individual camera position slot within a container (1-4)
 *
 * Feature: 043-container-management
 * Shows occupied camera info or empty slot with assign button
 */

import {
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CameraAssignment } from '@/infrastructure/api/v1-containers';
import type { CameraStatus } from '@/domain/types/entities';

interface PositionSlotProps {
  position: 1 | 2 | 3 | 4;
  assignment?: CameraAssignment;
  onAssign?: () => void;
  onUnassign?: () => void;
  isUnassigning?: boolean;
  disabled?: boolean;
  className?: string;
}

const statusConfig: Record<CameraStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  online: { label: 'Online', icon: CheckCircle, color: 'text-green-500' },
  offline: { label: 'Offline', icon: XCircle, color: 'text-red-500' },
  idle: { label: 'Idle', icon: CheckCircle, color: 'text-yellow-500' },
  error: { label: 'Error', icon: AlertCircle, color: 'text-red-500' },
  rebooting: { label: 'Rebooting', icon: AlertCircle, color: 'text-yellow-500' },
  discovered: { label: 'Discovered', icon: Camera, color: 'text-blue-500' },
  pairing: { label: 'Pairing', icon: Camera, color: 'text-blue-500' },
  connecting: { label: 'Connecting', icon: Camera, color: 'text-yellow-500' },
};

export function PositionSlot({
  position,
  assignment,
  onAssign,
  onUnassign,
  isUnassigning,
  disabled,
  className,
}: PositionSlotProps) {
  if (!assignment) {
    // Empty slot
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-4 min-h-[100px]',
          className
        )}
        data-testid={`position-slot-${position}-empty`}
      >
        <span className="text-xs text-muted-foreground mb-2">Position {position}</span>
        {onAssign && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAssign}
            disabled={disabled}
          >
            <Plus className="mr-1 h-3 w-3" />
            Assign
          </Button>
        )}
      </div>
    );
  }

  // Occupied slot
  const status = assignment.status ? statusConfig[assignment.status] : null;
  const StatusIcon = status?.icon || Camera;
  const isOffline = assignment.status === 'offline' || assignment.status === 'error';

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border bg-card p-3 min-h-[100px]',
        isOffline && 'border-yellow-500/50 bg-yellow-500/5',
        className
      )}
      data-testid={`position-slot-${position}-occupied`}
    >
      {/* Position badge */}
      <div className="absolute -top-2 -left-2">
        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
          {position}
        </Badge>
      </div>

      {/* Camera info */}
      <div className="flex items-start justify-between gap-2 mt-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {assignment.name || 'Camera'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            <span>Device ID: </span>
            <span className="font-mono">{assignment.device_id}</span>
          </p>
        </div>

        {/* Unassign button */}
        {onUnassign && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={onUnassign}
                disabled={isUnassigning || disabled}
              >
                <X className={cn('h-3.5 w-3.5', isUnassigning && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Unassign camera</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Status badge */}
      {status && (
        <div className="mt-2 flex items-center gap-1">
          <StatusIcon className={cn('h-3 w-3', status.color)} />
          <span className={cn('text-xs', status.color)}>{status.label}</span>
          {isOffline && (
            <AlertCircle className="h-3 w-3 text-yellow-500 ml-auto" />
          )}
        </div>
      )}
    </div>
  );
}
