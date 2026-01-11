/**
 * ConnectionStatus Component
 * Feature: 006-piorchestrator-v1-api-sync
 *
 * Displays SSE/WebSocket connection state with visual indicators.
 */

import { Wifi, WifiOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SSEConnectionState } from '@/domain/types/sse';

// ============================================================================
// Types
// ============================================================================

interface ConnectionStatusProps {
  /** Current connection state */
  state: SSEConnectionState;
  /** Error message if in error state */
  error?: string | null;
  /** Optional reconnect handler */
  onReconnect?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show compact version */
  compact?: boolean;
}

// ============================================================================
// State Configuration
// ============================================================================

const stateConfig = {
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    animate: false,
  },
  connecting: {
    icon: Loader2,
    label: 'Connecting...',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    animate: true,
  },
  connected: {
    icon: Wifi,
    label: 'Connected',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    animate: false,
  },
  reconnecting: {
    icon: RefreshCw,
    label: 'Reconnecting...',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    animate: true,
  },
  error: {
    icon: AlertCircle,
    label: 'Connection Error',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    animate: false,
  },
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * Visual indicator for SSE/WebSocket connection status.
 *
 * Shows current state with appropriate icon, color, and optional reconnect button.
 */
export function ConnectionStatus({
  state,
  error,
  onReconnect,
  className,
  compact = false,
}: ConnectionStatusProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5',
          config.color,
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={`Connection status: ${config.label}`}
        data-testid="connection-status"
        data-state={state}
      >
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            config.animate && 'animate-spin'
          )}
          aria-hidden="true"
        />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg px-4 py-2',
        config.bgColor,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${config.label}${error && state === 'error' ? `. Error: ${error}` : ''}`}
      data-testid="connection-status"
      data-state={state}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            'h-4 w-4',
            config.color,
            config.animate && 'animate-spin'
          )}
          aria-hidden="true"
        />
        <div>
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
          {error && state === 'error' && (
            <p className="text-xs text-muted-foreground">{error}</p>
          )}
        </div>
      </div>

      {state === 'error' && onReconnect && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReconnect}
          className="h-7"
          data-testid="reconnect-button"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Reconnect
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Inline Status
// ============================================================================

/**
 * Minimal inline connection status indicator (just icon + dot).
 */
export function ConnectionDot({ state }: { state: SSEConnectionState }) {
  const config = stateConfig[state];

  return (
    <span
      className={cn(
        'inline-flex h-2 w-2 rounded-full',
        state === 'connected' && 'bg-green-500',
        state === 'connecting' && 'bg-blue-500 animate-pulse',
        state === 'reconnecting' && 'bg-yellow-500 animate-pulse',
        state === 'error' && 'bg-red-500',
        state === 'disconnected' && 'bg-muted-foreground'
      )}
      role="status"
      aria-label={config.label}
      title={config.label}
      data-testid="connection-dot"
      data-state={state}
    />
  );
}
