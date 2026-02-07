/**
 * EditContainerDialog Component
 * Dialog form for editing a container's label and description
 *
 * Feature: 043-container-management
 */

import { useState, useEffect } from 'react';
import { Package, Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContainerDetail } from '@/infrastructure/api/v1-containers';

interface EditContainerDialogProps {
  container: ContainerDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { label?: string; description?: string }) => void;
  isUpdating?: boolean;
}

export function EditContainerDialog({
  container,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
}: EditContainerDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  // Sync form state when container changes
  useEffect(() => {
    if (container) {
      setLabel(container.label || '');
      setDescription(container.description || '');
    }
  }, [container]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      label: label.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUpdating) {
      // Reset form when closing
      setLabel(container?.label || '');
      setDescription(container?.description || '');
    }
    onOpenChange(newOpen);
  };

  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="edit-container-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Edit Container
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {container.id}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-container-label">
              Label <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-container-label"
              placeholder="e.g., Main Fridge, Storage Room"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              disabled={isUpdating}
              data-testid="edit-container-label-input"
            />
            <p className="text-xs text-muted-foreground">
              Human-friendly name for this container (max 100 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-container-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="edit-container-description"
              placeholder="Additional notes about this container..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={isUpdating}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="edit-container-description-input"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating} data-testid="edit-container-submit">
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
