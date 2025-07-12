import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users, patterns, locations, patternSuggestions, votes, activity, spatialPoints, savedLocations, deviceRegistrations,
  type User, type InsertUser,
  type Pattern, type InsertPattern,
  type Location, type InsertLocation,
  type PatternSuggestion, type InsertPatternSuggestion,
  type Vote, type InsertVote,
  type Activity, type InsertActivity,
  type ActivityWithLocation,
  type SpatialPoint, type InsertSpatialPoint,
  type SavedLocation, type InsertSavedLocation,
  type DeviceRegistration, type InsertDeviceRegistration
} from "@shared/schema";

export interface PatternWithVotes extends Pattern {
  upvotes: number;
  downvotes: number;
  confidence: number;
  suggestionId: number;
  userVote: 'up' | 'down' | null;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Pattern methods
  getAllPatterns(): Promise<Pattern[]>;
  getPattern(id: number): Promise<Pattern | undefined>;
  createPattern(pattern: InsertPattern): Promise<Pattern>;
  searchPatterns(keywords: string[]): Promise<Pattern[]>;

  // Location methods
  createLocation(location: InsertLocation): Promise<Location>;
  getLocationsBySession(sessionId: string): Promise<Location[]>;
  getNearbyLocations(lat: number, lng: number, radiusKm: number): Promise<Location[]>;

  // Pattern suggestion methods
  createPatternSuggestion(suggestion: InsertPatternSuggestion): Promise<PatternSuggestion>;
  getSuggestionsForLocation(locationId: number): Promise<PatternSuggestion[]>;
  getPatternsForLocation(locationId: number, sessionId: string): Promise<PatternWithVotes[]>;

  // Voting methods
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesForSuggestion(suggestionId: number): Promise<Vote[]>;
  getUserVoteForSuggestion(suggestionId: number, sessionId: string): Promise<Vote | undefined>;

  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivity(limit: number): Promise<Activity[]>;

  // Statistics
  getStats(sessionId: string): Promise<{
    suggestedPatterns: number;
    votesContributed: number;
    offlinePatterns: number;
  }>;

  // Tracking methods
  createTrackingPoint(point: InsertSpatialPoint): Promise<SpatialPoint>;
  getTrackingPointsBySession(sessionId: string): Promise<SpatialPoint[]>;
  getTrackingPointsInRadius(lat: number, lng: number, radiusKm: number, sessionId: string): Promise<SpatialPoint[]>;

  // Saved locations methods
  getSavedLocations(limit: number): Promise<SavedLocation[]>;
  createSavedLocation(location: InsertSavedLocation): Promise<SavedLocation>;
  getSavedLocationsBySession(sessionId: string): Promise<SavedLocation[]>;
  deleteSavedLocation(id: number, sessionId: string): Promise<void>;

  // Device registration methods
  getDeviceRegistration(deviceId: string): Promise<DeviceRegistration | undefined>;
  createDeviceRegistration(registration: InsertDeviceRegistration): Promise<DeviceRegistration>;
  updateDeviceLastSeen(deviceId: string): Promise<void>;

  // Live voting methods
  getRecentVotesForPattern(suggestionId: number, limit?: number): Promise<any[]>;
  getRecentVotingActivity(locationId: number, limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllPatterns(): Promise<Pattern[]> {
    return await db.select().from(patterns).orderBy(patterns.number);
  }

  async getPattern(id: number): Promise<Pattern | undefined> {
    const [pattern] = await db.select().from(patterns).where(eq(patterns.id, id));
    return pattern || undefined;
  }

  async createPattern(insertPattern: InsertPattern): Promise<Pattern> {
    const [pattern] = await db.insert(patterns).values(insertPattern).returning();
    return pattern;
  }

  async searchPatterns(keywords: string[]): Promise<Pattern[]> {
    const allPatterns = await db.select().from(patterns);
    return allPatterns.filter(pattern => 
      keywords.some(keyword => 
        pattern.name.toLowerCase().includes(keyword) ||
        pattern.description.toLowerCase().includes(keyword) ||
        pattern.keywords.some(k => k.toLowerCase().includes(keyword))
      )
    );
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(insertLocation).returning();
    return location;
  }

  async getLocationsBySession(sessionId: string): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.sessionId, sessionId));
  }

  async getNearbyLocations(lat: number, lng: number, radiusKm: number): Promise<Location[]> {
    const allLocations = await db.select().from(locations);
    return allLocations.filter(location => {
      const distance = this.calculateDistance(lat, lng, Number(location.latitude), Number(location.longitude));
      return distance <= radiusKm;
    });
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

  async createPatternSuggestion(insertSuggestion: InsertPatternSuggestion): Promise<PatternSuggestion> {
    const [suggestion] = await db.insert(patternSuggestions).values(insertSuggestion).returning();
    return suggestion;
  }

  async getSuggestionsForLocation(locationId: number): Promise<PatternSuggestion[]> {
    return await db.select().from(patternSuggestions).where(eq(patternSuggestions.locationId, locationId));
  }

  async getPatternsForLocation(locationId: number, sessionId: string): Promise<PatternWithVotes[]> {
    const suggestions = await db
      .select({
        suggestion: patternSuggestions,
        pattern: patterns
      })
      .from(patternSuggestions)
      .innerJoin(patterns, eq(patternSuggestions.patternId, patterns.id))
      .where(eq(patternSuggestions.locationId, locationId));

    const patternsWithVotes: PatternWithVotes[] = [];

    for (const { suggestion, pattern } of suggestions) {
      const allVotes = await db.select().from(votes).where(eq(votes.suggestionId, suggestion.id));
      const userVote = await db.select().from(votes)
        .where(and(eq(votes.suggestionId, suggestion.id), eq(votes.sessionId, sessionId)))
        .limit(1);

      const upvotes = allVotes.filter(v => v.voteType === 'up').length;
      const downvotes = allVotes.filter(v => v.voteType === 'down').length;

      patternsWithVotes.push({
        ...pattern,
        upvotes,
        downvotes,
        confidence: parseFloat(suggestion.confidence),
        suggestionId: suggestion.id,
        userVote: userVote[0]?.voteType as 'up' | 'down' || null
      });
    }

    return patternsWithVotes;
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(insertVote).returning();
    return vote;
  }

  async getVotesForSuggestion(suggestionId: number): Promise<Vote[]> {
    return await db.select().from(votes).where(eq(votes.suggestionId, suggestionId));
  }

  async getUserVoteForSuggestion(suggestionId: number, sessionId: string): Promise<Vote | undefined> {
    const [vote] = await db.select().from(votes)
      .where(and(eq(votes.suggestionId, suggestionId), eq(votes.sessionId, sessionId)));
    return vote || undefined;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activityRecord] = await db.insert(activity).values(insertActivity).returning();
    return activityRecord;
  }

  async getRecentActivity(limit: number): Promise<ActivityWithLocation[]> {
    console.log('Enhanced getRecentActivity called with limit:', limit);
    const activities = await db.select({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      sessionId: activity.sessionId,
      locationId: activity.locationId,
      createdAt: activity.createdAt,
      latitude: locations.latitude,
      longitude: locations.longitude,
      locationName: locations.name
    })
    .from(activity)
    .leftJoin(locations, eq(activity.locationId, locations.id))
    .orderBy(sql`${activity.createdAt} DESC`)
    .limit(limit);
    
    console.log('Activity query result sample:', activities[0]);
    return activities;
  }

  async getStats(sessionId: string): Promise<{
    suggestedPatterns: number;
    votesContributed: number;
    offlinePatterns: number;
  }> {
    const userVotes = await db.select().from(votes).where(eq(votes.sessionId, sessionId));
    const userLocations = await this.getLocationsBySession(sessionId);
    
    let suggestedPatterns = 0;
    for (const location of userLocations) {
      const suggestions = await this.getSuggestionsForLocation(location.id);
      suggestedPatterns += suggestions.length;
    }

    const allPatterns = await db.select().from(patterns);

    return {
      suggestedPatterns,
      votesContributed: userVotes.length,
      offlinePatterns: allPatterns.length
    };
  }

  async createTrackingPoint(insertPoint: InsertSpatialPoint): Promise<SpatialPoint> {
    const trackingData = {
      ...insertPoint,
      type: insertPoint.type || 'tracking' // Ensure type is always set
    };
    const [spatialPoint] = await db.insert(spatialPoints).values(trackingData).returning();
    return spatialPoint;
  }

  async getTrackingPointsBySession(sessionId: string): Promise<SpatialPoint[]> {
    return await db.select().from(spatialPoints).where(eq(spatialPoints.sessionId, sessionId));
  }

  async getTrackingPointsInRadius(lat: number, lng: number, radiusKm: number, sessionId: string): Promise<SpatialPoint[]> {
    const allPoints = await db.select().from(spatialPoints).where(eq(spatialPoints.sessionId, sessionId));
    return allPoints.filter(point => {
      const distance = this.calculateDistance(lat, lng, Number(point.latitude), Number(point.longitude));
      return distance <= radiusKm;
    });
  }

  async getSavedLocations(limit: number = 20): Promise<SavedLocation[]> {
    return await db.select().from(savedLocations)
      .orderBy(desc(savedLocations.createdAt))
      .limit(limit);
  }

  async createSavedLocation(insertLocation: InsertSavedLocation): Promise<SavedLocation> {
    const [savedLocation] = await db.insert(savedLocations).values(insertLocation).returning();
    return savedLocation;
  }

  async getSavedLocationsBySession(sessionId: string): Promise<SavedLocation[]> {
    return await db.select().from(savedLocations)
      .where(eq(savedLocations.sessionId, sessionId))
      .orderBy(desc(savedLocations.createdAt));
  }

  async deleteSavedLocation(id: number, sessionId: string): Promise<void> {
    await db.delete(savedLocations)
      .where(and(eq(savedLocations.id, id), eq(savedLocations.sessionId, sessionId)));
  }

  // Device registration methods
  async getDeviceRegistration(deviceId: string): Promise<DeviceRegistration | undefined> {
    const [registration] = await db.select().from(deviceRegistrations)
      .where(eq(deviceRegistrations.deviceId, deviceId));
    return registration;
  }

  async createDeviceRegistration(registration: InsertDeviceRegistration): Promise<DeviceRegistration> {
    const [newRegistration] = await db.insert(deviceRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    await db.update(deviceRegistrations)
      .set({ lastSeenAt: new Date() })
      .where(eq(deviceRegistrations.deviceId, deviceId));
  }

  // Live voting methods
  async getRecentVotesForPattern(suggestionId: number, limit: number = 10): Promise<any[]> {
    const recentVotes = await db.select().from(votes)
      .where(eq(votes.suggestionId, suggestionId))
      .orderBy(desc(votes.createdAt))
      .limit(limit);

    return recentVotes.map(vote => ({
      ...vote,
      movementData: vote.movementData ? JSON.parse(vote.movementData) : null
    }));
  }

  async getRecentVotingActivity(locationId: number, limit: number = 10): Promise<any[]> {
    // Get patterns for this location
    const locationPatterns = await this.getPatternsForLocation(locationId, 'system');
    const patternIds = locationPatterns.map(p => p.suggestionId);
    
    if (patternIds.length === 0) return [];

    const recentVotes = await db.select().from(votes)
      .where(inArray(votes.suggestionId, patternIds))
      .orderBy(desc(votes.createdAt))
      .limit(limit);

    // Enhance with pattern information
    return recentVotes.map(vote => {
      const pattern = locationPatterns.find(p => p.suggestionId === vote.suggestionId);
      return {
        ...vote,
        patternNumber: pattern?.number || 0,
        patternName: pattern?.name || 'Unknown Pattern',
        locationId,
        movementData: vote.movementData ? JSON.parse(vote.movementData) : null
      };
    });
  }

  // Get tracking points within radius (needed for spatial density bonus)
  async getTrackingPointsInRadius(lat: number, lng: number, radiusKm: number, excludeSessionId?: string): Promise<any[]> {
    // For now, return empty array - would need to implement proper geospatial queries
    // In a real implementation, would use PostGIS or similar for distance calculations
    return [];
  }
}

export const storage = new DatabaseStorage();