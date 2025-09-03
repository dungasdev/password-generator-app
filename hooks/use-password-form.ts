"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

const passwordFormSchema = z.object({
  networkUser: z.string().min(1, "Usuário de rede é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  length: z.number().min(8).max(64),
  includeUppercase: z.boolean(),
  includeLowercase: z.boolean(),
  includeNumbers: z.boolean(),
  includeSymbols: z.boolean(),
})

export type PasswordFormData = z.infer<typeof passwordFormSchema>

export function usePasswordForm() {
  const { toast } = useToast()

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      networkUser: "",
      email: "",
      length: 16,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
    },
  })

  const generatePassword = useCallback(
    (criteria: Omit<PasswordFormData, "networkUser" | "email">) => {
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
        return ""
      }

      let result = ""
      const array = new Uint8Array(criteria.length)
      crypto.getRandomValues(array)

      for (let i = 0; i < criteria.length; i++) {
        result += charset[array[i] % charset.length]
      }

      return result
    },
    [toast],
  )

  const analyzePasswordStrength = useCallback((pwd: string) => {
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

  return {
    form,
    generatePassword,
    analyzePasswordStrength,
  }
}
