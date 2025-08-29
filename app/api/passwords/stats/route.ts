import { NextResponse } from "next/server"
import { getPasswordStats } from "@/lib/password-store"

export async function GET() {
  try {
    const stats = getPasswordStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Error getting password stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
