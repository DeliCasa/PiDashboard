/**
 * ContainerPicker Component
 * Feature: 046-opaque-container-identity
 *
 * Header dropdown that allows operators to select the active container.
 * Scopes camera and evidence views to the selected container.
 * Persists selection via the activeContainer Zustand store.
 */

import { useEffect } from 'react';
import { Package } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContainers } from '@/application/hooks/useContainers';
import {
  useActiveContainerId,
  useActiveContainerActions,
} from '@/application/stores/activeContainer';
import { isFeatureUnavailable } from '@/infrastructure/api/client';

interface ContainerPickerProps {
  className?: string;
}

export function ContainerPicker({ className }: ContainerPickerProps) {
  const { data: containers = [], isLoading, isError, error } = useContainers();
  const activeContainerId = useActiveContainerId();
  const { setActiveContainer, clearActiveContainer } = useActiveContainerActions();

  const featureUnavailable = isError && error && isFeatureUnavailable(error);

  // Stale selection reconciliation (T007):
  // When container data arrives, validate the active selection.
  useEffect(() => {
    if (isLoading || isError) return;

    if (containers.length === 0) {
      // No containers — clear selection
      if (activeContainerId !== null) {
        clearActiveContainer();
      }
      return;
    }

    if (activeContainerId === null) {
      // No prior selection — auto-select first container
      setActiveContainer(containers[0].id);
      return;
    }

    // Check if current selection still exists
    const found = containers.some((c) => c.id === activeContainerId);
    if (!found) {
      // Stale selection — fall back to first container
      setActiveContainer(containers[0].id);
    }
  }, [containers, isLoading, isError, activeContainerId, setActiveContainer, clearActiveContainer]);

  // Graceful degradation: feature unavailable (404/503)
  if (featureUnavailable) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={className} data-testid="container-picker-loading">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4 animate-pulse" />
          <span className="hidden sm:inline">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state (non-404/503)
  if (isError) {
    return (
      <div className={className} data-testid="container-picker-error">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">No containers</span>
        </div>
      </div>
    );
  }

  // Empty state: no containers exist
  if (containers.length === 0) {
    return (
      <div className={className} data-testid="container-picker-empty">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">No containers</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className} data-testid="container-picker">
      <Select
        value={activeContainerId ?? undefined}
        onValueChange={(value) => setActiveContainer(value)}
      >
        <SelectTrigger
          className="h-9 w-[180px] sm:w-[220px]"
          data-testid="container-picker-trigger"
          aria-label="Select container"
        >
          <Package className="mr-2 h-4 w-4 shrink-0" />
          <SelectValue placeholder="Select container" />
        </SelectTrigger>
        <SelectContent>
          {containers.map((container) => {
            const hasLabel = container.label && container.label.trim().length > 0;
            return (
              <SelectItem
                key={container.id}
                value={container.id}
                data-testid={`container-option-${container.id}`}
              >
                <div className="flex flex-col">
                  <span className="truncate">
                    {hasLabel ? container.label : (
                      <span className="italic text-muted-foreground">Unnamed Container</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    <span>ID: </span>
                    <span className="font-mono">
                      {container.id.length > 20
                        ? `${container.id.slice(0, 8)}...${container.id.slice(-4)}`
                        : container.id}
                    </span>
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
