// Adaptive GPS Tracking System
// Dynamically adjusts tracking behavior based on movement patterns

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number; // m/s
  heading?: number; // degrees
}

export interface MovementAnalysis {
  type: 'stationary' | 'walking' | 'biking' | 'driving' | 'transit';
  speed: number; // km/h
  confidence: number; // 0-1
  consistency: number; // 0-1, how consistent the movement is
  duration: number; // minutes in this movement type
}

export interface TrackingConfig {
  interval: number; // milliseconds between GPS readings
  accuracy: 'high' | 'medium' | 'low';
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}

export class AdaptiveGPSTracker {
  private isTracking = false;
  private watchId: number | null = null;
  private positionHistory: GPSPosition[] = [];
  private currentMovement: MovementAnalysis | null = null;
  private trackingConfig: TrackingConfig;
  private intervalId: number | null = null;
  private onPositionUpdate?: (position: GPSPosition, movement: MovementAnalysis) => void;
  private onMovementChange?: (oldMovement: MovementAnalysis | null, newMovement: MovementAnalysis) => void;

  // Movement classification thresholds (km/h)
  private readonly MOVEMENT_THRESHOLDS = {
    stationary: 0.5,     // < 0.5 km/h
    walking: 6,          // 0.5 - 6 km/h
    biking: 25,          // 6 - 25 km/h
    driving: 120,        // 25 - 120 km/h
    transit: 200         // > 120 km/h (trains, etc.)
  };

  // Adaptive tracking configurations
  private readonly TRACKING_CONFIGS = {
    stationary: {
      interval: 30000,   // 30 seconds - less frequent when stationary
      accuracy: 'medium' as const,
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000
    },
    walking: {
      interval: 10000,   // 10 seconds - standard interval
      accuracy: 'high' as const,
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    },
    biking: {
      interval: 8000,    // 8 seconds - slightly more frequent
      accuracy: 'high' as const,
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 20000
    },
    driving: {
      interval: 5000,    // 5 seconds - more frequent for fast movement
      accuracy: 'medium' as const,
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 15000
    },
    transit: {
      interval: 15000,   // 15 seconds - less critical for very fast movement
      accuracy: 'low' as const,
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30000
    }
  };

  constructor() {
    this.trackingConfig = this.TRACKING_CONFIGS.walking; // Default to walking config
    this.positionHistory = [];
  }

  startTracking(
    onPositionUpdate?: (position: GPSPosition, movement: MovementAnalysis) => void,
    onMovementChange?: (oldMovement: MovementAnalysis | null, newMovement: MovementAnalysis) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      if (this.isTracking) {
        resolve();
        return;
      }

      this.onPositionUpdate = onPositionUpdate;
      this.onMovementChange = onMovementChange;
      this.isTracking = true;

      // Start with an immediate position reading
      this.getCurrentPosition()
        .then(() => {
          this.startPeriodicTracking();
          resolve();
        })
        .catch(reject);
    });
  }

  stopTracking(): void {
    this.isTracking = false;
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('GPS tracking stopped');
  }

  private startPeriodicTracking(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      if (this.isTracking) {
        this.getCurrentPosition();
      }
    }, this.trackingConfig.interval);

    console.log(`GPS tracking started with ${this.trackingConfig.interval}ms intervals`);
  }

  private getCurrentPosition(): Promise<GPSPosition> {
    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: this.trackingConfig.enableHighAccuracy,
        timeout: this.trackingConfig.timeout,
        maximumAge: this.trackingConfig.maximumAge
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsPosition: GPSPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined
          };

          this.processPosition(gpsPosition);
          resolve(gpsPosition);
        },
        (error) => {
          console.error('GPS position error:', error);
          reject(error);
        },
        options
      );
    });
  }

  private processPosition(position: GPSPosition): void {
    // Add to position history
    this.positionHistory.push(position);
    
    // Keep only last 20 positions for analysis (about 3-5 minutes of data)
    if (this.positionHistory.length > 20) {
      this.positionHistory = this.positionHistory.slice(-20);
    }

    // Analyze movement if we have enough data
    if (this.positionHistory.length >= 3) {
      const newMovement = this.analyzeMovement();
      
      // Check if movement type changed
      if (!this.currentMovement || newMovement.type !== this.currentMovement.type) {
        const oldMovement = this.currentMovement;
        this.currentMovement = newMovement;
        
        // Update tracking configuration
        this.updateTrackingConfig(newMovement.type);
        
        // Notify about movement change
        if (this.onMovementChange) {
          this.onMovementChange(oldMovement, newMovement);
        }

        console.log(`Movement changed from ${oldMovement?.type || 'unknown'} to ${newMovement.type}`);
      } else {
        // Update existing movement data
        this.currentMovement = newMovement;
      }

      // Notify about position update
      if (this.onPositionUpdate) {
        this.onPositionUpdate(position, this.currentMovement);
      }
    }
  }

  private analyzeMovement(): MovementAnalysis {
    if (this.positionHistory.length < 3) {
      return {
        type: 'stationary',
        speed: 0,
        confidence: 0.5,
        consistency: 0,
        duration: 0
      };
    }

    // Calculate speeds between consecutive positions
    const speeds: number[] = [];
    const timeIntervals: number[] = [];

    for (let i = 1; i < this.positionHistory.length; i++) {
      const pos1 = this.positionHistory[i - 1];
      const pos2 = this.positionHistory[i];
      
      const distance = this.calculateDistance(pos1.latitude, pos1.longitude, pos2.latitude, pos2.longitude);
      const timeInterval = (pos2.timestamp - pos1.timestamp) / 1000; // seconds
      
      if (timeInterval > 0) {
        const speed = (distance / timeInterval) * 3.6; // km/h
        speeds.push(speed);
        timeIntervals.push(timeInterval);
      }
    }

    if (speeds.length === 0) {
      return {
        type: 'stationary',
        speed: 0,
        confidence: 0.5,
        consistency: 0,
        duration: 0
      };
    }

    // Calculate average speed and consistency
    const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const speedVariance = speeds.reduce((sum, speed) => sum + Math.pow(speed - averageSpeed, 2), 0) / speeds.length;
    const speedStdDev = Math.sqrt(speedVariance);
    const consistency = Math.max(0, 1 - (speedStdDev / Math.max(averageSpeed, 1)));

    // Classify movement type
    let movementType: MovementAnalysis['type'] = 'stationary';
    let confidence = 0.5;

    if (averageSpeed < this.MOVEMENT_THRESHOLDS.stationary) {
      movementType = 'stationary';
      confidence = 0.8 + (consistency * 0.2);
    } else if (averageSpeed < this.MOVEMENT_THRESHOLDS.walking) {
      movementType = 'walking';
      confidence = 0.7 + (consistency * 0.3);
    } else if (averageSpeed < this.MOVEMENT_THRESHOLDS.biking) {
      movementType = 'biking';
      confidence = 0.6 + (consistency * 0.4);
    } else if (averageSpeed < this.MOVEMENT_THRESHOLDS.driving) {
      movementType = 'driving';
      confidence = 0.7 + (consistency * 0.3);
    } else {
      movementType = 'transit';
      confidence = 0.6 + (consistency * 0.4);
    }

    // Calculate duration in current movement type
    const totalTimespan = timeIntervals.reduce((sum, interval) => sum + interval, 0);
    const duration = totalTimespan / 60; // minutes

    return {
      type: movementType,
      speed: Math.round(averageSpeed * 10) / 10, // Round to 1 decimal
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
      consistency: Math.round(consistency * 100) / 100,
      duration: Math.round(duration * 10) / 10
    };
  }

  private updateTrackingConfig(movementType: MovementAnalysis['type']): void {
    const newConfig = this.TRACKING_CONFIGS[movementType];
    
    if (JSON.stringify(newConfig) !== JSON.stringify(this.trackingConfig)) {
      this.trackingConfig = newConfig;
      
      // Restart periodic tracking with new interval
      if (this.isTracking) {
        this.startPeriodicTracking();
      }
      
      console.log(`Updated tracking config for ${movementType}:`, {
        interval: `${newConfig.interval}ms`,
        accuracy: newConfig.accuracy,
        highAccuracy: newConfig.enableHighAccuracy
      });
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for calculating distance between two GPS coordinates
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Public getters
  getCurrentMovement(): MovementAnalysis | null {
    return this.currentMovement;
  }

  getPositionHistory(): GPSPosition[] {
    return [...this.positionHistory];
  }

  getTrackingConfig(): TrackingConfig {
    return { ...this.trackingConfig };
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  // Get movement statistics
  getMovementStats(): {
    totalDistance: number; // meters
    averageSpeed: number; // km/h
    maxSpeed: number; // km/h
    trackingDuration: number; // minutes
  } {
    if (this.positionHistory.length < 2) {
      return { totalDistance: 0, averageSpeed: 0, maxSpeed: 0, trackingDuration: 0 };
    }

    let totalDistance = 0;
    const speeds: number[] = [];
    
    for (let i = 1; i < this.positionHistory.length; i++) {
      const pos1 = this.positionHistory[i - 1];
      const pos2 = this.positionHistory[i];
      
      const distance = this.calculateDistance(pos1.latitude, pos1.longitude, pos2.latitude, pos2.longitude);
      totalDistance += distance;
      
      const timeInterval = (pos2.timestamp - pos1.timestamp) / 1000;
      if (timeInterval > 0) {
        const speed = (distance / timeInterval) * 3.6; // km/h
        speeds.push(speed);
      }
    }

    const averageSpeed = speeds.length > 0 ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    
    const firstTimestamp = this.positionHistory[0].timestamp;
    const lastTimestamp = this.positionHistory[this.positionHistory.length - 1].timestamp;
    const trackingDuration = (lastTimestamp - firstTimestamp) / (1000 * 60); // minutes

    return {
      totalDistance: Math.round(totalDistance),
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      trackingDuration: Math.round(trackingDuration * 10) / 10
    };
  }
}