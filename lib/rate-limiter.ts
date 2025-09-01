import { getTrafficAnalytics } from "./traffic-analytics"

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly name: string

  constructor(maxRequests = 10, windowMs: number = 15 * 60 * 1000, name = "default") {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.name = name

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

    const trafficAnalytics = getTrafficAnalytics()
    if (trafficAnalytics.isClientBlocked(identifier)) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + this.windowMs,
      }
    }

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
      const analytics = getTrafficAnalytics()
      analytics.recordRequest(identifier, `rate-limit-${this.name}`, "CHECK", 0, 429)

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

  getStats(): { activeClients: number; totalRequests: number } {
    let totalRequests = 0
    for (const entry of this.store.values()) {
      totalRequests += entry.count
    }

    return {
      activeClients: this.store.size,
      totalRequests,
    }
  }
}

// Create rate limiters for different endpoints
export const createPasswordLimiter = new RateLimiter(5, 15 * 60 * 1000, "create-password") // 5 requests per 15 minutes
export const retrievePasswordLimiter = new RateLimiter(20, 15 * 60 * 1000, "retrieve-password") // 20 requests per 15 minutes
export const generalLimiter = new RateLimiter(100, 15 * 60 * 1000, "general") // 100 requests per 15 minutes

export function getClientIdentifier(request: Request): string {
  // In production, you might want to use a more sophisticated identifier
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || realIp || "unknown"

  return ip
}

export function getCountryFromIP(ip: string): string {
  // Em produção, usar serviço como MaxMind GeoIP ou similar
  if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip === "127.0.0.1") {
    return "Local"
  }
  return "Unknown"
}
