import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Generate a unique device fingerprint for anonymous authentication
export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    // Check if we already have a stored fingerprint
    const existingFingerprint = await AsyncStorage.getItem('device_fingerprint');
    if (existingFingerprint) {
      return existingFingerprint;
    }

    // Create fingerprint components
    const platformInfo = Platform.OS;
    const timestamp = Date.now().toString();
    const randomComponent = Math.random().toString(36).substring(2, 15);
    
    // Simple hash function
    const hash = async (str: string): Promise<string> => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(36);
    };

    const combinedString = `${platformInfo}-${timestamp}-${randomComponent}`;
    const fingerprint = await hash(combinedString);
    
    // Store for future use
    await AsyncStorage.setItem('device_fingerprint', fingerprint);
    
    return fingerprint;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to simple random string
    return Math.random().toString(36).substring(2, 15);
  }
};