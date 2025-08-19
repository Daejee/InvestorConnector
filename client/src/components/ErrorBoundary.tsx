import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details but don't display JSON parsing errors to users
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      console.error('JSON parsing error caught by ErrorBoundary:', error);
      console.error('Error info:', errorInfo);
      // Don't show JSON errors to users - just log them
      this.setState({ hasError: false });
      return;
    }
    
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Only show error UI for non-JSON errors
      if (!this.state.error.message.includes('JSON') && !this.state.error.message.includes('parse')) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-lg font-semibold text-red-800">오류가 발생했습니다</h2>
            <p className="text-red-600 mt-2">페이지를 새로고침하거나 다시 시도해주세요.</p>
          </div>
        );
      }
    }

    return this.props.children;
  }
}