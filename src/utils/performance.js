// Performance monitoring for mobile apps
import React from 'react';
import PlatformUtils from './platform';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      appStart: Date.now(),
      renders: 0,
      memoryUsage: [],
      networkRequests: 0,
      errors: 0
    };
    
    this.initializePerformanceObserver();
    this.startMemoryMonitoring();
  }

  initializePerformanceObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    // Monitor network requests
    const networkObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
          this.metrics.networkRequests++;
          
          // Log slow requests
          if (entry.duration > 2000) {
            console.warn('Slow network request detected:', entry.name, entry.duration + 'ms');
          }
        }
      });
    });

    try {
      networkObserver.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (e) {
      console.warn('Performance Observer not fully supported:', e);
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window && 'PerformanceLongTaskTiming' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.warn('Long task detected:', entry.duration + 'ms');
          this.logPerformanceIssue('long_task', {
            duration: entry.duration,
            startTime: entry.startTime
          });
        });
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task observer not supported:', e);
      }
    }
  }

  startMemoryMonitoring() {
    if (!PlatformUtils.isNative()) return;

    setInterval(() => {
      if (performance.memory) {
        const memInfo = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          timestamp: Date.now()
        };

        this.metrics.memoryUsage.push(memInfo);

        // Keep only last 50 measurements
        if (this.metrics.memoryUsage.length > 50) {
          this.metrics.memoryUsage.shift();
        }

        // Warn about high memory usage
        if (memInfo.used > memInfo.limit * 0.8) {
          console.warn('High memory usage detected:', memInfo);
          this.logPerformanceIssue('high_memory', memInfo);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  recordRender() {
    this.metrics.renders++;
  }

  recordError(error) {
    this.metrics.errors++;
    this.logPerformanceIssue('error', {
      message: error.message,
      stack: error.stack
    });
  }

  async logPerformanceIssue(type, data) {
    if (!PlatformUtils.isNative()) return;

    const issue = {
      type,
      data,
      timestamp: Date.now(),
      platform: PlatformUtils.isAndroid() ? 'android' : 'ios',
      deviceInfo: await PlatformUtils.getDeviceInfo(),
      appUptime: Date.now() - this.metrics.appStart
    };

    // Store in preferences for later analysis
    try {
      const existingIssues = await PlatformUtils.getPreference('performance_issues', []);
      existingIssues.push(issue);

      // Keep only last 100 issues
      if (existingIssues.length > 100) {
        existingIssues.splice(0, existingIssues.length - 100);
      }

      await PlatformUtils.setPreference('performance_issues', existingIssues);
    } catch (e) {
      console.error('Failed to log performance issue:', e);
    }
  }

  getMetrics() {
    const currentMemory = performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
    } : null;

    return {
      ...this.metrics,
      currentMemory,
      uptime: Date.now() - this.metrics.appStart,
      averageMemory: this.metrics.memoryUsage.length > 0 
        ? this.metrics.memoryUsage.reduce((sum, m) => sum + m.used, 0) / this.metrics.memoryUsage.length
        : 0
    };
  }

  async generateReport() {
    const metrics = this.getMetrics();
    const deviceInfo = await PlatformUtils.getDeviceInfo();
    const networkStatus = await PlatformUtils.getNetworkStatus();

    return {
      timestamp: new Date().toISOString(),
      platform: deviceInfo?.platform || 'unknown',
      deviceInfo,
      networkStatus,
      metrics,
      performanceEntries: performance.getEntries().length,
      userAgent: navigator.userAgent
    };
  }

  // Reset metrics (useful for testing or after app updates)
  reset() {
    this.metrics = {
      appStart: Date.now(),
      renders: 0,
      memoryUsage: [],
      networkRequests: 0,
      errors: 0
    };
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [monitor] = React.useState(() => new PerformanceMonitor());
  const [metrics, setMetrics] = React.useState(monitor.getMetrics());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [monitor]);

  React.useEffect(() => {
    // Record render
    monitor.recordRender();
  });

  return {
    monitor,
    metrics,
    generateReport: () => monitor.generateReport()
  };
}

export default PerformanceMonitor;