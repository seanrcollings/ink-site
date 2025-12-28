import { LRUCache } from "lru-cache";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// LRU cache for rate limiting with automatic eviction
// max: 10000 entries, ttl: 1 hour (entries auto-expire)
const rateLimitStore = new LRUCache<string, RateLimitEntry>({
  max: 10000,
  ttl: 1000 * 60 * 60, // 1 hour
});

/**
 * Extracts the client identifier from the request for rate limiting
 * Uses Cloudflare's CF-Connecting-IP header when available
 */
export function getRateLimitKey(
  request: Request,
  prefix: string = "ip"
): string {
  const clientIP =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  return `${prefix}:${clientIP}`;
}

/**
 * Checks if a request should be rate limited
 * Uses a sliding window algorithm
 *
 * @param key - Unique identifier for the rate limit (e.g., IP address)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns Object with allowed status, remaining requests, and reset time
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // If no entry exists or the window has expired, create a new one
  if (!entry || now >= entry.resetTime) {
    const resetTime = now + windowSeconds * 1000;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  rateLimitStore.set(key, {
    ...entry,
    count: entry.count + 1,
  });

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}
