import { Request, Response, NextFunction } from 'express';

interface CacheConfig {
  ttl: number; // Time to live in seconds
  key?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
}

class InMemoryCache {
  private cache = new Map<string, { data: any; expires: number; hits: number }>();
  private maxSize = 1000;
  private stats = { hits: 0, misses: 0, sets: 0 };

  set(key: string, data: any, ttl: number): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl * 1000),
      hits: 0
    });
    this.stats.sets++;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new InMemoryCache();

// Cleanup expired entries every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

export function cacheMiddleware(config: CacheConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition if provided
    if (config.condition && !config.condition(req, res)) {
      return next();
    }

    // Generate cache key
    const cacheKey = config.key ? config.key(req) : `${req.method}:${req.originalUrl}`;
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, config.ttl);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
      }
      return originalJson(data);
    };

    next();
  };
}

// Predefined cache configurations
export const cacheConfigs = {
  patterns: {
    ttl: 3600, // 1 hour - patterns rarely change
    key: (req: Request) => `patterns:all`
  },
  
  patternById: {
    ttl: 3600, // 1 hour
    key: (req: Request) => `pattern:${req.params.id}`
  },
  
  locationPatterns: {
    ttl: 300, // 5 minutes - pattern suggestions can change
    key: (req: Request) => `location:${req.params.id}:patterns`
  },
  
  stats: {
    ttl: 60, // 1 minute - stats change frequently
    key: (req: Request) => `stats:${req.query.sessionId || req.query.userId || 'global'}`
  },
  
  activity: {
    ttl: 30, // 30 seconds - activity is real-time
    key: (req: Request) => `activity:${req.query.limit || 10}:${req.query.sessionId || req.query.userId || 'global'}`
  },

  communityAnalysis: {
    ttl: 600, // 10 minutes - community analysis is expensive
    key: (req: Request) => `community:analysis`
  }
};