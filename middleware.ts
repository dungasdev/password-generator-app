import { type NextRequest, NextResponse } from "next/server"
import { addSecurityHeaders } from "@/lib/security-headers"

export function middleware(request: NextRequest) {
  // Add security headers to all responses
  const response = NextResponse.next()

  // Add security headers
  addSecurityHeaders(response)

  // Add rate limiting headers for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("X-RateLimit-Policy", "Enabled")
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
