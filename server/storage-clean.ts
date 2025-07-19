import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, patterns, locations, patternSuggestions, votes, activity, spatialPoints, savedLocations, savedLocationPatterns,
  peerConnections, messages, sharedPaths, pathAccesses, deviceRegistrations,
  type User, type InsertUser,
  type Pattern, type InsertPattern,
  type Location, type InsertLocation,
  type PatternSuggestion, type InsertPatternSuggestion,
  type Vote, type InsertVote,
  type Activity, type InsertActivity,
  type SpatialPoint, type InsertSpatialPoint,
  type SavedLocation, type InsertSavedLocation,
  type SavedLocationPattern, type InsertSavedLocationPattern,
  type PeerConnection, type InsertPeerConnection,
  type Message, type InsertMessage,
  type SharedPath, type InsertSharedPath,
  type PathAccess, type InsertPathAccess,
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
  getRecentActivity(limit: number, sessionId?: string): Promise<Activity[]>;

  // Statistics
  getStats(sessionId: string): Promise<{
    suggestedPatterns: number;
    votesContributed: number;
    locationsTracked: number;
    hoursContributed: number;
  }>;

  // Location time breakdown
  getLocationTimeBreakdown(userId: string): Promise<Array<{
    locationId: number;
    locationName: string;
    totalMinutes: number;
    totalHours: number;
    visitCount: number;
    firstVisit: string;
    lastVisit: string;
    coordinates: { latitude: number; longitude: number };
  }>>;

  // Get all sessions with tracking data
  getAllSessionsWithTrackingData(): Promise<Array<{
    sessionId: string;
    pointCount: number;
    lastActivity: string;
  }>>;

  // Tracking methods
  createTrackingPoint(point: InsertSpatialPoint): Promise<SpatialPoint>;
  getTrackingPointsBySession(sessionId: string): Promise<SpatialPoint[]>;
  getTrackingPointsInRadius(lat: number, lng: number, radiusKm: number, sessionId: string): Promise<SpatialPoint[]>;

  // Saved locations methods
  getSavedLocations(limit: number): Promise<SavedLocation[]>;
  createSavedLocation(location: InsertSavedLocation): Promise<SavedLocation>;
  getSavedLocationsBySession(sessionId: string): Promise<SavedLocation[]>;
  getAllSavedLocations(): Promise<SavedLocation[]>;
  migrateSavedLocations(newUserId: string, locationIds: number[]): Promise<number>;
  deleteSavedLocation(id: number, sessionId: string): Promise<void>;
  
  // Saved location patterns
  assignPatternToSavedLocation(assignment: InsertSavedLocationPattern): Promise<SavedLocationPattern>;
  getPatternsByLocationId(savedLocationId: number): Promise<(SavedLocationPattern & { pattern: Pattern })[]>;
  removePatternFromSavedLocation(savedLocationId: number, patternId: number, sessionId: string): Promise<void>;
  
  // Communication methods for Bitcoin-powered location sharing
  createPeerConnection(connection: InsertPeerConnection): Promise<PeerConnection>;
  getPeerConnections(userId: string): Promise<PeerConnection[]>;
  updatePeerConnection(connectionId: number, updates: Partial<PeerConnection>): Promise<void>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(userId: string, peerId?: string): Promise<Message[]>;
  markMessageDelivered(messageId: number): Promise<void>;
  markMessageRead(messageId: number): Promise<void>;
  
  createSharedPath(path: InsertSharedPath): Promise<SharedPath>;
  getSharedPaths(sharerId?: string): Promise<SharedPath[]>;
  getSharedPath(pathId: number): Promise<SharedPath | undefined>;
  recordPathAccess(access: InsertPathAccess): Promise<PathAccess>;
  
  // Token operations for communication economy
  getUserTokenBalance(userId: string): Promise<number>;
  deductTokens(userId: string, amount: number): Promise<void>;
  awardTokens(userId: string, amount: number): Promise<void>;
  
  // Device registration methods
  getDeviceRegistration(deviceId: string): Promise<DeviceRegistration | undefined>;
  createDeviceRegistration(registration: InsertDeviceRegistration): Promise<DeviceRegistration>;
  updateDeviceLastSeen(deviceId: string): Promise<void>;
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

  async getRecentActivity(limit: number, sessionId?: string): Promise<Activity[]> {
    let query = db.select({
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
    .leftJoin(locations, eq(activity.locationId, locations.id));

    // Add sessionId filter if provided
    if (sessionId) {
      query = query.where(eq(activity.sessionId, sessionId));
    }

    const activities = await query
      .orderBy(sql`${activity.createdAt} DESC`)
      .limit(limit);
    
    // Clean up descriptions by removing the "New location visited:" prefix
    const cleanedActivities = activities.map(act => ({
      ...act,
      description: act.description?.replace(/^New location visited:\s*/, '') || act.description
    }));
    
    return cleanedActivities as any;
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

  async getAllSavedLocations(): Promise<SavedLocation[]> {
    return await db.select().from(savedLocations)
      .orderBy(desc(savedLocations.createdAt));
  }

  async migrateSavedLocations(newUserId: string, locationIds: number[]): Promise<number> {
    const updates = await db.update(savedLocations)
      .set({ sessionId: newUserId })
      .where(sql`${savedLocations.id} = ANY(ARRAY[${locationIds.join(', ')}])`)
      .returning();
    return updates.length;
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

  // Communication methods for Bitcoin-powered location sharing
  async createPeerConnection(connection: InsertPeerConnection): Promise<PeerConnection> {
    const [newConnection] = await db.insert(peerConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async getPeerConnections(userId: string): Promise<PeerConnection[]> {
    return await db.select().from(peerConnections)
      .where(eq(peerConnections.localUserId, userId))
      .orderBy(desc(peerConnections.lastActive));
  }

  async updatePeerConnection(connectionId: number, updates: Partial<PeerConnection>): Promise<void> {
    await db.update(peerConnections)
      .set({ ...updates, lastActive: new Date() })
      .where(eq(peerConnections.id, connectionId));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessages(userId: string, peerId?: string): Promise<Message[]> {
    let query = db.select().from(messages)
      .where(
        sql`${messages.senderId} = ${userId} OR ${messages.recipientId} = ${userId}`
      );
    
    if (peerId) {
      query = query.where(
        sql`(${messages.senderId} = ${userId} AND ${messages.recipientId} = ${peerId}) OR 
            (${messages.senderId} = ${peerId} AND ${messages.recipientId} = ${userId})`
      );
    }
    
    return await query.orderBy(desc(messages.createdAt));
  }

  async markMessageDelivered(messageId: number): Promise<void> {
    await db.update(messages)
      .set({ deliveredAt: new Date() })
      .where(eq(messages.id, messageId));
  }

  async markMessageRead(messageId: number): Promise<void> {
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, messageId));
  }

  async createSharedPath(path: InsertSharedPath): Promise<SharedPath> {
    const [newPath] = await db.insert(sharedPaths)
      .values(path)
      .returning();
    return newPath;
  }

  async getSharedPaths(sharerId?: string): Promise<SharedPath[]> {
    let query = db.select().from(sharedPaths);
    
    if (sharerId) {
      query = query.where(eq(sharedPaths.sharerId, sharerId));
    }
    
    return await query.orderBy(desc(sharedPaths.createdAt));
  }

  async getSharedPath(pathId: number): Promise<SharedPath | undefined> {
    const [path] = await db.select().from(sharedPaths)
      .where(eq(sharedPaths.id, pathId));
    return path;
  }

  async recordPathAccess(access: InsertPathAccess): Promise<PathAccess> {
    const [newAccess] = await db.insert(pathAccesses)
      .values(access)
      .returning();
    
    // Increment total accesses count
    await db.update(sharedPaths)
      .set({ totalAccesses: sql`${sharedPaths.totalAccesses} + 1` })
      .where(eq(sharedPaths.id, access.pathId));
    
    return newAccess;
  }

  async getUserTokenBalance(userId: string): Promise<number> {
    const registration = await this.getDeviceRegistration(userId);
    return registration?.tokenBalance || 100; // Default starting balance
  }

  async deductTokens(userId: string, amount: number): Promise<void> {
    // First check if device registration exists, create if not
    let registration = await this.getDeviceRegistration(userId);
    if (!registration) {
      registration = await this.createDeviceRegistration({
        deviceId: userId,
        userId: userId, // Add user_id field
        tokenBalance: 100,
        totalTokensEarned: 100,
        totalTokensSpent: 0,
        lastSeenAt: new Date()
      });
    }

    await db.update(deviceRegistrations)
      .set({ 
        tokenBalance: Math.max(0, registration.tokenBalance - amount),
        totalTokensSpent: (registration.totalTokensSpent || 0) + amount
      })
      .where(eq(deviceRegistrations.deviceId, userId));
  }

  async awardTokens(userId: string, amount: number): Promise<void> {
    // First check if device registration exists, create if not
    let registration = await this.getDeviceRegistration(userId);
    if (!registration) {
      registration = await this.createDeviceRegistration({
        deviceId: userId,
        userId: userId, // Add user_id field
        tokenBalance: 100,
        totalTokensEarned: 100,
        totalTokensSpent: 0,
        lastSeenAt: new Date()
      });
    }

    await db.update(deviceRegistrations)
      .set({ 
        tokenBalance: registration.tokenBalance + amount,
        totalTokensEarned: (registration.totalTokensEarned || 0) + amount
      })
      .where(eq(deviceRegistrations.deviceId, userId));
  }

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

  async getLocationTimeBreakdown(userId: string): Promise<Array<{
    locationId: number;
    locationName: string;
    totalMinutes: number;
    totalHours: number;
    visitCount: number;
    firstVisit: string;
    lastVisit: string;
    coordinates: { latitude: number; longitude: number };
  }>> {
    try {
      // Get all tracking points for this user and group by location proximity
      const trackingPoints = await db.select()
        .from(spatialPoints)
        .where(eq(spatialPoints.sessionId, userId));

      // Group points by location (using 50m radius clustering)
      const locationGroups = new Map<string, {
        points: any[];
        locationId?: number;
        locationName?: string;
        coordinates: { latitude: number; longitude: number };
      }>();

      for (const point of trackingPoints) {
        let groupKey = null;
        
        // Find existing group within 50m radius
        for (const [key, group] of locationGroups) {
          const groupLat = group.coordinates.latitude;
          const groupLng = group.coordinates.longitude;
          
          const distance = this.calculateDistance(
            parseFloat(point.latitude), parseFloat(point.longitude),
            groupLat, groupLng
          );
          
          if (distance <= 0.05) { // 50m
            groupKey = key;
            break;
          }
        }
        
        if (!groupKey) {
          // Create new group
          const lat = parseFloat(point.latitude);
          const lng = parseFloat(point.longitude);
          groupKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
          
          locationGroups.set(groupKey, {
            points: [],
            coordinates: { latitude: lat, longitude: lng }
          });
        }
        
        locationGroups.get(groupKey)!.points.push(point);
      }

      // Calculate time spent for each location group
      const breakdown = [];
      
      for (const [key, group] of locationGroups) {
        if (group.points.length === 0) continue;
        
        // Sort points by timestamp
        group.points.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Calculate total time by summing intervals between consecutive points
        let totalMinutes = 0;
        const maxGapMinutes = 30; // Consider gaps > 30 minutes as separate visits
        
        for (let i = 1; i < group.points.length; i++) {
          const prevTime = new Date(group.points[i - 1].createdAt).getTime();
          const currTime = new Date(group.points[i].createdAt).getTime();
          const gapMinutes = (currTime - prevTime) / (1000 * 60);
          
          if (gapMinutes <= maxGapMinutes) {
            totalMinutes += gapMinutes;
          }
        }
        
        // Count visits (consecutive periods with gaps < 30 minutes)
        let visitCount = 1;
        for (let i = 1; i < group.points.length; i++) {
          const prevTime = new Date(group.points[i - 1].createdAt).getTime();
          const currTime = new Date(group.points[i].createdAt).getTime();
          const gapMinutes = (currTime - prevTime) / (1000 * 60);
          
          if (gapMinutes > maxGapMinutes) {
            visitCount++;
          }
        }
        
        // Try to find associated location record
        let locationName = 'Unknown Location';
        let locationId = 0;
        
        // Find nearest saved location within 100m
        const savedLocs = await db.select()
          .from(locations)
          .where(eq(locations.sessionId, userId));
        
        for (const loc of savedLocs) {
          const distance = this.calculateDistance(
            group.coordinates.latitude, group.coordinates.longitude,
            parseFloat(loc.latitude), parseFloat(loc.longitude)
          );
          
          if (distance <= 0.1) { // 100m
            locationName = loc.name || 'Saved Location';
            locationId = loc.id;
            break;
          }
        }
        
        // Include all locations regardless of time (for demo purposes, adjust threshold)
        if (totalMinutes >= 0) { 
          breakdown.push({
            locationId,
            locationName,
            totalMinutes: Math.round(totalMinutes),
            totalHours: Math.round(totalMinutes / 60 * 100) / 100,
            visitCount,
            firstVisit: group.points[0].createdAt,
            lastVisit: group.points[group.points.length - 1].createdAt,
            coordinates: group.coordinates
          });
        }
      }
      
      // Sort by total time spent (highest first)
      breakdown.sort((a, b) => b.totalMinutes - a.totalMinutes);
      
      return breakdown;
    } catch (error) {
      console.error('Error calculating location time breakdown:', error);
      return [];
    }
  }

  async getAllSessionsWithTrackingData(): Promise<Array<{
    sessionId: string;
    pointCount: number;
    lastActivity: string;
  }>> {
    try {
      const sessions = await db.select({
        sessionId: spatialPoints.sessionId,
        pointCount: sql<number>`count(*)`.as('pointCount'),
        lastActivity: sql<string>`max(${spatialPoints.createdAt})`.as('lastActivity')
      })
      .from(spatialPoints)
      .groupBy(spatialPoints.sessionId)
      .orderBy(desc(sql`max(${spatialPoints.createdAt})`));
      
      return sessions;
    } catch (error) {
      console.error('Error fetching sessions with tracking data:', error);
      return [];
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const storage = new DatabaseStorage();