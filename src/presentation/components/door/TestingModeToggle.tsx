/**
 * TestingModeToggle Component
 * Testing mode activation control with countdown timer
 */

import { useState, useEffect } from 'react';
import { TestTube, Clock, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  useTestingModeStore,
  getRemainingTime,
  formatRemainingTime,
} from '@/application/stores/testingMode';

interface TestingModeToggleProps {
  className?: string;
}

export function TestingModeToggle({ className }: TestingModeToggleProps) {
  const { active, expiresAt, operationCount, activate, deactivate, checkExpiry } =
    useTestingModeStore();
  const [showConfirm, setShowConfirm] = useState(false);
  // Calculate remaining time from active state
  const computedRemainingTime = active && expiresAt ? getRemainingTime(expiresAt) : 0;
  const [remainingTime, setRemainingTime] = useState(computedRemainingTime);

  // Sync remaining time when active/expiresAt changes
  // This is intentional - we need to sync derived state when dependencies change
  useEffect(() => {
    setRemainingTime(active && expiresAt ? getRemainingTime(expiresAt) : 0);
  }, [active, expiresAt]);

  // Update remaining time every second when active
  useEffect(() => {
    if (!active || !expiresAt) {
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = getRemainingTime(expiresAt);
      setRemainingTime(remaining);
      if (remaining <= 0) {
        checkExpiry();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [active, expiresAt, checkExpiry]);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setShowConfirm(true);
    } else {
      deactivate();
    }
  };

  const confirmActivate = () => {
    activate();
    setShowConfirm(false);
  };

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-colors',
      active && 'border-yellow-500/50 bg-yellow-500/10',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TestTube className={cn(
            'h-5 w-5',
            active ? 'text-yellow-500' : 'text-muted-foreground'
          )} />
          <div>
            <p className="font-medium">Testing Mode</p>
            <p className="text-xs text-muted-foreground">
              Skip confirmation dialogs for 5 minutes
            </p>
          </div>
        </div>
        <Switch
          checked={active}
          onCheckedChange={handleToggle}
          className={active ? 'data-[state=checked]:bg-yellow-500' : ''}
        />
      </div>

      {/* Active State Display */}
      {active && (
        <div className="mt-4 space-y-3">
          {/* Countdown Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Time remaining:</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {formatRemainingTime(remainingTime)}
            </Badge>
          </div>

          {/* Operation Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Operations:</span>
            <Badge variant="secondary">{operationCount}</Badge>
          </div>

          {/* Manual Deactivate */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => deactivate()}
            className="w-full"
          >
            Deactivate Testing Mode
          </Button>
        </div>
      )}

      {/* Warning when active */}
      {active && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-yellow-500/20 p-2 text-xs text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p>
            Door operations will execute without confirmation. Be careful!
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-yellow-500" />
              Enable Testing Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Testing mode allows you to operate the door without confirmation
                dialogs for 5 minutes.
              </p>
              <p className="font-medium text-yellow-600 dark:text-yellow-400">
                This should only be used during device setup and testing.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActivate}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Enable Testing Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
