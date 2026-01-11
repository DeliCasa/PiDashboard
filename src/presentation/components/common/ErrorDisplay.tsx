/**
 * ErrorDisplay Component
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T046
 *
 * Displays structured error information from V1 API errors with:
 * - User-friendly error messages
 * - Retry countdown for retryable errors
 * - Correlation ID display for debugging
 * - Category-based styling (auth, session, device, network, etc.)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  WifiOff,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  Copy,
  Check,
  XCircle,
  Clock,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  V1ApiError,
  getErrorCategory,
  type ErrorCategory,
} from '@/infrastructure/api/errors';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ErrorDisplayProps {
  /** The error to display (V1ApiError, Error, or string) */
  error: V1ApiError | Error | string | null | undefined;
  /** Optional title override */
  title?: string;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Whether to show the dismiss button */
  dismissible?: boolean;
  /** Whether to show the correlation ID (for debugging) */
  showCorrelationId?: boolean;
  /** Custom className */
  className?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the icon component for an error category.
 */
function getCategoryIcon(category: ErrorCategory) {
  switch (category) {
    case 'auth':
      return Lock;
    case 'session':
      return Clock;
    case 'device':
      return ShieldAlert;
    case 'network':
      return WifiOff;
    case 'validation':
      return AlertTriangle;
    case 'infrastructure':
      return Server;
    default:
      return AlertCircle;
  }
}

/**
 * Get the default title for an error category.
 */
function getCategoryTitle(category: ErrorCategory): string {
  switch (category) {
    case 'auth':
      return 'Authentication Required';
    case 'session':
      return 'Session Error';
    case 'device':
      return 'Device Error';
    case 'network':
      return 'Connection Error';
    case 'validation':
      return 'Validation Error';
    case 'infrastructure':
      return 'Service Error';
    default:
      return 'Error';
  }
}

/**
 * Get the variant for the Alert component based on error category.
 */
function getCategoryVariant(category: ErrorCategory): 'default' | 'destructive' {
  switch (category) {
    case 'auth':
    case 'network':
    case 'infrastructure':
      return 'destructive';
    default:
      return 'default';
  }
}

/**
 * Extract error information from various error types.
 */
function extractErrorInfo(error: V1ApiError | Error | string | null | undefined): {
  category: ErrorCategory;
  code: string | undefined;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryAfterSeconds: number | undefined;
  correlationId: string | undefined;
} {
  if (!error) {
    return {
      category: 'unknown',
      code: undefined,
      message: 'An unknown error occurred',
      userMessage: 'An unknown error occurred. Please try again.',
      retryable: false,
      retryAfterSeconds: undefined,
      correlationId: undefined,
    };
  }

  if (V1ApiError.isV1ApiError(error)) {
    return {
      category: getErrorCategory(error.code),
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      retryAfterSeconds: error.retryAfterSeconds,
      correlationId: error.correlationId,
    };
  }

  if (error instanceof Error) {
    // Check for common network error messages
    const msg = error.message.toLowerCase();
    let category: ErrorCategory = 'unknown';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      category = 'network';
    } else if (msg.includes('unauthorized') || msg.includes('api key')) {
      category = 'auth';
    }

    return {
      category,
      code: undefined,
      message: error.message,
      userMessage: error.message,
      retryable: category === 'network',
      retryAfterSeconds: undefined,
      correlationId: undefined,
    };
  }

  // String error
  return {
    category: 'unknown',
    code: undefined,
    message: error,
    userMessage: error,
    retryable: false,
    retryAfterSeconds: undefined,
    correlationId: undefined,
  };
}

// ============================================================================
// Countdown Hook
// ============================================================================

/**
 * Hook for managing retry countdown.
 */
function useRetryCountdown(
  retryAfterSeconds: number | undefined,
  onComplete: (() => void) | undefined
): {
  countdown: number;
  isCountingDown: boolean;
  cancel: () => void;
} {
  const [countdown, setCountdown] = useState(retryAfterSeconds ?? 0);
  const [isCountingDown, setIsCountingDown] = useState(
    !!retryAfterSeconds && retryAfterSeconds > 0
  );

  useEffect(() => {
    if (!retryAfterSeconds || retryAfterSeconds <= 0) {
      setIsCountingDown(false);
      return;
    }

    setCountdown(retryAfterSeconds);
    setIsCountingDown(true);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCountingDown(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfterSeconds, onComplete]);

  const cancel = useCallback(() => {
    setIsCountingDown(false);
    setCountdown(0);
  }, []);

  return { countdown, isCountingDown, cancel };
}

// ============================================================================
// Component
// ============================================================================

export function ErrorDisplay({
  error,
  title,
  onRetry,
  onDismiss,
  dismissible = false,
  showCorrelationId = true,
  className,
  compact = false,
}: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);

  const errorInfo = extractErrorInfo(error);
  const Icon = getCategoryIcon(errorInfo.category);
  const defaultTitle = getCategoryTitle(errorInfo.category);
  const variant = getCategoryVariant(errorInfo.category);

  const { countdown, isCountingDown } = useRetryCountdown(
    errorInfo.retryAfterSeconds,
    onRetry
  );

  const handleCopyCorrelationId = useCallback(async () => {
    if (!errorInfo.correlationId) return;

    try {
      await navigator.clipboard.writeText(errorInfo.correlationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [errorInfo.correlationId]);

  if (!error) {
    return null;
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm',
          variant === 'destructive' && 'text-destructive',
          className
        )}
        role="alert"
        data-testid="error-display"
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{errorInfo.userMessage}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isCountingDown}
            className="ml-auto h-7 px-2"
            data-testid="error-retry-button"
          >
            {isCountingDown ? (
              `${countdown}s`
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert
      variant={variant}
      className={cn('relative', className)}
      data-testid="error-display"
    >
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{title || defaultTitle}</span>
        {dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2"
            onClick={onDismiss}
            data-testid="error-dismiss-button"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        {/* User-friendly message */}
        <p data-testid="error-message">{errorInfo.userMessage}</p>

        {/* Error code badge */}
        {errorInfo.code && (
          <p className="text-xs opacity-70" data-testid="error-code">
            Error code: <code className="font-mono">{errorInfo.code}</code>
          </p>
        )}

        {/* Correlation ID for debugging */}
        {showCorrelationId && errorInfo.correlationId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopyCorrelationId}
                  className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  data-testid="correlation-id"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span className="font-mono">{errorInfo.correlationId}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? 'Copied!' : 'Click to copy correlation ID'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Retry section */}
        {errorInfo.retryable && onRetry && (
          <div className="flex items-center gap-2 pt-2" data-testid="error-retry-section">
            {isCountingDown ? (
              <>
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  Retrying in <strong>{countdown}</strong> seconds...
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="ml-auto"
                  data-testid="error-retry-now-button"
                >
                  Retry Now
                </Button>
              </>
            ) : (
              <Button
                variant={variant === 'destructive' ? 'secondary' : 'outline'}
                size="sm"
                onClick={onRetry}
                className="ml-auto"
                data-testid="error-retry-button"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Specialized Error Displays
// ============================================================================

/**
 * Specialized error display for authentication errors.
 */
export function AuthErrorDisplay({
  error,
  onConfigureApiKey,
  className,
}: {
  error: V1ApiError | Error | string | null | undefined;
  onConfigureApiKey?: () => void;
  className?: string;
}) {
  return (
    <ErrorDisplay
      error={error}
      title="Authentication Required"
      onRetry={onConfigureApiKey}
      className={className}
    />
  );
}

/**
 * Specialized error display for network errors.
 */
export function NetworkErrorDisplay({
  error,
  onRetry,
  className,
}: {
  error: V1ApiError | Error | string | null | undefined;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <ErrorDisplay
      error={error}
      title="Connection Error"
      onRetry={onRetry}
      className={className}
    />
  );
}

/**
 * Inline error message for form validation.
 */
export function InlineError({
  message,
  className,
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;

  return (
    <p
      className={cn('text-sm text-destructive', className)}
      role="alert"
      data-testid="inline-error"
    >
      {message}
    </p>
  );
}
