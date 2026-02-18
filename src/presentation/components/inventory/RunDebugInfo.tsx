/**
 * RunDebugInfo Component
 * Feature: 055-session-review-drilldown (T022)
 *
 * Collapsible metadata display with copy-to-clipboard for each field.
 * Shows run ID, session ID, container ID, provider, timing, model, and request ID.
 */

import { useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { getLastRequestId } from '@/infrastructure/api/inventory-delta';
import type { InventoryAnalysisRun } from '@/domain/types/inventory';

// ============================================================================
// Helpers
// ============================================================================

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success('Copied');
}

// ============================================================================
// Sub-components
// ============================================================================

interface DebugFieldProps {
  label: string;
  value: string | number | null | undefined;
  fieldKey: string;
  mono?: boolean;
}

function DebugField({ label, value, fieldKey, mono = false }: DebugFieldProps) {
  if (value === null || value === undefined) return null;

  const displayValue = String(value);

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span
          className={cn(
            'text-xs',
            mono && 'font-mono text-muted-foreground'
          )}
        >
          {displayValue}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 shrink-0 p-0"
        onClick={() => copyToClipboard(displayValue)}
        data-testid={`debug-copy-${fieldKey}`}
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface RunDebugInfoProps {
  run: InventoryAnalysisRun;
}

export function RunDebugInfo({ run }: RunDebugInfoProps) {
  const [open, setOpen] = useState(false);
  const requestId = getLastRequestId();

  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid="debug-info">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs text-muted-foreground"
          data-testid="debug-info-toggle"
        >
          Debug Info
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              open && 'rotate-180'
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0 px-2 pt-2">
        <DebugField label="Run ID" value={run.run_id} fieldKey="run-id" mono />
        <DebugField label="Session ID" value={run.session_id} fieldKey="session-id" mono />
        <DebugField label="Container ID" value={run.container_id} fieldKey="container-id" mono />
        <DebugField label="Provider" value={run.metadata.provider} fieldKey="provider" />
        <DebugField
          label="Processing Time"
          value={run.metadata.processing_time_ms != null ? `${run.metadata.processing_time_ms}ms` : null}
          fieldKey="processing-time"
        />
        <DebugField label="Model Version" value={run.metadata.model_version} fieldKey="model-version" />
        <DebugField label="Request ID" value={requestId} fieldKey="request-id" mono />
      </CollapsibleContent>
    </Collapsible>
  );
}
