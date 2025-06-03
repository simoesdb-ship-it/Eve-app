import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { 
  users, patterns, locations, patternSuggestions, votes, activity, trackingPoints,
  type User, type InsertUser, type Pattern, type InsertPattern, 
  type Location, type InsertLocation, type PatternSuggestion, type InsertPatternSuggestion,
  type Vote, type InsertVote, type Activity, type InsertActivity,
  type TrackingPoint, type InsertTrackingPoint, type PatternWithVotes
} from "@shared/schema";

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
  createTrackingPoint(point: InsertTrackingPoint): Promise<TrackingPoint>;
  getTrackingPointsBySession(sessionId: string): Promise<TrackingPoint[]>;
  getTrackingPointsInRadius(lat: number, lng: number, radiusKm: number, sessionId: string): Promise<TrackingPoint[]>;
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
    // Initialize patterns if database is empty
    const existingPatterns = await db.select().from(patterns);
    if (existingPatterns.length === 0) {
      await this.initializePatterns();
      return await db.select().from(patterns);
    }
    return existingPatterns;
  }

  private async initializePatterns(): Promise<void> {
    const initialPatterns: InsertPattern[] = [
      {
        number: 52,
        name: "Network of Paths and Cars",
        description: "Cars are dangerous to pedestrians; yet activities and people's movement patterns on foot are incompatible with the grid of streets and roads that this movement requires.",
        fullDescription: "Cars are dangerous to pedestrians; yet activities and people's movement patterns on foot are incompatible with the grid of streets and roads that this movement requires. The conflict can be resolved by making a complete separation between paths for people and roads for cars.",
        category: "Transportation",
        keywords: ["pedestrian", "walkway", "traffic", "safety", "urban"],
        iconName: "footprints",
        moodColor: "structured"
      },
      {
        number: 61,
        name: "Small Public Squares",
        description: "A town needs public squares; they are the largest, most public rooms, that the town has.",
        fullDescription: "A town needs public squares; they are the largest, most public rooms, that the town has. But when they are too large, they look and feel deserted.",
        category: "Public Space",
        keywords: ["plaza", "gathering", "public", "community", "center"],
        iconName: "square",
        moodColor: "community"
      },
      {
        number: 88,
        name: "Street Café",
        description: "The street café provides a unique setting, special to the activity of drinking.",
        fullDescription: "The street café provides a unique setting, special to the activity of drinking. If the café cannot be on a sidewalk, a terrace or a place where people can sit lazily, the café will not provide the magic of a street café.",
        category: "Commercial",
        keywords: ["cafe", "outdoor", "seating", "social", "dining"],
        iconName: "coffee",
        moodColor: "warm"
      },
      {
        number: 100,
        name: "Pedestrian Street",
        description: "In the right circumstances, a street closed to traffic can become a wonderful place for people.",
        fullDescription: "In the right circumstances, a street closed to traffic can become a wonderful place for people. But not all streets should be closed to traffic. The ones that should be closed are those which are small enough, and active enough, so that they are not overwhelmed by people walking.",
        category: "Transportation",
        keywords: ["pedestrian", "walkway", "no-cars", "public", "street"],
        iconName: "road",
        moodColor: "active"
      },
      {
        number: 106,
        name: "Positive Outdoor Space",
        description: "Outdoor spaces which are merely 'left over' between buildings will, in general, not be used.",
        fullDescription: "Outdoor spaces which are merely 'left over' between buildings will, in general, not be used. Instead of making buildings, and then treating the open space between them as leftover, start with the open space and make it positive.",
        category: "Landscape",
        keywords: ["outdoor", "space", "landscape", "design", "natural"],
        iconName: "trees",
        moodColor: "natural"
      }
    ];

    for (const pattern of initialPatterns) {
      await db.insert(patterns).values(pattern);
    }
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
        confidence: Number(suggestion.confidence),
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

  async createTrackingPoint(insertPoint: InsertTrackingPoint): Promise<TrackingPoint> {
    const [trackingPoint] = await db.insert(trackingPoints).values(insertPoint).returning();
    return trackingPoint;
  }

  async getTrackingPointsBySession(sessionId: string): Promise<TrackingPoint[]> {
    return await db.select().from(trackingPoints)
      .where(eq(trackingPoints.sessionId, sessionId))
      .orderBy(trackingPoints.timestamp);
  }

  async getTrackingPointsInRadius(lat: number, lng: number, radiusKm: number, sessionId: string): Promise<TrackingPoint[]> {
    const allPoints = await db.select().from(trackingPoints)
      .where(eq(trackingPoints.sessionId, sessionId));
    
    return allPoints.filter(point => {
      const distance = this.calculateDistance(lat, lng, Number(point.latitude), Number(point.longitude));
      return distance <= radiusKm;
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const storage = new DatabaseStorage();