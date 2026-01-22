/**
 * ErrorDisplay Component
 * Feature: 006-piorchestrator-v1-api-sync
 * Task: T046
 * Enhanced: 030-dashboard-recovery (endpoint display, HTMLFallbackError, copy debug info)
 *
 * Displays structured error information from V1 API errors with:
 * - User-friendly error messages
 * - Retry countdown for retryable errors
 * - Correlation ID display for debugging
 * - Category-based styling (auth, session, device, network, etc.)
 * - Endpoint path display (030-dashboard-recovery)
 * - Copy debug info button (030-dashboard-recovery)
 * - HTMLFallbackError specific messaging (030-dashboard-recovery)
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
  FileCode,
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
  HTMLFallbackError,
  getErrorCategory,
  createDebugInfo,
  formatDebugInfoForClipboard,
  type ErrorCategory,
} from '@/infrastructure/api/errors';
import { ApiError } from '@/infrastructure/api/client';
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
 * Render the icon for an error category.
 */
function CategoryIcon({ category, className }: { category: ErrorCategory; className?: string }) {
  const iconProps = { className };
  switch (category) {
    case 'auth':
      return <Lock {...iconProps} />;
    case 'session':
      return <Clock {...iconProps} />;
    case 'device':
      return <ShieldAlert {...iconProps} />;
    case 'network':
      return <WifiOff {...iconProps} />;
    case 'validation':
      return <AlertTriangle {...iconProps} />;
    case 'infrastructure':
      return <Server {...iconProps} />;
    default:
      return <AlertCircle {...iconProps} />;
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
 * Enhanced: 030-dashboard-recovery - handles HTMLFallbackError, ApiError with endpoint/requestId
 */
function extractErrorInfo(error: V1ApiError | Error | string | null | undefined): {
  category: ErrorCategory;
  code: string | undefined;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryAfterSeconds: number | undefined;
  correlationId: string | undefined;
  endpoint: string | undefined;
  status: number | undefined;
  timestamp: Date | undefined;
  isHtmlFallback: boolean;
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
      endpoint: undefined,
      status: undefined,
      timestamp: undefined,
      isHtmlFallback: false,
    };
  }

  // 030-dashboard-recovery: Handle HTMLFallbackError specifically
  if (HTMLFallbackError.isHTMLFallbackError(error)) {
    return {
      category: 'infrastructure',
      code: 'HTML_FALLBACK',
      message: error.message,
      userMessage: error.userMessage,
      retryable: false, // HTML fallback is not retryable - endpoint doesn't exist
      retryAfterSeconds: undefined,
      correlationId: undefined,
      endpoint: error.endpoint,
      status: undefined,
      timestamp: error.timestamp,
      isHtmlFallback: true,
    };
  }

  // 030-dashboard-recovery: Handle ApiError with endpoint/requestId
  if (ApiError.isApiError(error)) {
    const msg = error.message.toLowerCase();
    let category: ErrorCategory = 'unknown';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      category = 'network';
    } else if (error.status === 401 || error.status === 403) {
      category = 'auth';
    } else if (error.status >= 500) {
      category = 'infrastructure';
    } else if (error.status >= 400) {
      category = 'validation';
    }

    return {
      category,
      code: error.code,
      message: error.message,
      userMessage: error.message,
      retryable: error.status >= 500, // Server errors are retryable
      retryAfterSeconds: undefined,
      correlationId: error.requestId,
      endpoint: error.endpoint,
      status: error.status,
      timestamp: error.timestamp,
      isHtmlFallback: false,
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
      endpoint: undefined,
      status: undefined,
      timestamp: undefined,
      isHtmlFallback: false,
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
      endpoint: undefined,
      status: undefined,
      timestamp: undefined,
      isHtmlFallback: false,
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
    endpoint: undefined,
    status: undefined,
    timestamp: undefined,
    isHtmlFallback: false,
  };
}

// ============================================================================
// Countdown Hook
// ============================================================================

/**
 * Hook for managing retry countdown.
 * Note: Uses useMemo to derive initial state to avoid setState in useEffect
 */
function useRetryCountdown(
  retryAfterSeconds: number | undefined,
  onComplete: (() => void) | undefined
): {
  countdown: number;
  isCountingDown: boolean;
  cancel: () => void;
} {
  // Derive if countdown should be active
  const shouldCountdown = !!retryAfterSeconds && retryAfterSeconds > 0;

  const [countdown, setCountdown] = useState(() => retryAfterSeconds ?? 0);
  const [isCountingDown, setIsCountingDown] = useState(() => shouldCountdown);
  const [prevRetryAfter, setPrevRetryAfter] = useState(retryAfterSeconds);

  // Sync state when retryAfterSeconds changes (replacement for setState in effect)
  if (retryAfterSeconds !== prevRetryAfter) {
    setPrevRetryAfter(retryAfterSeconds);
    if (!retryAfterSeconds || retryAfterSeconds <= 0) {
      setIsCountingDown(false);
    } else {
      setCountdown(retryAfterSeconds);
      setIsCountingDown(true);
    }
  }

  useEffect(() => {
    if (!isCountingDown || countdown <= 0) {
      return;
    }

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
  }, [isCountingDown, countdown, onComplete]);

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
  const [debugCopied, setDebugCopied] = useState(false);

  const errorInfo = extractErrorInfo(error);
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

  // 030-dashboard-recovery: Copy full debug info
  const handleCopyDebugInfo = useCallback(async () => {
    const debugInfo = createDebugInfo({
      endpoint: errorInfo.endpoint ?? 'unknown',
      status: errorInfo.status,
      code: errorInfo.code,
      requestId: errorInfo.correlationId,
      timestamp: errorInfo.timestamp,
    });

    try {
      await navigator.clipboard.writeText(formatDebugInfoForClipboard(debugInfo));
      setDebugCopied(true);
      setTimeout(() => setDebugCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [errorInfo]);

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
        <CategoryIcon category={errorInfo.category} className="h-4 w-4 flex-shrink-0" />
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
      <CategoryIcon category={errorInfo.category} className="h-4 w-4" />
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

        {/* 030-dashboard-recovery: HTML Fallback hint */}
        {errorInfo.isHtmlFallback && (
          <div className="flex items-center gap-2 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 p-2 rounded" data-testid="html-fallback-hint">
            <FileCode className="h-4 w-4 flex-shrink-0" />
            <span>API route hitting SPA fallback - endpoint may not be registered on the server</span>
          </div>
        )}

        {/* 030-dashboard-recovery: Endpoint display */}
        {errorInfo.endpoint && (
          <p className="text-xs opacity-70" data-testid="error-endpoint">
            Endpoint: <code className="font-mono bg-muted px-1 rounded">{errorInfo.endpoint}</code>
            {errorInfo.status && (
              <span className="ml-2">
                Status: <code className="font-mono bg-muted px-1 rounded">{errorInfo.status}</code>
              </span>
            )}
          </p>
        )}

        {/* Error code badge */}
        {errorInfo.code && (
          <p className="text-xs opacity-70" data-testid="error-code">
            Error code: <code className="font-mono">{errorInfo.code}</code>
          </p>
        )}

        {/* 030-dashboard-recovery: Timestamp display */}
        {errorInfo.timestamp && (
          <p className="text-xs opacity-70" data-testid="error-timestamp">
            Time: <code className="font-mono">{errorInfo.timestamp.toLocaleTimeString()}</code>
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

        {/* Action buttons row */}
        <div className="flex items-center gap-2 pt-2">
          {/* 030-dashboard-recovery: Copy debug info button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDebugInfo}
                  className="h-7 text-xs"
                  data-testid="copy-debug-info-button"
                >
                  {debugCopied ? (
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {debugCopied ? 'Copied!' : 'Copy Debug Info'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy error details as JSON for support</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Retry section - preserved data-testid for existing tests */}
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
