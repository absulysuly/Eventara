// app/components/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { loggingService } from '@/lib/loggingService';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our external service for debugging
    loggingService.logError(error, { reactErrorInfo: errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      // A user-friendly fallback UI with a retry mechanism.
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-bg p-4 text-center">
            <h1 className="text-4xl font-bold text-red-500 mb-4">Oops! Something went wrong.</h1>
            <p className="text-lg text-neutral-text-soft mb-6">
                We've been notified about the issue and are working to fix it. Please try refreshing the page.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
            >
                Refresh Page
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
