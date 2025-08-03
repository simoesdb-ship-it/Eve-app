import { getConsistentUserId } from './device-fingerprint';

export function generateSessionId(): string {
  return `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}

// Generate consistent user ID based on device fingerprint
export async function getAnonymousUserId(): Promise<string> {
  return await getConsistentUserId();
}

export function getCurrentPosition(forceRefresh: boolean = false): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: forceRefresh ? 0 : 300000 // Force fresh location if requested
      }
    );
  });
}

// Add visibility change listener for app foreground refresh
export function setupAppForegroundRefresh(callback: () => void): () => void {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // App came to foreground, refresh location
      callback();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

export function watchPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser.');
  }

  return navigator.geolocation.watchPosition(
    onSuccess,
    onError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }
  );
}

export function clearWatch(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
