import type { NextRequest } from "next/server"
import { retrievePassword } from "@/lib/database"
import { retrievePasswordLimiter, getClientIdentifier } from "@/lib/rate-limiter"
import { securityLogger } from "@/lib/security-logger"
import { validateToken } from "@/lib/input-validator"
import { createSecureResponse } from "@/lib/security-headers"

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const clientId = getClientIdentifier(request)

  try {
    // Rate limiting
    const rateLimitResult = retrievePasswordLimiter.check(clientId)
    if (!rateLimitResult.allowed) {
      securityLogger.log(
        "rate_limit_exceeded",
        "medium",
        { endpoint: "/api/passwords/[token]", remaining: rateLimitResult.remaining },
        clientId,
      )

      return createSecureResponse(
        {
          error: "Muitas tentativas. Tente novamente mais tarde.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        429,
      )
    }

    const { token } = params

    if (!token || typeof token !== "string") {
      securityLogger.log("missing_token", "medium", { endpoint: "/api/passwords/[token]" }, clientId)
      return createSecureResponse({ error: "Token é obrigatório" }, 400)
    }

    // Validate token format
    const tokenValidation = validateToken(token)
    if (!tokenValidation.success) {
      securityLogger.log(
        "invalid_token_format",
        "medium",
        { endpoint: "/api/passwords/[token]", token: token.substring(0, 8) + "..." },
        clientId,
      )

      return createSecureResponse({ error: "Formato de token inválido" }, 400)
    }

    let credentialsData: any

    try {
      credentialsData = retrievePassword(tokenValidation.token)
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : "Database error"

      securityLogger.log(
        "database_error",
        "high",
        {
          endpoint: "/api/passwords/[token]",
          error: errorMessage,
          operation: "retrieve_credentials",
          token: token.substring(0, 8) + "...",
        },
        clientId,
      )

      if (errorMessage.includes("decrypt")) {
        return createSecureResponse({ error: "Credenciais corrompidas ou inválidas" }, 410)
      }

      return createSecureResponse({ error: "Falha ao recuperar credenciais" }, 500)
    }

    if (!credentialsData) {
      securityLogger.log(
        "credentials_not_found",
        "medium",
        { endpoint: "/api/passwords/[token]", token: token.substring(0, 8) + "..." },
        clientId,
      )

      return createSecureResponse({ error: "Credenciais não encontradas ou token inválido" }, 404)
    }

    if (!credentialsData.isValid) {
      let errorMessage = "Link de credenciais não é mais válido"
      let logEvent = "credentials_invalid"

      if (credentialsData.isExpired) {
        errorMessage = "Link de credenciais expirou"
        logEvent = "credentials_expired"
      } else if (credentialsData.usageLimit !== -1 && credentialsData.usageCount >= credentialsData.usageLimit) {
        errorMessage = "Link de credenciais atingiu o limite de uso"
        logEvent = "credentials_usage_limit_reached"
      }

      securityLogger.log(
        logEvent,
        "low",
        {
          endpoint: "/api/passwords/[token]",
          token: token.substring(0, 8) + "...",
          usageCount: credentialsData.usageCount,
          usageLimit: credentialsData.usageLimit,
          isExpired: credentialsData.isExpired,
        },
        clientId,
      )

      return createSecureResponse(
        {
          error: errorMessage,
          isExpired: credentialsData.isExpired,
          usageCount: credentialsData.usageCount,
          usageLimit: credentialsData.usageLimit,
        },
        410, // Gone
      )
    }

    // Log successful credentials retrieval
    securityLogger.log(
      "credentials_retrieved",
      "low",
      {
        endpoint: "/api/passwords/[token]",
        token: token.substring(0, 8) + "...",
        usageCount: credentialsData.usageCount,
        usageLimit: credentialsData.usageLimit,
        hasNetworkUser: !!credentialsData.networkUser,
        hasEmail: !!credentialsData.email,
      },
      clientId,
    )

    return createSecureResponse({
      success: true,
      password: credentialsData.password,
      networkUser: credentialsData.networkUser,
      email: credentialsData.email,
      expiresAt: credentialsData.expiresAt,
      usageLimit: credentialsData.usageLimit,
      usageCount: credentialsData.usageCount,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    securityLogger.log(
      "server_error",
      "high",
      {
        endpoint: "/api/passwords/[token]",
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      clientId,
    )

    console.error("Error retrieving credentials:", error)
    return createSecureResponse({ error: "Erro interno do servidor" }, 500)
  }
}
