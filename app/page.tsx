"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Copy, RefreshCw, Check, Eye, EyeOff, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import AmaraLogo from "@/components/amara-logo"

interface PasswordCriteria {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
}

interface PasswordStrength {
  score: number
  label: string
  color: string
  feedback: string[]
}

export default function PasswordGeneratorPage() {
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(true)
  const [copied, setCopied] = useState(false)
  const [criteria, setCriteria] = useState<PasswordCriteria>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  })

  const generatePassword = useCallback(() => {
    let charset = ""

    if (criteria.includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz"
    if (criteria.includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if (criteria.includeNumbers) charset += "0123456789"
    if (criteria.includeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?"

    if (charset === "") {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um tipo de caractere.",
        variant: "destructive",
      })
      return
    }

    let result = ""
    const array = new Uint8Array(criteria.length)
    crypto.getRandomValues(array)

    for (let i = 0; i < criteria.length; i++) {
      result += charset[array[i] % charset.length]
    }

    setPassword(result)
    setCopied(false)
  }, [criteria, toast])

  const analyzePasswordStrength = useCallback((pwd: string): PasswordStrength => {
    if (!pwd) return { score: 0, label: "Sem Senha", color: "bg-gray-300", feedback: [] }

    let score = 0
    const feedback: string[] = []

    // Length scoring
    if (pwd.length >= 12) score += 25
    else if (pwd.length >= 8) score += 15
    else feedback.push("Use pelo menos 12 caracteres")

    // Character variety
    if (/[a-z]/.test(pwd)) score += 15
    else feedback.push("Adicione letras minúsculas")

    if (/[A-Z]/.test(pwd)) score += 15
    else feedback.push("Adicione letras maiúsculas")

    if (/[0-9]/.test(pwd)) score += 15
    else feedback.push("Adicione números")

    if (/[^A-Za-z0-9]/.test(pwd)) score += 20
    else feedback.push("Adicione caracteres especiais")

    // Complexity bonus
    const uniqueChars = new Set(pwd).size
    if (uniqueChars / pwd.length > 0.7) score += 10

    if (score >= 80) return { score, label: "Muito Forte", color: "bg-green-500", feedback }
    if (score >= 60) return { score, label: "Forte", color: "bg-blue-500", feedback }
    if (score >= 40) return { score, label: "Média", color: "bg-yellow-500", feedback }
    if (score >= 20) return { score, label: "Fraca", color: "bg-orange-500", feedback }
    return { score, label: "Muito Fraca", color: "bg-red-500", feedback }
  }, [])

  const copyToClipboard = async () => {
    if (!password) return

    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast({
        title: "Copiado!",
        description: "Senha copiada para a área de transferência.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Erro",
        description: "Falha ao copiar senha.",
        variant: "destructive",
      })
    }
  }

  const sharePassword = () => {
    if (!password) return

    sessionStorage.setItem("passwordToShare", password)
    window.location.href = "/share"
  }

  const strength = analyzePasswordStrength(password)

  // Generate initial password on mount
  useState(() => {
    generatePassword()
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <AmaraLogo size="md" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Gerador de Senhas Seguras</h1>
          <p className="text-muted-foreground">Crie e compartilhe senhas com segurança máxima</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  readOnly
                  className="font-mono text-lg pr-20 text-center bg-background/50 border-primary/30 focus:border-primary"
                  placeholder="Sua senha aparecerá aqui"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                    disabled={!password}
                  >
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={generatePassword} className="bg-primary hover:bg-primary/90">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar Nova Senha
                </Button>
                <Button
                  onClick={sharePassword}
                  variant="outline"
                  disabled={!password}
                  className="border-primary/30 hover:bg-primary/10 bg-transparent"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar Senha
                </Button>
              </div>
            </CardContent>
          </Card>

          {password && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Força da Senha: {strength.label}</span>
                  <span className="text-muted-foreground">{strength.score}/100</span>
                </div>
                <Progress value={strength.score} className="h-3" />
                {strength.feedback.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Sugestões para melhorar:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {strength.feedback.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">Configurações da Senha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Comprimento da Senha</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{criteria.length}</span>
                </div>
                <Slider
                  value={[criteria.length]}
                  onValueChange={(value) => setCriteria((prev) => ({ ...prev, length: value[0] }))}
                  min={8}
                  max={64}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Tipos de Caracteres</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <Label htmlFor="uppercase" className="text-sm">
                      Maiúsculas (A-Z)
                    </Label>
                    <Switch
                      id="uppercase"
                      checked={criteria.includeUppercase}
                      onCheckedChange={(checked) => setCriteria((prev) => ({ ...prev, includeUppercase: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <Label htmlFor="numbers" className="text-sm">
                      Números (0-9)
                    </Label>
                    <Switch
                      id="numbers"
                      checked={criteria.includeNumbers}
                      onCheckedChange={(checked) => setCriteria((prev) => ({ ...prev, includeNumbers: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <Label htmlFor="lowercase" className="text-sm">
                      Minúsculas (a-z)
                    </Label>
                    <Switch
                      id="lowercase"
                      checked={criteria.includeLowercase}
                      onCheckedChange={(checked) => setCriteria((prev) => ({ ...prev, includeLowercase: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <Label htmlFor="symbols" className="text-sm">
                      Símbolos (!@#$)
                    </Label>
                    <Switch
                      id="symbols"
                      checked={criteria.includeSymbols}
                      onCheckedChange={(checked) => setCriteria((prev) => ({ ...prev, includeSymbols: checked }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
