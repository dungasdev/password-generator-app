"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Copy, Check, ArrowLeft, Clock, Users, LinkIcon, AlertTriangle } from "lucide-react"
import Link from "next/link"
import AmaraLogo from "@/components/amara-logo"
import { ThemeToggle } from "@/components/theme-toggle"

interface ShareSettings {
  password: string
  expirationTime: string
  usageLimit: number
  customHours?: number
}

export default function SharePage() {
  const [settings, setSettings] = useState<ShareSettings>({
    password: "",
    expirationTime: "24h",
    usageLimit: 1,
  })

  const [shareLink, setShareLink] = useState("")
  const [linkCopied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const passwordFromStorage = sessionStorage.getItem("passwordToShare")

    if (passwordFromStorage) {
      setSettings((prev) => ({ ...prev, password: passwordFromStorage }))
      // Clear from sessionStorage after using
      sessionStorage.removeItem("passwordToShare")
    }
  }, [])

  const expirationOptions = [
    { value: "15m", label: "15 Minutos", description: "Link expira em 15 minutos" },
    { value: "30m", label: "30 Minutos", description: "Link expira em 30 minutos" },
    { value: "1h", label: "1 Hora", description: "Link expira em 1 hora" },
    { value: "2h", label: "2 Horas", description: "Link expira em 2 horas" },
    { value: "6h", label: "6 Horas", description: "Link expira em 6 horas" },
    { value: "12h", label: "12 Horas", description: "Link expira em 12 horas" },
    { value: "24h", label: "24 Horas", description: "Link expira em 1 dia" },
    { value: "48h", label: "2 Dias", description: "Link expira em 2 dias" },
    { value: "72h", label: "3 Dias", description: "Link expira em 3 dias" },
    { value: "168h", label: "1 Semana", description: "Link expira em 7 dias" },
    { value: "720h", label: "1 Mês", description: "Link expira em 30 dias" },
    { value: "custom", label: "Personalizado", description: "Definir tempo de expiração personalizado" },
  ]

  const usageLimitOptions = [
    { value: 1, label: "Uso único", description: "Link se torna inválido após o primeiro acesso" },
    { value: 3, label: "3 usos", description: "Link se torna inválido após 3 acessos" },
    { value: 5, label: "5 usos", description: "Link se torna inválido após 5 acessos" },
    { value: 10, label: "10 usos", description: "Link se torna inválido após 10 acessos" },
    { value: -1, label: "Ilimitado", description: "Sem limite de uso (expira apenas por tempo)" },
  ]

  const generateShareLink = async () => {
    if (!settings.password.trim()) return

    setIsGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/passwords/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: settings.password,
          expirationTime: settings.expirationTime,
          usageLimit: settings.usageLimit,
          customHours: settings.customHours,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Falha ao criar link de compartilhamento")
      }

      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const generatedLink = `${baseUrl}/view/${data.token}`

      setShareLink(generatedLink)
    } catch (err) {
      console.error("Error generating share link:", err)
      setError(err instanceof Error ? err.message : "Falha ao gerar link de compartilhamento")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyShareLink = async () => {
    if (!shareLink) return

    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  const getExpirationLabel = () => {
    const option = expirationOptions.find((opt) => opt.value === settings.expirationTime)
    if (settings.expirationTime === "custom" && settings.customHours) {
      const hours = settings.customHours
      if (hours < 24) {
        return `${hours} ${hours === 1 ? "hora" : "horas"}`
      } else if (hours < 168) {
        const days = Math.floor(hours / 24)
        const remainingHours = hours % 24
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} ${days === 1 ? "dia" : "dias"}`
      } else {
        const weeks = Math.floor(hours / 168)
        const remainingDays = Math.floor((hours % 168) / 24)
        return remainingDays > 0 ? `${weeks}sem ${remainingDays}d` : `${weeks} ${weeks === 1 ? "semana" : "semanas"}`
      }
    }
    return option?.label || ""
  }

  const getUsageLimitLabel = () => {
    const option = usageLimitOptions.find((opt) => opt.value === settings.usageLimit)
    return option?.label || ""
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
                  Voltar ao Gerador
                </Link>
              </Button>
              <AmaraLogo size="md" />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Share Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Senha para Compartilhar
                </CardTitle>
                <CardDescription>Digite a senha que você deseja compartilhar com segurança</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={settings.password}
                    onChange={(e) => setSettings((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Digite a senha para compartilhar"
                    className="font-mono"
                  />
                </div>

                {!settings.password.trim() && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Por favor, digite uma senha para compartilhar. Você pode gerar uma no{" "}
                      <Link href="/" className="text-primary hover:underline">
                        gerador de senhas
                      </Link>
                      .
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Tempo de Expiração
                </CardTitle>
                <CardDescription>Defina quando o link compartilhado deve expirar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expiration">Tempo de Expiração</Label>
                  <Select
                    value={settings.expirationTime}
                    onValueChange={(value) => setSettings((prev) => ({ ...prev, expirationTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tempo de expiração" />
                    </SelectTrigger>
                    <SelectContent>
                      {expirationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {settings.expirationTime === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="customHours">Horas Personalizadas</Label>
                    <Input
                      id="customHours"
                      type="number"
                      min="1"
                      max="8760"
                      value={settings.customHours || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, customHours: Number.parseInt(e.target.value) || undefined }))
                      }
                      placeholder="Digite as horas (1-8760)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo: 8760 horas (1 ano). Para tempos menores que 1 hora, use as opções em minutos acima.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Limite de Uso
                </CardTitle>
                <CardDescription>Defina quantas vezes o link pode ser acessado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="usageLimit">Limite de Uso</Label>
                  <Select
                    value={settings.usageLimit.toString()}
                    onValueChange={(value) => setSettings((prev) => ({ ...prev, usageLimit: Number.parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o limite de uso" />
                    </SelectTrigger>
                    <SelectContent>
                      {usageLimitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Share Link Generation */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo das Configurações</CardTitle>
                <CardDescription>Revise sua configuração de compartilhamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Comprimento da Senha</span>
                    <Badge variant="outline">{settings.password.length} caracteres</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expira Em</span>
                    <Badge variant="outline">{getExpirationLabel()}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Limite de Uso</span>
                    <Badge variant="outline">{getUsageLimitLabel()}</Badge>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={generateShareLink}
                  className="w-full"
                  size="lg"
                  disabled={
                    !settings.password.trim() ||
                    isGenerating ||
                    (settings.expirationTime === "custom" && (!settings.customHours || settings.customHours < 1))
                  }
                >
                  {isGenerating ? "Gerando Link Seguro..." : "Gerar Link de Compartilhamento"}
                </Button>
              </CardContent>
            </Card>

            {shareLink && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Link de Compartilhamento Seguro</CardTitle>
                  <CardDescription>
                    Compartilhe este link com usuários autorizados. Ele expirará com base nas suas configurações.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Input value={shareLink} readOnly className="font-mono text-sm pr-12 bg-background" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={copyShareLink}
                    >
                      {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Aviso de Segurança:</strong> Este link contém informações sensíveis. Compartilhe apenas
                      através de canais seguros e com destinatários confiáveis.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-background rounded-md border">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-medium">Expira</p>
                      <p className="text-muted-foreground">{getExpirationLabel()}</p>
                    </div>
                    <div className="text-center p-3 bg-background rounded-md border">
                      <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-medium">Limite de Uso</p>
                      <p className="text-muted-foreground">{getUsageLimitLabel()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Tips */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Melhores Práticas de Compartilhamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Use canais de comunicação seguros (mensagens criptografadas, email seguro)
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Defina o menor tempo de expiração que atenda às suas necessidades
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Use links de uso único para máxima segurança
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    Verifique a identidade do destinatário antes de compartilhar senhas sensíveis
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
