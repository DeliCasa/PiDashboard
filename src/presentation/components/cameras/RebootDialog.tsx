/**
 * RebootDialog Component
 * Confirmation dialog for camera reboot operation
 *
 * Feature: 034-esp-camera-integration (T043, T044)
 * - AlertDialog with warning message
 * - Disabled button during reboot request
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface RebootDialogProps {
  /** Name of the camera to reboot */
  cameraName: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms reboot */
  onConfirm: () => void;
  /** Whether reboot is in progress */
  isRebooting?: boolean;
}

export function RebootDialog({
  cameraName,
  open,
  onOpenChange,
  onConfirm,
  isRebooting = false,
}: RebootDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="reboot-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Reboot Camera
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to reboot <strong>{cameraName}</strong>?
              </p>
              <p className="text-yellow-600 dark:text-yellow-400" data-testid="reboot-warning">
                The camera will be temporarily unavailable during the reboot process.
                This typically takes 30-60 seconds.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRebooting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isRebooting}
            className={cn(
              'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              isRebooting && 'opacity-50 cursor-not-allowed'
            )}
            data-testid="reboot-confirm-button"
          >
            {isRebooting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Rebooting...
              </>
            ) : (
              'Reboot'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
