"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  recoveryAttempt: number;
}

/**
 * WebGLErrorBoundary — catches WebGL / Canvas rendering errors
 * and shows a friendly recovery button instead of a blank white page.
 */
export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, recoveryAttempt: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<WebGLErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[WebGLErrorBoundary] Caught rendering error:", error);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      recoveryAttempt: prev.recoveryAttempt + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#1a1008] p-8 text-center">
          <div className="max-w-md">
            <h2 className="mb-2 text-lg font-semibold text-amber-400">
              3D Render Error
            </h2>
            <p className="mb-4 text-sm text-white/60">
              The WebGL canvas encountered an error and could not render the
              office.
              {this.state.recoveryAttempt > 0 &&
                " A recovery was already attempted."}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="rounded-md bg-amber-600/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
              >
                Retry
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/20"
              >
                Reload Page
              </button>
            </div>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-white/40">
                  Error details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/30 p-2 text-[10px] text-red-300/60">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
