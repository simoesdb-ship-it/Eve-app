import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { 
  users, patterns, locations, patternSuggestions, votes, activity, spatialPoints, savedLocations,
  type User, type InsertUser, type Pattern, type InsertPattern, 
  type Location, type InsertLocation, type PatternSuggestion, type InsertPatternSuggestion,
  type Vote, type InsertVote, type Activity, type InsertActivity,
  type SpatialPoint, type InsertSpatialPoint, type SavedLocation, type InsertSavedLocation, type PatternWithVotes
} from "@shared/schema";

export interface IUnifiedStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Pattern methods
  getAllPatterns(): Promise<Pattern[]>;
  getPattern(id: number): Promise<Pattern | undefined>;
  createPattern(pattern: InsertPattern): Promise<Pattern>;
  searchPatterns(keywords: string[]): Promise<Pattern[]>;

  // Unified spatial methods
  createSpatialPoint(point: InsertSpatialPoint): Promise<SpatialPoint>;
  getSpatialPointsBySession(sessionId: string, type?: string): Promise<SpatialPoint[]>;
  getSpatialPointsInRadius(lat: number, lng: number, radiusKm: number, sessionId: string, type?: string): Promise<SpatialPoint[]>;
  
  // Location analysis (creates spatial points with type 'analyzed')
  analyzeLocation(location: InsertLocation): Promise<Location>;
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

  // Derived activity methods (no separate storage)
  getRecentActivity(limit: number): Promise<Activity[]>;

  // Statistics
  getStats(sessionId: string): Promise<{
    suggestedPatterns: number;
    votesContributed: number;
    offlinePatterns: number;
  }>;

  // Saved location methods (now using spatial points)
  createSavedLocation(location: InsertSavedLocation): Promise<SavedLocation>;
  getSavedLocationsBySession(sessionId: string): Promise<SavedLocation[]>;
  deleteSavedLocation(id: number, sessionId: string): Promise<void>;

  // Legacy compatibility
  createTrackingPoint(point: { latitude: string; longitude: string; sessionId: string }): Promise<any>;
  getTrackingPointsBySession(sessionId: string): Promise<any[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

export class UnifiedStorage implements IUnifiedStorage {
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
    return await db.select().from(patterns);
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
        pattern.name.toLowerCase().includes(keyword.toLowerCase()) ||
        pattern.description.toLowerCase().includes(keyword.toLowerCase()) ||
        pattern.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
      )
    );
  }

  // Unified spatial data methods
  async createSpatialPoint(insertPoint: InsertSpatialPoint): Promise<SpatialPoint> {
    const [spatialPoint] = await db.insert(spatialPoints).values(insertPoint).returning();
    return spatialPoint;
  }

  async getSpatialPointsBySession(sessionId: string, type?: string): Promise<SpatialPoint[]> {
    const conditions = [eq(spatialPoints.sessionId, sessionId)];
    if (type) {
      conditions.push(eq(spatialPoints.type, type));
    }
    return await db.select().from(spatialPoints)
      .where(and(...conditions))
      .orderBy(spatialPoints.createdAt);
  }

  async getSpatialPointsInRadius(lat: number, lng: number, radiusKm: number, sessionId: string, type?: string): Promise<SpatialPoint[]> {
    const conditions = [eq(spatialPoints.sessionId, sessionId)];
    if (type) {
      conditions.push(eq(spatialPoints.type, type));
    }
    
    const allPoints = await db.select().from(spatialPoints).where(and(...conditions));
    
    return allPoints.filter(point => {
      const distance = this.calculateDistance(lat, lng, Number(point.latitude), Number(point.longitude));
      return distance <= radiusKm;
    });
  }

  async analyzeLocation(insertLocation: InsertLocation): Promise<Location> {
    // Create location record
    const [location] = await db.insert(locations).values(insertLocation).returning();
    
    // Create corresponding spatial point for unified tracking
    await this.createSpatialPoint({
      latitude: insertLocation.latitude,
      longitude: insertLocation.longitude,
      sessionId: insertLocation.sessionId,
      type: 'analyzed',
      metadata: JSON.stringify({ locationId: location.id })
    });
    
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

  async createPatternSuggestion(insertSuggestion: InsertPatternSuggestion): Promise<PatternSuggestion> {
    const [suggestion] = await db.insert(patternSuggestions).values(insertSuggestion).returning();
    return suggestion;
  }

  async getSuggestionsForLocation(locationId: number): Promise<PatternSuggestion[]> {
    return await db.select().from(patternSuggestions).where(eq(patternSuggestions.locationId, locationId));
  }

  async getPatternsForLocation(locationId: number, sessionId: string): Promise<PatternWithVotes[]> {
    const suggestions = await db.select({
      id: patternSuggestions.id,
      locationId: patternSuggestions.locationId,
      patternId: patternSuggestions.patternId,
      confidence: patternSuggestions.confidence,
      createdAt: patternSuggestions.createdAt,
      pattern: patterns
    })
    .from(patternSuggestions)
    .innerJoin(patterns, eq(patternSuggestions.patternId, patterns.id))
    .where(eq(patternSuggestions.locationId, locationId));

    const results: PatternWithVotes[] = [];
    
    for (const suggestion of suggestions) {
      const allVotes = await db.select().from(votes).where(eq(votes.suggestionId, suggestion.id));
      const userVote = await db.select().from(votes)
        .where(and(eq(votes.suggestionId, suggestion.id), eq(votes.sessionId, sessionId)))
        .limit(1);

      const upvotes = allVotes.filter(v => v.voteType === 'up').length;
      const downvotes = allVotes.filter(v => v.voteType === 'down').length;

      results.push({
        ...suggestion.pattern,
        upvotes,
        downvotes,
        confidence: Number(suggestion.confidence),
        suggestionId: suggestion.id,
        userVote: userVote[0]?.voteType as 'up' | 'down' | undefined || null
      });
    }

    return results;
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
      .where(and(eq(votes.suggestionId, suggestionId), eq(votes.sessionId, sessionId)))
      .limit(1);
    return vote || undefined;
  }

  // Derived activity from actual data changes
  async getRecentActivity(limit: number): Promise<Activity[]> {
    const activities: Activity[] = [];
    
    // Get recent location analyses
    const recentLocations = await db.select().from(locations)
      .orderBy(sql`${locations.createdAt} DESC`)
      .limit(Math.floor(limit / 2));
    
    for (const location of recentLocations) {
      activities.push({
        id: location.id,
        type: 'visit',
        description: `New location analyzed at ${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`,
        locationId: location.id,
        sessionId: location.sessionId,
        createdAt: location.createdAt
      });
    }

    // Get recent votes
    const recentVotes = await db.select().from(votes)
      .orderBy(sql`${votes.createdAt} DESC`)
      .limit(Math.floor(limit / 2));
    
    for (const vote of recentVotes) {
      activities.push({
        id: vote.id + 10000, // Offset to avoid ID conflicts
        type: 'vote',
        description: `${vote.voteType === 'up' ? 'Upvoted' : 'Downvoted'} pattern suggestion`,
        locationId: null,
        sessionId: vote.sessionId,
        createdAt: vote.createdAt
      });
    }

    return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }

  async getStats(sessionId: string): Promise<{ suggestedPatterns: number; votesContributed: number; offlinePatterns: number; }> {
    const userLocations = await db.select().from(locations).where(eq(locations.sessionId, sessionId));
    const userVotes = await db.select().from(votes).where(eq(votes.sessionId, sessionId));
    const allPatterns = await db.select().from(patterns);
    
    let totalSuggestions = 0;
    for (const location of userLocations) {
      const suggestions = await db.select().from(patternSuggestions).where(eq(patternSuggestions.locationId, location.id));
      totalSuggestions += suggestions.length;
    }

    return {
      suggestedPatterns: totalSuggestions,
      votesContributed: userVotes.length,
      offlinePatterns: allPatterns.length
    };
  }

  // Legacy compatibility methods
  async createTrackingPoint(point: { latitude: string; longitude: string; sessionId: string }): Promise<any> {
    const spatialPoint = await this.createSpatialPoint({
      latitude: point.latitude,
      longitude: point.longitude,
      sessionId: point.sessionId,
      type: 'tracking',
      metadata: '{}'
    });
    
    return {
      id: spatialPoint.id,
      latitude: spatialPoint.latitude,
      longitude: spatialPoint.longitude,
      sessionId: spatialPoint.sessionId,
      timestamp: spatialPoint.createdAt
    };
  }

  async getTrackingPointsBySession(sessionId: string): Promise<any[]> {
    const spatialPoints = await this.getSpatialPointsBySession(sessionId, 'tracking');
    
    return spatialPoints.map(point => ({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      sessionId: point.sessionId,
      timestamp: point.createdAt
    }));
  }

  // Saved location methods using spatial points
  async createSavedLocation(insertLocation: InsertSavedLocation): Promise<SavedLocation> {
    const [savedLocation] = await db.insert(savedLocations).values(insertLocation).returning();
    
    // Create corresponding spatial point
    await this.createSpatialPoint({
      latitude: insertLocation.latitude,
      longitude: insertLocation.longitude,
      sessionId: insertLocation.sessionId,
      type: 'saved',
      metadata: JSON.stringify({ savedLocationId: savedLocation.id, name: insertLocation.name })
    });
    
    return savedLocation;
  }

  async getSavedLocationsBySession(sessionId: string): Promise<SavedLocation[]> {
    return await db.select().from(savedLocations).where(eq(savedLocations.sessionId, sessionId));
  }

  async deleteSavedLocation(id: number, sessionId: string): Promise<void> {
    await db.delete(savedLocations).where(and(eq(savedLocations.id, id), eq(savedLocations.sessionId, sessionId)));
    
    // Also remove corresponding spatial point
    const spatialPointsToDelete = await db.select().from(spatialPoints)
      .where(and(
        eq(spatialPoints.sessionId, sessionId),
        eq(spatialPoints.type, 'saved'),
        sql`${spatialPoints.metadata}::jsonb->>'savedLocationId' = ${id.toString()}`
      ));
    
    for (const point of spatialPointsToDelete) {
      await db.delete(spatialPoints).where(eq(spatialPoints.id, point.id));
    }
  }

  // Legacy compatibility methods
  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    return await this.analyzeLocation(insertLocation);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    // Activity is now derived, but for compatibility we'll create a minimal record
    const [activityRecord] = await db.insert(activity).values(insertActivity).returning();
    return activityRecord;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const unifiedStorage = new UnifiedStorage();