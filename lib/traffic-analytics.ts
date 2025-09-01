import { getDatabase } from "./database"
import { securityLogger } from "./security-logger"

export interface TrafficMetrics {
  totalRequests: number
  uniqueClients: number
  requestsByEndpoint: Record<string, number>
  requestsByHour: Record<string, number>
  averageResponseTime: number
  errorRate: number
  topClients: Array<{ clientId: string; requests: number }>
  geographicDistribution: Record<string, number>
}

export interface ClientAnalytics {
  clientId: string
  totalRequests: number
  firstSeen: Date
  lastSeen: Date
  endpoints: Record<string, number>
  averageResponseTime: number
  errorCount: number
  successRate: number
  riskScore: number
}

class TrafficAnalyticsManager {
  private db: any
  private requestMetrics = new Map<string, { count: number; totalTime: number; errors: number }>()
  private clientMetrics = new Map<string, ClientAnalytics>()

  constructor() {
    this.initializeAnalyticsDB()
    this.startMetricsCollection()
  }

  private initializeAnalyticsDB() {
    const database = getDatabase()
    this.db = (database as any).db

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS traffic_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        client_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        response_time INTEGER,
        status_code INTEGER,
        user_agent TEXT,
        country TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS client_analytics (
        client_id TEXT PRIMARY KEY,
        total_requests INTEGER DEFAULT 0,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        risk_score REAL DEFAULT 0,
        is_blocked INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON traffic_analytics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_traffic_client ON traffic_analytics(client_id);
      CREATE INDEX IF NOT EXISTS idx_traffic_endpoint ON traffic_analytics(endpoint);
      CREATE INDEX IF NOT EXISTS idx_client_risk ON client_analytics(risk_score);
      CREATE INDEX IF NOT EXISTS idx_client_blocked ON client_analytics(is_blocked);
    `)
  }

  private startMetricsCollection() {
    setInterval(
      () => {
        this.cleanupOldAnalytics()
      },
      60 * 60 * 1000,
    )

    setInterval(
      () => {
        this.calculateRiskScores()
      },
      5 * 60 * 1000,
    )
  }

  public recordRequest(
    clientId: string,
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userAgent?: string,
    country?: string,
  ): void {
    const now = Date.now()

    const insertTraffic = this.db.prepare(`
      INSERT INTO traffic_analytics 
      (timestamp, client_id, endpoint, method, response_time, status_code, user_agent, country, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertTraffic.run(now, clientId, endpoint, method, responseTime, statusCode, userAgent, country, now)

    const upsertClient = this.db.prepare(`
      INSERT INTO client_analytics (client_id, total_requests, first_seen, last_seen, created_at, updated_at)
      VALUES (?, 1, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        total_requests = total_requests + 1,
        last_seen = ?,
        updated_at = ?
    `)

    upsertClient.run(clientId, now, now, now, now, now, now)

    const key = `${endpoint}:${method}`
    const existing = this.requestMetrics.get(key) || { count: 0, totalTime: 0, errors: 0 }
    existing.count++
    existing.totalTime += responseTime
    if (statusCode >= 400) existing.errors++
    this.requestMetrics.set(key, existing)
  }

  public getTrafficMetrics(hours = 24): TrafficMetrics {
    const since = Date.now() - hours * 60 * 60 * 1000

    const totalRequests =
      this.db
        .prepare(`
      SELECT COUNT(*) as count FROM traffic_analytics WHERE timestamp > ?
    `)
        .get(since)?.count || 0

    const uniqueClients =
      this.db
        .prepare(`
      SELECT COUNT(DISTINCT client_id) as count FROM traffic_analytics WHERE timestamp > ?
    `)
        .get(since)?.count || 0

    const requestsByEndpoint = this.db
      .prepare(`
      SELECT endpoint, COUNT(*) as count 
      FROM traffic_analytics 
      WHERE timestamp > ? 
      GROUP BY endpoint
    `)
      .all(since)
      .reduce((acc: Record<string, number>, row: any) => {
        acc[row.endpoint] = row.count
        return acc
      }, {})

    const requestsByHour = this.db
      .prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', datetime(timestamp/1000, 'unixepoch')) as hour,
        COUNT(*) as count
      FROM traffic_analytics 
      WHERE timestamp > ?
      GROUP BY hour
      ORDER BY hour
    `)
      .all(since)
      .reduce((acc: Record<string, number>, row: any) => {
        acc[row.hour] = row.count
        return acc
      }, {})

    const responseTimeStats = this.db
      .prepare(`
      SELECT AVG(response_time) as avg_time, COUNT(*) as total, SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
      FROM traffic_analytics 
      WHERE timestamp > ?
    `)
      .get(since)

    const topClients = this.db
      .prepare(`
      SELECT client_id, COUNT(*) as requests
      FROM traffic_analytics 
      WHERE timestamp > ?
      GROUP BY client_id
      ORDER BY requests DESC
      LIMIT 10
    `)
      .all(since)
      .map((row: any) => ({
        clientId: row.client_id.substring(0, 8) + "...",
        requests: row.requests,
      }))

    const geographicDistribution = this.db
      .prepare(`
      SELECT country, COUNT(*) as count
      FROM traffic_analytics 
      WHERE timestamp > ? AND country IS NOT NULL
      GROUP BY country
    `)
      .all(since)
      .reduce((acc: Record<string, number>, row: any) => {
        acc[row.country || "Unknown"] = row.count
        return acc
      }, {})

    return {
      totalRequests,
      uniqueClients,
      requestsByEndpoint,
      requestsByHour,
      averageResponseTime: responseTimeStats?.avg_time || 0,
      errorRate: responseTimeStats?.total > 0 ? (responseTimeStats?.errors || 0) / responseTimeStats.total : 0,
      topClients,
      geographicDistribution,
    }
  }

  public getClientAnalytics(clientId: string): ClientAnalytics | null {
    const clientData = this.db
      .prepare(`
      SELECT * FROM client_analytics WHERE client_id = ?
    `)
      .get(clientId)

    if (!clientData) return null

    const endpointStats = this.db
      .prepare(`
      SELECT endpoint, COUNT(*) as count
      FROM traffic_analytics 
      WHERE client_id = ?
      GROUP BY endpoint
    `)
      .all(clientId)
      .reduce((acc: Record<string, number>, row: any) => {
        acc[row.endpoint] = row.count
        return acc
      }, {})

    const performanceStats = this.db
      .prepare(`
      SELECT 
        AVG(response_time) as avg_time,
        COUNT(*) as total,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
      FROM traffic_analytics 
      WHERE client_id = ?
    `)
      .get(clientId)

    return {
      clientId: clientId.substring(0, 8) + "...",
      totalRequests: clientData.total_requests,
      firstSeen: new Date(clientData.first_seen),
      lastSeen: new Date(clientData.last_seen),
      endpoints: endpointStats,
      averageResponseTime: performanceStats?.avg_time || 0,
      errorCount: performanceStats?.errors || 0,
      successRate: performanceStats?.total > 0 ? 1 - (performanceStats?.errors || 0) / performanceStats.total : 1,
      riskScore: clientData.risk_score,
    }
  }

  private calculateRiskScores(): void {
    const riskFactors = this.db
      .prepare(`
      SELECT 
        client_id,
        COUNT(*) as total_requests,
        AVG(response_time) as avg_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        COUNT(DISTINCT endpoint) as unique_endpoints,
        (MAX(timestamp) - MIN(timestamp)) / 1000.0 / 60.0 as session_duration_minutes
      FROM traffic_analytics 
      WHERE timestamp > ?
      GROUP BY client_id
    `)
      .all(Date.now() - 24 * 60 * 60 * 1000)

    for (const client of riskFactors) {
      let riskScore = 0

      // Alto volume de requisições
      if (client.total_requests > 100) riskScore += 0.3
      if (client.total_requests > 500) riskScore += 0.4

      // Alta taxa de erro
      const errorRate = client.error_count / client.total_requests
      if (errorRate > 0.1) riskScore += 0.2
      if (errorRate > 0.3) riskScore += 0.3

      // Muitos endpoints diferentes (possível scanning)
      if (client.unique_endpoints > 10) riskScore += 0.2

      // Sessão muito curta com muitas requisições (possível bot)
      if (client.session_duration_minutes < 1 && client.total_requests > 20) riskScore += 0.4

      // Atualizar score no banco
      this.db
        .prepare(`
        UPDATE client_analytics 
        SET risk_score = ?, updated_at = ?
        WHERE client_id = ?
      `)
        .run(Math.min(riskScore, 1.0), Date.now(), client.client_id)

      // Log clientes de alto risco
      if (riskScore > 0.7) {
        securityLogger.log(
          "high_risk_client_detected",
          "high",
          {
            clientId: client.client_id.substring(0, 8) + "...",
            riskScore,
            totalRequests: client.total_requests,
            errorRate,
            uniqueEndpoints: client.unique_endpoints,
          },
          client.client_id,
        )
      }
    }
  }

  private cleanupOldAnalytics(): void {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const deletedTraffic = this.db
      .prepare(`
      DELETE FROM traffic_analytics WHERE timestamp < ?
    `)
      .run(thirtyDaysAgo)

    const deletedClients = this.db
      .prepare(`
      DELETE FROM client_analytics WHERE last_seen < ?
    `)
      .run(thirtyDaysAgo)

    if (deletedTraffic.changes > 0 || deletedClients.changes > 0) {
      console.log(
        `[TrafficAnalytics] Cleaned up ${deletedTraffic.changes} traffic records and ${deletedClients.changes} client records`,
      )
    }
  }

  public getHighRiskClients(threshold = 0.7): Array<{ clientId: string; riskScore: number; totalRequests: number }> {
    return this.db
      .prepare(`
      SELECT client_id, risk_score, total_requests
      FROM client_analytics 
      WHERE risk_score > ? AND is_blocked = 0
      ORDER BY risk_score DESC
      LIMIT 20
    `)
      .all(threshold)
      .map((row: any) => ({
        clientId: row.client_id.substring(0, 8) + "...",
        riskScore: row.risk_score,
        totalRequests: row.total_requests,
      }))
  }

  public blockClient(clientId: string, reason: string): void {
    this.db
      .prepare(`
      UPDATE client_analytics 
      SET is_blocked = 1, updated_at = ?
      WHERE client_id = ?
    `)
      .run(Date.now(), clientId)

    securityLogger.log("client_blocked", "high", { clientId: clientId.substring(0, 8) + "...", reason }, clientId)
  }

  public isClientBlocked(clientId: string): boolean {
    const result = this.db
      .prepare(`
      SELECT is_blocked FROM client_analytics WHERE client_id = ?
    `)
      .get(clientId)

    return result?.is_blocked === 1
  }
}

let trafficAnalyticsInstance: TrafficAnalyticsManager | null = null

export function getTrafficAnalytics(): TrafficAnalyticsManager {
  if (!trafficAnalyticsInstance) {
    trafficAnalyticsInstance = new TrafficAnalyticsManager()
  }
  return trafficAnalyticsInstance
}
