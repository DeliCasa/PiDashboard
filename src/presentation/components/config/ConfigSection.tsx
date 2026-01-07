/**
 * ConfigSection Component
 * Complete configuration management section with category filtering
 */

import { useState, useMemo } from 'react';
import { Settings, Filter, RefreshCw, Search, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useConfig, useUpdateConfig, useResetConfig } from '@/application/hooks/useConfig';
import { ConfigEditor } from './ConfigEditor';
import { toast } from 'sonner';
import type { ConfigCategory } from '@/domain/types/entities';

interface ConfigSectionProps {
  className?: string;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'system', label: 'System' },
  { value: 'mqtt', label: 'MQTT' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'monitoring', label: 'Monitoring' },
];

export function ConfigSection({ className }: ConfigSectionProps) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Hooks
  const { data: config = [], isLoading, error, refetch } = useConfig();
  const updateMutation = useUpdateConfig();
  const resetMutation = useResetConfig();

  // Filter config entries
  const filteredConfig = useMemo(() => {
    return config.filter((entry) => {
      const matchesCategory = category === 'all' || entry.category === category;
      const matchesSearch =
        !search ||
        entry.key.toLowerCase().includes(search.toLowerCase()) ||
        entry.description?.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [config, category, search]);

  // Group by category for display
  const groupedConfig = useMemo(() => {
    const groups: Record<ConfigCategory, typeof filteredConfig> = {
      system: [],
      mqtt: [],
      wifi: [],
      hardware: [],
      monitoring: [],
    };

    for (const entry of filteredConfig) {
      groups[entry.category].push(entry);
    }

    return groups;
  }, [filteredConfig]);

  const handleSave = async (key: string, value: string) => {
    try {
      await updateMutation.mutateAsync({ key, value });
      toast.success('Configuration updated', {
        description: `${key} has been updated`,
      });
    } catch (error) {
      toast.error('Failed to update configuration', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error; // Re-throw for editor to handle
    }
  };

  const handleReset = async (key: string) => {
    try {
      await resetMutation.mutateAsync(key);
      toast.success('Configuration reset', {
        description: `${key} has been reset to default`,
      });
    } catch (error) {
      toast.error('Failed to reset configuration', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuration
          </CardTitle>
          <CardDescription>System and hardware settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load configuration: {error.message}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuration
          </CardTitle>
          <CardDescription>
            Manage system, hardware, and connectivity settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Config Entries */}
          {filteredConfig.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No configuration entries found</p>
              {search && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setSearch('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : category === 'all' ? (
            // Grouped display when showing all
            <div className="space-y-6">
              {(Object.keys(groupedConfig) as ConfigCategory[]).map(
                (cat) =>
                  groupedConfig[cat].length > 0 && (
                    <div key={cat}>
                      <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                        {cat}
                      </h3>
                      <div className="space-y-2">
                        {groupedConfig[cat].map((entry) => (
                          <ConfigEditor
                            key={entry.key}
                            entry={entry}
                            onSave={handleSave}
                            onReset={handleReset}
                            isSaving={
                              updateMutation.isPending || resetMutation.isPending
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          ) : (
            // Flat display for single category
            <div className="space-y-2">
              {filteredConfig.map((entry) => (
                <ConfigEditor
                  key={entry.key}
                  entry={entry}
                  onSave={handleSave}
                  onReset={handleReset}
                  isSaving={
                    updateMutation.isPending || resetMutation.isPending
                  }
                />
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filteredConfig.length} of {config.length} settings
            </span>
            <span>
              {config.filter((c) => c.editable).length} editable
            </span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
