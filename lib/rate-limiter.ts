interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 10, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs

    // Clean up expired entries every 5 minutes
    setInterval(
      () => {
        const now = Date.now()
        for (const [key, entry] of this.store.entries()) {
          if (now > entry.resetTime) {
            this.store.delete(key)
          }
        }
      },
      5 * 60 * 1000,
    )
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + this.windowMs
      this.store.set(identifier, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      }
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      }
    }

    // Increment count
    entry.count++
    this.store.set(identifier, entry)

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }
}

// Create rate limiters for different endpoints
export const createPasswordLimiter = new RateLimiter(5, 15 * 60 * 1000) // 5 requests per 15 minutes
export const retrievePasswordLimiter = new RateLimiter(20, 15 * 60 * 1000) // 20 requests per 15 minutes
export const generalLimiter = new RateLimiter(100, 15 * 60 * 1000) // 100 requests per 15 minutes

export function getClientIdentifier(request: Request): string {
  // In production, you might want to use a more sophisticated identifier
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || realIp || "unknown"

  return ip
}
