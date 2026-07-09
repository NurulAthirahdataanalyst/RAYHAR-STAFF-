import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-mono">
          <div className="max-w-3xl w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden border border-red-200 dark:border-red-900">
            <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-100 dark:border-red-900/50 p-4">
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                ⚠️ Application Error
              </h1>
              <p className="text-sm text-red-500/80 mt-1">
                The application encountered an unexpected error.
              </p>
            </div>
            
            <div className="p-4 overflow-auto max-h-[60vh]">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Error Message:</h3>
                <pre className="text-xs bg-red-50/50 dark:bg-slate-900 text-red-600 dark:text-red-400 p-3 rounded border border-red-100 dark:border-red-900/30 whitespace-pre-wrap break-all">
                  {this.state.error?.toString()}
                </pre>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Component Stack Trace:</h3>
                <pre className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 p-3 rounded border border-slate-200 dark:border-slate-800 whitespace-pre-wrap break-all">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => {
                  sessionStorage.removeItem("user");
                  localStorage.removeItem("user");
                  window.location.href = "/login";
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Clear Session & Login
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
