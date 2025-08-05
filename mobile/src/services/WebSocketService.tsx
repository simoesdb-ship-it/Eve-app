import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthService';

interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  messageType: 'location_share' | 'pattern_insight' | 'encrypted_message';
  timestamp: number;
  encryptionLevel: 'none' | 'basic' | 'advanced';
  locationData?: {
    latitude: number;
    longitude: number;
    placeName?: string;
  };
  tokenCost?: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  messages: Message[];
  sendMessage: (content: string, messageType: Message['messageType'], locationData?: Message['locationData']) => void;
  connectToNearbyUsers: (latitude: number, longitude: number) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // WebSocket server URL - in production, this would be your deployed backend
  const WS_URL = __DEV__ 
    ? 'ws://localhost:5000/communication'  // Development
    : 'wss://your-app-domain.replit.app/communication'; // Production

  const connectToNearbyUsers = (latitude: number, longitude: number) => {
    if (!user) return;

    try {
      const websocket = new WebSocket(WS_URL);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Send authentication and location
        websocket.send(JSON.stringify({
          type: 'auth',
          sessionId: user.sessionId,
          username: user.username,
          location: { latitude, longitude }
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'message':
              const newMessage: Message = {
                id: data.messageId || `msg_${Date.now()}`,
                senderId: data.senderId,
                senderUsername: data.senderUsername,
                content: data.content,
                messageType: data.messageType,
                timestamp: data.timestamp,
                encryptionLevel: data.encryptionLevel,
                locationData: data.locationData,
                tokenCost: data.tokenCost,
              };
              setMessages(prev => [...prev, newMessage]);
              break;
              
            case 'user_joined':
              console.log('User joined:', data.username);
              break;
              
            case 'user_left':
              console.log('User left:', data.username);
              break;
              
            case 'error':
              console.error('WebSocket error:', data.message);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setWs(null);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setWs(websocket);
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const sendMessage = (
    content: string, 
    messageType: Message['messageType'], 
    locationData?: Message['locationData']
  ) => {
    if (!ws || !isConnected || !user) {
      console.warn('WebSocket not connected or user not authenticated');
      return;
    }

    const message = {
      type: 'send_message',
      content,
      messageType,
      locationData,
      encryptionLevel: 'basic', // Default encryption level
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(message));
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
    }
    setWs(null);
    setIsConnected(false);
    setMessages([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    messages,
    sendMessage,
    connectToNearbyUsers,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};