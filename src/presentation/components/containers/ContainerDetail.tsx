/**
 * ContainerDetail Component
 * Modal displaying detailed container info with 2x2 position grid
 *
 * Feature: 043-container-management
 */

import { useState } from 'react';
import {
  Package,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { PositionSlot } from './PositionSlot';
import { EditContainerDialog } from './EditContainerDialog';
import { AssignCameraDialog } from './AssignCameraDialog';
import { cn } from '@/lib/utils';
import {
  useContainer,
  useUpdateContainer,
  useDeleteContainer,
  useAssignCamera,
  useUnassignCamera,
  useUnassignedCameras,
  getAvailablePositions,
  canDeleteContainer,
} from '@/application/hooks/useContainers';
import { V1ApiError, getUserMessage } from '@/infrastructure/api/errors';
import { toast } from 'sonner';
import type { ContainerDetail as ContainerDetailType, CameraPosition } from '@/infrastructure/api/v1-containers';

interface ContainerDetailProps {
  containerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToList?: () => void;
}

function LoadingState() {
  return (
    <div className="space-y-4" data-testid="container-detail-loading">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

function NotFoundState({ onBack }: { onBack?: () => void }) {
  return (
    <div className="py-8 text-center" data-testid="container-detail-not-found">
      <AlertCircle className="mx-auto h-12 w-12 text-destructive opacity-70" />
      <h3 className="mt-4 text-lg font-semibold">Container Not Found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        This container may have been deleted.
      </p>
      {onBack && (
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Containers
        </Button>
      )}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const message = V1ApiError.isV1ApiError(error)
    ? getUserMessage(error.code)
    : error.message;

  return (
    <div className="py-8 text-center" data-testid="container-detail-error">
      <AlertCircle className="mx-auto h-12 w-12 text-destructive opacity-70" />
      <h3 className="mt-4 text-lg font-semibold">Failed to Load Container</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function ContainerContent({
  container,
  onEdit,
  onDelete,
  onAssign,
  onUnassign,
  unassigningDeviceId,
}: {
  container: ContainerDetailType;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: (position: CameraPosition) => void;
  onUnassign: (deviceId: string) => void;
  unassigningDeviceId: string | null;
}) {
  const hasLabel = container.label && container.label.trim().length > 0;
  const canDelete = canDeleteContainer(container);
  const availablePositions = getAvailablePositions(container);

  // Get assignment for each position
  const getAssignment = (position: CameraPosition) =>
    container.cameras.find((c) => c.position === position);

  return (
    <div className="space-y-6" data-testid="container-detail-content">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {hasLabel ? container.label : (
                <span className="text-muted-foreground italic">Unnamed Container</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              <span>Container ID: </span>
              <span className="font-mono">{container.id}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  disabled={!canDelete}
                  className={cn(
                    !canDelete && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </span>
            </TooltipTrigger>
            {!canDelete && (
              <TooltipContent>
                Remove all cameras before deleting
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {/* Description */}
      {container.description && (
        <p className="text-sm text-muted-foreground">{container.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <Badge variant="secondary">
          {container.camera_count}/4 cameras
        </Badge>
        {container.online_count > 0 && (
          <Badge variant="outline" className="text-green-600 dark:text-green-400">
            {container.online_count} online
          </Badge>
        )}
        {container.camera_count - container.online_count > 0 && (
          <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400">
            {container.camera_count - container.online_count} offline
          </Badge>
        )}
      </div>

      {/* 2x2 Position Grid */}
      <div className="grid grid-cols-2 gap-4" data-testid="position-grid">
        {([1, 2, 3, 4] as const).map((position) => (
          <PositionSlot
            key={position}
            position={position}
            assignment={getAssignment(position)}
            onAssign={
              availablePositions.includes(position)
                ? () => onAssign(position)
                : undefined
            }
            onUnassign={
              getAssignment(position)
                ? () => onUnassign(getAssignment(position)!.device_id)
                : undefined
            }
            isUnassigning={
              getAssignment(position)?.device_id === unassigningDeviceId
            }
          />
        ))}
      </div>

      {/* Created/Updated timestamps */}
      <div className="border-t pt-4 text-xs text-muted-foreground">
        <p>Created: {new Date(container.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(container.updated_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

export function ContainerDetail({
  containerId,
  open,
  onOpenChange,
  onBackToList,
}: ContainerDetailProps) {
  // State for dialogs
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [assignPosition, setAssignPosition] = useState<CameraPosition | null>(null);
  const [unassigningDeviceId, setUnassigningDeviceId] = useState<string | null>(null);

  // Queries and mutations
  const { data: container, isLoading, isError, error, refetch } = useContainer(containerId, open);
  const updateMutation = useUpdateContainer();
  const deleteMutation = useDeleteContainer();
  const assignMutation = useAssignCamera();
  const unassignMutation = useUnassignCamera();
  const { data: unassignedCameras = [], isLoading: isLoadingCameras } = useUnassignedCameras(open);

  // Check for 404
  const isNotFound = error && V1ApiError.isV1ApiError(error) && error.code === 'CONTAINER_NOT_FOUND';

  // Handlers
  const handleUpdate = async (data: { label?: string; description?: string }) => {
    if (!containerId) return;
    try {
      await updateMutation.mutateAsync({ id: containerId, data });
      toast.success('Container updated');
      setShowEditDialog(false);
    } catch (err) {
      const message = V1ApiError.isV1ApiError(err)
        ? getUserMessage(err.code)
        : 'Failed to update container';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!containerId) return;
    try {
      await deleteMutation.mutateAsync(containerId);
      toast.success('Container deleted');
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (err) {
      const message = V1ApiError.isV1ApiError(err)
        ? getUserMessage(err.code)
        : 'Failed to delete container';
      toast.error(message);
    }
  };

  const handleAssign = async (deviceId: string, position: CameraPosition) => {
    if (!containerId) return;
    try {
      await assignMutation.mutateAsync({
        containerId,
        data: { device_id: deviceId, position },
      });
      toast.success('Camera assigned');
      setAssignPosition(null);
    } catch (err) {
      const message = V1ApiError.isV1ApiError(err)
        ? getUserMessage(err.code)
        : 'Failed to assign camera';
      toast.error(message);
    }
  };

  const handleUnassign = async (deviceId: string) => {
    if (!containerId) return;
    setUnassigningDeviceId(deviceId);
    try {
      await unassignMutation.mutateAsync({ containerId, deviceId });
      toast.success('Camera unassigned');
    } catch (err) {
      const message = V1ApiError.isV1ApiError(err)
        ? getUserMessage(err.code)
        : 'Failed to unassign camera';
      toast.error(message);
    } finally {
      setUnassigningDeviceId(null);
    }
  };

  const availablePositions = container ? getAvailablePositions(container) : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" data-testid="container-detail-dialog">
          <DialogHeader>
            <DialogTitle>Container Details</DialogTitle>
            <DialogDescription>
              View and manage camera assignments
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <LoadingState />
          ) : isNotFound ? (
            <NotFoundState onBack={onBackToList} />
          ) : isError && error ? (
            <ErrorState error={error as Error} onRetry={() => refetch()} />
          ) : container ? (
            <ContainerContent
              container={container}
              onEdit={() => setShowEditDialog(true)}
              onDelete={() => setShowDeleteDialog(true)}
              onAssign={setAssignPosition}
              onUnassign={handleUnassign}
              unassigningDeviceId={unassigningDeviceId}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EditContainerDialog
        container={container ?? null}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={handleUpdate}
        isUpdating={updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-container-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Container
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{container?.label || 'this container'}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-container-confirm"
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Camera Dialog */}
      <AssignCameraDialog
        open={assignPosition !== null}
        onOpenChange={(open) => !open && setAssignPosition(null)}
        onSubmit={(deviceId) => {
          if (assignPosition) {
            handleAssign(deviceId, assignPosition);
          }
        }}
        unassignedCameras={unassignedCameras}
        availablePositions={availablePositions}
        containerLabel={container?.label}
        isAssigning={assignMutation.isPending}
        isLoadingCameras={isLoadingCameras}
      />
    </>
  );
}
