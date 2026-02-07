/**
 * LogStream Component
 * Real-time log display with virtual scrolling
 */

import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Copy, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LogEntry, LogLevel } from '@/domain/types/entities';
import { toast } from 'sonner';

interface LogStreamProps {
  logs: LogEntry[];
  searchFilter?: string;
  autoScroll?: boolean;
  onAutoScrollChange?: (autoScroll: boolean) => void;
  className?: string;
}

const levelColors: Record<LogLevel, string> = {
  debug: 'text-blue-500',
  info: 'text-green-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
};

const levelBgColors: Record<LogLevel, string> = {
  debug: 'bg-blue-500/10',
  info: 'bg-green-500/10',
  warn: 'bg-yellow-500/10',
  error: 'bg-red-500/10',
};

function LogEntryRow({
  entry,
  isHighlighted,
  onCopy,
}: {
  entry: LogEntry;
  isHighlighted?: boolean;
  onCopy: () => void;
}) {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <div
      className={cn(
        'group flex items-start gap-2 px-3 py-1 font-mono text-sm transition-colors hover:bg-muted',
        isHighlighted && levelBgColors[entry.level]
      )}
    >
      {/* Timestamp */}
      <span className="flex-shrink-0 text-xs text-muted-foreground">
        {timestamp}
      </span>

      {/* Level Badge */}
      <span
        className={cn(
          'flex-shrink-0 w-14 text-xs font-semibold uppercase',
          levelColors[entry.level]
        )}
      >
        [{entry.level}]
      </span>

      {/* Component */}
      <span className="flex-shrink-0 w-24 truncate text-xs text-muted-foreground">
        {entry.component}
      </span>

      {/* Message */}
      <span className="flex-1 break-all text-foreground">
        {entry.message}
      </span>

      {/* Copy Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={onCopy}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function LogStream({
  logs,
  searchFilter,
  autoScroll = true,
  onAutoScrollChange,
  className,
}: LogStreamProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [internalAutoScroll, setInternalAutoScroll] = useState(autoScroll);

  // Filter logs by search
  const filteredLogs = searchFilter
    ? logs.filter(
        (log) =>
          log.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
          log.component.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : logs;

  // Virtual list
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // Estimated row height
    overscan: 10,
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (internalAutoScroll && filteredLogs.length > 0) {
      virtualizer.scrollToIndex(filteredLogs.length - 1);
    }
  }, [filteredLogs.length, internalAutoScroll, virtualizer]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (isAtBottom !== internalAutoScroll) {
      setInternalAutoScroll(isAtBottom);
      onAutoScrollChange?.(isAtBottom);
    }
  };

  const copyEntry = (entry: LogEntry) => {
    const text = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const scrollToBottom = () => {
    virtualizer.scrollToIndex(filteredLogs.length - 1);
    setInternalAutoScroll(true);
    onAutoScrollChange?.(true);
  };

  if (filteredLogs.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center py-12 text-muted-foreground',
        className
      )}>
        <p className="text-sm">
          {searchFilter ? 'No matching logs found' : 'Waiting for logs...'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="h-[400px] overflow-auto rounded-lg border bg-muted/30"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const entry = filteredLogs[virtualItem.index];
            const isHighlighted = searchFilter
              ? entry.message.toLowerCase().includes(searchFilter.toLowerCase())
              : entry.level === 'error' || entry.level === 'warn';

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <LogEntryRow
                  entry={entry}
                  isHighlighted={isHighlighted}
                  onCopy={() => copyEntry(entry)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {!internalAutoScroll && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-4 right-4"
          onClick={scrollToBottom}
        >
          <ChevronDown className="mr-1 h-4 w-4" />
          Latest
        </Button>
      )}
    </div>
  );
}
