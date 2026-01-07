/**
 * DoorControls Component
 * Door control buttons and state display
 */

import { useState } from 'react';
import { DoorOpen, DoorClosed, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { Door } from '@/domain/types/entities';

interface DoorControlsProps {
  door: Door | undefined;
  isLoading?: boolean;
  testingModeActive?: boolean;
  onOpen: (duration: number) => void;
  onClose: () => void;
  isOpening?: boolean;
  isClosing?: boolean;
  className?: string;
}

const DURATIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '30', label: '30 seconds' },
];

export function DoorControls({
  door,
  isLoading,
  testingModeActive = false,
  onOpen,
  onClose,
  isOpening,
  isClosing,
  className,
}: DoorControlsProps) {
  const [duration, setDuration] = useState('5');
  const [showConfirmOpen, setShowConfirmOpen] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleOpenClick = () => {
    if (testingModeActive) {
      onOpen(parseInt(duration));
    } else {
      setShowConfirmOpen(true);
    }
  };

  const handleCloseClick = () => {
    if (testingModeActive) {
      onClose();
    } else {
      setShowConfirmClose(true);
    }
  };

  const confirmOpen = () => {
    onOpen(parseInt(duration));
    setShowConfirmOpen(false);
  };

  const confirmClose = () => {
    onClose();
    setShowConfirmClose(false);
  };

  if (isLoading || !door) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const isOpen = door.state === 'open';
  const isLocked = door.lockState === 'locked';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Current State Display */}
      <div className="flex items-center justify-center gap-4 rounded-lg bg-muted p-6">
        <div className="text-center">
          {isOpen ? (
            <DoorOpen className="mx-auto h-12 w-12 text-yellow-500" />
          ) : (
            <DoorClosed className="mx-auto h-12 w-12 text-green-500" />
          )}
          <p className="mt-2 font-medium capitalize">{door.state}</p>
        </div>
        <div className="text-center">
          {isLocked ? (
            <Lock className="mx-auto h-8 w-8 text-green-500" />
          ) : (
            <Unlock className="mx-auto h-8 w-8 text-yellow-500" />
          )}
          <p className="mt-2 text-sm text-muted-foreground capitalize">
            {door.lockState}
          </p>
        </div>
      </div>

      {/* Duration Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Duration:</span>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleOpenClick}
          disabled={isOpening || isClosing}
          className="flex-1"
          variant={isOpen ? 'outline' : 'default'}
        >
          <DoorOpen className={cn('mr-2 h-4 w-4', isOpening && 'animate-pulse')} />
          {isOpening ? 'Opening...' : 'Open Door'}
        </Button>
        <Button
          onClick={handleCloseClick}
          disabled={isOpening || isClosing}
          variant={isOpen ? 'default' : 'outline'}
          className="flex-1"
        >
          <DoorClosed className={cn('mr-2 h-4 w-4', isClosing && 'animate-pulse')} />
          {isClosing ? 'Closing...' : 'Close Door'}
        </Button>
      </div>

      {/* Last Command Result */}
      {door.lastCommand && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Last command: {door.lastCommandType}</span>
          <Badge variant={door.lastCommandResult === 'success' ? 'default' : 'destructive'}>
            {door.lastCommandResult}
          </Badge>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <AlertDialog open={showConfirmOpen} onOpenChange={setShowConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Door Open
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will unlock the door for {duration} seconds. Are you sure you
              want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOpen}>
              Open Door
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Door Close</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the door. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              Close Door
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
