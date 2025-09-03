import type { NextRequest } from "next/server"
import { getPasswordStats } from "@/lib/database"
import { getClientIdentifier } from "@/lib/rate-limiter"
import { securityLogger } from "@/lib/security-logger"
import { createSecureResponse } from "@/lib/security-headers"

export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request)

  try {
    securityLogger.log("stats_accessed", "low", { endpoint: "/api/passwords/stats" }, clientId)

    let stats: any

    try {
      stats = getPasswordStats()
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : "Database error"

      securityLogger.log(
        "database_error",
        "high",
        {
          endpoint: "/api/passwords/stats",
          error: errorMessage,
          operation: "get_stats",
        },
        clientId,
      )

      return createSecureResponse({ error: "Falha ao obter estatísticas" }, 500)
    }

    if (!stats || typeof stats !== "object") {
      securityLogger.log(
        "invalid_stats_data",
        "medium",
        { endpoint: "/api/passwords/stats", stats: typeof stats },
        clientId,
      )

      return createSecureResponse({ error: "Dados de estatísticas inválidos" }, 500)
    }

    return createSecureResponse({
      success: true,
      stats: {
        total: stats.total || 0,
        expired: stats.expired || 0,
        active: stats.active || 0,
        recentlyCreated: stats.recentlyCreated || 0,
        nearExpiration: stats.nearExpiration || 0,
        expiredByTime: stats.expiredByTime || 0,
        expiredByUsage: stats.expiredByUsage || 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    securityLogger.log(
      "server_error",
      "high",
      {
        endpoint: "/api/passwords/stats",
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      clientId,
    )

    console.error("Error getting credentials stats:", error)
    return createSecureResponse({ error: "Erro interno do servidor" }, 500)
  }
}
