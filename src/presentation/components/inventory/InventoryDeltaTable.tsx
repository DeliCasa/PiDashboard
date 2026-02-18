/**
 * InventoryDeltaTable Component
 * Feature: 047-inventory-delta-viewer (T014)
 *
 * Displays per-item delta with before/after counts, change indicators,
 * and confidence badges.
 */

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { DeltaEntry } from '@/domain/types/inventory';

interface InventoryDeltaTableProps {
  delta: DeltaEntry[];
}

/**
 * Get confidence tier label and color classes.
 * >= 0.8: High (green), 0.5-0.79: Medium (amber), < 0.5: Low (red)
 */
function getConfidenceTier(confidence: number): {
  label: string;
  className: string;
} {
  if (confidence >= 0.8) {
    return { label: 'High', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  }
  if (confidence >= 0.5) {
    return { label: 'Medium', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' };
  }
  return { label: 'Low', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
}

/**
 * Format a change value with +/- prefix and color.
 */
function formatChange(change: number): { text: string; className: string } {
  if (change > 0) {
    return { text: `+${change}`, className: 'text-green-600 dark:text-green-400' };
  }
  if (change < 0) {
    return { text: `${change}`, className: 'text-red-600 dark:text-red-400' };
  }
  return { text: '0', className: 'text-muted-foreground' };
}

export function InventoryDeltaTable({ delta }: InventoryDeltaTableProps) {
  const allZeroChange = delta.every((entry) => entry.change === 0);
  const avgConfidence =
    delta.length > 0
      ? delta.reduce((sum, entry) => sum + entry.confidence, 0) / delta.length
      : 1;
  const isLowConfidence = avgConfidence < 0.5;

  if (delta.length === 0) {
    return (
      <div
        className="py-8 text-center text-muted-foreground"
        data-testid="inventory-delta-empty"
      >
        No changes detected
      </div>
    );
  }

  return (
    <div data-testid="inventory-delta-table">
      <div className="mb-2 flex items-center gap-2">
        <Badge
          variant="outline"
          data-testid="delta-item-count"
        >
          {delta.length} {delta.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>

      {isLowConfidence && (
        <Alert variant="destructive" className="mb-4" data-testid="low-confidence-banner">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Low confidence in detection results. Manual verification recommended.
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Before</TableHead>
            <TableHead className="text-right">After</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {delta.map((entry, index) => {
            const change = formatChange(entry.change);
            const confidence = getConfidenceTier(entry.confidence);

            return (
              <TableRow key={`${entry.name}-${index}`} data-testid={`delta-row-${index}`}>
                <TableCell>
                  <div>
                    <span className="font-medium">{entry.name}</span>
                    {entry.sku && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {entry.sku}
                      </span>
                    )}
                  </div>
                  {entry.rationale && (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid={`delta-rationale-${index}`}
                    >
                      {entry.rationale}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {entry.before_count}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {entry.after_count}
                </TableCell>
                <TableCell className={cn('text-right font-medium tabular-nums', change.className)}>
                  {allZeroChange && entry.change === 0 ? 'No change' : change.text}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', confidence.className)}
                    data-testid={`confidence-badge-${index}`}
                    aria-label={`Confidence: ${confidence.label}`}
                  >
                    {confidence.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
