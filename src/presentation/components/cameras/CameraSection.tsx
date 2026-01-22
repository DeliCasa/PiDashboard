/**
 * CameraSection Component
 * Complete camera management section
 *
 * Feature: 034-esp-camera-integration
 * - Updated to use V1 Cameras API with base64 image capture
 * - Added visibility-aware polling
 * - Enhanced error states with retry functionality
 */

import { useState } from 'react';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCameras,
  useCaptureTest,
  useRebootCamera,
} from '@/application/hooks/useCameras';
import { CameraCard } from './CameraCard';
import { CapturePreview } from './CapturePreview';
import { CameraDetail } from './CameraDetail';
import { RebootDialog } from './RebootDialog';
import { DiagnosticsView } from './DiagnosticsView';
import { AutoOnboardPanel } from '@/presentation/components/auto-onboard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { V1ApiError, getUserMessage } from '@/infrastructure/api/errors';
import { createDataUrl } from '@/lib/download';

interface CameraSectionProps {
  className?: string;
}

interface CaptureState {
  cameraId: string;
  /** Data URL for base64 image (data:image/jpeg;base64,...) */
  imageUrl: string;
  timestamp: string;
}

export function CameraSection({ className }: CameraSectionProps) {
  const [captureState, setCaptureState] = useState<CaptureState | null>(null);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [rebootingId, setRebootingId] = useState<string | null>(null);
  const [detailCameraId, setDetailCameraId] = useState<string | null>(null);
  /** Camera ID pending reboot confirmation */
  const [rebootConfirmId, setRebootConfirmId] = useState<string | null>(null);

  // Hooks - useCameras now uses V1 API with visibility-aware polling
  const { data: cameras = [], isLoading, isError, error, refetch } = useCameras();
  const captureMutation = useCaptureTest();
  const rebootMutation = useRebootCamera();

  const handleCapture = async (cameraId: string) => {
    setCapturingId(cameraId);
    try {
      const result = await captureMutation.mutateAsync(cameraId);
      if (result.success && result.image) {
        // V1 API returns base64 image - convert to data URL
        const imageUrl = createDataUrl(result.image, 'image/jpeg');
        setCaptureState({
          cameraId,
          imageUrl,
          timestamp: result.timestamp || new Date().toISOString(),
        });
        toast.success('Capture successful');
      } else {
        toast.error('Capture failed', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (err) {
      // Handle V1ApiError for user-friendly messages
      const message = V1ApiError.isV1ApiError(err)
        ? getUserMessage(err.code)
        : err instanceof Error
          ? err.message
          : 'Unknown error';
      toast.error('Capture failed', { description: message });
    } finally {
      setCapturingId(null);
    }
  };

  /** Opens the reboot confirmation dialog */
  const handleRebootClick = (cameraId: string) => {
    setRebootConfirmId(cameraId);
  };

  /** Actually performs the reboot after confirmation */
  const handleRebootConfirm = async () => {
    if (!rebootConfirmId) return;

    const cameraId = rebootConfirmId;
    setRebootingId(cameraId);
    // Keep dialog open while rebooting to show loading state

    try {
      await rebootMutation.mutateAsync(cameraId);
      toast.success('Reboot command sent', {
        description: 'Camera will be temporarily unavailable during reboot.',
      });
      setRebootConfirmId(null);
    } catch (err) {
      // Handle V1ApiError for user-friendly messages
      const message = V1ApiError.isV1ApiError(err)
        ? getUserMessage(err.code)
        : err instanceof Error
          ? err.message
          : 'Unknown error';
      toast.error('Reboot failed', { description: message });
      setRebootConfirmId(null);
    } finally {
      setRebootingId(null);
    }
  };

  // Get user-friendly error message for display (T016)
  const getErrorMessage = (): string => {
    if (V1ApiError.isV1ApiError(error)) {
      return getUserMessage(error.code);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to load cameras. Please try again.';
  };

  const onlineCount = cameras.filter((c) => c.status === 'online').length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Camera Management
            </CardTitle>
            <CardDescription>
              {cameras.length} camera{cameras.length !== 1 ? 's' : ''} registered
              {cameras.length > 0 && ` • ${onlineCount} online`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Auto-onboard panel - shows only when available (FR-027) */}
        <AutoOnboardPanel className="mb-6" />

        {isLoading ? (
          // Loading state (T014)
          <div className="py-8 text-center text-muted-foreground" data-testid="camera-loading">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-sm">Loading cameras...</p>
          </div>
        ) : isError ? (
          // Error state with retry button (T016)
          <div className="py-8 text-center" data-testid="camera-error">
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
        ) : cameras.length === 0 ? (
          // Empty state (T015)
          <div className="py-8 text-center text-muted-foreground" data-testid="camera-empty">
            <Camera className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2 text-sm">No cameras connected</p>
            <p className="text-xs">Cameras will appear here once registered with PiOrchestrator</p>
          </div>
        ) : (
          // Camera grid
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="camera-grid">
            {cameras.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onCapture={() => handleCapture(camera.id)}
                onReboot={() => handleRebootClick(camera.id)}
                onViewDetails={() => setDetailCameraId(camera.id)}
                isCapturing={capturingId === camera.id}
                isRebooting={rebootingId === camera.id}
              />
            ))}
          </div>
        )}

        {/* Diagnostics Section (T059) - Always visible as collapsible */}
        {!isLoading && !isError && (
          <DiagnosticsView className="mt-6" />
        )}
      </CardContent>

      {/* Capture Preview Dialog */}
      <Dialog
        open={captureState !== null}
        onOpenChange={(open: boolean) => !open && setCaptureState(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture Preview</DialogTitle>
          </DialogHeader>
          {captureState && (
            <CapturePreview
              imageUrl={captureState.imageUrl}
              timestamp={captureState.timestamp}
              onClose={() => setCaptureState(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Camera Detail Dialog */}
      <CameraDetail
        cameraId={detailCameraId}
        open={detailCameraId !== null}
        onOpenChange={(open) => !open && setDetailCameraId(null)}
        onViewList={() => setDetailCameraId(null)}
      />

      {/* Reboot Confirmation Dialog (T043, T047) */}
      <RebootDialog
        cameraName={cameras.find((c) => c.id === rebootConfirmId)?.name || 'Camera'}
        open={rebootConfirmId !== null}
        onOpenChange={(open) => !open && !rebootingId && setRebootConfirmId(null)}
        onConfirm={handleRebootConfirm}
        isRebooting={rebootingId === rebootConfirmId}
      />
    </Card>
  );
}
