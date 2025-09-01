import type { NextRequest } from "next/server"
import { getTrafficAnalytics } from "./traffic-analytics"
import { getClientIdentifier, getCountryFromIP } from "./rate-limiter"

export function recordRequestMetrics(
  request: NextRequest,
  endpoint: string,
  responseTime: number,
  statusCode: number,
): void {
  const clientId = getClientIdentifier(request)
  const userAgent = request.headers.get("user-agent") || undefined
  const country = getCountryFromIP(clientId)
  const method = request.method

  const trafficAnalytics = getTrafficAnalytics()
  trafficAnalytics.recordRequest(clientId, endpoint, method, responseTime, statusCode, userAgent, country)
}

export function withAnalytics<T extends any[]>(handler: (...args: T) => Promise<Response>, endpoint: string) {
  return async (...args: T): Promise<Response> => {
    const startTime = Date.now()
    const request = args[0] as NextRequest

    try {
      const response = await handler(...args)
      const responseTime = Date.now() - startTime

      recordRequestMetrics(request, endpoint, responseTime, response.status)

      return response
    } catch (error) {
      const responseTime = Date.now() - startTime
      recordRequestMetrics(request, endpoint, responseTime, 500)
      throw error
    }
  }
}
