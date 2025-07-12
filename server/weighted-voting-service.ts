import { db } from "./db";
import { spatialPoints, locations, votes, patternSuggestions } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface MovementAnalysis {
  movementType: 'walking' | 'biking' | 'driving' | 'stationary' | 'transit';
  timeSpentMinutes: number;
  averageSpeed: number;
  distanceCovered: number; // km
  weightFactor: number; // multiplier for voting weight
}

export interface WeightedVotingEligibility {
  canVote: boolean;
  totalWeight: number;
  baseTimeMinutes: number;
  movementBreakdown: MovementAnalysis[];
  weightComponents: {
    timeWeight: number;        // Base weight from time spent
    movementBonus: number;     // Bonus for different movement types
    engagementBonus: number;   // Bonus for meaningful engagement
    diversityBonus: number;    // Bonus for varied movement patterns
  };
  eligibilityReason: string;
}

export interface VoteWithWeight {
  suggestionId: number;
  sessionId: string;
  voteType: 'up' | 'down';
  weight: number;
  locationId: number;
  movementData: MovementAnalysis[];
  timeSpentBreakdown: Record<string, number>;
}

export class WeightedVotingService {
  // Movement type weight multipliers
  private readonly MOVEMENT_WEIGHTS = {
    walking: 1.5,     // Highest weight - pedestrian engagement
    stationary: 1.4,  // High weight - focused observation time
    biking: 1.3,      // Good weight - active engagement
    transit: 1.1,     // Moderate weight - public transport use
    driving: 0.8      // Lower weight - less engagement with environment
  };

  // Time-based voting thresholds
  private readonly MIN_TIME_FOR_VOTING = 3; // minutes
  private readonly MAX_VOTING_WEIGHT = 15.0;
  private readonly BASE_WEIGHT_FACTOR = 0.1; // weight per minute
  
  // Movement detection thresholds
  private readonly SPEED_THRESHOLDS = {
    stationary: 0.5,  // km/h
    walking: 6,       // km/h
    biking: 25,       // km/h
    driving: 80       // km/h above this is highway driving
  };

  private readonly LOCATION_RADIUS_KM = 0.15; // 150 meters for location association

  /**
   * Calculate weighted voting eligibility based on time and movement patterns
   */
  async calculateWeightedVotingEligibility(
    sessionId: string, 
    locationId: number
  ): Promise<WeightedVotingEligibility> {
    // Get location details
    const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    const locationLat = parseFloat(location.latitude);
    const locationLng = parseFloat(location.longitude);

    // Get all spatial points for this session near the location
    const spatialData = await this.getSpatialPointsNearLocation(
      sessionId, 
      locationLat, 
      locationLng
    );

    if (spatialData.length === 0) {
      return {
        canVote: false,
        totalWeight: 0,
        baseTimeMinutes: 0,
        movementBreakdown: [],
        weightComponents: { timeWeight: 0, movementBonus: 0, engagementBonus: 0, diversityBonus: 0 },
        eligibilityReason: "No time spent at this location"
      };
    }

    // Analyze movement patterns and calculate time spent
    const movementAnalysis = await this.analyzeMovementPatterns(spatialData);
    const totalTimeMinutes = movementAnalysis.reduce((sum, m) => sum + m.timeSpentMinutes, 0);

    // Check minimum time requirement
    if (totalTimeMinutes < this.MIN_TIME_FOR_VOTING) {
      return {
        canVote: false,
        totalWeight: 0,
        baseTimeMinutes: totalTimeMinutes,
        movementBreakdown: movementAnalysis,
        weightComponents: { timeWeight: 0, movementBonus: 0, engagementBonus: 0, diversityBonus: 0 },
        eligibilityReason: `Need at least ${this.MIN_TIME_FOR_VOTING} minutes at location (current: ${totalTimeMinutes.toFixed(1)} min)`
      };
    }

    // Calculate weighted voting power
    const weightComponents = this.calculateVotingWeight(movementAnalysis, totalTimeMinutes);
    const totalWeight = Math.min(
      weightComponents.timeWeight + 
      weightComponents.movementBonus + 
      weightComponents.engagementBonus + 
      weightComponents.diversityBonus,
      this.MAX_VOTING_WEIGHT
    );

    return {
      canVote: true,
      totalWeight,
      baseTimeMinutes: totalTimeMinutes,
      movementBreakdown: movementAnalysis,
      weightComponents,
      eligibilityReason: `Earned ${totalWeight.toFixed(2)}x voting weight from ${totalTimeMinutes.toFixed(1)} minutes of engagement`
    };
  }

  /**
   * Cast a weighted vote with movement pattern analysis
   */
  async castWeightedVote(vote: VoteWithWeight): Promise<void> {
    // Verify voting eligibility
    const eligibility = await this.calculateWeightedVotingEligibility(
      vote.sessionId, 
      vote.locationId
    );

    if (!eligibility.canVote) {
      throw new Error(`Not eligible to vote: ${eligibility.eligibilityReason}`);
    }

    // Check for existing vote
    const existingVote = await db.select().from(votes)
      .where(and(
        eq(votes.suggestionId, vote.suggestionId),
        eq(votes.sessionId, vote.sessionId)
      ));

    if (existingVote.length > 0) {
      throw new Error("Already voted on this suggestion");
    }

    // Store the weighted vote
    await db.insert(votes).values({
      suggestionId: vote.suggestionId,
      sessionId: vote.sessionId,
      voteType: vote.voteType,
      weight: eligibility.totalWeight.toString(),
      locationId: vote.locationId,
      timeSpentMinutes: Math.round(eligibility.baseTimeMinutes)
    });
  }

  /**
   * Get voting statistics for a pattern suggestion
   */
  async getVotingStats(suggestionId: number): Promise<{
    upVotes: number;
    downVotes: number;
    weightedScore: number;
    totalVoters: number;
    averageWeight: number;
  }> {
    const voteData = await db.select({
      voteType: votes.voteType,
      weight: votes.weight
    }).from(votes).where(eq(votes.suggestionId, suggestionId));

    let upVotes = 0;
    let downVotes = 0;
    let weightedScore = 0;
    let totalWeight = 0;

    for (const vote of voteData) {
      const weight = parseFloat(vote.weight);
      totalWeight += weight;

      if (vote.voteType === 'up') {
        upVotes++;
        weightedScore += weight;
      } else {
        downVotes++;
        weightedScore -= weight;
      }
    }

    return {
      upVotes,
      downVotes,
      weightedScore,
      totalVoters: voteData.length,
      averageWeight: voteData.length > 0 ? totalWeight / voteData.length : 0
    };
  }

  /**
   * Detect movement type based on speed and location patterns
   */
  private classifyMovement(
    speed: number, 
    previousPoints: Array<{lat: number, lng: number, timestamp: Date}>
  ): 'walking' | 'biking' | 'driving' | 'stationary' | 'transit' {
    // Stationary if very low speed
    if (speed <= this.SPEED_THRESHOLDS.stationary) {
      return 'stationary';
    }

    // Walking speed range
    if (speed <= this.SPEED_THRESHOLDS.walking) {
      return 'walking';
    }

    // Biking speed range
    if (speed <= this.SPEED_THRESHOLDS.biking) {
      // Check for bike path patterns or consistent moderate speeds
      return 'biking';
    }

    // Driving or transit
    if (speed <= this.SPEED_THRESHOLDS.driving) {
      // Could be city driving or transit - analyze patterns
      return this.distinguishDrivingFromTransit(speed, previousPoints);
    }

    // High speed driving
    return 'driving';
  }

  private distinguishDrivingFromTransit(
    speed: number, 
    points: Array<{lat: number, lng: number, timestamp: Date}>
  ): 'driving' | 'transit' {
    // Simple heuristic: consistent speed and straight lines suggest transit
    // Varying speeds and direction changes suggest driving
    if (points.length < 3) return 'driving';

    const speedVariations = this.calculateSpeedVariations(points);
    
    // Low speed variation might indicate transit
    return speedVariations < 5 ? 'transit' : 'driving';
  }

  private calculateSpeedVariations(points: Array<{lat: number, lng: number, timestamp: Date}>): number {
    // Calculate speed variations between consecutive points
    let totalVariation = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const speed1 = this.calculateSpeed(points[i-1], points[i]);
      const speed2 = this.calculateSpeed(points[i], points[i+1]);
      totalVariation += Math.abs(speed2 - speed1);
    }
    return points.length > 1 ? totalVariation / (points.length - 1) : 0;
  }

  private calculateSpeed(point1: {lat: number, lng: number, timestamp: Date}, point2: {lat: number, lng: number, timestamp: Date}): number {
    const distance = this.calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
    const timeHours = (point2.timestamp.getTime() - point1.timestamp.getTime()) / (1000 * 60 * 60);
    return timeHours > 0 ? distance / timeHours : 0;
  }

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

  private async getSpatialPointsNearLocation(
    sessionId: string,
    locationLat: number,
    locationLng: number
  ) {
    // Get all spatial points for the session
    const allPoints = await db.select().from(spatialPoints)
      .where(eq(spatialPoints.sessionId, sessionId))
      .orderBy(spatialPoints.createdAt);

    // Filter points within radius of location
    return allPoints.filter(point => {
      const distance = this.calculateDistance(
        locationLat, locationLng,
        parseFloat(point.latitude), parseFloat(point.longitude)
      );
      return distance <= this.LOCATION_RADIUS_KM;
    });
  }

  private async analyzeMovementPatterns(spatialData: any[]): Promise<MovementAnalysis[]> {
    const movementSegments: MovementAnalysis[] = [];
    
    // Group consecutive points by movement type
    let currentSegment: any[] = [];
    let currentMovementType: string | null = null;

    for (let i = 0; i < spatialData.length; i++) {
      const point = spatialData[i];
      const speed = point.speed ? parseFloat(point.speed) : 0;
      
      // Classify movement based on speed and context
      const movementType = point.movementType || this.classifyMovement(speed, spatialData.slice(Math.max(0, i-2), i+1));
      
      if (movementType !== currentMovementType) {
        // Process previous segment
        if (currentSegment.length > 0 && currentMovementType) {
          const analysis = this.analyzeSegment(currentSegment, currentMovementType);
          if (analysis) movementSegments.push(analysis);
        }
        
        // Start new segment
        currentSegment = [point];
        currentMovementType = movementType;
      } else {
        currentSegment.push(point);
      }
    }

    // Process final segment
    if (currentSegment.length > 0 && currentMovementType) {
      const analysis = this.analyzeSegment(currentSegment, currentMovementType);
      if (analysis) movementSegments.push(analysis);
    }

    return movementSegments;
  }

  private analyzeSegment(points: any[], movementType: string): MovementAnalysis | null {
    if (points.length === 0) return null;

    const startTime = new Date(points[0].createdAt);
    const endTime = new Date(points[points.length - 1].createdAt);
    const timeSpentMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    // Calculate average speed and distance
    let totalDistance = 0;
    let totalSpeed = 0;
    let speedMeasurements = 0;

    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(
        parseFloat(points[i-1].latitude), parseFloat(points[i-1].longitude),
        parseFloat(points[i].latitude), parseFloat(points[i].longitude)
      );
      totalDistance += distance;

      if (points[i].speed) {
        totalSpeed += parseFloat(points[i].speed);
        speedMeasurements++;
      }
    }

    const averageSpeed = speedMeasurements > 0 ? totalSpeed / speedMeasurements : 0;
    const weightFactor = this.MOVEMENT_WEIGHTS[movementType as keyof typeof this.MOVEMENT_WEIGHTS] || 1.0;

    return {
      movementType: movementType as any,
      timeSpentMinutes,
      averageSpeed,
      distanceCovered: totalDistance,
      weightFactor
    };
  }

  private calculateVotingWeight(
    movementAnalysis: MovementAnalysis[], 
    totalTimeMinutes: number
  ) {
    // Base weight from time spent
    const timeWeight = totalTimeMinutes * this.BASE_WEIGHT_FACTOR;

    // Movement type bonus (weighted by time spent in each mode)
    let movementBonus = 0;
    for (const movement of movementAnalysis) {
      const timeRatio = movement.timeSpentMinutes / totalTimeMinutes;
      movementBonus += timeRatio * movement.weightFactor * movement.timeSpentMinutes * 0.05;
    }

    // Engagement bonus for meaningful time investment
    const engagementBonus = totalTimeMinutes > 15 ? 2.0 : 
                           totalTimeMinutes > 10 ? 1.5 :
                           totalTimeMinutes > 5 ? 1.0 : 0;

    // Diversity bonus for varied movement patterns
    const uniqueMovementTypes = new Set(movementAnalysis.map(m => m.movementType)).size;
    const diversityBonus = uniqueMovementTypes > 2 ? 1.5 :
                          uniqueMovementTypes > 1 ? 1.0 : 0;

    return {
      timeWeight,
      movementBonus,
      engagementBonus,
      diversityBonus
    };
  }
}

export const weightedVotingService = new WeightedVotingService();