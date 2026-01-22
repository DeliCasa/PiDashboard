/**
 * DiagnosticsView Component
 * Raw camera diagnostics JSON display with search and copy
 *
 * Feature: 034-esp-camera-integration (T053-T059)
 * - Warning banner for debugging use only
 * - JSON display with syntax highlighting
 * - Search/filter with regex matching
 * - Copy JSON button with clipboard API
 */

import { useState, useMemo, useCallback } from 'react';
import { AlertTriangle, Search, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCameraDiagnostics } from '@/application/hooks/useCameras';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DiagnosticsViewProps {
  className?: string;
}

export function DiagnosticsView({ className }: DiagnosticsViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: diagnostics, isLoading, isError, refetch } = useCameraDiagnostics(isOpen);

  // Format JSON with indentation
  const formattedJson = useMemo(() => {
    if (!diagnostics) return '';
    return JSON.stringify(diagnostics, null, 2);
  }, [diagnostics]);

  // Filter JSON based on search query (T056)
  const filteredJson = useMemo(() => {
    if (!searchQuery.trim() || !formattedJson) return formattedJson;

    try {
      const regex = new RegExp(searchQuery, 'gi');
      const lines = formattedJson.split('\n');
      const matchingLines: string[] = [];

      // Include context lines around matches
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          // Include 1 line before and after for context
          const start = Math.max(0, index - 1);
          const end = Math.min(lines.length - 1, index + 1);
          for (let i = start; i <= end; i++) {
            if (!matchingLines.includes(lines[i])) {
              matchingLines.push(lines[i]);
            }
          }
        }
      });

      return matchingLines.length > 0 ? matchingLines.join('\n') : 'No matches found';
    } catch {
      // Invalid regex, fall back to simple string search
      const lines = formattedJson.split('\n');
      const matchingLines = lines.filter((line) =>
        line.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchingLines.length > 0 ? matchingLines.join('\n') : 'No matches found';
    }
  }, [formattedJson, searchQuery]);

  // Copy to clipboard (T057, T058)
  const handleCopy = useCallback(async () => {
    if (!formattedJson) return;

    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      toast.success('Diagnostics copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [formattedJson]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('rounded-lg border', className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
          data-testid="diagnostics-trigger"
        >
          <span className="font-medium">Camera Diagnostics</span>
          <span className="text-xs text-muted-foreground">
            {isOpen ? 'Click to collapse' : 'Click to expand'}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 p-4 pt-0">
          {/* Warning banner (T054) */}
          <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10" data-testid="diagnostics-warning">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              <strong>For debugging purposes only.</strong> This data is intended for technical
              troubleshooting and may contain sensitive device information.
            </AlertDescription>
          </Alert>

          {/* Controls */}
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Search input (T056) */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search diagnostics (regex supported)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="diagnostics-search"
              />
            </div>
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                data-testid="diagnostics-refresh"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              {/* Copy button (T057) */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!formattedJson || isLoading}
                data-testid="diagnostics-copy"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* JSON display (T055) */}
          <div className="relative" data-testid="diagnostics-json-container">
            {isLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="diagnostics-loading">
                <RefreshCw className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading diagnostics...</span>
              </div>
            ) : isError ? (
              <div className="py-8 text-center" data-testid="diagnostics-error">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive opacity-70" />
                <p className="mt-2 text-sm text-destructive">Failed to load diagnostics</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <pre
                className="max-h-[400px] overflow-auto rounded-lg bg-muted/50 p-4 text-xs font-mono"
                data-testid="diagnostics-json"
              >
                <code>
                  {searchQuery ? filteredJson : formattedJson || 'No diagnostics data available'}
                </code>
              </pre>
            )}
          </div>

          {/* Match indicator */}
          {searchQuery && formattedJson && (
            <p className="text-xs text-muted-foreground" data-testid="diagnostics-match-count">
              {filteredJson === 'No matches found'
                ? 'No matches found'
                : `Showing filtered results for "${searchQuery}"`}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
