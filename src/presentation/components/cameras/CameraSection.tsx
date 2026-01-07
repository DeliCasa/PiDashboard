/**
 * CameraSection Component
 * Complete camera management section
 */

import { useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CameraSectionProps {
  className?: string;
}

interface CaptureState {
  cameraId: string;
  imageUrl: string;
  timestamp: string;
}

export function CameraSection({ className }: CameraSectionProps) {
  const [captureState, setCaptureState] = useState<CaptureState | null>(null);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [rebootingId, setRebootingId] = useState<string | null>(null);

  // Hooks
  const { data: cameras = [], isLoading, refetch } = useCameras();
  const captureMutation = useCaptureTest();
  const rebootMutation = useRebootCamera();

  const handleCapture = async (cameraId: string) => {
    setCapturingId(cameraId);
    try {
      const result = await captureMutation.mutateAsync(cameraId);
      if (result.success && result.image_url) {
        setCaptureState({
          cameraId,
          imageUrl: result.image_url,
          timestamp: result.timestamp || new Date().toISOString(),
        });
        toast.success('Capture successful');
      } else {
        toast.error('Capture failed', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error('Capture failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCapturingId(null);
    }
  };

  const handleReboot = async (cameraId: string) => {
    setRebootingId(cameraId);
    try {
      await rebootMutation.mutateAsync(cameraId);
      toast.success('Reboot command sent');
    } catch (error) {
      toast.error('Reboot failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRebootingId(null);
    }
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
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-sm">Loading cameras...</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Camera className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2 text-sm">No cameras registered</p>
            <p className="text-xs">Cameras will appear here once connected</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cameras.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onCapture={() => handleCapture(camera.id)}
                onReboot={() => handleReboot(camera.id)}
                isCapturing={capturingId === camera.id}
                isRebooting={rebootingId === camera.id}
              />
            ))}
          </div>
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
    </Card>
  );
}
