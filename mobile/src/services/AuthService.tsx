import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDeviceFingerprint } from '../utils/deviceFingerprint';
import { generateUsername } from '../utils/usernameGenerator';

interface User {
  sessionId: string;
  deviceId: string;
  username: string;
  tokensEarned: number;
  tokensSpent: number;
  votingPower: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  initializeAuth: () => Promise<void>;
  updateTokens: (earned: number, spent: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initializeAuth = async () => {
    try {
      // Check for existing session
      const existingSession = await AsyncStorage.getItem('user_session');
      
      if (existingSession) {
        const userData = JSON.parse(existingSession);
        setUser(userData);
      } else {
        // Create new anonymous user
        const deviceId = await generateDeviceFingerprint();
        const username = generateUsername(deviceId);
        const sessionId = `anon_${deviceId}_${Date.now()}`;
        
        const newUser: User = {
          sessionId,
          deviceId,
          username,
          tokensEarned: 0,
          tokensSpent: 0,
          votingPower: 1.0,
        };
        
        // Save to local storage
        await AsyncStorage.setItem('user_session', JSON.stringify(newUser));
        setUser(newUser);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTokens = async (earned: number, spent: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        tokensEarned: user.tokensEarned + earned,
        tokensSpent: user.tokensSpent + spent,
      };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_session', JSON.stringify(updatedUser));
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    initializeAuth,
    updateTokens,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};