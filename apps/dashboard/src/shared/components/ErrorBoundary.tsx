"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/shared/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Application-level error boundary. Catches render-time errors anywhere
 * in the subtree and shows a recoverable fallback UI.
 *
 * Usage:
 *   <ErrorBoundary><Routes /></ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Report to Sentry in production
    if (process.env.NODE_ENV !== "development") {
      Sentry.captureException(error, {
        contexts: {
          react: { componentStack: info.componentStack },
        },
      });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div role="alert" className="min-h-[60vh] grid place-items-center p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 grid place-items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4 break-words">
            {error.message || "An unexpected error occurred."}
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload page
            </Button>
            <Button onClick={this.reset}>Try again</Button>
          </div>
        </div>
      </div>
    );
  }
}
