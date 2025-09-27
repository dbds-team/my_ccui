// Mobile-specific error boundary with native features
import React from 'react';
import PlatformUtils from '../utils/platform';

class MobileErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Mobile Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Haptic feedback for native apps
    if (PlatformUtils.isNative()) {
      PlatformUtils.hapticFeedback('heavy');
    }

    // Store error information for debugging
    if (PlatformUtils.isNative()) {
      PlatformUtils.setPreference('last_error', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        platform: PlatformUtils.isAndroid() ? 'android' : PlatformUtils.isIOS() ? 'ios' : 'web'
      });
    }
  }

  handleRestart = async () => {
    // Clear error state
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Haptic feedback
    if (PlatformUtils.isNative()) {
      await PlatformUtils.hapticFeedback('light');
    }
    
    // Reload the app in native context
    if (PlatformUtils.isNative()) {
      window.location.reload();
    }
  };

  handleReportError = async () => {
    if (PlatformUtils.isNative()) {
      await PlatformUtils.hapticFeedback('light');
    }

    const errorReport = {
      error: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || 'No stack trace',
      userAgent: navigator.userAgent,
      platform: PlatformUtils.isAndroid() ? 'android' : PlatformUtils.isIOS() ? 'ios' : 'web',
      timestamp: new Date().toISOString()
    };

    // Copy error report to clipboard
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
      alert('Error report copied to clipboard');
    } catch (e) {
      console.error('Failed to copy error report:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      const isNative = PlatformUtils.isNative();
      const platform = PlatformUtils.isAndroid() ? 'Android' : PlatformUtils.isIOS() ? 'iOS' : 'Web';

      return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-6xl mb-4">😵</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The app encountered an unexpected error on {platform}.
              </p>
            </div>

            {/* Error details (collapsed by default) */}
            <details className="mb-4 text-sm">
              <summary className="cursor-pointer text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Error Details
              </summary>
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-auto max-h-32">
                <div className="text-red-600 dark:text-red-400 mb-2">
                  {this.state.error?.message}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {this.state.error?.stack}
                </div>
              </div>
            </details>

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRestart}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                {isNative ? 'Restart App' : 'Reload Page'}
              </button>
              
              <button
                onClick={this.handleReportError}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
              >
                Copy Error Report
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              Platform: {platform} • Version: {process.env.REACT_APP_VERSION || '1.5.0'}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;