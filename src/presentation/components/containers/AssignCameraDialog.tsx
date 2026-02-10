/**
 * AssignCameraDialog Component
 * Dialog for assigning a camera to a container position
 *
 * Feature: 043-container-management
 */

import { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Camera as CameraType } from '@/infrastructure/api/v1-cameras';

interface AssignCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (deviceId: string, position: 1 | 2 | 3 | 4) => void;
  unassignedCameras: CameraType[];
  availablePositions: (1 | 2 | 3 | 4)[];
  containerLabel?: string;
  isAssigning?: boolean;
  isLoadingCameras?: boolean;
}

export function AssignCameraDialog({
  open,
  onOpenChange,
  onSubmit,
  unassignedCameras,
  availablePositions,
  containerLabel,
  isAssigning,
  isLoadingCameras,
}: AssignCameraDialogProps) {
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCamera('');
      setSelectedPosition('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCamera && selectedPosition) {
      onSubmit(selectedCamera, parseInt(selectedPosition, 10) as 1 | 2 | 3 | 4);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isAssigning) {
      setSelectedCamera('');
      setSelectedPosition('');
    }
    onOpenChange(newOpen);
  };

  const selectedCameraData = unassignedCameras.find((c) => c.id === selectedCamera);
  const isValid = selectedCamera && selectedPosition;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="assign-camera-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Assign Camera
          </DialogTitle>
          <DialogDescription>
            {containerLabel ? (
              <>Assign a camera to <strong>{containerLabel}</strong></>
            ) : (
              'Assign a camera to this container'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Camera Selection */}
          <div className="space-y-2">
            <Label htmlFor="camera-select">Camera</Label>
            {isLoadingCameras ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading cameras...
              </div>
            ) : unassignedCameras.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No unassigned cameras available
              </div>
            ) : (
              <Select
                value={selectedCamera}
                onValueChange={setSelectedCamera}
                disabled={isAssigning}
              >
                <SelectTrigger
                  id="camera-select"
                  className="w-full"
                  data-testid="camera-select"
                >
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedCameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      <div className="flex items-center gap-2">
                        {camera.status === 'online' ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span>{camera.name || camera.id}</span>
                        <span className="text-xs text-muted-foreground">
                          ({camera.status})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected camera info */}
          {selectedCameraData && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedCameraData.name}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span>Camera ID: </span>
                <span className="font-mono">{selectedCameraData.id}</span>
              </p>
              <div className="mt-1 flex items-center gap-1">
                {selectedCameraData.status === 'online' ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">Online</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {selectedCameraData.status}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Position Selection */}
          <div className="space-y-2">
            <Label htmlFor="position-select">Position</Label>
            {availablePositions.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No positions available (container is full)
              </div>
            ) : (
              <Select
                value={selectedPosition}
                onValueChange={setSelectedPosition}
                disabled={isAssigning}
              >
                <SelectTrigger
                  id="position-select"
                  className="w-full"
                  data-testid="position-select"
                >
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {availablePositions.map((pos) => (
                    <SelectItem key={pos} value={pos.toString()}>
                      Position {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAssigning || !isValid}
              data-testid="assign-camera-submit"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Camera
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
