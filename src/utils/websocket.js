import { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl } from './api';

export function useWebSocket() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const connect = async () => {
    try {
      // Get authentication token
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.warn('No authentication token found for WebSocket connection');
        return;
      }
      
      // Use the same API base URL logic as other requests
      const apiBaseUrl = await getApiBaseUrl();
      console.log('WebSocket using API base URL:', apiBaseUrl);
      
      // Convert HTTP(S) URL to WebSocket URL
      const wsBaseUrl = apiBaseUrl.replace(/^https?:/, apiBaseUrl.startsWith('https:') ? 'wss:' : 'ws:');
      
      // Include token in WebSocket URL as query parameter
      const wsUrl = `${wsBaseUrl}/ws?token=${encodeURIComponent(token)}`;
      console.log('WebSocket connecting to:', wsUrl);
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages(prev => [...prev, data]);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setWs(null);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting WebSocket reconnection...');
          connect();
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  };

  const sendMessage = (message) => {
    if (ws && isConnected) {
      console.log('Sending WebSocket message:', message.type);
      ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected. Connection state:', { ws: !!ws, isConnected });
      // TODO: 可以在这里添加UI提示用户连接失败
    }
  };

  return {
    ws,
    sendMessage,
    messages,
    isConnected
  };
}