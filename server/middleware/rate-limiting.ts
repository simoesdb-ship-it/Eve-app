import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimiter {
  private windows = new Map<string, { count: number; resetTime: number }>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, window] of this.windows.entries()) {
      if (now > window.resetTime) {
        this.windows.delete(key);
      }
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.config.keyGenerator ? 
        this.config.keyGenerator(req) : 
        this.getDefaultKey(req);

      const now = Date.now();
      let window = this.windows.get(key);

      if (!window || now > window.resetTime) {
        window = {
          count: 0,
          resetTime: now + this.config.windowMs
        };
        this.windows.set(key, window);
      }

      // Check if limit exceeded
      if (window.count >= this.config.maxRequests) {
        const resetTime = new Date(window.resetTime);
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`,
          retryAfter: Math.ceil((window.resetTime - now) / 1000)
        });
        return;
      }

      // Track the request
      const originalSend = res.send.bind(res);
      res.send = function(data) {
        const shouldCount = 
          (!rateLimiter.config.skipSuccessfulRequests || res.statusCode >= 400) &&
          (!rateLimiter.config.skipFailedRequests || res.statusCode < 400);

        if (shouldCount) {
          window!.count++;
        }

        return originalSend(data);
      };

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - window.count));
      res.setHeader('X-RateLimit-Reset', window.resetTime);

      const rateLimiter = this;
      next();
    };
  }

  private getDefaultKey(req: Request): string {
    // Use IP + user agent as default key
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `${ip}:${req.get('User-Agent') || 'unknown'}`;
  }
}

// Predefined rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limit
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (req) => req.ip || 'unknown'
  }),

  // Strict rate limit for expensive operations
  expensive: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (req) => req.ip || 'unknown'
  }),

  // Pattern analysis specific
  patternAnalysis: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    keyGenerator: (req) => req.ip || 'unknown',
    skipSuccessfulRequests: true // Don't count successful responses
  }),

  // Location creation
  locationCreation: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyGenerator: (req) => {
      const sessionId = req.body?.sessionId || req.query?.sessionId;
      return sessionId || req.ip || 'unknown';
    }
  }),

  // Voting
  voting: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyGenerator: (req) => {
      const sessionId = req.body?.sessionId || req.query?.sessionId;
      return sessionId || req.ip || 'unknown';
    }
  })
};