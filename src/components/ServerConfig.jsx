import React, { useState, useEffect } from 'react';
import { Server, Wifi, WifiOff, Settings, Check, X, AlertCircle } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import PlatformUtils from '../utils/platform';

const ServerConfig = ({ isOpen, onClose, onSave }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [networkStatus, setNetworkStatus] = useState({ connected: true, connectionType: 'unknown' });
  
  // 预设服务器列表
  const presetServers = [
    { name: '本地服务器', url: 'http://localhost:63008' },
    { name: '开发服务器', url: 'http://117.72.113.106:63008' },
    { name: '生产服务器', url: 'https://claude-ui.example.com' },
  ];

  useEffect(() => {
    if (isOpen) {
      loadSavedConfig();
      checkNetworkStatus();
    }
  }, [isOpen]);

  const checkNetworkStatus = async () => {
    try {
      if (PlatformUtils.isNative()) {
        const status = await PlatformUtils.getNetworkStatus();
        setNetworkStatus(status);
        
        // 监听网络状态变化
        PlatformUtils.addNetworkListener((status) => {
          setNetworkStatus(status);
        });
      } else {
        // Web环境网络检测
        setNetworkStatus({
          connected: navigator.onLine,
          connectionType: 'unknown'
        });
        
        window.addEventListener('online', () => {
          setNetworkStatus({ connected: true, connectionType: 'unknown' });
        });
        
        window.addEventListener('offline', () => {
          setNetworkStatus({ connected: false, connectionType: 'none' });
        });
      }
    } catch (error) {
      console.error('Failed to check network status:', error);
    }
  };

  const loadSavedConfig = async () => {
    try {
      if (PlatformUtils.isNative()) {
        const { value } = await Preferences.get({ key: 'serverUrl' });
        if (value) {
          setServerUrl(value);
        }
      } else {
        const saved = localStorage.getItem('claude-server-url');
        if (saved) {
          setServerUrl(saved);
        }
      }
    } catch (error) {
      console.error('Failed to load server config:', error);
    }
  };

  const saveConfig = async (url) => {
    try {
      if (PlatformUtils.isNative()) {
        await Preferences.set({ key: 'serverUrl', value: url });
      } else {
        localStorage.setItem('claude-server-url', url);
      }
    } catch (error) {
      console.error('Failed to save server config:', error);
    }
  };

  const testConnection = async (url) => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      setErrorMessage('');

      // 检查网络连接
      if (!networkStatus.connected) {
        throw new Error('网络连接不可用，请检查网络设置');
      }

      // 规范化URL
      const normalizedUrl = url.replace(/\/$/, '');
      
      // 测试连接
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(`${normalizedUrl}/api/auth/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setConnectionStatus('success');
        return true;
      } else {
        throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      
      if (error.name === 'AbortError') {
        setErrorMessage('连接超时，请检查服务器地址和网络连接');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setErrorMessage('无法连接到服务器，请检查地址是否正确');
      } else {
        setErrorMessage(error.message || '连接测试失败');
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      setErrorMessage('请输入服务器地址');
      setConnectionStatus('error');
      return;
    }

    // 测试连接
    const isConnected = await testConnection(serverUrl.trim());
    
    if (isConnected) {
      await saveConfig(serverUrl.trim());
      onSave(serverUrl.trim());
      setTimeout(() => {
        onClose();
        setConnectionStatus('idle');
      }, 1500);
    }
  };

  const handlePresetSelect = async (url) => {
    setServerUrl(url);
    setConnectionStatus('idle');
    setErrorMessage('');
    // 自动测试预设服务器连接
    await testConnection(url);
  };

  const handleInputChange = (e) => {
    setServerUrl(e.target.value);
    setConnectionStatus('idle');
    setErrorMessage('');
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getInputBorderClass = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'border-blue-500 ring-2 ring-blue-500/20';
      case 'success':
        return 'border-green-500 ring-2 ring-green-500/20';
      case 'error':
        return 'border-red-500 ring-2 ring-red-500/20';
      default:
        return 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20';
    }
  };

  const getNetworkIcon = () => {
    if (!networkStatus.connected) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  const getNetworkStatusText = () => {
    if (!networkStatus.connected) {
      return '网络断开';
    }
    
    const type = networkStatus.connectionType || 'unknown';
    switch (type) {
      case 'wifi':
        return 'WiFi连接';
      case 'cellular':
        return '移动网络';
      case 'ethernet':
        return '以太网';
      case 'none':
        return '无网络';
      default:
        return '网络已连接';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg border border-border w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">服务器配置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[calc(90vh-8rem)] overflow-y-auto">
          {/* 网络状态显示 */}
          <div className="bg-muted/50 rounded-md p-3">
            <div className="flex items-center space-x-2">
              {getNetworkIcon()}
              <span className="text-sm font-medium text-foreground">
                {getNetworkStatusText()}
              </span>
              {!networkStatus.connected && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            {!networkStatus.connected && (
              <p className="text-xs text-red-600 mt-1">
                请检查网络连接后重试
              </p>
            )}
          </div>

          {/* 自定义服务器输入 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              服务器地址
            </label>
            <div className="relative">
              <input
                type="url"
                value={serverUrl}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 bg-background text-foreground rounded-md transition-all duration-200 pr-10 ${getInputBorderClass()}`}
                placeholder="http://127.0.0.1:63008"
                disabled={isConnecting || !networkStatus.connected}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getStatusIcon()}
              </div>
            </div>
            
            {connectionStatus === 'success' && (
              <p className="text-sm text-green-600 mt-1 flex items-center">
                <Check className="w-3 h-3 mr-1" />
                连接成功
              </p>
            )}
            
            {errorMessage && (
              <p className="text-sm text-red-600 mt-1 flex items-start">
                <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                {errorMessage}
              </p>
            )}
          </div>

          {/* 预设服务器 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              快速选择
            </label>
            <div className="space-y-2">
              {presetServers.map((server, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetSelect(server.url)}
                  disabled={isConnecting || !networkStatus.connected}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    serverUrl === server.url
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted border-border hover:bg-muted/80'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium text-sm">{server.name}</div>
                  <div className="text-xs text-muted-foreground">{server.url}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 连接提示 */}
          <div className="bg-muted/50 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Settings className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p>确保服务器地址包含协议（http:// 或 https://）</p>
                <p className="mt-1">本地开发通常使用: http://localhost:63008</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isConnecting}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isConnecting || !serverUrl.trim() || !networkStatus.connected}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? '连接中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerConfig;