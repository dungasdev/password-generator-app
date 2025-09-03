"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"

const shareFormSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
  networkUser: z.string().min(1, "Usuário de rede é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  expirationTime: z.enum(["15m", "30m", "1h", "2h", "6h", "12h", "24h", "48h", "72h", "168h", "720h", "custom"]),
  usageLimit: z.number().int().min(-1),
  customHours: z.number().min(0.25).max(8760).optional(),
})

export type ShareFormData = z.infer<typeof shareFormSchema>

export function useShareForm() {
  const [shareLink, setShareLink] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<ShareFormData>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      password: "",
      networkUser: "",
      email: "",
      expirationTime: "24h",
      usageLimit: 1,
    },
  })

  const generateShareLink = async (data: ShareFormData) => {
    setIsGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/passwords/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Falha ao criar link de compartilhamento")
      }

      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const generatedLink = `${baseUrl}/view/${result.token}`

      setShareLink(generatedLink)
      return generatedLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Falha ao gerar link de compartilhamento"
      setError(errorMessage)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    form,
    shareLink,
    setShareLink,
    isGenerating,
    error,
    setError,
    generateShareLink,
  }
}
