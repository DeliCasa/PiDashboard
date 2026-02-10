/**
 * InventorySessionLookup Component
 * Feature: 048-inventory-review (T021)
 *
 * Input field with search button for looking up a run by session ID.
 * Trims input, validates non-empty, shows loading/error states.
 */

import { useState, type FormEvent } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSessionLookup } from '@/application/hooks/useInventoryDelta';
import type { InventoryAnalysisRun } from '@/domain/types/inventory';

interface InventorySessionLookupProps {
  onRunFound: (run: InventoryAnalysisRun) => void;
}

export function InventorySessionLookup({ onRunFound }: InventorySessionLookupProps) {
  const [inputValue, setInputValue] = useState('');
  const { lookup, isLoading, isError, error, reset } = useSessionLookup();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await lookup(inputValue);
    if (result) {
      onRunFound(result);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (isError) {
      reset();
    }
  };

  return (
    <div data-testid="session-lookup">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          data-testid="session-lookup-input"
          placeholder="Enter session ID..."
          aria-label="Session ID lookup"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          disabled={isLoading}
          className="font-mono text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          data-testid="session-lookup-submit"
          aria-label="Search session"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>
      {isError && error && (
        <p
          className="mt-1.5 text-xs text-destructive"
          data-testid="session-lookup-error"
        >
          {error.message}
        </p>
      )}
    </div>
  );
}
