import { db } from "./db";
import { 
  adminUsers, 
  systemMetrics, 
  userSessions, 
  auditLogs,
  locations,
  activity,
  votes,
  patternSuggestions,
  patterns,
  messages,
  peerConnections,
  spatialPoints
} from "@shared/schema";
import { desc, eq, gte, lte, count, sum, avg, sql } from "drizzle-orm";
import { performanceMonitor } from "./performance-monitor";

class AdminService {
  // Authentication
  async createAdminUser(adminData: {
    adminId: string;
    username: string;
    role?: string;
    permissions?: any;
  }) {
    const [admin] = await db
      .insert(adminUsers)
      .values(adminData)
      .returning();
    return admin;
  }

  async authenticateAdmin(adminId: string): Promise<boolean> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.adminId, adminId))
      .limit(1);
    
    if (admin && admin.isActive) {
      // Update last login
      await db
        .update(adminUsers)
        .set({ lastLogin: new Date() })
        .where(eq(adminUsers.id, admin.id));
      return true;
    }
    return false;
  }

  // System Overview
  async getSystemOverview() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total counts
    const [totalLocations] = await db.select({ count: count() }).from(locations);
    const [totalPatterns] = await db.select({ count: count() }).from(patterns);
    const [totalVotes] = await db.select({ count: count() }).from(votes);
    const [totalActivity] = await db.select({ count: count() }).from(activity);
    const [totalMessages] = await db.select({ count: count() }).from(messages);
    const [totalConnections] = await db.select({ count: count() }).from(peerConnections);

    // Recent activity (24h)
    const [recentLocations] = await db
      .select({ count: count() })
      .from(locations)
      .where(gte(locations.createdAt, oneDayAgo));

    const [recentVotes] = await db
      .select({ count: count() })
      .from(votes)
      .where(gte(votes.createdAt, oneDayAgo));

    const [recentActivity] = await db
      .select({ count: count() })
      .from(activity)
      .where(gte(activity.createdAt, oneDayAgo));

    // Active users (7 days)
    const [activeUsers] = await db
      .select({ count: count() })
      .from(activity)
      .where(gte(activity.createdAt, oneWeekAgo));

    // Performance metrics
    const performanceMetrics = performanceMonitor.getMetrics();

    return {
      totals: {
        locations: totalLocations.count,
        patterns: totalPatterns.count,
        votes: totalVotes.count,
        activities: totalActivity.count,
        messages: totalMessages.count,
        connections: totalConnections.count,
      },
      recent24h: {
        locations: recentLocations.count,
        votes: recentVotes.count,
        activities: recentActivity.count,
      },
      activeUsers7d: activeUsers.count,
      performance: {
        requestsPerMinute: performanceMetrics.requests?.total || 0,
        averageResponseTime: performanceMetrics.requests?.avgResponseTime || 0,
        errorRate: performanceMetrics.requests?.errorRate || 0,
        activeConnections: 0, // Not directly available from current metrics
        systemHealth: performanceMetrics.requests?.errorRate < 0.05 ? 'healthy' : 'degraded',
      },
    };
  }

  // User Analytics
  async getUserAnalytics(timeframe: string = "7d") {
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // User engagement metrics
    const userActivity = await db
      .select({
        sessionId: activity.sessionId,
        activityCount: count(activity.id),
        lastActivity: sql<Date>`MAX(${activity.createdAt})`,
      })
      .from(activity)
      .where(gte(activity.createdAt, startDate))
      .groupBy(activity.sessionId)
      .orderBy(desc(count(activity.id)));

    // Top contributors
    const topVoters = await db
      .select({
        sessionId: votes.sessionId,
        voteCount: count(votes.id),
        totalWeight: sum(votes.weight),
      })
      .from(votes)
      .where(gte(votes.createdAt, startDate))
      .groupBy(votes.sessionId)
      .orderBy(desc(count(votes.id)))
      .limit(10);

    // Location creators
    const topLocationCreators = await db
      .select({
        sessionId: locations.sessionId,
        locationCount: count(locations.id),
      })
      .from(locations)
      .where(gte(locations.createdAt, startDate))
      .groupBy(locations.sessionId)
      .orderBy(desc(count(locations.id)))
      .limit(10);

    return {
      timeframe,
      totalActiveUsers: userActivity.length,
      userActivity: userActivity.slice(0, 20),
      topContributors: {
        voters: topVoters,
        locationCreators: topLocationCreators,
      },
    };
  }

  // Pattern Analytics
  async getPatternAnalytics() {
    // Most suggested patterns
    const topPatterns = await db
      .select({
        patternId: patternSuggestions.patternId,
        patternName: patterns.name,
        patternNumber: patterns.number,
        suggestionCount: count(patternSuggestions.id),
        averageConfidence: avg(sql<number>`CAST(${patternSuggestions.confidence} AS DECIMAL)`),
      })
      .from(patternSuggestions)
      .leftJoin(patterns, eq(patternSuggestions.patternId, patterns.id))
      .groupBy(patternSuggestions.patternId, patterns.name, patterns.number)
      .orderBy(desc(count(patternSuggestions.id)))
      .limit(20);

    // Pattern voting statistics
    const patternVotes = await db
      .select({
        patternId: patterns.id,
        patternName: patterns.name,
        upVotes: sql<number>`COUNT(CASE WHEN ${votes.voteType} = 'up' THEN 1 END)`,
        downVotes: sql<number>`COUNT(CASE WHEN ${votes.voteType} = 'down' THEN 1 END)`,
        totalVotes: count(votes.id),
      })
      .from(patterns)
      .leftJoin(patternSuggestions, eq(patterns.id, patternSuggestions.patternId))
      .leftJoin(votes, eq(patternSuggestions.id, votes.suggestionId))
      .groupBy(patterns.id, patterns.name)
      .having(sql`COUNT(${votes.id}) > 0`)
      .orderBy(desc(count(votes.id)))
      .limit(20);

    // ML Algorithm performance
    const algorithmStats = await db
      .select({
        algorithm: patternSuggestions.mlAlgorithm,
        suggestionCount: count(patternSuggestions.id),
        averageConfidence: avg(sql<number>`CAST(${patternSuggestions.confidence} AS DECIMAL)`),
      })
      .from(patternSuggestions)
      .groupBy(patternSuggestions.mlAlgorithm)
      .orderBy(desc(count(patternSuggestions.id)));

    return {
      topPatterns,
      patternVotes,
      algorithmStats,
    };
  }

  // Location Analytics
  async getLocationAnalytics() {
    // Geographic distribution
    const locationDistribution = await db
      .select({
        name: locations.name,
        latitude: locations.latitude,
        longitude: locations.longitude,
        createdAt: locations.createdAt,
        suggestionCount: sql<number>`COUNT(${patternSuggestions.id})`,
      })
      .from(locations)
      .leftJoin(patternSuggestions, eq(locations.id, patternSuggestions.locationId))
      .groupBy(locations.id, locations.name, locations.latitude, locations.longitude, locations.createdAt)
      .orderBy(desc(sql<number>`COUNT(${patternSuggestions.id})`))
      .limit(50);

    // Activity hotspots
    const activityHotspots = await db
      .select({
        locationId: activity.locationId,
        locationName: sql<string>`COALESCE(${locations.name}, 'Unknown Location')`,
        activityCount: count(activity.id),
        latitude: locations.latitude,
        longitude: locations.longitude,
      })
      .from(activity)
      .leftJoin(locations, eq(activity.locationId, locations.id))
      .where(sql`${activity.locationId} IS NOT NULL`)
      .groupBy(activity.locationId, locations.name, locations.latitude, locations.longitude)
      .orderBy(desc(count(activity.id)))
      .limit(20);

    return {
      locationDistribution,
      activityHotspots,
    };
  }

  // Communication Analytics
  async getCommunicationAnalytics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Message statistics
    const messageStats = await db
      .select({
        messageType: messages.messageType,
        count: count(messages.id),
        avgTokenCost: avg(messages.tokenCost),
      })
      .from(messages)
      .groupBy(messages.messageType);

    // Recent communication activity
    const recentMessages = await db
      .select({ count: count() })
      .from(messages)
      .where(gte(messages.createdAt, oneDayAgo));

    const weeklyMessages = await db
      .select({ count: count() })
      .from(messages)
      .where(gte(messages.createdAt, oneWeekAgo));

    // Connection statistics
    const connectionStats = await db
      .select({
        trustLevel: peerConnections.trustLevel,
        count: count(peerConnections.id),
        avgMessages: avg(peerConnections.totalMessagesExchanged),
      })
      .from(peerConnections)
      .groupBy(peerConnections.trustLevel);

    return {
      messageStats,
      recentActivity: {
        messages24h: recentMessages[0]?.count || 0,
        messages7d: weeklyMessages[0]?.count || 0,
      },
      connectionStats,
    };
  }

  // System Health
  async getSystemHealth() {
    const performanceMetrics = performanceMonitor.getMetrics();
    
    // Database health check
    const dbHealthChecks = await Promise.allSettled([
      db.select({ count: count() }).from(locations).limit(1),
      db.select({ count: count() }).from(patterns).limit(1),
      db.select({ count: count() }).from(activity).limit(1),
    ]);

    const dbHealth = dbHealthChecks.every(result => result.status === 'fulfilled');

    // Cache health
    const cacheMetrics = performanceMetrics.cache || {};

    return {
      status: dbHealth && (performanceMetrics.requests?.errorRate || 0) < 0.05 ? 'healthy' : 'degraded',
      database: {
        status: dbHealth ? 'connected' : 'error',
        responseTime: performanceMetrics.requests?.avgResponseTime || 0,
      },
      api: {
        requestsPerMinute: performanceMetrics.requests?.total || 0,
        errorRate: performanceMetrics.requests?.errorRate || 0,
        averageResponseTime: performanceMetrics.requests?.avgResponseTime || 0,
      },
      cache: {
        hitRate: cacheMetrics.hitRate || 0,
        memoryUsage: cacheMetrics.memoryUsage || 0,
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  // Record system metrics
  async recordSystemMetric(metricType: string, value: number, data: any = {}) {
    await db.insert(systemMetrics).values({
      metricType,
      metricValue: value.toString(),
      metricData: data,
      timeframe: "1hour",
    });
  }

  // Audit logging
  async logAction(
    adminId: string, 
    action: string, 
    entityType: string, 
    entityId?: string, 
    changes: any = {},
    ipAddress?: string,
    userAgent?: string
  ) {
    await db.insert(auditLogs).values({
      adminId,
      action,
      entityType,
      entityId,
      changes,
      ipAddress,
      userAgent,
    });
  }

  // Get audit logs
  async getAuditLogs(limit: number = 50) {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    
    return logs;
  }

  // Content moderation
  async flagContent(contentType: string, contentId: string, reason: string, adminId: string) {
    await this.logAction(adminId, 'flag_content', contentType, contentId, { reason });
    
    // Here you could implement content flagging logic
    // For now, just log the action
    return { success: true, message: 'Content flagged for review' };
  }

  // System configuration
  async updateSystemConfig(config: any, adminId: string) {
    await this.logAction(adminId, 'update_config', 'system', 'config', config);
    
    // Here you could implement system configuration updates
    return { success: true, message: 'Configuration updated' };
  }
}

export const adminService = new AdminService();