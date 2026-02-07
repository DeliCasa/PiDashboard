/**
 * ContainerSection Component
 * Main section component for container management
 *
 * Feature: 043-container-management
 * - Lists all containers with camera counts
 * - Create/edit/delete containers
 * - Assign/unassign cameras to positions
 */

import { useState } from 'react';
import { Package, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContainerCard } from './ContainerCard';
import { ContainerDetail } from './ContainerDetail';
import { CreateContainerDialog } from './CreateContainerDialog';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useContainers,
  useCreateContainer,
  useUnassignedCameras,
} from '@/application/hooks/useContainers';
import { V1ApiError, getUserMessage } from '@/infrastructure/api/errors';

interface ContainerSectionProps {
  className?: string;
}

export function ContainerSection({ className }: ContainerSectionProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Queries
  const {
    data: containers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useContainers();
  const createMutation = useCreateContainer();
  const { data: unassignedCameras = [] } = useUnassignedCameras();

  // Stats
  const totalCameras = containers.reduce((sum, c) => sum + c.camera_count, 0);
  const onlineCameras = containers.reduce((sum, c) => sum + c.online_count, 0);

  // Handlers
  const handleCreate = async (data: { label?: string; description?: string }) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Container created');
      setShowCreateDialog(false);
    } catch (err) {
      const message = V1ApiError.isV1ApiError(err)
        ? getUserMessage(err.code)
        : 'Failed to create container';
      toast.error(message);
    }
  };

  // Error message helper
  const getErrorMessage = (): string => {
    if (V1ApiError.isV1ApiError(error)) {
      return getUserMessage(error.code);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to load containers. Please try again.';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Container Management
            </CardTitle>
            <CardDescription>
              {containers.length} container{containers.length !== 1 ? 's' : ''}
              {containers.length > 0 && (
                <>
                  {' '}&bull; {totalCameras} camera{totalCameras !== 1 ? 's' : ''} assigned
                  {onlineCameras > 0 && ` (${onlineCameras} online)`}
                </>
              )}
              {unassignedCameras.length > 0 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  {' '}&bull; {unassignedCameras.length} unassigned
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              data-testid="create-container-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Container
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          // Loading state
          <div className="py-8 text-center text-muted-foreground" data-testid="containers-loading">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-sm">Loading containers...</p>
          </div>
        ) : isError ? (
          // Error state
          <div className="py-8 text-center" data-testid="containers-error">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive opacity-70" />
            <p className="mt-2 text-sm text-destructive">{getErrorMessage()}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : containers.length === 0 ? (
          // Empty state
          <EmptyState onCreateClick={() => setShowCreateDialog(true)} />
        ) : (
          // Container grid
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="containers-grid"
          >
            {containers.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                onClick={() => setSelectedContainerId(container.id)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Container Dialog */}
      <CreateContainerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isCreating={createMutation.isPending}
      />

      {/* Container Detail Dialog */}
      <ContainerDetail
        containerId={selectedContainerId}
        open={selectedContainerId !== null}
        onOpenChange={(open) => !open && setSelectedContainerId(null)}
        onBackToList={() => setSelectedContainerId(null)}
      />
    </Card>
  );
}
