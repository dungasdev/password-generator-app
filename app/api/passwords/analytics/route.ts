import type { NextRequest } from "next/server"
import { getTrafficAnalytics } from "@/lib/traffic-analytics"
import { createPasswordLimiter, retrievePasswordLimiter, generalLimiter } from "@/lib/rate-limiter"
import { createSecureResponse } from "@/lib/security-headers"
import { securityLogger } from "@/lib/security-logger"
import { getClientIdentifier } from "@/lib/rate-limiter"

export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request)
  const url = new URL(request.url)
  const hours = Number.parseInt(url.searchParams.get("hours") || "24")
  const clientAnalytics = url.searchParams.get("client")

  try {
    const trafficAnalytics = getTrafficAnalytics()

    if (clientAnalytics) {
      // Retornar analytics de um cliente específico
      const analytics = trafficAnalytics.getClientAnalytics(clientAnalytics)

      if (!analytics) {
        return createSecureResponse({ error: "Client not found" }, 404)
      }

      return createSecureResponse({
        success: true,
        clientAnalytics: analytics,
      })
    }

    // Retornar métricas gerais de tráfego
    const metrics = trafficAnalytics.getTrafficMetrics(hours)
    const highRiskClients = trafficAnalytics.getHighRiskClients()

    const rateLimiterStats = {
      createPassword: createPasswordLimiter.getStats(),
      retrievePassword: retrievePasswordLimiter.getStats(),
      general: generalLimiter.getStats(),
    }

    securityLogger.log("analytics_requested", "low", { hours, metricsRequested: true }, clientId)

    return createSecureResponse({
      success: true,
      metrics,
      highRiskClients,
      rateLimiterStats,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    securityLogger.log(
      "analytics_error",
      "medium",
      { error: error instanceof Error ? error.message : "Unknown error" },
      clientId,
    )

    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request)

  try {
    const body = await request.json()
    const { action, targetClientId, reason } = body

    const trafficAnalytics = getTrafficAnalytics()

    if (action === "block" && targetClientId && reason) {
      trafficAnalytics.blockClient(targetClientId, reason)

      securityLogger.log(
        "client_blocked_manually",
        "high",
        { targetClientId: targetClientId.substring(0, 8) + "...", reason },
        clientId,
      )

      return createSecureResponse({
        success: true,
        message: "Client blocked successfully",
      })
    }

    return createSecureResponse({ error: "Invalid action or missing parameters" }, 400)
  } catch (error) {
    securityLogger.log(
      "analytics_management_error",
      "high",
      { error: error instanceof Error ? error.message : "Unknown error" },
      clientId,
    )

    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
