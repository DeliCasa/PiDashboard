/**
 * ContainerCard Component
 * Summary card for a container showing label, ID, and camera counts
 *
 * Feature: 043-container-management
 */

import { Package, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContainerDetail } from '@/infrastructure/api/v1-containers';

interface ContainerCardProps {
  container: ContainerDetail;
  onClick?: () => void;
  className?: string;
}

export function ContainerCard({ container, onClick, className }: ContainerCardProps) {
  const hasLabel = container.label && container.label.trim().length > 0;
  const offlineCount = container.camera_count - container.online_count;
  const hasOfflineCameras = offlineCount > 0;
  const isFull = container.camera_count >= 4;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent/50',
        className
      )}
      onClick={onClick}
      data-testid={`container-card-${container.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-base truncate">
              {hasLabel ? container.label : (
                <span className="text-muted-foreground italic">Unnamed Container</span>
              )}
            </CardTitle>
          </div>
          {isFull && (
            <Badge variant="secondary" className="text-xs">Full</Badge>
          )}
        </div>
        <CardDescription className="font-mono text-xs truncate">
          {container.id}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Camera count stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span>
              {container.camera_count}/4 cameras
            </span>
          </div>

          {container.camera_count > 0 && (
            <div className="flex items-center gap-2">
              {container.online_count > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {container.online_count}
                </span>
              )}
              {hasOfflineCameras && (
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {offlineCount}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Description preview if exists */}
        {container.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {container.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
