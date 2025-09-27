import { credentialsStorage } from './credentials';
import PlatformUtils from './platform';
import { CapacitorHttp } from '@capacitor/core';

// Get the API base URL
const getApiBaseUrl = async () => {
  // 检查用户配置的服务器地址
  const savedServerUrl = await credentialsStorage.getServerConfig();
  if (savedServerUrl) {
    return savedServerUrl;
  }

  // 在生产环境中，使用配置的API主机
  if (import.meta.env.VITE_API_HOST) {
    return import.meta.env.VITE_API_HOST;
  }
  
  // 在开发环境中，使用相对URL或localhost
  if (import.meta.env.DEV) {
    return '';  // Use relative URLs for development proxy
  }
  
  // 回退到当前主机的默认端口
  return `${window.location.protocol}//${window.location.hostname}:63008`;
};

// 同步版本，用于不支持async的情况
const getApiBaseUrlSync = () => {
  // 在移动端，尝试从同步存储中获取
  if (PlatformUtils.isWeb()) {
    const savedServerUrl = localStorage.getItem('claude-server-url');
    if (savedServerUrl) {
      return savedServerUrl;
    }
  }

  // 在生产环境中，使用配置的API主机
  if (import.meta.env.VITE_API_HOST) {
    return import.meta.env.VITE_API_HOST;
  }
  
  // 在开发环境中，使用相对URL或localhost
  if (import.meta.env.DEV) {
    return '';  // Use relative URLs for development proxy
  }
  
  // 回退到当前主机的默认端口
  return `${window.location.protocol}//${window.location.hostname}:63008`;
};

// 创建支持Capacitor的HTTP请求函数
const httpRequest = async (url, options = {}) => {
  if (PlatformUtils.isNative()) {
    // 在移动端使用Capacitor HTTP
    try {
      const response = await CapacitorHttp.request({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body,
        ...options
      });
      
      // 构造类似fetch的响应对象
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText || '',
        headers: new Map(Object.entries(response.headers || {})),
        async json() { 
          return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        },
        async text() { 
          return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        }
      };
    } catch (error) {
      console.error('Capacitor HTTP request failed:', error);
      throw error;
    }
  } else {
    // 在Web端使用标准fetch
    return fetch(url, options);
  }
};

// Utility function for authenticated API calls
export const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem('auth-token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Construct full URL if needed  
  const baseUrl = await getApiBaseUrl();
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
  
  return httpRequest(fullUrl, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

// 同步版本的API调用，用于简单请求
export const authenticatedFetchSync = (url, options = {}) => {
  const token = localStorage.getItem('auth-token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Construct full URL if needed  
  const baseUrl = getApiBaseUrlSync();
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
  
  return fetch(fullUrl, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

// API endpoints
export const api = {
  // Auth endpoints (no token required)
  auth: {
    status: async () => {
      const baseUrl = await getApiBaseUrl();
      return httpRequest(`${baseUrl}/api/auth/status`);
    },
    login: async (username, password) => {
      const baseUrl = await getApiBaseUrl();
      return httpRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    },
    register: async (username, password) => {
      const baseUrl = await getApiBaseUrl();
      return httpRequest(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    },
    user: () => authenticatedFetch('/api/auth/user'),
    logout: () => authenticatedFetch('/api/auth/logout', { method: 'POST' }),
  },
  
  // Protected endpoints
  config: () => authenticatedFetch('/api/config'),
  projects: () => authenticatedFetch('/api/projects'),
  sessions: (projectName, limit = 5, offset = 0) => 
    authenticatedFetch(`/api/projects/${projectName}/sessions?limit=${limit}&offset=${offset}`),
  sessionMessages: (projectName, sessionId) =>
    authenticatedFetch(`/api/projects/${projectName}/sessions/${sessionId}/messages`),
  renameProject: (projectName, displayName) =>
    authenticatedFetch(`/api/projects/${projectName}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ displayName }),
    }),
  deleteSession: (projectName, sessionId) =>
    authenticatedFetch(`/api/projects/${projectName}/sessions/${sessionId}`, {
      method: 'DELETE',
    }),
  deleteProject: (projectName) =>
    authenticatedFetch(`/api/projects/${projectName}`, {
      method: 'DELETE',
    }),
  createProject: (path) =>
    authenticatedFetch('/api/projects/create', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  readFile: (projectName, filePath) =>
    authenticatedFetch(`/api/projects/${projectName}/file?filePath=${encodeURIComponent(filePath)}`),
  saveFile: (projectName, filePath, content) =>
    authenticatedFetch(`/api/projects/${projectName}/file`, {
      method: 'PUT',
      body: JSON.stringify({ filePath, content }),
    }),
  getFiles: (projectName) =>
    authenticatedFetch(`/api/projects/${projectName}/files`),
  transcribe: (formData) =>
    authenticatedFetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  // 新增: 测试服务器连接的方法
  testConnection: async (serverUrl) => {
    try {
      const response = await httpRequest(`${serverUrl}/api/auth/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        connectTimeout: 10000,
        readTimeout: 10000,
      });

      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
  },
};

// 导出方法供其他组件使用
export { getApiBaseUrl, getApiBaseUrlSync };