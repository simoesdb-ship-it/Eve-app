import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, patterns, locations, patternSuggestions, votes, activity, spatialPoints, savedLocations, savedLocationPatterns,
  type User, type InsertUser,
  type Pattern, type InsertPattern,
  type Location, type InsertLocation,
  type PatternSuggestion, type InsertPatternSuggestion,
  type Vote, type InsertVote,
  type Activity, type InsertActivity,
  type SpatialPoint, type InsertSpatialPoint,
  type SavedLocation, type InsertSavedLocation,
  type SavedLocationPattern, type InsertSavedLocationPattern
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
    locationsTracked: number;
    hoursContributed: number;
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
  
  // Saved location patterns
  assignPatternToSavedLocation(assignment: InsertSavedLocationPattern): Promise<SavedLocationPattern>;
  getPatternsByLocationId(savedLocationId: number): Promise<(SavedLocationPattern & { pattern: Pattern })[]>;
  removePatternFromSavedLocation(savedLocationId: number, patternId: number, sessionId: string): Promise<void>;
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

  async getRecentActivity(limit: number): Promise<Activity[]> {
    return await db.select().from(activity)
      .orderBy(sql`${activity.createdAt} DESC`)
      .limit(limit);
  }

  async getStats(sessionId: string): Promise<{
    suggestedPatterns: number;
    votesContributed: number;
    locationsTracked: number;
    hoursContributed: number;
  }> {
    const userVotes = await db.select().from(votes).where(eq(votes.sessionId, sessionId));
    const userLocations = await this.getLocationsBySession(sessionId);
    
    let suggestedPatterns = 0;
    for (const location of userLocations) {
      const suggestions = await this.getSuggestionsForLocation(location.id);
      suggestedPatterns += suggestions.length;
    }

    return {
      suggestedPatterns,
      votesContributed: userVotes.length,
      locationsTracked: userLocations.length,
      hoursContributed: Math.max(0.1, userLocations.length * 0.5)
    };
  }

  async createTrackingPoint(insertPoint: InsertSpatialPoint): Promise<SpatialPoint> {
    const [spatialPoint] = await db.insert(spatialPoints).values(insertPoint).returning();
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

  async assignPatternToSavedLocation(assignment: InsertSavedLocationPattern): Promise<SavedLocationPattern> {
    const [savedLocationPattern] = await db.insert(savedLocationPatterns).values(assignment).returning();
    return savedLocationPattern;
  }

  async getPatternsByLocationId(savedLocationId: number): Promise<(SavedLocationPattern & { pattern: Pattern })[]> {
    const results = await db.select({
      id: savedLocationPatterns.id,
      savedLocationId: savedLocationPatterns.savedLocationId,
      patternId: savedLocationPatterns.patternId,
      sessionId: savedLocationPatterns.sessionId,
      assignedAt: savedLocationPatterns.assignedAt,
      pattern: patterns
    })
    .from(savedLocationPatterns)
    .innerJoin(patterns, eq(savedLocationPatterns.patternId, patterns.id))
    .where(eq(savedLocationPatterns.savedLocationId, savedLocationId));
    
    return results;
  }

  async removePatternFromSavedLocation(savedLocationId: number, patternId: number, sessionId: string): Promise<void> {
    await db.delete(savedLocationPatterns)
      .where(and(
        eq(savedLocationPatterns.savedLocationId, savedLocationId),
        eq(savedLocationPatterns.patternId, patternId),
        eq(savedLocationPatterns.sessionId, sessionId)
      ));
  }
}

export const storage = new DatabaseStorage();