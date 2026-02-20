/**
 * SubsystemErrorBoundary Component
 * Feature: 058-real-evidence-ops (T003)
 *
 * Isolates render errors within a named subsystem so that failures in one
 * part of the page (e.g., sessions) don't crash other parts (e.g., camera health).
 */

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SubsystemErrorBoundaryProps {
  /** Human-readable name for the subsystem (shown in error UI) */
  subsystemName: string;
  children: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface SubsystemErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class SubsystemErrorBoundary extends Component<
  SubsystemErrorBoundaryProps,
  SubsystemErrorBoundaryState
> {
  constructor(props: SubsystemErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SubsystemErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[${this.props.subsystemName}] Render error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card
          className="border-muted"
          data-testid={`subsystem-error-${this.props.subsystemName.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {this.props.subsystemName} unavailable
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                An error occurred loading this section. Other parts of the page are unaffected.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              data-testid="subsystem-retry-button"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
