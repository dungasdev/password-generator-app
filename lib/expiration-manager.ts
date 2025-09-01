import { getDatabase } from "./database"
import { securityLogger } from "./security-logger"

export interface ExpirationConfig {
  cleanupIntervalMinutes: number
  batchSize: number
  enableBackup: boolean
  notifyBeforeExpiration: boolean
  notificationThresholdHours: number
}

export interface ExpirationStats {
  totalExpired: number
  expiredByTime: number
  expiredByUsage: number
  nearExpiration: number
  lastCleanup: Date
  nextCleanup: Date
}

class ExpirationManager {
  private config: ExpirationConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private lastCleanup: Date = new Date()

  constructor(config: Partial<ExpirationConfig> = {}) {
    this.config = {
      cleanupIntervalMinutes: 2,
      batchSize: 100,
      enableBackup: true,
      notifyBeforeExpiration: false,
      notificationThresholdHours: 1,
      ...config,
    }

    this.startCleanupScheduler()
  }

  private startCleanupScheduler() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(
      () => {
        this.performCleanup()
      },
      this.config.cleanupIntervalMinutes * 60 * 1000,
    )

    // Limpeza inicial
    this.performCleanup()
  }

  private async performCleanup(): Promise<ExpirationStats> {
    const db = getDatabase()
    const now = Date.now()

    try {
      if (this.config.enableBackup) {
        await this.backupExpiringCredentials()
      }

      const expiredByTime = this.cleanupExpiredByTime(now)
      const expiredByUsage = this.cleanupExpiredByUsage()
      const nearExpiration = this.countNearExpiration(now)

      const stats: ExpirationStats = {
        totalExpired: expiredByTime + expiredByUsage,
        expiredByTime,
        expiredByUsage,
        nearExpiration,
        lastCleanup: new Date(),
        nextCleanup: new Date(Date.now() + this.config.cleanupIntervalMinutes * 60 * 1000),
      }

      this.lastCleanup = new Date()

      if (stats.totalExpired > 0) {
        securityLogger.log(
          "cleanup_completed",
          "low",
          {
            totalExpired: stats.totalExpired,
            expiredByTime: stats.expiredByTime,
            expiredByUsage: stats.expiredByUsage,
            nearExpiration: stats.nearExpiration,
          },
          "system",
        )

        console.log(`[ExpirationManager] Cleaned up ${stats.totalExpired} expired credentials`)
      }

      return stats
    } catch (error) {
      securityLogger.log(
        "cleanup_error",
        "high",
        {
          error: error instanceof Error ? error.message : "Unknown cleanup error",
        },
        "system",
      )

      console.error("[ExpirationManager] Cleanup error:", error)
      throw error
    }
  }

  private cleanupExpiredByTime(now: number): number {
    const db = getDatabase()

    let totalDeleted = 0
    let hasMore = true

    while (hasMore) {
      const deleteExpiredByTime = (db as any).db.prepare(`
        DELETE FROM credentials 
        WHERE id IN (
          SELECT id FROM credentials 
          WHERE expires_at < ? 
          LIMIT ?
        )
      `)

      const result = deleteExpiredByTime.run(now, this.config.batchSize)
      totalDeleted += result.changes
      hasMore = result.changes === this.config.batchSize
    }

    return totalDeleted
  }

  private cleanupExpiredByUsage(): number {
    const db = getDatabase()

    let totalDeleted = 0
    let hasMore = true

    while (hasMore) {
      const deleteExpiredByUsage = (db as any).db.prepare(`
        DELETE FROM credentials 
        WHERE id IN (
          SELECT id FROM credentials 
          WHERE usage_limit != -1 AND usage_count >= usage_limit 
          LIMIT ?
        )
      `)

      const result = deleteExpiredByUsage.run(this.config.batchSize)
      totalDeleted += result.changes
      hasMore = result.changes === this.config.batchSize
    }

    return totalDeleted
  }

  private countNearExpiration(now: number): number {
    const db = getDatabase()
    const thresholdTime = now + this.config.notificationThresholdHours * 60 * 60 * 1000

    const countNear = (db as any).db.prepare(`
      SELECT COUNT(*) as count 
      FROM credentials 
      WHERE expires_at > ? AND expires_at < ? 
      AND (usage_limit = -1 OR usage_count < usage_limit)
    `)

    const result = countNear.get(now, thresholdTime) as any
    return result.count || 0
  }

  private async backupExpiringCredentials(): Promise<void> {
    const db = getDatabase()
    const now = Date.now()

    const getExpiringCredentials = (db as any).db.prepare(`
      SELECT id, token, network_user, email, expires_at, usage_limit, usage_count, created_at
      FROM credentials 
      WHERE expires_at < ? OR (usage_limit != -1 AND usage_count >= usage_limit)
    `)

    const expiringCredentials = getExpiringCredentials.all(now)

    if (expiringCredentials.length > 0) {
      const backupData = {
        timestamp: new Date().toISOString(),
        count: expiringCredentials.length,
        credentials: expiringCredentials.map((cred: any) => ({
          id: cred.id,
          token: cred.token.substring(0, 8) + "...", // Token parcial para auditoria
          networkUser: cred.network_user,
          email: cred.email,
          expiresAt: new Date(cred.expires_at).toISOString(),
          usageLimit: cred.usage_limit,
          usageCount: cred.usage_count,
          createdAt: new Date(cred.created_at).toISOString(),
        })),
      }

      // Log do backup para auditoria
      securityLogger.log(
        "credentials_backup",
        "low",
        {
          backupCount: backupData.count,
          backupTimestamp: backupData.timestamp,
        },
        "system",
      )
    }
  }

  public getExpirationStats(): ExpirationStats {
    const db = getDatabase()
    const now = Date.now()
    const nearExpiration = this.countNearExpiration(now)

    return {
      totalExpired: 0, // Será calculado na próxima limpeza
      expiredByTime: 0,
      expiredByUsage: 0,
      nearExpiration,
      lastCleanup: this.lastCleanup,
      nextCleanup: new Date(Date.now() + this.config.cleanupIntervalMinutes * 60 * 1000),
    }
  }

  public async manualCleanup(): Promise<ExpirationStats> {
    return await this.performCleanup()
  }

  public updateConfig(newConfig: Partial<ExpirationConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Reinicia o scheduler se o intervalo mudou
    if (newConfig.cleanupIntervalMinutes) {
      this.startCleanupScheduler()
    }

    securityLogger.log("expiration_config_updated", "low", { newConfig }, "system")
  }

  public stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  public getNearExpirationCredentials(hours = 24): Array<{
    token: string
    networkUser?: string
    email?: string
    expiresAt: string
    hoursUntilExpiration: number
  }> {
    const db = getDatabase()
    const now = Date.now()
    const thresholdTime = now + hours * 60 * 60 * 1000

    const getNearExpiring = (db as any).db.prepare(`
      SELECT token, network_user, email, expires_at
      FROM credentials 
      WHERE expires_at > ? AND expires_at < ?
      AND (usage_limit = -1 OR usage_count < usage_limit)
      ORDER BY expires_at ASC
    `)

    const results = getNearExpiring.all(now, thresholdTime) as any[]

    return results.map((row) => ({
      token: row.token.substring(0, 8) + "...",
      networkUser: row.network_user,
      email: row.email,
      expiresAt: new Date(row.expires_at).toISOString(),
      hoursUntilExpiration: Math.round((row.expires_at - now) / (1000 * 60 * 60)),
    }))
  }
}

let expirationManagerInstance: ExpirationManager | null = null

export function getExpirationManager(): ExpirationManager {
  if (!expirationManagerInstance) {
    expirationManagerInstance = new ExpirationManager()
  }
  return expirationManagerInstance
}

export function initializeExpirationManager(config?: Partial<ExpirationConfig>): ExpirationManager {
  if (expirationManagerInstance) {
    expirationManagerInstance.stop()
  }
  expirationManagerInstance = new ExpirationManager(config)
  return expirationManagerInstance
}
