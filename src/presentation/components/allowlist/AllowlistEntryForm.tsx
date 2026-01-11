/**
 * AllowlistEntryForm Component
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T031
 *
 * Form for adding new device MAC addresses to the allowlist.
 */

import { useState, useCallback } from 'react';
import { Loader2, Plus, Network, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/**
 * MAC address validation regex.
 * Accepts formats: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABBCCDDEEFF
 */
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/;

/**
 * Normalize MAC address to uppercase with colons.
 */
function normalizeMac(mac: string): string {
  // Remove all separators and convert to uppercase
  const clean = mac.replace(/[:-]/g, '').toUpperCase();
  // Insert colons every 2 characters
  return clean.match(/.{2}/g)?.join(':') ?? clean;
}

/**
 * Validate MAC address format.
 */
function isValidMac(mac: string): boolean {
  return MAC_REGEX.test(mac);
}

// ============================================================================
// Types
// ============================================================================

interface AllowlistEntryFormProps {
  /** Callback when form is submitted */
  onSubmit: (mac: string, description?: string, containerId?: string) => Promise<void>;
  /** Whether submission is in progress */
  isLoading?: boolean;
  /** Whether form is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Form for adding a device to the allowlist.
 *
 * Validates MAC address format and normalizes to uppercase with colons.
 * Optionally accepts description and container ID.
 */
export function AllowlistEntryForm({
  onSubmit,
  isLoading = false,
  disabled = false,
  className,
}: AllowlistEntryFormProps) {
  const [mac, setMac] = useState('');
  const [description, setDescription] = useState('');
  const [containerId, setContainerId] = useState('');
  const [macError, setMacError] = useState<string | null>(null);

  // Validate MAC on change
  const handleMacChange = useCallback((value: string) => {
    setMac(value);
    if (value && !isValidMac(value)) {
      setMacError('Invalid MAC address format (e.g., AA:BB:CC:DD:EE:FF)');
    } else {
      setMacError(null);
    }
  }, []);

  const isValid = mac.trim().length > 0 && isValidMac(mac) && !macError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading || disabled) return;

    const normalizedMac = normalizeMac(mac);
    await onSubmit(
      normalizedMac,
      description.trim() || undefined,
      containerId.trim() || undefined
    );

    // Clear form on success
    setMac('');
    setDescription('');
    setContainerId('');
    setMacError(null);
  };

  return (
    <Card className={cn('w-full', className)} data-testid="allowlist-entry-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5" />
          Add Device to Allowlist
        </CardTitle>
        <CardDescription>
          Pre-approve devices by MAC address for batch provisioning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* MAC Address Field */}
          <div className="space-y-2">
            <Label htmlFor="mac-address">
              MAC Address <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Network className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="mac-address"
                type="text"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={mac}
                onChange={(e) => handleMacChange(e.target.value.toUpperCase())}
                disabled={disabled || isLoading}
                className={cn('pl-10', macError && 'border-destructive')}
                data-testid="mac-input"
                aria-describedby="mac-help"
                aria-invalid={!!macError}
              />
            </div>
            {macError ? (
              <p id="mac-help" className="text-xs text-destructive" role="alert">
                {macError}
              </p>
            ) : (
              <p id="mac-help" className="text-xs text-muted-foreground">
                Device hardware address (required)
              </p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="device-description">
              Description
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="device-description"
                type="text"
                placeholder="e.g., Kitchen Camera #1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={disabled || isLoading}
                className="pl-10"
                data-testid="description-input"
                aria-describedby="description-help"
              />
            </div>
            <p id="description-help" className="text-xs text-muted-foreground">
              Optional label to identify this device
            </p>
          </div>

          {/* Container ID Field */}
          <div className="space-y-2">
            <Label htmlFor="container-id">
              Container ID
            </Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="container-id"
                type="text"
                placeholder="e.g., container-001"
                value={containerId}
                onChange={(e) => setContainerId(e.target.value)}
                disabled={disabled || isLoading}
                className="pl-10"
                data-testid="container-id-input"
                aria-describedby="container-help"
              />
            </div>
            <p id="container-help" className="text-xs text-muted-foreground">
              Optional pre-assigned container for this device
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isLoading || disabled}
            data-testid="add-entry-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add to Allowlist
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { isValidMac, normalizeMac };
