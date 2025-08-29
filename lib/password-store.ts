import { type EncryptedData, encrypt, decrypt } from "./crypto"

export interface StoredPassword {
  id: string
  encryptedPassword: EncryptedData
  expiresAt: Date
  usageLimit: number
  usageCount: number
  createdAt: Date
}

export interface CreatePasswordData {
  password: string
  expirationHours: number
  usageLimit: number
}

export interface PasswordResponse {
  password: string
  expiresAt: string
  usageLimit: number
  usageCount: number
  isExpired: boolean
  isValid: boolean
}

// In-memory storage for demo purposes
// In production, this would be a database
const passwordStore = new Map<string, StoredPassword>()

// Cleanup expired passwords every 5 minutes
setInterval(
  () => {
    const now = new Date()
    for (const [token, data] of passwordStore.entries()) {
      if (data.expiresAt < now || data.usageCount >= data.usageLimit) {
        passwordStore.delete(token)
      }
    }
  },
  5 * 60 * 1000,
)

export function storePassword(token: string, data: CreatePasswordData): StoredPassword {
  const encryptedPassword = encrypt(data.password)
  const expiresAt = new Date(Date.now() + data.expirationHours * 60 * 60 * 1000)

  const storedPassword: StoredPassword = {
    id: token,
    encryptedPassword,
    expiresAt,
    usageLimit: data.usageLimit,
    usageCount: 0,
    createdAt: new Date(),
  }

  passwordStore.set(token, storedPassword)
  return storedPassword
}

export function retrievePassword(token: string): PasswordResponse | null {
  const stored = passwordStore.get(token)

  if (!stored) {
    return null
  }

  const now = new Date()
  const isExpired = stored.expiresAt < now
  const isUsageLimitReached = stored.usageLimit !== -1 && stored.usageCount >= stored.usageLimit
  const isValid = !isExpired && !isUsageLimitReached

  if (!isValid) {
    // Clean up invalid passwords
    passwordStore.delete(token)
    return {
      password: "",
      expiresAt: stored.expiresAt.toISOString(),
      usageLimit: stored.usageLimit,
      usageCount: stored.usageCount,
      isExpired,
      isValid: false,
    }
  }

  // Increment usage count
  stored.usageCount++
  passwordStore.set(token, stored)

  // Decrypt password
  const password = decrypt(stored.encryptedPassword)

  return {
    password,
    expiresAt: stored.expiresAt.toISOString(),
    usageLimit: stored.usageLimit,
    usageCount: stored.usageCount,
    isExpired: false,
    isValid: true,
  }
}

export function getPasswordStats(): { total: number; expired: number; active: number } {
  const now = new Date()
  let expired = 0
  let active = 0

  for (const [, data] of passwordStore.entries()) {
    if (data.expiresAt < now || data.usageCount >= data.usageLimit) {
      expired++
    } else {
      active++
    }
  }

  return {
    total: passwordStore.size,
    expired,
    active,
  }
}
