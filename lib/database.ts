import Database from "better-sqlite3"
import { type EncryptedData, encrypt, decrypt } from "./crypto"
import path from "path"
import { getExpirationManager } from "./expiration-manager"

export interface StoredCredentials {
  id: string
  token: string
  encryptedPassword: EncryptedData
  networkUser?: string
  email?: string
  expiresAt: Date
  usageLimit: number
  usageCount: number
  createdAt: Date
  lastAccessedAt?: Date
}

export interface CreateCredentialsData {
  password: string
  networkUser?: string
  email?: string
  expirationHours: number
  usageLimit: number
}

export interface CredentialsResponse {
  password: string
  networkUser?: string
  email?: string
  expiresAt: string
  usageLimit: number
  usageCount: number
  isExpired: boolean
  isValid: boolean
}

class CredentialsDatabase {
  private db: Database.Database

  constructor() {
    const dbPath =
      process.env.NODE_ENV === "production" ? "/tmp/credentials.db" : path.join(process.cwd(), "credentials.db")

    this.db = new Database(dbPath)
    this.initializeDatabase()
    // Removed startCleanupJob() - now managed by ExpirationManager
  }

  private initializeDatabase() {
    // Create credentials table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        encrypted_password TEXT NOT NULL,
        network_user TEXT,
        email TEXT,
        expires_at INTEGER NOT NULL,
        usage_limit INTEGER NOT NULL,
        usage_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_accessed_at INTEGER
      )
    `)

    // Optimized indexes for expiration queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_token ON credentials(token);
      CREATE INDEX IF NOT EXISTS idx_expires_at ON credentials(expires_at);
      CREATE INDEX IF NOT EXISTS idx_created_at ON credentials(created_at);
      CREATE INDEX IF NOT EXISTS idx_usage_limit_count ON credentials(usage_limit, usage_count);
      CREATE INDEX IF NOT EXISTS idx_expires_usage ON credentials(expires_at, usage_limit, usage_count);
    `)
  }

  storeCredentials(token: string, data: CreateCredentialsData): StoredCredentials {
    const encryptedPassword = encrypt(data.password)
    const expiresAt = new Date(Date.now() + data.expirationHours * 60 * 60 * 1000)
    const createdAt = new Date()

    const credentials: StoredCredentials = {
      id: token,
      token,
      encryptedPassword,
      networkUser: data.networkUser,
      email: data.email,
      expiresAt,
      usageLimit: data.usageLimit,
      usageCount: 0,
      createdAt,
    }

    const insert = this.db.prepare(`
      INSERT INTO credentials (
        id, token, encrypted_password, network_user, email, 
        expires_at, usage_limit, usage_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insert.run(
      credentials.id,
      credentials.token,
      JSON.stringify(credentials.encryptedPassword),
      credentials.networkUser,
      credentials.email,
      credentials.expiresAt.getTime(),
      credentials.usageLimit,
      credentials.usageCount,
      credentials.createdAt.getTime(),
    )

    return credentials
  }

  retrieveCredentials(token: string): CredentialsResponse | null {
    const select = this.db.prepare(`
      SELECT * FROM credentials WHERE token = ?
    `)

    const row = select.get(token) as any

    if (!row) {
      return null
    }

    const stored: StoredCredentials = {
      id: row.id,
      token: row.token,
      encryptedPassword: JSON.parse(row.encrypted_password),
      networkUser: row.network_user,
      email: row.email,
      expiresAt: new Date(row.expires_at),
      usageLimit: row.usage_limit,
      usageCount: row.usage_count,
      createdAt: new Date(row.created_at),
      lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
    }

    const now = new Date()
    const isExpired = stored.expiresAt < now
    const isUsageLimitReached = stored.usageLimit !== -1 && stored.usageCount >= stored.usageLimit
    const isValid = !isExpired && !isUsageLimitReached

    if (!isValid) {
      // Clean up invalid credentials
      const deleteInvalid = this.db.prepare("DELETE FROM credentials WHERE token = ?")
      deleteInvalid.run(token)

      return {
        password: "",
        networkUser: stored.networkUser,
        email: stored.email,
        expiresAt: stored.expiresAt.toISOString(),
        usageLimit: stored.usageLimit,
        usageCount: stored.usageCount,
        isExpired,
        isValid: false,
      }
    }

    // Increment usage count and update last accessed
    const updateUsage = this.db.prepare(`
      UPDATE credentials 
      SET usage_count = usage_count + 1, last_accessed_at = ? 
      WHERE token = ?
    `)
    updateUsage.run(Date.now(), token)

    // Decrypt password
    const password = decrypt(stored.encryptedPassword)

    return {
      password,
      networkUser: stored.networkUser,
      email: stored.email,
      expiresAt: stored.expiresAt.toISOString(),
      usageLimit: stored.usageLimit,
      usageCount: stored.usageCount + 1, // Return incremented count
      isExpired: false,
      isValid: true,
    }
  }

  getCredentialsStats(): {
    total: number
    expired: number
    active: number
    recentlyCreated: number
    // Additional expiration statistics
    nearExpiration: number
    expiredByTime: number
    expiredByUsage: number
  } {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oneHourFromNow = now + 60 * 60 * 1000

    const stats = this.db
      .prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN expires_at < ? THEN 1 ELSE 0 END) as expiredByTime,
        SUM(CASE WHEN usage_limit != -1 AND usage_count >= usage_limit THEN 1 ELSE 0 END) as expiredByUsage,
        SUM(CASE WHEN expires_at >= ? AND (usage_limit = -1 OR usage_count < usage_limit) THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) as recentlyCreated,
        SUM(CASE WHEN expires_at > ? AND expires_at < ? AND (usage_limit = -1 OR usage_count < usage_limit) THEN 1 ELSE 0 END) as nearExpiration
      FROM credentials
    `)
      .get(now, now, oneDayAgo, now, oneHourFromNow) as any

    return {
      total: stats.total || 0,
      expired: (stats.expiredByTime || 0) + (stats.expiredByUsage || 0),
      active: stats.active || 0,
      recentlyCreated: stats.recentlyCreated || 0,
      nearExpiration: stats.nearExpiration || 0,
      expiredByTime: stats.expiredByTime || 0,
      expiredByUsage: stats.expiredByUsage || 0,
    }
  }

  manualCleanup(): { deleted: number } {
    // Delegated to the ExpirationManager
    const expirationManager = getExpirationManager()
    return expirationManager.manualCleanup().then((stats) => ({ deleted: stats.totalExpired }))
  }

  close() {
    this.db.close()
  }
}

// Singleton instance
let dbInstance: CredentialsDatabase | null = null

export function getDatabase(): CredentialsDatabase {
  if (!dbInstance) {
    dbInstance = new CredentialsDatabase()
  }
  return dbInstance
}

// Export functions for backward compatibility
export function storePassword(token: string, data: CreateCredentialsData): StoredCredentials {
  return getDatabase().storeCredentials(token, data)
}

export function retrievePassword(token: string): CredentialsResponse | null {
  return getDatabase().retrieveCredentials(token)
}

export function getPasswordStats() {
  return getDatabase().getCredentialsStats()
}
