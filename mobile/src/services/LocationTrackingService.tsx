import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  timeSpent: number;
}

interface LocationContextType {
  currentLocation: LocationData | null;
  trackingPoints: TrackingPoint[];
  isTracking: boolean;
  locationPermission: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestLocationPermission: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocationTracking = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationTracking must be used within a LocationTrackingProvider');
  }
  return context;
};

interface LocationTrackingProviderProps {
  children: ReactNode;
}

export const LocationTrackingProvider: React.FC<LocationTrackingProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Pattern Discovery needs access to your location to find architectural patterns near you.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        const granted = permission === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermission(granted);
        return granted;
      } else {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        const granted = result === RESULTS.GRANTED;
        setLocationPermission(granted);
        return granted;
      }
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  };

  const startTracking = async (): Promise<void> => {
    const hasPermission = locationPermission || await requestLocationPermission();
    
    if (!hasPermission) {
      console.warn('Location permission denied');
      return;
    }

    setIsTracking(true);

    // Get initial position
    Geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        setCurrentLocation(locationData);
        
        // Add to tracking points
        const trackingPoint: TrackingPoint = {
          id: `point_${Date.now()}`,
          ...locationData,
          timeSpent: 0,
        };
        setTrackingPoints(prev => [...prev, trackingPoint]);
      },
      (error) => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    // Start continuous tracking
    const id = Geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        
        setCurrentLocation(locationData);
        
        // Update or add tracking point if moved significantly
        setTrackingPoints(prev => {
          const lastPoint = prev[prev.length - 1];
          if (!lastPoint) return prev;
          
          const distance = calculateDistance(
            lastPoint.latitude,
            lastPoint.longitude,
            locationData.latitude,
            locationData.longitude
          );
          
          // If moved more than 50 meters, create new point
          if (distance > 0.05) {
            const newPoint: TrackingPoint = {
              id: `point_${Date.now()}`,
              ...locationData,
              timeSpent: 0,
            };
            return [...prev, newPoint];
          } else {
            // Update time spent at current location
            const updatedPoints = [...prev];
            const lastIndex = updatedPoints.length - 1;
            updatedPoints[lastIndex] = {
              ...updatedPoints[lastIndex],
              timeSpent: updatedPoints[lastIndex].timeSpent + 10, // 10 second intervals
            };
            return updatedPoints;
          }
        });
      },
      (error) => {
        console.error('Watch position error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
        distanceFilter: 10, // Update every 10 meters
      }
    );

    setWatchId(id);
  };

  const stopTracking = (): void => {
    setIsTracking(false);
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Handle app state changes for background tracking
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && isTracking) {
        // Resume tracking when app becomes active
        startTracking();
      } else if (nextAppState === 'background' && isTracking) {
        // Continue tracking in background (requires background location permission)
        console.log('App in background, continuing location tracking');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isTracking]);

  // Initialize location permission check
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const value: LocationContextType = {
    currentLocation,
    trackingPoints,
    isTracking,
    locationPermission,
    startTracking,
    stopTracking,
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};