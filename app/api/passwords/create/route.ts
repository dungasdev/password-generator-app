import type { NextRequest } from "next/server"
import { generateSecureToken } from "@/lib/crypto"
import { storePassword, type CreateCredentialsData } from "@/lib/database"
import { createPasswordLimiter, getClientIdentifier } from "@/lib/rate-limiter"
import { securityLogger } from "@/lib/security-logger"
import { validateCreatePasswordRequest } from "@/lib/input-validator"
import { createSecureResponse } from "@/lib/security-headers"

const EXPIRATION_TIME_MAP: Record<string, number> = {
  "15m": 0.25,
  "30m": 0.5,
  "1h": 1,
  "2h": 2,
  "6h": 6,
  "12h": 12,
  "24h": 24,
  "48h": 48,
  "72h": 72,
  "168h": 168,
  "720h": 720,
}

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
          error: "Muitas tentativas. Tente novamente mais tarde.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        429,
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      securityLogger.log(
        "invalid_json",
        "medium",
        { endpoint: "/api/passwords/create", error: "Invalid JSON format" },
        clientId,
      )
      return createSecureResponse({ error: "Formato JSON inválido" }, 400)
    }

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

    const { password, expirationTime, usageLimit, customHours, networkUser, email } = validation.data

    let expirationHours: number

    if (expirationTime === "custom") {
      if (!customHours || customHours < 0.25 || customHours > 8760) {
        return createSecureResponse(
          {
            error: "Tempo personalizado deve estar entre 0.25 e 8760 horas",
          },
          400,
        )
      }
      expirationHours = customHours
    } else {
      expirationHours = EXPIRATION_TIME_MAP[expirationTime]
      if (!expirationHours) {
        return createSecureResponse({ error: "Tempo de expiração inválido" }, 400)
      }
    }

    let token: string
    let stored: any

    try {
      token = generateSecureToken()

      const credentialsData: CreateCredentialsData = {
        password,
        networkUser,
        email,
        expirationHours,
        usageLimit,
      }

      stored = storePassword(token, credentialsData)
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : "Database error"

      securityLogger.log(
        "database_error",
        "high",
        {
          endpoint: "/api/passwords/create",
          error: errorMessage,
          operation: "store_credentials",
        },
        clientId,
      )

      if (errorMessage.includes("Token already exists")) {
        return createSecureResponse({ error: "Erro interno. Tente novamente." }, 500)
      }

      return createSecureResponse({ error: "Falha ao armazenar credenciais" }, 500)
    }

    // Log successful password creation
    securityLogger.log(
      "credentials_created",
      "low",
      {
        expirationHours,
        usageLimit,
        passwordLength: password.length,
        hasNetworkUser: !!networkUser,
        hasEmail: !!email,
      },
      clientId,
    )

    // Return success response
    return createSecureResponse({
      success: true,
      token,
      expiresAt: stored.expiresAt.toISOString(),
      usageLimit: stored.usageLimit,
      message: "Credenciais armazenadas com sucesso",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    securityLogger.log(
      "server_error",
      "high",
      {
        endpoint: "/api/passwords/create",
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      clientId,
    )

    console.error("Error creating password:", error)
    return createSecureResponse({ error: "Erro interno do servidor" }, 500)
  }
}
