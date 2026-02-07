/**
 * LogFilter Component
 * Log filtering controls
 *
 * Feature: 005-testing-research-and-hardening (T038)
 * Added data-testid attributes for reliable test selectors.
 */

import { Search, Filter, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LogFilterProps {
  level: string;
  onLevelChange: (level: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  connected: boolean;
  onClear: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  className?: string;
}

const LEVELS: { value: string; label: string; color: string }[] = [
  { value: 'all', label: 'All Levels', color: 'bg-gray-500' },
  { value: 'debug', label: 'Debug', color: 'bg-blue-500' },
  { value: 'info', label: 'Info', color: 'bg-green-500' },
  { value: 'warn', label: 'Warning', color: 'bg-yellow-500' },
  { value: 'error', label: 'Error', color: 'bg-red-500' },
];

export function LogFilter({
  level,
  onLevelChange,
  search,
  onSearchChange,
  connected,
  onClear,
  onExport,
  isExporting,
  className,
}: LogFilterProps) {
  return (
    <div data-testid="log-filter" className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Connection Status */}
      <Badge data-testid="log-connection-status" variant={connected ? 'default' : 'secondary'} className="gap-1">
        <Circle className={cn(
          'h-2 w-2',
          connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'
        )} />
        {connected ? 'Connected' : 'Disconnected'}
      </Badge>

      {/* Level Filter */}
      <Select value={level} onValueChange={onLevelChange}>
        <SelectTrigger data-testid="log-level-select" className="w-32">
          <Filter className="mr-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEVELS.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              <div className="flex items-center gap-2">
                <Circle className={cn('h-2 w-2', l.color, 'fill-current')} />
                {l.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="log-search-input"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Actions */}
      <Button data-testid="log-clear-button" variant="outline" size="sm" onClick={onClear}>
        Clear
      </Button>
      {onExport && (
        <Button
          data-testid="log-export-button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      )}
    </div>
  );
}
