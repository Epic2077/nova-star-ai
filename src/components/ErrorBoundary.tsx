"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  /** Optional fallback to render when an error is caught. */
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Generic React error boundary.
 *
 * Catches rendering errors in child components and displays a
 * graceful fallback instead of a blank screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
          <p>Something went wrong.</p>
          <button
            type="button"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
