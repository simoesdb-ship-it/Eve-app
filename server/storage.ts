import { 
  users, patterns, locations, patternSuggestions, votes, activity,
  type User, type InsertUser, type Pattern, type InsertPattern,
  type Location, type InsertLocation, type PatternSuggestion, type InsertPatternSuggestion,
  type Vote, type InsertVote, type Activity, type InsertActivity,
  type PatternWithVotes, type LocationWithPatterns
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patterns: Map<number, Pattern>;
  private locations: Map<number, Location>;
  private patternSuggestions: Map<number, PatternSuggestion>;
  private votes: Map<number, Vote>;
  private activities: Map<number, Activity>;
  private currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.patterns = new Map();
    this.locations = new Map();
    this.patternSuggestions = new Map();
    this.votes = new Map();
    this.activities = new Map();
    this.currentId = {
      users: 1,
      patterns: 1,
      locations: 1,
      patternSuggestions: 1,
      votes: 1,
      activities: 1,
    };

    // Initialize with Christopher Alexander patterns
    this.initializePatterns();
  }

  private initializePatterns() {
    const alexanderPatterns: InsertPattern[] = [
      {
        number: 88,
        name: "Street Café",
        description: "Encourage outdoor eating and street life through sidewalk cafés",
        fullDescription: "The street café provides a place where people can sit lazily, legitimately, be on view, and watch the world go by. When people are in a street café, they become part of the life of the street.",
        category: "Public Spaces",
        keywords: ["cafe", "restaurant", "outdoor", "seating", "street", "sidewalk"],
        iconName: "utensils",
        moodColor: "amber" // Warm, social gathering
      },
      {
        number: 100,
        name: "Pedestrian Street",
        description: "Create car-free zones that prioritize walking and community interaction",
        fullDescription: "The pedestrian street is a street given over primarily to pedestrians and their activities. It may allow some vehicular traffic, but the balance is clearly in favor of the pedestrian.",
        category: "Transportation",
        keywords: ["pedestrian", "walking", "car-free", "street", "plaza"],
        iconName: "walking",
        moodColor: "green" // Natural, movement, health
      },
      {
        number: 61,
        name: "Small Public Squares",
        description: "Create intimate gathering spaces at the intersections of paths",
        fullDescription: "Small public squares are essential to create community. They must be frequent, small, and intimate - not vast civic spaces that overwhelm human scale.",
        category: "Community",
        keywords: ["square", "plaza", "gathering", "community", "public space"],
        iconName: "users",
        moodColor: "purple" // Community, gathering, social
      },
      {
        number: 30,
        name: "Activity Nodes",
        description: "Concentrate community services and activities in strategic locations",
        fullDescription: "Activity nodes are the local centers of activity and energy. They draw people together and support the intensity of human contact.",
        category: "Community",
        keywords: ["activity", "center", "services", "community", "node"],
        iconName: "map-pin",
        moodColor: "red" // Energy, activity, intensity
      },
      {
        number: 52,
        name: "Network of Paths and Cars",
        description: "Create a hierarchy of paths that separates pedestrians from vehicles",
        fullDescription: "Cars and pedestrians work best when their paths form two overlapping networks, connected but separate, each one serving different aspects of movement.",
        category: "Transportation",
        keywords: ["paths", "cars", "pedestrian", "network", "transportation"],
        iconName: "route",
        moodColor: "blue" // Structure, connection, flow
      }
    ];

    alexanderPatterns.forEach(pattern => {
      this.createPattern(pattern);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Pattern methods
  async getAllPatterns(): Promise<Pattern[]> {
    return Array.from(this.patterns.values());
  }

  async getPattern(id: number): Promise<Pattern | undefined> {
    return this.patterns.get(id);
  }

  async createPattern(insertPattern: InsertPattern): Promise<Pattern> {
    const id = this.currentId.patterns++;
    const pattern: Pattern = { 
      ...insertPattern, 
      id,
      moodColor: insertPattern.moodColor || "blue"
    };
    this.patterns.set(id, pattern);
    return pattern;
  }

  async searchPatterns(keywords: string[]): Promise<Pattern[]> {
    return Array.from(this.patterns.values()).filter(pattern =>
      keywords.some(keyword =>
        pattern.keywords.some(pk => pk.toLowerCase().includes(keyword.toLowerCase())) ||
        pattern.name.toLowerCase().includes(keyword.toLowerCase()) ||
        pattern.description.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  // Location methods
  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.currentId.locations++;
    const location: Location = { 
      ...insertLocation, 
      id, 
      createdAt: new Date(),
      name: insertLocation.name ?? null
    };
    this.locations.set(id, location);
    return location;
  }

  async getLocationsBySession(sessionId: string): Promise<Location[]> {
    return Array.from(this.locations.values()).filter(loc => loc.sessionId === sessionId);
  }

  async getNearbyLocations(lat: number, lng: number, radiusKm: number): Promise<Location[]> {
    return Array.from(this.locations.values()).filter(location => {
      const distance = this.calculateDistance(
        lat, lng, 
        parseFloat(location.latitude), parseFloat(location.longitude)
      );
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

  // Pattern suggestion methods
  async createPatternSuggestion(insertSuggestion: InsertPatternSuggestion): Promise<PatternSuggestion> {
    const id = this.currentId.patternSuggestions++;
    const suggestion: PatternSuggestion = { 
      ...insertSuggestion, 
      id, 
      createdAt: new Date() 
    };
    this.patternSuggestions.set(id, suggestion);
    return suggestion;
  }

  async getSuggestionsForLocation(locationId: number): Promise<PatternSuggestion[]> {
    return Array.from(this.patternSuggestions.values()).filter(s => s.locationId === locationId);
  }

  async getPatternsForLocation(locationId: number, sessionId: string): Promise<PatternWithVotes[]> {
    const suggestions = await this.getSuggestionsForLocation(locationId);
    const patternsWithVotes: PatternWithVotes[] = [];

    for (const suggestion of suggestions) {
      const pattern = await this.getPattern(suggestion.patternId);
      if (pattern) {
        const votes = await this.getVotesForSuggestion(suggestion.id);
        const upvotes = votes.filter(v => v.voteType === 'up').length;
        const downvotes = votes.filter(v => v.voteType === 'down').length;
        const userVote = await this.getUserVoteForSuggestion(suggestion.id, sessionId);

        patternsWithVotes.push({
          ...pattern,
          upvotes,
          downvotes,
          confidence: parseFloat(suggestion.confidence),
          suggestionId: suggestion.id,
          userVote: userVote?.voteType as 'up' | 'down' | undefined || null
        });
      }
    }

    return patternsWithVotes.sort((a, b) => b.confidence - a.confidence);
  }

  // Voting methods
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.currentId.votes++;
    const vote: Vote = { ...insertVote, id, createdAt: new Date() };
    this.votes.set(id, vote);
    return vote;
  }

  async getVotesForSuggestion(suggestionId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(v => v.suggestionId === suggestionId);
  }

  async getUserVoteForSuggestion(suggestionId: number, sessionId: string): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(v => 
      v.suggestionId === suggestionId && v.sessionId === sessionId
    );
  }

  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentId.activities++;
    const activity: Activity = { 
      ...insertActivity, 
      id, 
      createdAt: new Date(),
      locationId: insertActivity.locationId ?? null
    };
    this.activities.set(id, activity);
    return activity;
  }

  async getRecentActivity(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Statistics
  async getStats(sessionId: string): Promise<{
    suggestedPatterns: number;
    votesContributed: number;
    offlinePatterns: number;
  }> {
    const userVotes = Array.from(this.votes.values()).filter(v => v.sessionId === sessionId);
    const userLocations = await this.getLocationsBySession(sessionId);
    
    let suggestedPatterns = 0;
    for (const location of userLocations) {
      const suggestions = await this.getSuggestionsForLocation(location.id);
      suggestedPatterns += suggestions.length;
    }

    return {
      suggestedPatterns,
      votesContributed: userVotes.length,
      offlinePatterns: this.patterns.size
    };
  }
}

export const storage = new MemStorage();
