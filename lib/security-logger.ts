interface SecurityEvent {
  timestamp: string
  event: string
  severity: "low" | "medium" | "high" | "critical"
  details: Record<string, any>
  clientId: string
}

class SecurityLogger {
  private events: SecurityEvent[] = []
  private readonly maxEvents = 1000

  log(event: string, severity: SecurityEvent["severity"], details: Record<string, any>, clientId: string) {
    const securityEvent: SecurityEvent = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      clientId,
    }

    this.events.push(securityEvent)

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[SECURITY ${severity.toUpperCase()}]`, {
        event,
        clientId,
        details,
      })
    }

    // In production, you would send this to your logging service
    // Example: send to external logging service, database, etc.
  }

  getRecentEvents(limit = 50): SecurityEvent[] {
    return this.events.slice(-limit)
  }

  getEventsByClient(clientId: string, limit = 20): SecurityEvent[] {
    return this.events.filter((event) => event.clientId === clientId).slice(-limit)
  }
}

export const securityLogger = new SecurityLogger()
