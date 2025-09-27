import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Server, 
  Shield, 
  Trash2, 
  Eye, 
  EyeOff, 
  LogOut, 
  Smartphone,
  Wifi,
  WifiOff,
  User,
  Save,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { credentialsStorage } from '../utils/credentials';
import PlatformUtils from '../utils/platform';
import ServerConfig from './ServerConfig';

const SettingsPage = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('server');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({ connected: true, connectionType: 'unknown' });
  const [settings, setSettings] = useState({
    serverUrl: '',
    rememberPassword: false,
    savedUsername: '',
    hasSavedCredentials: false,
  });
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
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
        
        const handleOnline = () => setNetworkStatus({ connected: true, connectionType: 'unknown' });
        const handleOffline = () => setNetworkStatus({ connected: false, connectionType: 'none' });
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    } catch (error) {
      console.error('Failed to check network status:', error);
    }
  };

  const loadSettings = async () => {
    try {
      // 加载服务器配置
      const serverUrl = await credentialsStorage.getServerConfig();
      
      // 加载凭据设置
      const savedCredentials = await credentialsStorage.getSavedCredentials();
      const rememberEnabled = await credentialsStorage.isRememberEnabled();

      setSettings({
        serverUrl: serverUrl || '默认服务器',
        rememberPassword: rememberEnabled,
        savedUsername: savedCredentials?.username || '',
        hasSavedCredentials: !!savedCredentials,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleClearCredentials = async () => {
    if (confirm('确定要清除保存的登录凭据吗？')) {
      await credentialsStorage.clearCredentials();
      await loadSettings();
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      onClose();
    }
  };

  const handleServerConfigSave = async (serverUrl) => {
    await credentialsStorage.saveServerConfig(serverUrl);
    await loadSettings();
    window.location.reload(); // 重新加载应用以应用新的服务器配置
  };

  const handleResetToDefault = async () => {
    if (confirm('确定要重置所有设置到默认值吗？这将清除所有保存的配置和凭据。')) {
      await credentialsStorage.clearCredentials();
      if (PlatformUtils.isNative()) {
        await credentialsStorage.saveServerConfig('');
      } else {
        localStorage.removeItem('claude-server-url');
      }
      await loadSettings();
      alert('设置已重置到默认值');
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'server', name: '服务器', icon: Server },
    { id: 'security', name: '安全', icon: Shield },
    { id: 'account', name: '账户', icon: User },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <span className="sr-only">关闭</span>
            ✕
          </button>
        </div>

        <div className="flex h-full max-h-[calc(90vh-4rem)]">
          {/* Sidebar */}
          <div className="w-48 border-r border-border bg-muted/30">
            <nav className="p-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'server' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">服务器配置</h3>
                  
                  <div className="space-y-4">
                    {/* 网络状态显示 */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          网络状态
                        </label>
                        <div className="flex items-center space-x-1">
                          {networkStatus.connected ? (
                            <>
                              <Wifi className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-green-600">
                                {networkStatus.connectionType === 'wifi' ? 'WiFi' : 
                                 networkStatus.connectionType === 'cellular' ? '移动网络' : '已连接'}
                              </span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600">断开连接</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          当前服务器
                        </label>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            networkStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                          }`}></div>
                          <span className={`text-xs ${
                            networkStatus.connected ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {networkStatus.connected ? '已连接' : '连接失败'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {settings.serverUrl || '默认服务器'}
                      </p>
                      <button
                        onClick={() => setShowServerConfig(true)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                      >
                        <Server className="w-4 h-4" />
                        <span>配置服务器</span>
                      </button>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Wifi className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-foreground">连接说明</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            确保服务器地址包含协议（http:// 或 https://）。
                            本地开发通常使用 http://localhost:63008，
                            生产环境应使用 HTTPS 协议确保安全。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">安全设置</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          记住密码
                        </label>
                        <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${
                          settings.rememberPassword ? 'bg-primary border-primary' : 'border-border'
                        }`}>
                          {settings.rememberPassword && (
                            <span className="text-primary-foreground text-xs">✓</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {settings.rememberPassword ? '已启用密码记忆功能' : '未启用密码记忆功能'}
                      </p>
                    </div>

                    {settings.hasSavedCredentials && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-foreground">
                            保存的凭据
                          </label>
                          <button
                            onClick={() => setShowCredentials(!showCredentials)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {showCredentials && (
                          <div className="text-xs text-muted-foreground mb-3">
                            用户名: {settings.savedUsername}
                          </div>
                        )}
                        <button
                          onClick={handleClearCredentials}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>清除凭据</span>
                        </button>
                      </div>
                    )}

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-foreground">安全提示</h4>
                          <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                            <li>• 保存的密码使用本地加密存储</li>
                            <li>• 凭据仅保存在您的设备上</li>
                            <li>• 定期清除凭据以提高安全性</li>
                            <li>• 使用HTTPS连接确保数据传输安全</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">账户信息</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground">
                            {user?.username || '未知用户'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Claude Code UI 用户
                          </p>
                        </div>
                      </div>
                    </div>

                    {PlatformUtils.isNative() && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <h4 className="text-sm font-medium text-foreground">设备信息</h4>
                            <p className="text-xs text-muted-foreground">
                              移动端应用 • Capacitor + React
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>退出登录</span>
                      </button>

                      <button
                        onClick={handleResetToDefault}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-border text-muted-foreground rounded-md text-sm hover:bg-muted transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>重置所有设置</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 服务器配置弹窗 */}
      <ServerConfig
        isOpen={showServerConfig}
        onClose={() => setShowServerConfig(false)}
        onSave={handleServerConfigSave}
      />
    </div>
  );
};

export default SettingsPage;