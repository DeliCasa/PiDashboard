/**
 * ConfigEditor Component
 * Inline editor for configuration values with type-specific inputs
 */

import { useState } from 'react';
import { Check, X, RotateCcw, Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ConfigEntry } from '@/domain/types/entities';

interface ConfigEditorProps {
  entry: ConfigEntry;
  onSave: (key: string, value: string) => Promise<void>;
  onReset: (key: string) => Promise<void>;
  isSaving?: boolean;
  className?: string;
}

// Common select options for known config keys
const SELECT_OPTIONS: Record<string, string[]> = {
  log_level: ['debug', 'info', 'warn', 'error'],
  camera_resolution: ['QQVGA', 'QVGA', 'VGA', 'SVGA', 'XGA', 'SXGA', 'UXGA'],
};

export function ConfigEditor({
  entry,
  onSave,
  onReset,
  isSaving,
  className,
}: ConfigEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.value);
  const [showSensitive, setShowSensitive] = useState(false);

  const hasChanged = editValue !== entry.value;
  const canReset = entry.default_value && entry.value !== entry.default_value;

  const handleSave = async () => {
    if (!hasChanged) {
      setIsEditing(false);
      return;
    }
    await onSave(entry.key, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(entry.value);
    setIsEditing(false);
  };

  const handleReset = async () => {
    await onReset(entry.key);
    setEditValue(entry.default_value || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Render value display for non-editing state
  const renderValue = () => {
    if (entry.sensitive && !showSensitive) {
      return (
        <span className="font-mono text-sm text-muted-foreground">
          {'•'.repeat(Math.min(entry.value.length, 12))}
        </span>
      );
    }

    if (entry.type === 'boolean') {
      return (
        <Badge variant={entry.value === 'true' ? 'default' : 'secondary'}>
          {entry.value === 'true' ? 'Enabled' : 'Disabled'}
        </Badge>
      );
    }

    return (
      <span className="font-mono text-sm">{entry.value || '(empty)'}</span>
    );
  };

  // Render input for editing state
  const renderInput = () => {
    if (entry.type === 'boolean') {
      return (
        <Switch
          checked={editValue === 'true'}
          onCheckedChange={(checked) => setEditValue(checked ? 'true' : 'false')}
          disabled={isSaving}
        />
      );
    }

    if (entry.type === 'select') {
      const options = SELECT_OPTIONS[entry.key] || [];
      return (
        <Select
          value={editValue}
          onValueChange={setEditValue}
          disabled={isSaving}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (entry.type === 'number') {
      return (
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-32 font-mono"
          disabled={isSaving}
          autoFocus
        />
      );
    }

    // String type
    return (
      <Input
        type={entry.sensitive && !showSensitive ? 'password' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-64 font-mono"
        disabled={isSaving}
        autoFocus
      />
    );
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3 transition-colors',
        isEditing && 'border-primary bg-muted/50',
        className
      )}
    >
      {/* Left: Key and Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{entry.key}</span>
          <Badge variant="outline" className="text-xs capitalize">
            {entry.category}
          </Badge>
          {!entry.editable && (
            <Tooltip>
              <TooltipTrigger>
                <Lock className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Read-only configuration</TooltipContent>
            </Tooltip>
          )}
        </div>
        {entry.description && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {entry.description}
          </p>
        )}
      </div>

      {/* Right: Value and Actions */}
      <div className="flex items-center gap-2 ml-4">
        {isEditing ? (
          <>
            {renderInput()}
            {entry.sensitive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowSensitive(!showSensitive)}
              >
                {showSensitive ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
              onClick={handleSave}
              disabled={isSaving || !hasChanged}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            {renderValue()}
            {entry.sensitive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowSensitive(!showSensitive)}
              >
                {showSensitive ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}
            {entry.editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
            {canReset && entry.editable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleReset}
                    disabled={isSaving}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to default</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
}
