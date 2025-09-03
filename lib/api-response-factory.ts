export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  requestId?: string
}

export class ApiResponseFactory {
  private static generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  static success<T>(data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": response.requestId!,
      },
    })
  }

  static error(message: string, status = 400, error?: any): Response {
    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
    }

    // Log do erro para debugging
    console.error(`[API Error ${response.requestId}]:`, { message, status, error })

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": response.requestId!,
      },
    })
  }

  static notFound(resource = "Resource"): Response {
    return this.error(`${resource} not found`, 404)
  }

  static unauthorized(message = "Unauthorized"): Response {
    return this.error(message, 401)
  }

  static rateLimit(message = "Rate limit exceeded"): Response {
    return this.error(message, 429)
  }

  static serverError(message = "Internal server error"): Response {
    return this.error(message, 500)
  }
}
