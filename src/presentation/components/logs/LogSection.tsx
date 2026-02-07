/**
 * LogSection Component
 * Complete log viewing section with streaming and filters
 */

import { useState } from 'react';
import { FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useLogStream, useExportDiagnostics } from '@/application/hooks/useLogs';
import { LogFilter } from './LogFilter';
import { LogStream } from './LogStream';
import { toast } from 'sonner';

interface LogSectionProps {
  className?: string;
}

export function LogSection({ className }: LogSectionProps) {
  const [level, setLevel] = useState('all');
  const [search, setSearch] = useState('');

  // Hooks
  const {
    logs,
    connected,
    clearLogs,
  } = useLogStream(level === 'all' ? undefined : level);
  const exportMutation = useExportDiagnostics();

  // Filter logs by level if not already filtered by SSE
  const filteredLogs = level === 'all'
    ? logs
    : logs.filter((log) => log.level === level);

  const handleExport = async () => {
    try {
      const report = await exportMutation.mutateAsync();
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `delicasa-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Diagnostics exported');
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          System Logs
        </CardTitle>
        <CardDescription>
          Real-time log streaming and diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <LogFilter
          level={level}
          onLevelChange={setLevel}
          search={search}
          onSearchChange={setSearch}
          connected={connected}
          onClear={clearLogs}
          onExport={handleExport}
          isExporting={exportMutation.isPending}
        />

        {/* Log Stream */}
        <LogStream
          logs={filteredLogs}
          searchFilter={search}
        />

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filteredLogs.length} logs
            {search && ` (filtered from ${logs.length})`}
          </span>
          <span>
            Max buffer: 500 entries
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
