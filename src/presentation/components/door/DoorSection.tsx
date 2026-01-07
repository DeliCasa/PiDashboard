/**
 * DoorSection Component
 * Complete door control section with testing mode
 */

import { DoorOpen, History } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useDoorStatus,
  useOpenDoor,
  useCloseDoor,
  useDoorHistory,
} from '@/application/hooks/useDoor';
import { useTestingModeStore } from '@/application/stores/testingMode';
import { DoorControls } from './DoorControls';
import { TestingModeToggle } from './TestingModeToggle';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DoorSectionProps {
  className?: string;
}

export function DoorSection({ className }: DoorSectionProps) {
  // Hooks
  const { data: door, isLoading: doorLoading, isError: doorError } = useDoorStatus();
  const { data: history = [] } = useDoorHistory();
  const openMutation = useOpenDoor();
  const closeMutation = useCloseDoor();
  const { active: testingModeActive } = useTestingModeStore();

  const handleOpen = async (duration: number) => {
    try {
      const result = await openMutation.mutateAsync(duration);
      if (result.success) {
        toast.success(`Door opened for ${duration} seconds`);
      } else {
        toast.error('Failed to open door', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Failed to open door', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleClose = async () => {
    try {
      const result = await closeMutation.mutateAsync();
      if (result.success) {
        toast.success('Door closed');
      } else {
        toast.error('Failed to close door', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Failed to close door', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Control Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" />
            Door Control
          </CardTitle>
          <CardDescription>
            Test and operate the container door
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Testing Mode Toggle */}
          <TestingModeToggle />

          {/* Door Controls */}
          <DoorControls
            door={door}
            isLoading={doorLoading}
            isError={doorError}
            testingModeActive={testingModeActive}
            onOpen={handleOpen}
            onClose={handleClose}
            isOpening={openMutation.isPending}
            isClosing={closeMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Operation History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Recent Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No operations recorded
            </p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {op.command}
                    </Badge>
                    {op.testing_mode && (
                      <Badge variant="secondary" className="text-xs">
                        Test
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={op.result === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {op.result}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(op.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
