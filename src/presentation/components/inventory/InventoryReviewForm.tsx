/**
 * InventoryReviewForm Component
 * Feature: 047-inventory-delta-viewer (T023), 048-inventory-review (T026-T028)
 *
 * Inline review controls: approve as-is, or edit corrections and submit.
 * Enhanced with inline validation, correction summary, and 409 conflict handling.
 */

import { useState, useCallback } from 'react';
import { Check, Pencil, Plus, Trash2, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useSubmitReview } from '@/application/hooks/useInventoryDelta';
import { V1ApiError } from '@/infrastructure/api/errors';
import type { InventoryAnalysisRun, ReviewCorrection } from '@/domain/types/inventory';
import { normalizeDelta } from '@/infrastructure/api/inventory-delta-adapter';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

interface EditableItem {
  name: string;
  sku: string | null;
  originalCount: number;
  correctedCount: number;
  added: boolean;
  removed: boolean;
}

interface InventoryReviewFormProps {
  run: InventoryAnalysisRun;
  onReviewSubmitted?: () => void;
}

const MAX_NOTES_LENGTH = 500;

export function InventoryReviewForm({ run, onReviewSubmitted }: InventoryReviewFormProps) {
  const [editMode, setEditMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(new Map());
  const [formError, setFormError] = useState<string | null>(null);
  const [showConflict, setShowConflict] = useState(false);

  const submitReview = useSubmitReview(run.run_id);
  const queryClient = useQueryClient();

  const initEditMode = useCallback(() => {
    const items: EditableItem[] = (normalizeDelta(run.delta) ?? []).map((entry) => ({
      name: entry.name,
      sku: entry.sku ?? null,
      originalCount: entry.after_count,
      correctedCount: entry.after_count,
      added: false,
      removed: false,
    }));
    setEditableItems(items);
    setFieldErrors(new Map());
    setFormError(null);
    setEditMode(true);
  }, [run.delta]);

  // Don't show form if already reviewed or status is pending/failed
  if (run.review !== null && run.review !== undefined) return null;
  if (run.status === 'pending' || run.status === 'processing' || run.status === 'error') return null;

  const validateField = (field: string, index: number, value: string | number) => {
    const key = `${field}-${index}`;
    const newErrors = new Map(fieldErrors);

    if (field === 'count') {
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (isNaN(num) || num < 0) {
        newErrors.set(key, 'Count must be 0 or greater');
      } else {
        newErrors.delete(key);
      }
    } else if (field === 'name') {
      if (!String(value).trim()) {
        newErrors.set(key, 'Item name is required');
      } else {
        newErrors.delete(key);
      }
    }

    setFieldErrors(newErrors);
  };

  const hasFieldErrors = fieldErrors.size > 0;

  const handleApprove = async () => {
    await submitReview.mutateAsync({
      action: 'approve',
      corrections: [],
      notes: '',
    });
    onReviewSubmitted?.();
  };

  const updateItem = (index: number, field: keyof EditableItem, value: string | number | boolean) => {
    setEditableItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    setFormError(null);
  };

  const addItem = () => {
    setEditableItems((prev) => [
      ...prev,
      { name: '', sku: null, originalCount: 0, correctedCount: 0, added: true, removed: false },
    ]);
    setFormError(null);
  };

  const removeItem = (index: number) => {
    setEditableItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, removed: true } : item
      )
    );
    // Clear any errors for the removed item
    const newErrors = new Map(fieldErrors);
    newErrors.delete(`name-${index}`);
    newErrors.delete(`count-${index}`);
    setFieldErrors(newErrors);
    setFormError(null);
  };

  const buildCorrections = (): ReviewCorrection[] => {
    return editableItems
      .filter((item) => {
        // Added then removed cancels out — no correction needed
        if (item.added && item.removed) return false;
        if (item.removed) return true;
        if (item.added) return true;
        return item.correctedCount !== item.originalCount;
      })
      .map((item) => ({
        name: item.name,
        sku: item.sku,
        original_count: item.originalCount,
        corrected_count: item.removed ? 0 : item.correctedCount,
        added: item.added || undefined,
        removed: item.removed || undefined,
      }));
  };

  const handleOpenConfirm = () => {
    // Validate all fields before opening confirm
    const newErrors = new Map<string, string>();

    editableItems.forEach((item, index) => {
      if (item.removed) return;
      if (!item.name.trim()) {
        newErrors.set(`name-${index}`, 'Item name is required');
      }
      if (item.correctedCount < 0 || isNaN(item.correctedCount)) {
        newErrors.set(`count-${index}`, 'Count must be 0 or greater');
      }
    });

    setFieldErrors(newErrors);

    if (newErrors.size > 0) return;

    // Check at least one correction exists
    const corrections = buildCorrections();
    if (corrections.length === 0) {
      setFormError('At least one correction is required');
      return;
    }

    // Validate notes length
    if (notes.length > MAX_NOTES_LENGTH) return;

    setShowConfirmDialog(true);
  };

  const handleSubmitReview = async () => {
    const corrections = buildCorrections();
    try {
      await submitReview.mutateAsync({
        action: corrections.length > 0 ? 'override' : 'approve',
        corrections,
        notes: notes || undefined,
      });
      setShowConfirmDialog(false);
      setEditMode(false);
      onReviewSubmitted?.();
    } catch (err) {
      setShowConfirmDialog(false);
      // Handle 409 conflict
      if (err instanceof V1ApiError && err.code === 'REVIEW_CONFLICT') {
        setShowConflict(true);
        toast.error('This session has already been reviewed');
      }
      // Other errors are handled by the mutation's onError
    }
  };

  const handleRefreshAndReview = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
    setShowConflict(false);
    setEditMode(false);
    setEditableItems([]);
    setFieldErrors(new Map());
    setFormError(null);
    setNotes('');
  };

  const corrections = editMode ? buildCorrections() : [];
  const submitDisabled = submitReview.isPending || hasFieldErrors || notes.length > MAX_NOTES_LENGTH;
  const submitDisabledForNoCorrections = corrections.length === 0;

  if (showConflict) {
    return (
      <div className="space-y-3 pt-4" data-testid="review-conflict">
        <p className="text-sm text-destructive">
          This session has already been reviewed by another operator.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAndReview}
          data-testid="review-refresh-btn"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh & Re-review
        </Button>
      </div>
    );
  }

  if (!editMode) {
    return (
      <div className="flex gap-2 pt-4" data-testid="review-actions">
        <Button
          variant="default"
          size="sm"
          onClick={handleApprove}
          disabled={submitReview.isPending}
          data-testid="review-approve-btn"
        >
          <Check className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={initEditMode}
          data-testid="review-edit-btn"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit & Correct
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4" data-testid="review-edit-form">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Original</TableHead>
            <TableHead className="text-right">Corrected</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {editableItems.map((item, index) => (
            <TableRow
              key={index}
              className={cn(item.removed && 'opacity-50 line-through')}
              data-testid={`edit-row-${index}`}
            >
              <TableCell>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  onBlur={(e) => validateField('name', index, e.target.value)}
                  disabled={item.removed}
                  className={cn('h-8', fieldErrors.has(`name-${index}`) && 'border-destructive')}
                  placeholder="Item name"
                  data-testid={`edit-name-${index}`}
                  aria-label={`Item name for row ${index}`}
                />
                {fieldErrors.has(`name-${index}`) && (
                  <p
                    className="mt-1 text-xs text-destructive"
                    data-testid={`review-error-name-${index}`}
                  >
                    {fieldErrors.get(`name-${index}`)}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.originalCount}
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  min={0}
                  value={item.correctedCount}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = parseInt(raw, 10);
                    updateItem(index, 'correctedCount', isNaN(parsed) ? 0 : parsed);
                  }}
                  onBlur={() => validateField('count', index, item.correctedCount)}
                  disabled={item.removed}
                  className={cn('h-8 w-20 text-right', fieldErrors.has(`count-${index}`) && 'border-destructive')}
                  data-testid={`edit-count-${index}`}
                  aria-label={`Corrected count for ${item.name || `row ${index}`}`}
                />
                {fieldErrors.has(`count-${index}`) && (
                  <p
                    className="mt-1 text-xs text-destructive"
                    data-testid={`review-error-count-${index}`}
                  >
                    {fieldErrors.get(`count-${index}`)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {!item.removed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(index)}
                    data-testid={`edit-remove-${index}`}
                    aria-label={`Remove ${item.name || `row ${index}`}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          data-testid="review-add-item-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div>
        <Textarea
          placeholder="Review notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={MAX_NOTES_LENGTH}
          rows={2}
          data-testid="review-notes"
          aria-label="Review notes"
        />
        {notes.length > MAX_NOTES_LENGTH && (
          <p className="mt-1 text-xs text-destructive" data-testid="review-error-notes">
            Notes must be {MAX_NOTES_LENGTH} characters or less
          </p>
        )}
      </div>

      {formError && (
        <p className="text-xs text-destructive" data-testid="review-submit-disabled-reason">
          {formError}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleOpenConfirm}
          disabled={submitDisabled || submitDisabledForNoCorrections}
          data-testid="review-submit-btn"
        >
          <Send className="mr-2 h-4 w-4" />
          Submit Review
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditMode(false)}
          data-testid="review-cancel-btn"
        >
          Cancel
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent data-testid="review-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Review</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {corrections.length > 0 ? (
                  <div className="space-y-2">
                    <p>
                      You are submitting {corrections.length} correction{corrections.length !== 1 ? 's' : ''}. This action cannot be undone.
                    </p>
                    <ul className="list-inside list-disc text-sm" data-testid="review-correction-summary">
                      {corrections.map((c, i) => (
                        <li key={i}>
                          {c.added && <span className="text-green-600">+ {c.name} (count: {c.corrected_count})</span>}
                          {c.removed && <span className="text-destructive line-through">{c.name}</span>}
                          {!c.added && !c.removed && (
                            <span>
                              {c.name}: {c.original_count} → {c.corrected_count}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {notes.trim() && (
                      <p className="text-sm text-muted-foreground" data-testid="review-notes-preview">
                        Notes: {notes.trim()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p>You are approving this inventory delta as-is. This action cannot be undone.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitReview}
              disabled={submitReview.isPending}
              data-testid="review-confirm-btn"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
