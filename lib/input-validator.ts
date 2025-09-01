import { z } from "zod"

// Password creation validation schema
export const createPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .max(1000, "Password is too long")
    .refine((password) => {
      // Basic sanitization - remove null bytes and control characters
      return !/[\x00-\x1f\x7f-\x9f]/.test(password)
    }, "Password contains invalid characters"),
  networkUser: z
    .string()
    .min(1, "Network user is required")
    .max(100, "Network user is too long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Network user contains invalid characters"),
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
  expirationTime: z.enum(["15m", "30m", "1h", "2h", "6h", "12h", "24h", "48h", "72h", "168h", "720h", "custom"]),
  usageLimit: z
    .number()
    .int()
    .refine(
      (limit) => limit === -1 || (limit >= 1 && limit <= 1000),
      "Usage limit must be -1 (unlimited) or between 1 and 1000",
    ),
  customHours: z
    .number()
    .min(0.25, "Custom hours must be at least 0.25 (15 minutes)")
    .max(8760, "Custom hours cannot exceed 1 year")
    .optional(),
})

// Token validation schema
export const tokenSchema = z
  .string()
  .length(64, "Invalid token format")
  .regex(/^[a-f0-9]{64}$/, "Token must be hexadecimal")

// Sanitize input to prevent XSS and injection attacks
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim()
}

// Validate and sanitize password creation request
export function validateCreatePasswordRequest(body: any) {
  try {
    const validated = createPasswordSchema.parse(body)

    // Additional validation for custom expiration
    if (validated.expirationTime === "custom" && !validated.customHours) {
      throw new Error("Custom hours is required when expiration time is custom")
    }

    if (validated.expirationTime === "custom" && validated.customHours && validated.customHours < 0.25) {
      throw new Error("Custom expiration time must be at least 15 minutes (0.25 hours)")
    }

    return {
      success: true,
      data: {
        ...validated,
        password: sanitizeInput(validated.password),
        networkUser: sanitizeInput(validated.networkUser),
        email: sanitizeInput(validated.email),
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(", ")
          : error instanceof Error
            ? error.message
            : "Invalid input",
    }
  }
}

// Validate token format
export function validateToken(token: string) {
  try {
    tokenSchema.parse(token)
    return { success: true, token: sanitizeInput(token) }
  } catch (error) {
    return {
      success: false,
      error: "Invalid token format",
    }
  }
}
