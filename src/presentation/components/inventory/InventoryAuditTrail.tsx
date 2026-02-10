/**
 * InventoryAuditTrail Component
 * Feature: 047-inventory-delta-viewer (T027)
 *
 * Displays review audit info: reviewer, timestamp, action, corrections diff.
 */

import { CheckCircle2, PenLine } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Review } from '@/domain/types/inventory';

interface InventoryAuditTrailProps {
  review: Review | null | undefined;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function InventoryAuditTrail({ review }: InventoryAuditTrailProps) {
  if (!review) return null;

  const isOverride = review.action === 'override';
  const corrections = review.corrections ?? [];

  return (
    <Card data-testid="audit-trail">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isOverride ? (
            <PenLine className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Review Audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Reviewer: </span>
            <span className="font-mono text-xs text-muted-foreground" data-testid="audit-reviewer">
              {review.reviewer_id}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Reviewed: </span>
            <span data-testid="audit-timestamp">
              {formatTimestamp(review.reviewed_at)}
            </span>
          </div>
          <div>
            <Badge
              variant={isOverride ? 'secondary' : 'default'}
              data-testid="audit-action"
            >
              {isOverride ? 'Corrected' : 'Approved'}
            </Badge>
          </div>
        </div>

        {isOverride && corrections.length > 0 && (
          <Table data-testid="audit-corrections">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Corrected</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.map((correction, index) => (
                <TableRow key={index}>
                  <TableCell
                    className={cn(
                      'font-medium',
                      correction.removed && 'text-destructive line-through',
                      correction.added && 'text-green-600 dark:text-green-400'
                    )}
                  >
                    {correction.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {correction.original_count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {correction.corrected_count}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {correction.added && '+ Added'}
                    {correction.removed && '- Removed'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!isOverride && (
          <p className="text-sm text-muted-foreground" data-testid="audit-approved-note">
            Approved as-is — no corrections made
          </p>
        )}

        {review.notes && (
          <div className="rounded-md bg-muted p-3" data-testid="audit-notes">
            <p className="text-sm">{review.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
