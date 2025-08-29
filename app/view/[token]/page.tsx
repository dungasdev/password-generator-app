"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Copy, Check, Eye, EyeOff, Clock, Users, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import AmaraLogo from "@/components/amara-logo"

interface SharedPassword {
  password: string
  expiresAt: string
  usageLimit: number
  usageCount: number
  isExpired: boolean
  isValid: boolean
}

export default function ViewPasswordPage() {
  const params = useParams()
  const token = params.token as string

  const [passwordData, setPasswordData] = useState<SharedPassword | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (token) {
      fetchPassword(token)
    }
  }, [token])

  const fetchPassword = async (token: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/passwords/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to retrieve password")
        return
      }

      setPasswordData({
        password: data.password,
        expiresAt: data.expiresAt,
        usageLimit: data.usageLimit,
        usageCount: data.usageCount,
        isExpired: false,
        isValid: true,
      })
    } catch (err) {
      console.error("Error fetching password:", err)
      setError("Failed to retrieve password. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyPassword = async () => {
    if (!passwordData?.password) return

    try {
      await navigator.clipboard.writeText(passwordData.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy password:", err)
    }
  }

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days > 1 ? "s" : ""}`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading password...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <AmaraLogo size="md" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {error ? (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Need to generate a new password link?</p>
                <Button asChild>
                  <Link href="/generator">Generate New Password</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          passwordData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Shared Password
                  </CardTitle>
                  <CardDescription>This password has been securely shared with you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={passwordData.password}
                      readOnly
                      className="font-mono text-lg pr-20 bg-muted/50"
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={copyPassword}>
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-card rounded-md border">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">Expires In</p>
                      <Badge variant="outline" className="mt-1">
                        {formatTimeRemaining(passwordData.expiresAt)}
                      </Badge>
                    </div>
                    <div className="text-center p-3 bg-card rounded-md border">
                      <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">Uses Remaining</p>
                      <Badge variant="outline" className="mt-1">
                        {passwordData.usageLimit === -1
                          ? "Unlimited"
                          : `${passwordData.usageLimit - passwordData.usageCount}`}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security Notice:</strong> This password will be automatically deleted after expiration or when
                  usage limits are reached. Make sure to save it securely if needed.
                </AlertDescription>
              </Alert>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Security Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Copy this password to a secure location immediately
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Do not share this password with unauthorized users
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Use this password only for its intended purpose
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Close this page after copying the password
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Need to generate your own secure passwords?</p>
                <Button variant="outline" asChild>
                  <Link href="/generator">Try Our Password Generator</Link>
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
