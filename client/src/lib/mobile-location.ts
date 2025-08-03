// Enhanced mobile location acquisition with progressive fallbacks
export interface LocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'gps-high' | 'gps-low' | 'network' | 'ip' | 'manual';
}

export class MobileLocationService {
  private static instance: MobileLocationService;
  
  static getInstance(): MobileLocationService {
    if (!this.instance) {
      this.instance = new MobileLocationService();
    }
    return this.instance;
  }

  async getLocation(allowFallbacks: boolean = true): Promise<LocationResult> {
    // Try high-accuracy GPS first
    try {
      console.log('Attempting high-accuracy GPS...');
      const position = await this.getGPSPosition(true, 15000);
      const accuracy = position.coords.accuracy;
      
      if (accuracy && accuracy <= 1000) {
        console.log(`High-accuracy GPS successful: ${accuracy}m`);
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy,
          source: 'gps-high'
        };
      }
      
      // GPS working but low accuracy - still use it if permissive
      if (accuracy && accuracy <= 3000) {
        console.log(`Medium-accuracy GPS: ${accuracy}m`);
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy,
          source: 'gps-low'
        };
      }
    } catch (error) {
      console.warn('High-accuracy GPS failed:', error);
    }

    if (!allowFallbacks) {
      throw new Error('GPS location unavailable and fallbacks disabled');
    }

    // Try low-accuracy GPS as fallback
    try {
      console.log('Trying low-accuracy GPS...');
      const position = await this.getGPSPosition(false, 20000);
      const accuracy = position.coords.accuracy;
      
      console.log(`Low-accuracy GPS: ${accuracy}m`);
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy,
        source: 'network'
      };
    } catch (error) {
      console.warn('Low-accuracy GPS failed:', error);
    }

    // Final fallback to IP-based location
    try {
      console.log('Falling back to IP-based location...');
      const ipLocation = await this.getIPLocation();
      return {
        ...ipLocation,
        source: 'ip'
      };
    } catch (error) {
      console.warn('IP location failed:', error);
    }

    throw new Error('All location methods failed');
  }

  private getGPSPosition(highAccuracy: boolean, timeout: number): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: 0 // Always get fresh location
        }
      );
    });
  }

  private async getIPLocation(): Promise<LocationResult> {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        lat: data.latitude,
        lng: data.longitude,
        accuracy: 10000, // IP location is very inaccurate
        source: 'ip'
      };
    }
    
    throw new Error('IP location unavailable');
  }

  // Progressive retry for better mobile experience
  async getLocationWithRetry(maxAttempts: number = 3): Promise<LocationResult> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Location attempt ${attempt}/${maxAttempts}`);
        return await this.getLocation(attempt === maxAttempts);
      } catch (error) {
        console.warn(`Location attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('All location attempts failed');
  }
}

export const mobileLocation = MobileLocationService.getInstance();