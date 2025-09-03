"use client"

import { useState, useEffect } from "react"
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
import { usePasswordForm } from "@/hooks/use-password-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

export default function PasswordGeneratorPage() {
  const { toast } = useToast()
  const { form, generatePassword, analyzePasswordStrength } = usePasswordForm()

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(true)
  const [copied, setCopied] = useState(false)

  const watchedValues = form.watch()

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

  const handleGeneratePassword = () => {
    const { networkUser, email, ...criteria } = watchedValues
    const newPassword = generatePassword(criteria)
    if (newPassword) {
      setPassword(newPassword)
      setCopied(false)
    }
  }

  const sharePassword = () => {
    if (!password) return

    const formData = form.getValues()
    const shareData = {
      password,
      networkUser: formData.networkUser,
      email: formData.email,
    }

    sessionStorage.setItem("credentialsToShare", JSON.stringify(shareData))
    window.location.href = "/share"
  }

  const strength = analyzePasswordStrength(password)

  useEffect(() => {
    handleGeneratePassword()
  }, [])

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Gerador de Credenciais Internas</h1>
          <p className="text-muted-foreground">Crie e compartilhe credenciais de colaboradores com segurança máxima</p>
        </div>

        <Form {...form}>
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">Informações do Colaborador</CardTitle>
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
                          <Input
                            placeholder="ex: joao.silva"
                            className="bg-background/50 border-primary/30 focus:border-primary"
                            {...field}
                          />
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
                          <Input
                            type="email"
                            placeholder="joao.silva@amaranetzero.com"
                            className="bg-background/50 border-primary/30 focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">Senha Gerada</CardTitle>
              </CardHeader>
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
                  <Button onClick={handleGeneratePassword} className="bg-primary hover:bg-primary/90">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Nova Senha
                  </Button>
                  <Button
                    onClick={sharePassword}
                    variant="outline"
                    disabled={!password || !form.formState.isValid}
                    className="border-primary/30 hover:bg-primary/10 bg-transparent"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar Credenciais
                  </Button>
                </div>

                {!form.formState.isValid && password && (
                  <p className="text-sm text-muted-foreground text-center">
                    Preencha o usuário de rede e e-mail para compartilhar as credenciais
                  </p>
                )}
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">Configurações da Senha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm font-medium">Comprimento da Senha</FormLabel>
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{field.value}</span>
                      </div>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={(value) => {
                            field.onChange(value[0])
                            handleGeneratePassword()
                          }}
                          min={8}
                          max={64}
                          step={1}
                          className="w-full"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <Label className="text-sm font-medium">Tipos de Caracteres</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="includeUppercase"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                            <FormLabel className="text-sm">Maiúsculas (A-Z)</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked)
                                  handleGeneratePassword()
                                }}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeNumbers"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                            <FormLabel className="text-sm">Números (0-9)</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked)
                                  handleGeneratePassword()
                                }}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeLowercase"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                            <FormLabel className="text-sm">Minúsculas (a-z)</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked)
                                  handleGeneratePassword()
                                }}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeSymbols"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                            <FormLabel className="text-sm">Símbolos (!@#$)</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked)
                                  handleGeneratePassword()
                                }}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Form>
      </div>
    </div>
  )
}
