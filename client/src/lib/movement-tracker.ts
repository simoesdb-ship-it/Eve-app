// Movement Tracking Service
// Continuously tracks user location every 3 minutes and stores tracking points

import { apiRequest } from "@/lib/queryClient";
import { generateSessionId } from "@/lib/geolocation";
import type { InsertTrackingPoint, TrackingPoint } from "@shared/schema";

export class MovementTracker {
  private watchId: number | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private sessionId: string;
  private isTracking: boolean = false;
  private lastTrackingTime: number = 0;
  private readonly TRACKING_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
  private readonly MIN_DISTANCE_METERS = 10; // Only track if moved at least 10 meters
  private lastPosition: { lat: number; lng: number } | null = null;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || generateSessionId();
  }

  // Start continuous location tracking
  startTracking(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isTracking) {
        resolve();
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      // Start watching position changes
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position),
        (error) => console.warn('Geolocation error:', error),
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000 // 1 minute
        }
      );

      // Set up interval tracking
      this.trackingInterval = setInterval(() => {
        this.requestLocationUpdate();
      }, this.TRACKING_INTERVAL_MS);

      this.isTracking = true;
      console.log('Movement tracking started - recording every 3 minutes');
      resolve();
    });
  }

  // Stop tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.isTracking = false;
    console.log('Movement tracking stopped');
  }

  // Handle position updates from watch
  private handlePositionUpdate(position: GeolocationPosition): void {
    const now = Date.now();
    const timeSinceLastTrack = now - this.lastTrackingTime;

    // Only track if enough time has passed
    if (timeSinceLastTrack >= this.TRACKING_INTERVAL_MS) {
      this.recordTrackingPoint(position);
    }
  }

  // Request a location update for interval tracking
  private requestLocationUpdate(): void {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => this.recordTrackingPoint(position),
      (error) => console.warn('Failed to get location for tracking:', error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  }

  // Record a tracking point if movement threshold is met
  private async recordTrackingPoint(position: GeolocationPosition): Promise<void> {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const currentPos = { lat: latitude, lng: longitude };

    // Check if we've moved enough to warrant a new tracking point
    if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.lat,
        this.lastPosition.lng,
        latitude,
        longitude
      );

      if (distance < this.MIN_DISTANCE_METERS) {
        return; // Not enough movement
      }
    }

    try {
      const trackingPoint: InsertTrackingPoint = {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        sessionId: this.sessionId,
        accuracy: accuracy ? accuracy.toString() : null,
        speed: speed ? speed.toString() : null,
        heading: heading ? heading.toString() : null,
      };

      await apiRequest('/api/tracking', 'POST', trackingPoint);
      
      this.lastPosition = currentPos;
      this.lastTrackingTime = Date.now();
      
      console.log(`Tracking point recorded: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    } catch (error) {
      console.error('Failed to record tracking point:', error);
    }
  }

  // Calculate distance between two points in meters
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get all tracking points for current session
  async getTrackingPoints(): Promise<TrackingPoint[]> {
    try {
      const response = await fetch(`/api/tracking/${this.sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch tracking points');
      return response.json();
    } catch (error) {
      console.error('Error fetching tracking points:', error);
      return [];
    }
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Check if currently tracking
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

// Global tracker instance
let globalTracker: MovementTracker | null = null;

export function getMovementTracker(sessionId?: string): MovementTracker {
  if (!globalTracker) {
    globalTracker = new MovementTracker(sessionId);
  }
  return globalTracker;
}

export function startGlobalTracking(sessionId?: string): Promise<void> {
  const tracker = getMovementTracker(sessionId);
  return tracker.startTracking();
}

export function stopGlobalTracking(): void {
  if (globalTracker) {
    globalTracker.stopTracking();
  }
}