import type { NextRequest } from "next/server"
import { generateSecureToken } from "@/lib/crypto"
import { storePassword, type CreatePasswordData } from "@/lib/password-store"
import { createPasswordLimiter, getClientIdentifier } from "@/lib/rate-limiter"
import { securityLogger } from "@/lib/security-logger"
import { validateCreatePasswordRequest } from "@/lib/input-validator"
import { createSecureResponse } from "@/lib/security-headers"

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request)

  try {
    // Rate limiting
    const rateLimitResult = createPasswordLimiter.check(clientId)
    if (!rateLimitResult.allowed) {
      securityLogger.log(
        "rate_limit_exceeded",
        "medium",
        { endpoint: "/api/passwords/create", remaining: rateLimitResult.remaining },
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

    // Parse and validate request body
    const body = await request.json()
    const validation = validateCreatePasswordRequest(body)

    if (!validation.success) {
      securityLogger.log(
        "invalid_input",
        "low",
        { endpoint: "/api/passwords/create", error: validation.error },
        clientId,
      )

      return createSecureResponse({ error: validation.error }, 400)
    }

    const { password, expirationTime, usageLimit, customHours } = validation.data

    // Calculate expiration hours
    let expirationHours: number

    switch (expirationTime) {
      case "15m":
        expirationHours = 0.25
        break
      case "30m":
        expirationHours = 0.5
        break
      case "1h":
        expirationHours = 1
        break
      case "2h":
        expirationHours = 2
        break
      case "6h":
        expirationHours = 6
        break
      case "12h":
        expirationHours = 12
        break
      case "24h":
        expirationHours = 24
        break
      case "48h":
        expirationHours = 48
        break
      case "72h":
        expirationHours = 72
        break
      case "168h":
        expirationHours = 168
        break
      case "720h":
        expirationHours = 720
        break
      case "custom":
        expirationHours = customHours!
        break
      default:
        return createSecureResponse({ error: "Invalid expiration time" }, 400)
    }

    // Validate expiration hours range
    if (expirationHours < 0.25) {
      return createSecureResponse({ error: "Minimum expiration time is 15 minutes" }, 400)
    }

    if (expirationHours > 8760) {
      return createSecureResponse({ error: "Maximum expiration time is 1 year (8760 hours)" }, 400)
    }

    // Generate secure token
    const token = generateSecureToken()

    // Store password
    const passwordData: CreatePasswordData = {
      password,
      expirationHours,
      usageLimit,
    }

    const stored = storePassword(token, passwordData)

    // Log successful password creation
    securityLogger.log(
      "password_created",
      "low",
      {
        expirationHours,
        usageLimit,
        passwordLength: password.length,
      },
      clientId,
    )

    // Return success response
    return createSecureResponse({
      success: true,
      token,
      expiresAt: stored.expiresAt.toISOString(),
      usageLimit: stored.usageLimit,
      message: "Password stored successfully",
    })
  } catch (error) {
    securityLogger.log(
      "server_error",
      "high",
      {
        endpoint: "/api/passwords/create",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      clientId,
    )

    console.error("Error creating password:", error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
