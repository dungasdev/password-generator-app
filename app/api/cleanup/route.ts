import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database"

export async function POST() {
  try {
    const db = getDatabase()
    const result = db.manualCleanup()

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.deleted} expired credentials`,
      deleted: result.deleted,
    })
  } catch (error) {
    console.error("Error during manual cleanup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = getDatabase()
    const stats = db.getCredentialsStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Error getting cleanup stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
