import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ENCRYPTION_KEY: z
    .string()
    .min(32, "Encryption key must be at least 32 characters")
    .optional()
    .default("your-32-character-secret-key-here!!"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

export function validateEnvironment() {
  try {
    const env = envSchema.parse(process.env)

    // Warn about default encryption key in production
    if (env.NODE_ENV === "production" && env.ENCRYPTION_KEY === "your-32-character-secret-key-here!!") {
      console.warn(
        "⚠️  WARNING: Using default encryption key in production. Please set ENCRYPTION_KEY environment variable.",
      )
    }

    return env
  } catch (error) {
    console.error("❌ Invalid environment variables:")
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`)
      })
    }
    process.exit(1)
  }
}

// Validate environment on module load
export const env = validateEnvironment()
