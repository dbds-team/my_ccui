// Platform detection and mobile-specific utilities
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { useState, useEffect } from 'react';

export class PlatformUtils {
  static isNative() {
    return Capacitor.isNativePlatform();
  }

  static isAndroid() {
    return Capacitor.getPlatform() === 'android';
  }

  static isIOS() {
    return Capacitor.getPlatform() === 'ios';
  }

  static isWeb() {
    return Capacitor.getPlatform() === 'web';
  }

  static async initializeApp() {
    if (!this.isNative()) return;

    try {
      // Initialize status bar
      await StatusBar.setStyle({ style: Style.Dark });
      if (this.isAndroid()) {
        await StatusBar.setBackgroundColor({ color: '#1f2937' });
      }

      // Hide splash screen
      await SplashScreen.hide();

      // Setup app state listeners
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
        // Handle app becoming active/inactive
        if (isActive) {
          // App became active - refresh data if needed
          window.dispatchEvent(new CustomEvent('app-became-active'));
        }
      });

      // Setup back button handler for Android
      if (this.isAndroid()) {
        CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            CapacitorApp.exitApp();
          } else {
            window.history.back();
          }
        });
      }

      console.log('📱 Native app initialized successfully');
    } catch (error) {
      console.error('Failed to initialize native app:', error);
    }
  }

  static async getDeviceInfo() {
    if (!this.isNative()) {
      return {
        platform: 'web',
        model: 'Unknown',
        operatingSystem: 'web',
        osVersion: 'Unknown',
        manufacturer: 'Unknown'
      };
    }

    try {
      const info = await Device.getInfo();
      return {
        platform: info.platform,
        model: info.model,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }

  static async getNetworkStatus() {
    if (!this.isNative()) {
      return { connected: navigator.onLine, connectionType: 'unknown' };
    }

    try {
      const status = await Network.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType
      };
    } catch (error) {
      console.error('Failed to get network status:', error);
      return { connected: true, connectionType: 'unknown' };
    }
  }

  static addNetworkListener(callback) {
    if (!this.isNative()) {
      const onlineHandler = () => callback({ connected: true, connectionType: 'unknown' });
      const offlineHandler = () => callback({ connected: false, connectionType: 'none' });
      
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      
      // 返回清理函数
      return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    }

    try {
      const listener = Network.addListener('networkStatusChange', callback);
      return () => {
        if (listener && listener.remove) {
          listener.remove();
        }
      };
    } catch (error) {
      console.error('Failed to add network listener:', error);
      return () => {}; // 返回空的清理函数
    }
  }

  // Preferences wrapper for consistent storage across platforms
  static async setPreference(key, value) {
    if (this.isNative()) {
      await Preferences.set({ key, value: JSON.stringify(value) });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  static async getPreference(key, defaultValue = null) {
    try {
      if (this.isNative()) {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) : defaultValue;
      } else {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
      }
    } catch (error) {
      console.error(`Failed to get preference ${key}:`, error);
      return defaultValue;
    }
  }

  static async removePreference(key) {
    if (this.isNative()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  }

  // Safe area handling for iOS
  static getSafeAreaInsets() {
    if (!this.isIOS()) return { top: 0, bottom: 0 };

    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0')
    };
  }

  // Haptic feedback
  static async hapticFeedback(type = 'light') {
    if (!this.isNative()) return;

    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }
}

// Hook for React components
export function usePlatform() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [networkStatus, setNetworkStatus] = useState({ connected: true });

  useEffect(() => {
    const init = async () => {
      setIsNative(PlatformUtils.isNative());
      setPlatform(Capacitor.getPlatform());
      
      const info = await PlatformUtils.getDeviceInfo();
      setDeviceInfo(info);
      
      const status = await PlatformUtils.getNetworkStatus();
      setNetworkStatus(status);
      
      // Listen for network changes
      PlatformUtils.addNetworkListener(setNetworkStatus);
    };

    init();
  }, []);

  return {
    isNative,
    platform,
    deviceInfo,
    networkStatus,
    isAndroid: PlatformUtils.isAndroid(),
    isIOS: PlatformUtils.isIOS(),
    isWeb: PlatformUtils.isWeb()
  };
}

export default PlatformUtils;