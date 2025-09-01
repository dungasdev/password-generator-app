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

interface SharedCredentials {
  password: string
  networkUser?: string
  email?: string
  expiresAt: string
  usageLimit: number
  usageCount: number
  isExpired: boolean
  isValid: boolean
}

export default function ViewPasswordPage() {
  const params = useParams()
  const token = params.token as string

  const [credentialsData, setCredentialsData] = useState<SharedCredentials | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (token) {
      fetchCredentials(token)
    }
  }, [token])

  const fetchCredentials = async (token: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/passwords/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to retrieve credentials")
        return
      }

      setCredentialsData({
        password: data.password,
        networkUser: data.networkUser,
        email: data.email,
        expiresAt: data.expiresAt,
        usageLimit: data.usageLimit,
        usageCount: data.usageCount,
        isExpired: false,
        isValid: true,
      })
    } catch (err) {
      console.error("Error fetching credentials:", err)
      setError("Failed to retrieve credentials. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied((prev) => ({ ...prev, [field]: true }))
      setTimeout(() => setCopied((prev) => ({ ...prev, [field]: false })), 2000)
    } catch (err) {
      console.error(`Failed to copy ${field}:`, err)
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
              <span className="text-muted-foreground">Carregando credenciais...</span>
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
                Acesso Negado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Precisa gerar um novo link de credenciais?</p>
                <Button asChild>
                  <Link href="/">Gerar Nova Senha</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          credentialsData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Credenciais Compartilhadas
                  </CardTitle>
                  <CardDescription>Estas credenciais foram compartilhadas com você de forma segura</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {credentialsData.networkUser && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Usuário de Rede</label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={credentialsData.networkUser}
                          readOnly
                          className="font-mono bg-muted/50 pr-10"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={() => copyToClipboard(credentialsData.networkUser!, "networkUser")}
                        >
                          {copied.networkUser ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {credentialsData.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Email Corporativo</label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={credentialsData.email}
                          readOnly
                          className="font-mono bg-muted/50 pr-10"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={() => copyToClipboard(credentialsData.email!, "email")}
                        >
                          {copied.email ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Senha</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={credentialsData.password}
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => copyToClipboard(credentialsData.password, "password")}
                        >
                          {copied.password ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-card rounded-md border">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">Expira Em</p>
                      <Badge variant="outline" className="mt-1">
                        {formatTimeRemaining(credentialsData.expiresAt)}
                      </Badge>
                    </div>
                    <div className="text-center p-3 bg-card rounded-md border">
                      <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">Usos Restantes</p>
                      <Badge variant="outline" className="mt-1">
                        {credentialsData.usageLimit === -1
                          ? "Ilimitado"
                          : `${credentialsData.usageLimit - credentialsData.usageCount}`}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Aviso de Segurança:</strong> Estas credenciais serão automaticamente excluídas após a
                  expiração ou quando os limites de uso forem atingidos. Certifique-se de salvá-las com segurança se
                  necessário.
                </AlertDescription>
              </Alert>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Recomendações de Segurança</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Copie estas credenciais para um local seguro imediatamente
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Não compartilhe estas credenciais com usuários não autorizados
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Use estas credenciais apenas para o propósito pretendido
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Feche esta página após copiar as credenciais
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Precisa gerar suas próprias senhas seguras?</p>
                <Button variant="outline" asChild>
                  <Link href="/">Experimente Nosso Gerador de Senhas</Link>
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
