"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Shield, Copy, RefreshCw, Check, ArrowLeft, Settings, Lock, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"

interface PasswordCriteria {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSpecialChars: boolean
}

interface PasswordStrength {
  score: number
  label: string
  color: string
  suggestions: string[]
}

export default function GeneratorPage() {
  const [criteria, setCriteria] = useState<PasswordCriteria>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSpecialChars: true,
  })

  const [password, setPassword] = useState("")
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    label: "Generate a password",
    color: "bg-muted",
    suggestions: [],
  })
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePassword = useCallback(() => {
    setIsGenerating(true)

    // Simulate generation delay for better UX
    setTimeout(() => {
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      const lowercase = "abcdefghijklmnopqrstuvwxyz"
      const numbers = "0123456789"
      const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"

      let charset = ""
      let requiredChars = ""

      if (criteria.includeUppercase) {
        charset += uppercase
        requiredChars += uppercase[Math.floor(Math.random() * uppercase.length)]
      }
      if (criteria.includeLowercase) {
        charset += lowercase
        requiredChars += lowercase[Math.floor(Math.random() * lowercase.length)]
      }
      if (criteria.includeNumbers) {
        charset += numbers
        requiredChars += numbers[Math.floor(Math.random() * numbers.length)]
      }
      if (criteria.includeSpecialChars) {
        charset += specialChars
        requiredChars += specialChars[Math.floor(Math.random() * specialChars.length)]
      }

      if (charset === "") {
        setPassword("")
        setIsGenerating(false)
        return
      }

      let generatedPassword = requiredChars

      // Fill remaining length with random characters
      for (let i = requiredChars.length; i < criteria.length; i++) {
        generatedPassword += charset[Math.floor(Math.random() * charset.length)]
      }

      // Shuffle the password to avoid predictable patterns
      const shuffled = generatedPassword
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("")

      setPassword(shuffled)
      setIsGenerating(false)
    }, 300)
  }, [criteria])

  const calculateStrength = useCallback((pwd: string): PasswordStrength => {
    if (!pwd) {
      return {
        score: 0,
        label: "Generate a password",
        color: "bg-muted",
        suggestions: [],
      }
    }

    let score = 0
    const suggestions: string[] = []

    // Length scoring
    if (pwd.length >= 12) score += 25
    else if (pwd.length >= 8) score += 15
    else suggestions.push("Use at least 12 characters")

    // Character variety scoring
    if (/[a-z]/.test(pwd)) score += 15
    else suggestions.push("Include lowercase letters")

    if (/[A-Z]/.test(pwd)) score += 15
    else suggestions.push("Include uppercase letters")

    if (/[0-9]/.test(pwd)) score += 15
    else suggestions.push("Include numbers")

    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20
    else suggestions.push("Include special characters")

    // Bonus for longer passwords
    if (pwd.length >= 16) score += 10

    // Determine label and color
    let label = ""
    let color = ""

    if (score >= 80) {
      label = "Very Strong"
      color = "bg-green-500"
    } else if (score >= 60) {
      label = "Strong"
      color = "bg-blue-500"
    } else if (score >= 40) {
      label = "Moderate"
      color = "bg-yellow-500"
    } else if (score >= 20) {
      label = "Weak"
      color = "bg-orange-500"
    } else {
      label = "Very Weak"
      color = "bg-red-500"
    }

    return { score, label, color, suggestions }
  }, [])

  useEffect(() => {
    setStrength(calculateStrength(password))
  }, [password, calculateStrength])

  const copyToClipboard = async () => {
    if (!password) return

    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy password:", err)
    }
  }

  const getStrengthIcon = () => {
    if (strength.score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (strength.score >= 40) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-lg font-serif font-bold text-foreground">Password Generator</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Password Generation */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Generated Password
                </CardTitle>
                <CardDescription>Your secure password will appear here</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    value={password}
                    readOnly
                    placeholder="Click 'Generate Password' to create a secure password"
                    className="font-mono text-lg pr-12 bg-muted/50"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={copyToClipboard}
                    disabled={!password}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Password Strength */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Password Strength</Label>
                    <div className="flex items-center gap-2">
                      {getStrengthIcon()}
                      <Badge variant={strength.score >= 60 ? "default" : "secondary"}>{strength.label}</Badge>
                    </div>
                  </div>
                  <Progress value={strength.score} className="h-2" />
                  {strength.suggestions.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Suggestions:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {strength.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <Button onClick={generatePassword} className="w-full" size="lg" disabled={isGenerating}>
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isGenerating ? "Generating..." : "Generate Password"}
                </Button>
              </CardContent>
            </Card>

            {password && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ready to share this password securely? Set expiration time and usage limits.
                  </p>
                  <Button className="w-full" asChild>
                    <Link href="/share">
                      Share Securely
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Password Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Password Settings
                </CardTitle>
                <CardDescription>Customize your password requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Length Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="length">Password Length</Label>
                    <Badge variant="outline">{criteria.length} characters</Badge>
                  </div>
                  <Slider
                    id="length"
                    min={8}
                    max={64}
                    step={1}
                    value={[criteria.length]}
                    onValueChange={(value) => setCriteria((prev) => ({ ...prev, length: value[0] }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>8</span>
                    <span>64</span>
                  </div>
                </div>

                {/* Character Type Toggles */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Include Characters</Label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="uppercase" className="text-sm font-normal">
                          Uppercase Letters
                        </Label>
                        <p className="text-xs text-muted-foreground">A-Z</p>
                      </div>
                      <Switch
                        id="uppercase"
                        checked={criteria.includeUppercase}
                        onCheckedChange={(checked) => setCriteria((prev) => ({ ...prev, includeUppercase: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="lowercase" className="text-sm font-normal">
                          Lowercase Letters
                        </Label>
                        <p className="text-xs text-muted-foreground">a-z</p>
                      </div>
                      <Switch
                        id="lowercase"
                        checked={criteria.includeLowercase}
                        onCheckedChange={(checked) => setCriteria((prev) => ({ ...prev, includeLowercase: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="numbers" className="text-sm font-normal">
                          Numbers
                        </Label>
                        <p className="text-xs text-muted-foreground">0-9</p>
                      </div>
                      <Switch
                        id="numbers"
                        checked={criteria.includeNumbers}
                        onCheckedChange={(checked) => setCriteria((prev) => ({ ...prev, includeNumbers: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="special" className="text-sm font-normal">
                          Special Characters
                        </Label>
                        <p className="text-xs text-muted-foreground">!@#$%^&*</p>
                      </div>
                      <Switch
                        id="special"
                        checked={criteria.includeSpecialChars}
                        onCheckedChange={(checked) =>
                          setCriteria((prev) => ({ ...prev, includeSpecialChars: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Warning for no character types */}
                {!criteria.includeUppercase &&
                  !criteria.includeLowercase &&
                  !criteria.includeNumbers &&
                  !criteria.includeSpecialChars && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <p className="text-sm text-destructive">Please select at least one character type</p>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Security Tips */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Security Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Use at least 12 characters for better security
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Include a mix of character types
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Avoid using the same password multiple times
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    Set appropriate expiration times when sharing
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
