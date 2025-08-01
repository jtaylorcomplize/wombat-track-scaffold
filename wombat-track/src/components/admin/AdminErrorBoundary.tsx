import React from 'react';

interface AdminErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AdminErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <span className="text-red-500 text-2xl mr-2">⚠️</span>
              <h2 className="text-xl font-semibold text-gray-800">Admin UI Error</h2>
            </div>
            <p className="text-gray-600 mb-4">
              The Admin UI failed to load. This might be due to a missing context provider or configuration issue.
            </p>
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}