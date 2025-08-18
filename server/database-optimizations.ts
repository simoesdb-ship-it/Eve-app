import { db } from './db';
import { sql } from 'drizzle-orm';

export class DatabaseOptimizations {
  
  // Create database indexes for better query performance
  async createOptimizedIndexes(): Promise<void> {
    console.log('Creating optimized database indexes...');
    
    try {
      // Pattern suggestions indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_pattern_suggestions_location_confidence 
        ON pattern_suggestions (location_id, confidence DESC);
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_pattern_suggestions_pattern_id 
        ON pattern_suggestions (pattern_id);
      `);

      // Activities indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_activities_session_created 
        ON activities (session_id, created_at DESC);
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_activities_type_created 
        ON activities (type, created_at DESC);
      `);

      // Locations indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_locations_coords 
        ON locations (latitude, longitude);
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_locations_session_created 
        ON locations (session_id, created_at DESC);
      `);

      // Votes indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_votes_suggestion_session 
        ON votes (suggestion_id, session_id);
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_votes_session_created 
        ON votes (session_id, created_at DESC);
      `);

      // Tracking points indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_tracking_session_timestamp 
        ON tracking_points (session_id, timestamp DESC);
      `);

      // Spatial index for geographic queries
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_locations_spatial 
        ON locations USING GIST (
          ST_Point(CAST(longitude AS FLOAT), CAST(latitude AS FLOAT))
        );
      `);

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  // Optimize database configuration
  async optimizeDatabase(): Promise<void> {
    console.log('Applying database optimizations...');
    
    try {
      // Update statistics for better query planning
      await db.execute(sql`ANALYZE;`);
      
      // Set optimal work memory for queries
      await db.execute(sql`SET work_mem = '256MB';`);
      
      // Enable parallel query execution
      await db.execute(sql`SET max_parallel_workers_per_gather = 2;`);
      
      // Optimize for read-heavy workload
      await db.execute(sql`SET random_page_cost = 1.1;`);
      
      console.log('Database optimizations applied');
    } catch (error) {
      console.error('Error applying database optimizations:', error);
    }
  }

  // Batch operations for better performance
  async batchInsertPatternSuggestions(suggestions: any[]): Promise<void> {
    if (suggestions.length === 0) return;

    const batchSize = 100;
    for (let i = 0; i < suggestions.length; i += batchSize) {
      const batch = suggestions.slice(i, i + batchSize);
      
      const values = batch.map(s => 
        `(${s.locationId}, ${s.patternId}, '${s.confidence}', '${s.mlAlgorithm}')`
      ).join(', ');

      await db.execute(sql`
        INSERT INTO pattern_suggestions (location_id, pattern_id, confidence, ml_algorithm)
        VALUES ${sql.raw(values)}
        ON CONFLICT (location_id, pattern_id) 
        DO UPDATE SET 
          confidence = EXCLUDED.confidence,
          ml_algorithm = EXCLUDED.ml_algorithm;
      `);
    }
  }

  // Efficient bulk stats calculation
  async calculateStatsOptimized(sessionId?: string): Promise<any> {
    const statsQuery = sessionId ? sql`
      WITH user_stats AS (
        SELECT 
          COUNT(DISTINCT ps.id) as suggested_patterns,
          COUNT(DISTINCT v.id) as votes_contributed,
          COUNT(DISTINCT l.id) as locations_tracked,
          COUNT(DISTINCT CASE WHEN tp.type = 'offline' THEN tp.id END) as offline_patterns
        FROM locations l
        LEFT JOIN pattern_suggestions ps ON l.id = ps.location_id
        LEFT JOIN votes v ON v.session_id = l.session_id
        LEFT JOIN tracking_points tp ON tp.session_id = l.session_id
        WHERE l.session_id = ${sessionId}
      )
      SELECT * FROM user_stats;
    ` : sql`
      WITH global_stats AS (
        SELECT 
          COUNT(DISTINCT ps.id) as suggested_patterns,
          COUNT(DISTINCT v.id) as votes_contributed,
          COUNT(DISTINCT l.id) as locations_tracked,
          COUNT(DISTINCT CASE WHEN tp.type = 'offline' THEN tp.id END) as offline_patterns
        FROM pattern_suggestions ps
        FULL OUTER JOIN votes v ON true
        FULL OUTER JOIN locations l ON true
        FULL OUTER JOIN tracking_points tp ON true
      )
      SELECT * FROM global_stats;
    `;

    const result = await db.execute(statsQuery);
    return (result && result.length > 0 ? (result as any)[0] : null) || {
      suggested_patterns: 0,
      votes_contributed: 0,
      locations_tracked: 0,
      offline_patterns: 0
    };
  }

  // Clean up old data to maintain performance
  async cleanupOldData(): Promise<void> {
    console.log('Cleaning up old data...');
    
    try {
      // Remove tracking points older than 30 days
      await db.execute(sql`
        DELETE FROM tracking_points 
        WHERE timestamp < NOW() - INTERVAL '30 days';
      `);

      // Remove activities older than 60 days
      await db.execute(sql`
        DELETE FROM activities 
        WHERE created_at < NOW() - INTERVAL '60 days';
      `);

      // Clean up orphaned pattern suggestions
      await db.execute(sql`
        DELETE FROM pattern_suggestions 
        WHERE location_id NOT IN (SELECT id FROM locations);
      `);

      // Vacuum to reclaim space
      await db.execute(sql`VACUUM ANALYZE;`);
      
      console.log('Old data cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Connection pooling optimization
  getOptimizedPoolConfig() {
    return {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    };
  }
}

export const dbOptimizations = new DatabaseOptimizations();