// Mobile-optimized app wrapper with native features
import React, { useEffect, useState } from 'react';
import PlatformUtils, { usePlatform } from '../utils/platform';
import MobileErrorBoundary from './MobileErrorBoundary';
import { usePerformanceMonitor } from '../utils/performance';

export default function MobileApp({ children }) {
  const { isNative, platform, networkStatus, deviceInfo } = usePlatform();
  const { monitor, metrics } = usePerformanceMonitor();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      if (isNative) {
        await PlatformUtils.initializeApp();
        console.log('📱 Mobile app initialized for platform:', platform);
        console.log('📱 Device info:', deviceInfo);
      }
      setIsInitialized(true);
    };

    initializeApp();
  }, [isNative, platform, deviceInfo]);

  useEffect(() => {
    // Handle network status changes
    if (!networkStatus.connected) {
      // Show offline indicator or handle offline mode
      console.warn('📱 Device is offline');
    } else {
      console.log('📱 Device is online');
    }
  }, [networkStatus]);

  useEffect(() => {
    // Listen for app becoming active
    const handleAppBecameActive = () => {
      console.log('📱 App became active - refreshing data');
      // Trigger data refresh
      window.dispatchEvent(new CustomEvent('refresh-data'));
    };

    window.addEventListener('app-became-active', handleAppBecameActive);
    
    return () => {
      window.removeEventListener('app-became-active', handleAppBecameActive);
    };
  }, []);

  if (isNative && !isInitialized) {
    // Show native loading screen while initializing
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Claude Code UI...</p>
        </div>
      </div>
    );
  }

  // Apply mobile-specific styles
  const mobileClasses = isNative ? [
    'native-app',
    platform === 'ios' ? 'ios-app' : '',
    platform === 'android' ? 'android-app' : ''
  ].filter(Boolean).join(' ') : '';

  return (
    <MobileErrorBoundary>
      <div className={`app-container ${mobileClasses}`}>
        {/* Network status indicator */}
        {!networkStatus.connected && (
          <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
            📶 No internet connection
          </div>
        )}
        
        {/* Performance debug info (only in development) */}
        {process.env.NODE_ENV === 'development' && isNative && (
          <div className="fixed bottom-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 z-50 rounded-tl">
            Mem: {metrics.currentMemory?.used || 0}MB | 
            Renders: {metrics.renders} | 
            Uptime: {Math.round(metrics.uptime / 1000)}s
          </div>
        )}
        
        {children}
      </div>
    </MobileErrorBoundary>
  );
}