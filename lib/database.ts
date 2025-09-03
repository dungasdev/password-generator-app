import Database from "better-sqlite3"
import { type EncryptedData, encrypt, decrypt } from "./crypto"
import path from "path"

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
    try {
      const dbPath =
        process.env.NODE_ENV === "production" ? "/tmp/credentials.db" : path.join(process.cwd(), "credentials.db")

      this.db = new Database(dbPath, {
        verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
        fileMustExist: false,
      })

      this.db.pragma("journal_mode = WAL")
      this.db.pragma("synchronous = NORMAL")
      this.db.pragma("cache_size = 1000")
      this.db.pragma("temp_store = memory")
      this.db.pragma("mmap_size = 268435456") // 256MB

      this.initializeDatabase()
    } catch (error) {
      console.error("Database initialization error:", error)
      throw new Error("Failed to initialize database")
    }
  }

  private initializeDatabase() {
    try {
      const transaction = this.db.transaction(() => {
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
      })

      transaction()
    } catch (error) {
      console.error("Database schema initialization error:", error)
      throw new Error("Failed to initialize database schema")
    }
  }

  storeCredentials(token: string, data: CreateCredentialsData): StoredCredentials {
    try {
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

      const transaction = this.db.transaction(() => {
        const insert = this.db.prepare(`
          INSERT INTO credentials (
            id, token, encrypted_password, network_user, email, 
            expires_at, usage_limit, usage_count, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const result = insert.run(
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

        if (result.changes === 0) {
          throw new Error("Failed to insert credentials")
        }
      })

      transaction()
      return credentials
    } catch (error) {
      console.error("Store credentials error:", error)
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new Error("Token already exists")
      }
      throw new Error("Failed to store credentials")
    }
  }

  retrieveCredentials(token: string): CredentialsResponse | null {
    try {
      const select = this.db.prepare(`
        SELECT * FROM credentials WHERE token = ?
      `)

      const row = select.get(token) as any

      if (!row) {
        return null
      }

      let encryptedPassword: EncryptedData
      try {
        encryptedPassword = JSON.parse(row.encrypted_password)
      } catch (error) {
        console.error("Invalid encrypted password format:", error)
        return null
      }

      const stored: StoredCredentials = {
        id: row.id,
        token: row.token,
        encryptedPassword,
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
        const transaction = this.db.transaction(() => {
          const deleteInvalid = this.db.prepare("DELETE FROM credentials WHERE token = ?")
          deleteInvalid.run(token)
        })
        transaction()

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

      const transaction = this.db.transaction(() => {
        const updateUsage = this.db.prepare(`
          UPDATE credentials 
          SET usage_count = usage_count + 1, last_accessed_at = ? 
          WHERE token = ?
        `)
        updateUsage.run(Date.now(), token)
      })
      transaction()

      // Decrypt password
      let password: string
      try {
        password = decrypt(stored.encryptedPassword)
      } catch (error) {
        console.error("Password decryption error:", error)
        throw new Error("Failed to decrypt password")
      }

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
    } catch (error) {
      console.error("Retrieve credentials error:", error)
      throw new Error("Failed to retrieve credentials")
    }
  }

  getCredentialsStats(): {
    total: number
    expired: number
    active: number
    recentlyCreated: number
    nearExpiration: number
    expiredByTime: number
    expiredByUsage: number
  } {
    try {
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
    } catch (error) {
      console.error("Get credentials stats error:", error)
      return {
        total: 0,
        expired: 0,
        active: 0,
        recentlyCreated: 0,
        nearExpiration: 0,
        expiredByTime: 0,
        expiredByUsage: 0,
      }
    }
  }

  manualCleanup(): { deleted: number } {
    try {
      const now = Date.now()
      const transaction = this.db.transaction(() => {
        const deleteExpired = this.db.prepare(`
          DELETE FROM credentials 
          WHERE expires_at < ? OR (usage_limit != -1 AND usage_count >= usage_limit)
        `)
        const result = deleteExpired.run(now)
        return result.changes
      })

      const deleted = transaction()
      return { deleted: deleted || 0 }
    } catch (error) {
      console.error("Manual cleanup error:", error)
      return { deleted: 0 }
    }
  }

  close() {
    try {
      this.db.close()
    } catch (error) {
      console.error("Database close error:", error)
    }
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
