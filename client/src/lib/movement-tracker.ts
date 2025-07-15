// Movement Tracking Service
// Continuously tracks user location every 3 minutes and stores tracking points

import { apiRequest } from "@/lib/queryClient";
import { generateSessionId } from "@/lib/geolocation";
import type { InsertSpatialPoint, SpatialPoint } from "@shared/schema";

export class MovementTracker {
  private watchId: number | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private sessionId: string;
  private isTracking: boolean = false;
  private lastTrackingTime: number = 0;
  private readonly TRACKING_INTERVAL_MS = 30 * 1000; // 30 seconds for testing accumulation
  private readonly MIN_DISTANCE_METERS = 1; // 1 meter for testing clustering
  private lastPosition: { lat: number; lng: number } | null = null;
  private pendingPoints: InsertSpatialPoint[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

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

      // Start watching position changes with more conservative settings
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position),
        (error) => {
          console.warn('Failed to get location for tracking:', error);
          // Stop trying after multiple failures to prevent spam
          if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
          }
        },
        {
          enableHighAccuracy: true, // Use high accuracy for consistent tracking
          timeout: 20000,
          maximumAge: 60000 // Accept 1-minute-old locations for fresher data
        }
      );

      // Set up interval tracking with longer intervals to reduce spam
      this.trackingInterval = setInterval(() => {
        // Only request location update if watch position isn't already working
        if (!this.watchId) {
          this.requestLocationUpdate();
        }
      }, 180000); // 3 minutes instead of 30 seconds

      // Set up periodic sync for offline points
      this.syncInterval = setInterval(() => {
        this.syncPendingPoints();
      }, 30000); // Sync every 30 seconds

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

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Sync any pending points before stopping
    this.syncPendingPoints();

    this.isTracking = false;
    console.log('Movement tracking stopped');
  }

  // Sync pending points with offline support
  private async syncPendingPoints(): Promise<void> {
    if (this.pendingPoints.length === 0) return;

    try {
      const pointsToSync = [...this.pendingPoints];
      this.pendingPoints = [];

      for (const point of pointsToSync) {
        await apiRequest('POST', '/api/tracking', point);
      }
      
      console.log(`Synced ${pointsToSync.length} tracking points`);
    } catch (error) {
      // Re-add failed points back to pending queue
      this.pendingPoints.unshift(...this.pendingPoints);
      console.warn('Failed to sync tracking points, will retry later');
    }
  }

  // Enhanced local storage for web persistence
  private saveToLocalStorage(point: InsertTrackingPoint): void {
    try {
      const key = `tracking_${this.sessionId}`;
      const existing = localStorage.getItem(key);
      const points = existing ? JSON.parse(existing) : [];
      points.push({
        ...point,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 100 points locally
      if (points.length > 100) {
        points.splice(0, points.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(points));
    } catch (error) {
      console.warn('Failed to save tracking point to local storage');
    }
  }

  // Load tracking points from local storage
  getLocalTrackingPoints(): TrackingPoint[] {
    try {
      const key = `tracking_${this.sessionId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      
      const points = JSON.parse(stored);
      return points.map((p: any, index: number) => ({
        id: `local_${index}`,
        ...p,
        timestamp: new Date(p.timestamp)
      }));
    } catch (error) {
      console.warn('Failed to load tracking points from local storage');
      return [];
    }
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

    // Validate GPS accuracy - reject very inaccurate readings
    if (accuracy && accuracy > 100) {
      console.warn(`Tracking point accuracy too low (${accuracy}m), skipping`);
      return;
    }

    // Check if we've moved enough to warrant a new tracking point
    if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.lat,
        this.lastPosition.lng,
        latitude,
        longitude
      );

      // Skip if location jump is unrealistic (more than 1km per interval)
      if (distance > 1000) {
        console.warn(`Tracking point jump too large (${distance}m), skipping`);
        return;
      }

      if (distance < this.MIN_DISTANCE_METERS) {
        return; // Not enough movement
      }
    }

    const trackingPoint: InsertTrackingPoint = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      sessionId: this.sessionId,
      accuracy: accuracy ? accuracy.toString() : null,
      speed: speed ? speed.toString() : null,
      heading: heading ? heading.toString() : null,
    };

    // Save to local storage immediately for offline persistence
    this.saveToLocalStorage(trackingPoint);

    // Try to sync to server, add to pending queue if fails
    try {
      await apiRequest('POST', '/api/tracking', trackingPoint);
      console.log(`Tracking point recorded: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      
      // Trigger map update by dispatching a custom event
      window.dispatchEvent(new CustomEvent('trackingPointAdded', {
        detail: trackingPoint
      }));
    } catch (error) {
      this.pendingPoints.push(trackingPoint);
      console.warn('Added tracking point to pending queue (offline)');
    }
    
    this.lastPosition = currentPos;
    this.lastTrackingTime = Date.now();
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