import type { NextRequest } from "next/server"
import { retrievePassword } from "@/lib/password-store"
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
    const passwordData = retrievePassword(tokenValidation.token)

    if (!passwordData) {
      securityLogger.log(
        "password_not_found",
        "medium",
        { endpoint: "/api/passwords/[token]", token: token.substring(0, 8) + "..." },
        clientId,
      )

      return createSecureResponse({ error: "Password not found or invalid token" }, 404)
    }

    if (!passwordData.isValid) {
      let errorMessage = "Password link is no longer valid"
      let logEvent = "password_invalid"

      if (passwordData.isExpired) {
        errorMessage = "Password link has expired"
        logEvent = "password_expired"
      } else if (passwordData.usageLimit !== -1 && passwordData.usageCount >= passwordData.usageLimit) {
        errorMessage = "Password link has reached its usage limit"
        logEvent = "password_usage_limit_reached"
      }

      securityLogger.log(
        logEvent,
        "low",
        {
          endpoint: "/api/passwords/[token]",
          token: token.substring(0, 8) + "...",
          usageCount: passwordData.usageCount,
          usageLimit: passwordData.usageLimit,
        },
        clientId,
      )

      return createSecureResponse(
        {
          error: errorMessage,
          isExpired: passwordData.isExpired,
          usageCount: passwordData.usageCount,
          usageLimit: passwordData.usageLimit,
        },
        410, // Gone
      )
    }

    // Log successful password retrieval
    securityLogger.log(
      "password_retrieved",
      "low",
      {
        endpoint: "/api/passwords/[token]",
        token: token.substring(0, 8) + "...",
        usageCount: passwordData.usageCount,
        usageLimit: passwordData.usageLimit,
      },
      clientId,
    )

    // Return password data
    return createSecureResponse({
      success: true,
      password: passwordData.password,
      expiresAt: passwordData.expiresAt,
      usageLimit: passwordData.usageLimit,
      usageCount: passwordData.usageCount,
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

    console.error("Error retrieving password:", error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
