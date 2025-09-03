export class PerformanceOptimizer {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  // Cache em memória com TTL
  static setCache(key: string, data: any, ttlSeconds = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    })
  }

  static getCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  // Middleware para compressão de resposta
  static compressResponse(data: any): string {
    return JSON.stringify(data, null, 0) // Remove espaços desnecessários
  }

  // Debounce para operações frequentes
  static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), wait)
    }
  }

  // Batch operations para banco
  static async batchDatabaseOperations<T>(operations: (() => Promise<T>)[], batchSize = 10): Promise<T[]> {
    const results: T[] = []

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map((op) => op()))
      results.push(...batchResults)
    }

    return results
  }

  // Cleanup automático do cache
  static startCacheCleanup(intervalMinutes = 5) {
    setInterval(
      () => {
        const now = Date.now()
        for (const [key, cached] of this.cache.entries()) {
          if (now - cached.timestamp > cached.ttl) {
            this.cache.delete(key)
          }
        }
      },
      intervalMinutes * 60 * 1000,
    )
  }
}
