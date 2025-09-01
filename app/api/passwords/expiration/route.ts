import type { NextRequest } from "next/server"
import { getExpirationManager } from "@/lib/expiration-manager"
import { createSecureResponse } from "@/lib/security-headers"
import { securityLogger } from "@/lib/security-logger"
import { getClientIdentifier } from "@/lib/rate-limiter"

export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request)

  try {
    const expirationManager = getExpirationManager()
    const stats = expirationManager.getExpirationStats()
    const nearExpiring = expirationManager.getNearExpirationCredentials(24)

    securityLogger.log("expiration_stats_requested", "low", { statsRequested: true }, clientId)

    return createSecureResponse({
      success: true,
      stats,
      nearExpiring,
    })
  } catch (error) {
    securityLogger.log(
      "expiration_stats_error",
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
    const { action, config } = body

    const expirationManager = getExpirationManager()

    if (action === "cleanup") {
      const stats = await expirationManager.manualCleanup()

      securityLogger.log("manual_cleanup_performed", "medium", { cleanupStats: stats }, clientId)

      return createSecureResponse({
        success: true,
        message: "Manual cleanup completed",
        stats,
      })
    }

    if (action === "updateConfig" && config) {
      expirationManager.updateConfig(config)

      securityLogger.log("expiration_config_updated", "medium", { newConfig: config }, clientId)

      return createSecureResponse({
        success: true,
        message: "Expiration configuration updated",
      })
    }

    return createSecureResponse({ error: "Invalid action" }, 400)
  } catch (error) {
    securityLogger.log(
      "expiration_management_error",
      "high",
      { error: error instanceof Error ? error.message : "Unknown error" },
      clientId,
    )

    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
