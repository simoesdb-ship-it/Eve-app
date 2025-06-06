import { db } from "./db";
import { spatialPoints, locations } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface LocationTimeSpent {
  locationId: number;
  timeSpentMinutes: number;
  firstVisit: Date;
  lastVisit: Date;
  visitCount: number;
}

export interface VotingEligibility {
  canVote: boolean;
  weight: number;
  timeSpentMinutes: number;
  reason?: string;
}

export class TimeTrackingService {
  private readonly MINIMUM_TIME_FOR_VOTING = 5; // minutes
  private readonly MAXIMUM_VOTING_WEIGHT = 10.0; // max weight multiplier
  private readonly TIME_WEIGHT_FACTOR = 0.1; // weight increase per minute

  /**
   * Calculate time spent by a session at a specific location
   */
  async calculateTimeAtLocation(sessionId: string, locationId: number): Promise<LocationTimeSpent> {
    // Get location coordinates
    const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    const locationLat = parseFloat(location.latitude);
    const locationLng = parseFloat(location.longitude);
    const RADIUS_KM = 0.1; // 100 meters

    // Get all spatial points for this session near the location
    const points = await db.select().from(spatialPoints)
      .where(and(
        eq(spatialPoints.sessionId, sessionId),
        sql`ST_DWithin(
          ST_MakePoint(${spatialPoints.longitude}::float, ${spatialPoints.latitude}::float)::geography,
          ST_MakePoint(${locationLng}, ${locationLat})::geography,
          ${RADIUS_KM * 1000}
        )`
      ))
      .orderBy(spatialPoints.createdAt);

    if (points.length === 0) {
      return {
        locationId,
        timeSpentMinutes: 0,
        firstVisit: new Date(),
        lastVisit: new Date(),
        visitCount: 0
      };
    }

    // Calculate time spent based on tracking points
    let totalMinutes = 0;
    const TRACKING_INTERVAL_MINUTES = 3; // tracking every 3 minutes

    // Group consecutive visits
    const visits: Date[][] = [];
    let currentVisit: Date[] = [points[0].createdAt];

    for (let i = 1; i < points.length; i++) {
      const timeDiff = (points[i].createdAt.getTime() - points[i-1].createdAt.getTime()) / (1000 * 60);
      
      if (timeDiff <= TRACKING_INTERVAL_MINUTES * 2) { // Allow some gap tolerance
        currentVisit.push(points[i].createdAt);
      } else {
        visits.push(currentVisit);
        currentVisit = [points[i].createdAt];
      }
    }
    visits.push(currentVisit);

    // Calculate time for each visit
    for (const visit of visits) {
      if (visit.length === 1) {
        totalMinutes += TRACKING_INTERVAL_MINUTES; // Assume minimum tracking interval
      } else {
        const visitDuration = (visit[visit.length - 1].getTime() - visit[0].getTime()) / (1000 * 60);
        totalMinutes += Math.max(visitDuration, TRACKING_INTERVAL_MINUTES);
      }
    }

    return {
      locationId,
      timeSpentMinutes: Math.round(totalMinutes),
      firstVisit: points[0].createdAt,
      lastVisit: points[points.length - 1].createdAt,
      visitCount: visits.length
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