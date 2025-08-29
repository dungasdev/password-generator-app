import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-32-character-secret-key-here!!"
const ALGORITHM = "aes-256-gcm"

export interface EncryptedData {
  encrypted: string
  iv: string
  tag: string
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const tag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  }
}

export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAuthTag(Buffer.from(encryptedData.tag, "hex"))

  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}
