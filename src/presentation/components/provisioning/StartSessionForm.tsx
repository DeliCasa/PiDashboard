/**
 * StartSessionForm Component
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Form for starting a new batch provisioning session.
 */

import { useState } from 'react';
import { Loader2, Wifi, Key, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface StartSessionFormProps {
  /** Callback when form is submitted */
  onSubmit: (ssid: string, password: string) => Promise<void>;
  /** Whether submission is in progress */
  isLoading?: boolean;
  /** Whether there's an active session (disable form) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Form for configuring and starting a batch provisioning session.
 *
 * Collects:
 * - Target WiFi SSID (where devices should connect after provisioning)
 * - Target WiFi password
 */
export function StartSessionForm({
  onSubmit,
  isLoading = false,
  disabled = false,
  className,
}: StartSessionFormProps) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isValid = ssid.trim().length > 0 && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading || disabled) return;
    await onSubmit(ssid.trim(), password);
  };

  return (
    <Card className={cn('w-full', className)} data-testid="start-session-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wifi className="h-5 w-5" />
          Start Provisioning Session
        </CardTitle>
        <CardDescription>
          Configure the target WiFi network for devices to connect after provisioning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SSID Field */}
          <div className="space-y-2">
            <Label htmlFor="target-ssid">
              Target Network SSID
            </Label>
            <div className="relative">
              <Wifi className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="target-ssid"
                type="text"
                placeholder="Enter WiFi network name"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                disabled={disabled || isLoading}
                className="pl-10"
                data-testid="ssid-input"
                aria-describedby="ssid-help"
              />
            </div>
            <p id="ssid-help" className="text-xs text-muted-foreground">
              The WiFi network devices should connect to after provisioning
            </p>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="target-password">
              Network Password
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="target-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter WiFi password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disabled || isLoading}
                className="pl-10 pr-20"
                data-testid="password-input"
                aria-describedby="password-help"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                disabled={disabled || isLoading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p id="password-help" className="text-xs text-muted-foreground">
              Password must be at least 8 characters
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isLoading || disabled}
            data-testid="start-session-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Session...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Session
              </>
            )}
          </Button>

          {disabled && (
            <p className="text-center text-sm text-muted-foreground">
              A session is currently active. Stop it to start a new one.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
