import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class SystemSurfaceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SystemSurfaceErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border-b border-gray-200 bg-red-50 border-l-4 border-l-red-400">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">System Surfaces Error</h3>
              <p className="text-xs text-red-700 mt-1">
                Failed to load system surfaces. Please try refreshing or contact support.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">Error Details</summary>
                  <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap bg-red-100 p-2 rounded">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <button
                onClick={this.handleRetry}
                className="mt-2 inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}