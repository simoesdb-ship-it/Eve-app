import { db } from "./db";
import { spatialPoints, locations } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface LocationTimeSpent {
  locationId: number;
  timeSpentMinutes: number;
  firstVisit: Date;
  lastVisit: Date;
  visitCount: number;
  averageSessionDuration: number;
  visitFrequency: number; // visits per day
  interpolatedPoints: number; // number of points interpolated due to clustering
}

export interface VotingEligibility {
  canVote: boolean;
  weight: number;
  timeSpentMinutes: number;
  movementBreakdown: {
    walkingMinutes: number;
    bikingMinutes: number;
    drivingMinutes: number;
    stationaryMinutes: number;
    transitMinutes: number;
  };
  weightFactors: {
    baseTimeWeight: number;
    movementTypeBonus: number;
    frequencyMultiplier: number;
    totalWeight: number;
  };
  reason?: string;
}

export class TimeTrackingService {
  private readonly MINIMUM_TIME_FOR_VOTING = 5; // minutes
  private readonly MAXIMUM_VOTING_WEIGHT = 10.0; // max weight multiplier
  private readonly TIME_WEIGHT_FACTOR = 0.1; // weight increase per minute
  private readonly CLUSTERING_RADIUS_KM = 0.1; // 100 meters for coordinate interpolation
  private readonly TRACKING_INTERVAL_MINUTES = 3; // tracking every 3 minutes
  private readonly MAX_GAP_TOLERANCE_MINUTES = 6; // allow up to 6 minutes gap in visits

  /**
   * Calculate time spent by a session at a specific location with coordinate interpolation
   */
  async calculateTimeAtLocation(sessionId: string, locationId: number): Promise<LocationTimeSpent> {
    // Get location coordinates
    const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    const locationLat = parseFloat(location.latitude);
    const locationLng = parseFloat(location.longitude);

    // Get all spatial points for this session
    const allPoints = await db.select().from(spatialPoints)
      .where(eq(spatialPoints.sessionId, sessionId))
      .orderBy(spatialPoints.createdAt);

    if (allPoints.length === 0) {
      return {
        locationId,
        timeSpentMinutes: 0,
        firstVisit: new Date(),
        lastVisit: new Date(),
        visitCount: 0,
        averageSessionDuration: 0,
        visitFrequency: 0,
        interpolatedPoints: 0
      };
    }

    // Find points near the location and interpolate coordinates that are close enough to be clustered
    const { nearbyPoints, interpolatedCount } = this.findAndInterpolateNearbyPoints(
      allPoints, 
      locationLat, 
      locationLng
    );

    if (nearbyPoints.length === 0) {
      return {
        locationId,
        timeSpentMinutes: 0,
        firstVisit: new Date(),
        lastVisit: new Date(),
        visitCount: 0,
        averageSessionDuration: 0,
        visitFrequency: 0,
        interpolatedPoints: interpolatedCount
      };
    }

    // Group consecutive visits with improved gap tolerance
    const visits = this.groupConsecutiveVisits(nearbyPoints);
    
    // Calculate time spent and visit statistics
    const { totalMinutes, visitDurations } = this.calculateVisitTimes(visits);
    const averageSessionDuration = visitDurations.length > 0 
      ? visitDurations.reduce((sum, duration) => sum + duration, 0) / visitDurations.length 
      : 0;

    // Calculate visit frequency (visits per day)
    const timeSpanDays = Math.max(1, 
      (nearbyPoints[nearbyPoints.length - 1].createdAt.getTime() - nearbyPoints[0].createdAt.getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    const visitFrequency = visits.length / timeSpanDays;

    return {
      locationId,
      timeSpentMinutes: Math.round(totalMinutes),
      firstVisit: nearbyPoints[0].createdAt,
      lastVisit: nearbyPoints[nearbyPoints.length - 1].createdAt,
      visitCount: visits.length,
      averageSessionDuration: Math.round(averageSessionDuration),
      visitFrequency: Math.round(visitFrequency * 100) / 100, // Round to 2 decimal places
      interpolatedPoints: interpolatedCount
    };
  }

  /**
   * Calculate voting eligibility and weight based on time spent at location
   */
  async calculateVotingEligibility(sessionId: string, locationId: number): Promise<VotingEligibility> {
    const timeSpent = await this.calculateTimeAtLocation(sessionId, locationId);

    if (timeSpent.timeSpentMinutes < this.MINIMUM_TIME_FOR_VOTING) {
      return {
        canVote: false,
        weight: 0,
        timeSpentMinutes: timeSpent.timeSpentMinutes,
        reason: `Minimum ${this.MINIMUM_TIME_FOR_VOTING} minutes required at location`
      };
    }

    // Calculate weight based on time spent
    // Formula: base weight (1.0) + (time_spent * factor), capped at maximum
    const weight = Math.min(
      1.0 + (timeSpent.timeSpentMinutes * this.TIME_WEIGHT_FACTOR),
      this.MAXIMUM_VOTING_WEIGHT
    );

    return {
      canVote: true,
      weight: Math.round(weight * 100) / 100, // Round to 2 decimal places
      timeSpentMinutes: timeSpent.timeSpentMinutes
    };
  }

  /**
   * Get all locations where user has voting eligibility
   */
  async getVotingEligibleLocations(sessionId: string): Promise<LocationTimeSpent[]> {
    // Get all locations where user has pattern suggestions
    const userLocations = await db.select().from(locations)
      .where(eq(locations.sessionId, sessionId));

    const eligibleLocations: LocationTimeSpent[] = [];

    for (const location of userLocations) {
      const timeSpent = await this.calculateTimeAtLocation(sessionId, location.id);
      if (timeSpent.timeSpentMinutes >= this.MINIMUM_TIME_FOR_VOTING) {
        eligibleLocations.push(timeSpent);
      }
    }

    return eligibleLocations.sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes);
  }

  /**
   * Find and interpolate nearby points that should be clustered together
   */
  private findAndInterpolateNearbyPoints(allPoints: any[], targetLat: number, targetLng: number): { nearbyPoints: any[], interpolatedCount: number } {
    const nearbyPoints: any[] = [];
    let interpolatedCount = 0;

    for (const point of allPoints) {
      const pointLat = parseFloat(point.latitude);
      const pointLng = parseFloat(point.longitude);
      const distance = this.calculateDistance(pointLat, pointLng, targetLat, targetLng);

      if (distance <= this.CLUSTERING_RADIUS_KM) {
        // If point is close enough but not exact, interpolate towards target location
        if (distance > 0.01) { // 10 meters
          const interpolatedPoint = {
            ...point,
            latitude: this.interpolateCoordinate(pointLat, targetLat, distance),
            longitude: this.interpolateCoordinate(pointLng, targetLng, distance),
            originalDistance: distance
          };
          nearbyPoints.push(interpolatedPoint);
          interpolatedCount++;
        } else {
          nearbyPoints.push(point);
        }
      }
    }

    return { nearbyPoints, interpolatedCount };
  }

  /**
   * Interpolate coordinate towards target based on distance
   */
  private interpolateCoordinate(current: number, target: number, distanceKm: number): string {
    // Interpolate closer to target if within clustering radius
    const interpolationFactor = Math.max(0.1, 1 - (distanceKm / this.CLUSTERING_RADIUS_KM));
    const interpolated = current + (target - current) * interpolationFactor;
    return interpolated.toString();
  }

  /**
   * Group consecutive visits with improved gap tolerance
   */
  private groupConsecutiveVisits(points: any[]): Date[][] {
    if (points.length === 0) return [];

    const visits: Date[][] = [];
    let currentVisit: Date[] = [points[0].createdAt];

    for (let i = 1; i < points.length; i++) {
      const timeDiff = (points[i].createdAt.getTime() - points[i-1].createdAt.getTime()) / (1000 * 60);
      
      if (timeDiff <= this.MAX_GAP_TOLERANCE_MINUTES) {
        currentVisit.push(points[i].createdAt);
      } else {
        visits.push(currentVisit);
        currentVisit = [points[i].createdAt];
      }
    }
    visits.push(currentVisit);

    return visits;
  }

  /**
   * Calculate total time and individual visit durations
   */
  private calculateVisitTimes(visits: Date[][]): { totalMinutes: number, visitDurations: number[] } {
    let totalMinutes = 0;
    const visitDurations: number[] = [];

    for (const visit of visits) {
      let visitDuration: number;
      
      if (visit.length === 1) {
        visitDuration = this.TRACKING_INTERVAL_MINUTES; // Assume minimum tracking interval
      } else {
        visitDuration = (visit[visit.length - 1].getTime() - visit[0].getTime()) / (1000 * 60);
        visitDuration = Math.max(visitDuration, this.TRACKING_INTERVAL_MINUTES);
      }
      
      totalMinutes += visitDuration;
      visitDurations.push(visitDuration);
    }

    return { totalMinutes, visitDurations };
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const timeTrackingService = new TimeTrackingService();