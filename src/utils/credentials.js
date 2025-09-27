import { Preferences } from '@capacitor/preferences';
import PlatformUtils from './platform';

// 密钥用于简单加密（在真实应用中应该使用更安全的方法）
const STORAGE_KEY = 'claude-credentials';
const REMEMBER_KEY = 'claude-remember';

// 简单的加密/解密功能（仅用于混淆，不是真正的安全加密）
const simpleEncrypt = (text) => {
  return btoa(text);
};

const simpleDecrypt = (encryptedText) => {
  try {
    return atob(encryptedText);
  } catch (error) {
    console.error('Failed to decrypt:', error);
    return null;
  }
};

export const credentialsStorage = {
  // 保存凭据
  async saveCredentials(username, password, remember = false) {
    try {
      if (!remember) {
        await this.clearCredentials();
        return;
      }

      const credentials = {
        username,
        password: simpleEncrypt(password),
        timestamp: Date.now(),
      };

      if (PlatformUtils.isNative()) {
        await Preferences.set({
          key: STORAGE_KEY,
          value: JSON.stringify(credentials)
        });
        await Preferences.set({
          key: REMEMBER_KEY,
          value: 'true'
        });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
        localStorage.setItem(REMEMBER_KEY, 'true');
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  },

  // 获取保存的凭据
  async getSavedCredentials() {
    try {
      let credentialsData = null;
      let rememberSetting = null;

      if (PlatformUtils.isNative()) {
        const credentialsResult = await Preferences.get({ key: STORAGE_KEY });
        const rememberResult = await Preferences.get({ key: REMEMBER_KEY });
        credentialsData = credentialsResult.value;
        rememberSetting = rememberResult.value;
      } else {
        credentialsData = localStorage.getItem(STORAGE_KEY);
        rememberSetting = localStorage.getItem(REMEMBER_KEY);
      }

      if (!credentialsData || !rememberSetting) {
        return null;
      }

      const credentials = JSON.parse(credentialsData);
      
      // 检查凭据是否过期（30天）
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (credentials.timestamp && (now - credentials.timestamp) > thirtyDays) {
        await this.clearCredentials();
        return null;
      }

      const decryptedPassword = simpleDecrypt(credentials.password);
      if (!decryptedPassword) {
        await this.clearCredentials();
        return null;
      }

      return {
        username: credentials.username,
        password: decryptedPassword,
        remember: true,
      };
    } catch (error) {
      console.error('Failed to get saved credentials:', error);
      return null;
    }
  },

  // 清除保存的凭据
  async clearCredentials() {
    try {
      if (PlatformUtils.isNative()) {
        await Preferences.remove({ key: STORAGE_KEY });
        await Preferences.remove({ key: REMEMBER_KEY });
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  },

  // 检查是否启用了记住密码
  async isRememberEnabled() {
    try {
      let rememberSetting = null;

      if (PlatformUtils.isNative()) {
        const result = await Preferences.get({ key: REMEMBER_KEY });
        rememberSetting = result.value;
      } else {
        rememberSetting = localStorage.getItem(REMEMBER_KEY);
      }

      return rememberSetting === 'true';
    } catch (error) {
      console.error('Failed to check remember setting:', error);
      return false;
    }
  },

  // 保存服务器配置
  async saveServerConfig(serverUrl) {
    try {
      if (PlatformUtils.isNative()) {
        await Preferences.set({
          key: 'claude-server-url',
          value: serverUrl
        });
      } else {
        localStorage.setItem('claude-server-url', serverUrl);
      }
    } catch (error) {
      console.error('Failed to save server config:', error);
    }
  },

  // 获取服务器配置
  async getServerConfig() {
    try {
      let serverUrl = null;

      if (PlatformUtils.isNative()) {
        const result = await Preferences.get({ key: 'claude-server-url' });
        serverUrl = result.value;
      } else {
        serverUrl = localStorage.getItem('claude-server-url');
      }

      return serverUrl;
    } catch (error) {
      console.error('Failed to get server config:', error);
      return null;
    }
  },
};