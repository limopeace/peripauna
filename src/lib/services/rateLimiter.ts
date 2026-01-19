// ============================================
// Rate Limiter Service
// ============================================
// In-memory rate limiting for MVP
// TODO: Replace with Redis/Upstash for production scaling

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed and increment counter
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const entry = this.store.get(key);

    // No existing entry or expired - create new
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + config.windowMs;
      this.store.set(key, { count: 1, resetAt });

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }

    // Existing entry - check limit
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Get current limit status without incrementing
   */
  getStatus(key: string, config: RateLimitConfig) {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      return {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }

    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string) {
    this.store.delete(key);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      activeKeys: Array.from(this.store.entries())
        .filter(([, entry]) => Date.now() < entry.resetAt)
        .length,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

// ============================================
// Rate Limit Configurations
// ============================================

export const RATE_LIMITS = {
  IMAGE_GENERATION: {
    maxRequests: 20, // 20 images per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  VIDEO_GENERATION: {
    maxRequests: 5, // 5 videos per hour (expensive)
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  PROMPT_ENHANCEMENT: {
    maxRequests: 50, // 50 prompt enhancements per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  GLOBAL_API: {
    maxRequests: 100, // 100 API calls per hour per IP
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get rate limit key for request
 */
export function getRateLimitKey(
  identifier: string,
  type: keyof typeof RATE_LIMITS
): string {
  return `ratelimit:${type}:${identifier}`;
}

/**
 * Format reset time for headers
 */
export function formatResetTime(resetAt: number): string {
  return Math.ceil((resetAt - Date.now()) / 1000).toString();
}
