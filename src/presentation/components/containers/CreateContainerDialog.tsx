/**
 * CreateContainerDialog Component
 * Dialog form for creating a new container
 *
 * Feature: 043-container-management
 */

import { useState } from 'react';
import { Package, Plus, Loader2 } from 'lucide-react';
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

interface CreateContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { label?: string; description?: string }) => void;
  isCreating?: boolean;
}

export function CreateContainerDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: CreateContainerDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      label: label.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isCreating) {
      // Reset form when closing
      setLabel('');
      setDescription('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="create-container-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Create Container
          </DialogTitle>
          <DialogDescription>
            Create a new container to organize your cameras.
            A unique ID will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="container-label">
              Label <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="container-label"
              placeholder="e.g., Main Fridge, Storage Room"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              disabled={isCreating}
              data-testid="container-label-input"
            />
            <p className="text-xs text-muted-foreground">
              Human-friendly name for this container (max 100 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="container-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="container-description"
              placeholder="Additional notes about this container..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={isCreating}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="container-description-input"
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
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} data-testid="create-container-submit">
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Container
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
