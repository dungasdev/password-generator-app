"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Copy, Check, ArrowLeft, Clock, Users, LinkIcon, AlertTriangle } from "lucide-react"
import Link from "next/link"
import AmaraLogo from "@/components/amara-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { useShareForm } from "@/hooks/use-share-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

export default function SharePage() {
  const { form, shareLink, setShareLink, isGenerating, error, setError, generateShareLink } = useShareForm()
  const [linkCopied, setCopied] = useState(false)

  useEffect(() => {
    const credentialsFromStorage = sessionStorage.getItem("credentialsToShare")

    if (credentialsFromStorage) {
      try {
        const credentials = JSON.parse(credentialsFromStorage)
        form.reset({
          ...form.getValues(),
          password: credentials.password || "",
          networkUser: credentials.networkUser || "",
          email: credentials.email || "",
        })
        sessionStorage.removeItem("credentialsToShare")
      } catch (error) {
        console.error("Error parsing credentials from storage:", error)
      }
    }
  }, [form])

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

  const onSubmit = async (data: any) => {
    try {
      await generateShareLink(data)
    } catch (err) {
      // Error is handled in the hook
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

  const watchedValues = form.watch()

  const getExpirationLabel = () => {
    const option = expirationOptions.find((opt) => opt.value === watchedValues.expirationTime)
    if (watchedValues.expirationTime === "custom" && watchedValues.customHours) {
      const hours = watchedValues.customHours
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
    const option = usageLimitOptions.find((opt) => opt.value === watchedValues.usageLimit)
    return option?.label || ""
  }

  return (
    <div className="min-h-screen bg-background">
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
              <AmaraLogo size="lg" showText />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Share Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      Credenciais do Colaborador
                    </CardTitle>
                    <CardDescription>Informações que serão compartilhadas com o colaborador</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="networkUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuário de Rede</FormLabel>
                            <FormControl>
                              <Input placeholder="ex: joao.silva" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail Corporativo</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="joao.silva@amaranetzero.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Digite a senha para compartilhar"
                              className="font-mono"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    <FormField
                      control={form.control}
                      name="expirationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo de Expiração</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tempo de expiração" />
                              </SelectTrigger>
                            </FormControl>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedValues.expirationTime === "custom" && (
                      <FormField
                        control={form.control}
                        name="customHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horas Personalizadas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0.25"
                                max="8760"
                                step="0.25"
                                placeholder="Digite as horas (0.25-8760)"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              Máximo: 8760 horas (1 ano). Mínimo: 0.25 horas (15 minutos).
                            </p>
                          </FormItem>
                        )}
                      />
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
                    <FormField
                      control={form.control}
                      name="usageLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Limite de Uso</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o limite de uso" />
                              </SelectTrigger>
                            </FormControl>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                        <span className="text-sm text-muted-foreground">Usuário de Rede</span>
                        <Badge variant="outline">{watchedValues.networkUser || "Não informado"}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">E-mail</span>
                        <Badge variant="outline" className="max-w-[200px] truncate">
                          {watchedValues.email || "Não informado"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Comprimento da Senha</span>
                        <Badge variant="outline">{watchedValues.password.length} caracteres</Badge>
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
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={!form.formState.isValid || isGenerating}
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
                          <strong>Aviso de Segurança:</strong> Este link contém informações sensíveis. Compartilhe
                          apenas através de canais seguros e com destinatários confiáveis.
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
          </form>
        </Form>
      </div>
    </div>
  )
}
