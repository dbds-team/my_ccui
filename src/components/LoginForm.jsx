import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Settings, Eye, EyeOff } from 'lucide-react';
import ServerConfig from './ServerConfig';
import { credentialsStorage } from '../utils/credentials';
import PlatformUtils from '../utils/platform';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [currentServer, setCurrentServer] = useState('');
  
  const { login } = useAuth();

  // 加载保存的凭据和服务器配置
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      // 加载保存的凭据
      const savedCredentials = await credentialsStorage.getSavedCredentials();
      if (savedCredentials) {
        setUsername(savedCredentials.username);
        setPassword(savedCredentials.password);
        setRememberPassword(true);
      }

      // 加载服务器配置
      const serverConfig = await credentialsStorage.getServerConfig();
      if (serverConfig) {
        setCurrentServer(serverConfig);
      } else {
        setCurrentServer('默认服务器');
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    
    setIsLoading(true);
    
    const result = await login(username, password);
    
    if (result.success) {
      // 保存凭据（如果用户选择记住密码）
      await credentialsStorage.saveCredentials(username, password, rememberPassword);
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  const handleServerConfigSave = async (serverUrl) => {
    await credentialsStorage.saveServerConfig(serverUrl);
    setCurrentServer(serverUrl);
    // 这里可以添加重新初始化API配置的逻辑
    window.location.reload(); // 简单的解决方案：重新加载页面
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg border border-border p-8 space-y-6">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <MessageSquare className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to your Claude Code UI account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 服务器配置显示 */}
            <div className="bg-muted/50 rounded-md p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {currentServer === '默认服务器' ? '使用默认服务器' : '自定义服务器'}
                    </span>
                    {currentServer !== '默认服务器' && (
                      <div className="text-xs text-muted-foreground truncate" title={currentServer}>
                        {currentServer}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerConfig(true)}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                  disabled={isLoading}
                  title="配置服务器"
                >
                  <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
                用户名
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入密码"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 记住密码选项 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-background border-border rounded focus:ring-blue-500 focus:ring-2"
                disabled={isLoading}
              />
              <label htmlFor="remember" className="text-sm text-foreground cursor-pointer">
                记住密码
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              输入您的凭据以访问 Claude Code UI
            </p>
            {PlatformUtils.isNative() && (
              <p className="text-xs text-muted-foreground mt-1">
                移动端版本 - 支持触摸操作
              </p>
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

export default LoginForm;