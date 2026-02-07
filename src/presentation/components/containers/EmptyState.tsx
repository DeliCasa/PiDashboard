/**
 * EmptyState Component
 * Displayed when no containers exist
 *
 * Feature: 043-container-management
 */

import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="py-12 text-center" data-testid="containers-empty">
      <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
      <h3 className="mt-4 text-lg font-medium">No containers yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        Containers organize your cameras into logical groups. Create your first container to get started.
      </p>
      <Button className="mt-6" onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        Create Container
      </Button>
    </div>
  );
}
