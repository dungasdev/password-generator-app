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
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        429,
      )
    }

    const { token } = params

    // Validate token format
    const tokenValidation = validateToken(token)
    if (!tokenValidation.success) {
      securityLogger.log(
        "invalid_token_format",
        "medium",
        { endpoint: "/api/passwords/[token]", token: token.substring(0, 8) + "..." },
        clientId,
      )

      return createSecureResponse({ error: tokenValidation.error }, 400)
    }

    // Retrieve password
    const credentialsData = retrievePassword(tokenValidation.token)

    if (!credentialsData) {
      securityLogger.log(
        "credentials_not_found",
        "medium",
        { endpoint: "/api/passwords/[token]", token: token.substring(0, 8) + "..." },
        clientId,
      )

      return createSecureResponse({ error: "Credentials not found or invalid token" }, 404)
    }

    if (!credentialsData.isValid) {
      let errorMessage = "Credentials link is no longer valid"
      let logEvent = "credentials_invalid"

      if (credentialsData.isExpired) {
        errorMessage = "Credentials link has expired"
        logEvent = "credentials_expired"
      } else if (credentialsData.usageLimit !== -1 && credentialsData.usageCount >= credentialsData.usageLimit) {
        errorMessage = "Credentials link has reached its usage limit"
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
    securityLogger.log(
      "server_error",
      "high",
      {
        endpoint: "/api/passwords/[token]",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      clientId,
    )

    console.error("Error retrieving credentials:", error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
