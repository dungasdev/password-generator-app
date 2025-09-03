interface APITestResult {
  endpoint: string
  method: string
  status: number
  success: boolean
  responseTime: number
  error?: string
}

class APIValidator {
  private baseUrl: string
  private results: APITestResult[] = []

  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl
  }

  private async makeRequest(endpoint: string, method: "GET" | "POST" = "GET", body?: any): Promise<APITestResult> {
    const startTime = Date.now()
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      const responseTime = Date.now() - startTime
      const success = response.ok

      return {
        endpoint,
        method,
        status: response.status,
        success,
        responseTime,
      }
    } catch (error) {
      return {
        endpoint,
        method,
        status: 0,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async validateAPIs(): Promise<void> {
    console.log("🌐 Validando APIs...\n")

    // Teste 1: Criar credenciais válidas
    console.log("📝 Testando criação de credenciais...")
    const createResult = await this.makeRequest("/api/passwords/create", "POST", {
      password: "ValidPassword123!",
      networkUser: "api.test",
      email: "api.test@amaranetzero.com",
      expirationTime: "1h",
      usageLimit: 1,
    })
    this.results.push(createResult)

    let token: string | null = null
    if (createResult.success) {
      console.log(`✅ Criação: ${createResult.status} (${createResult.responseTime}ms)`)
      // Extrair token da resposta (simulado)
      token = "test-token-for-validation"
    } else {
      console.log(`❌ Criação falhou: ${createResult.status} - ${createResult.error}`)
    }

    // Teste 2: Recuperar credenciais (se token disponível)
    if (token) {
      console.log("🔍 Testando recuperação de credenciais...")
      const retrieveResult = await this.makeRequest(`/api/passwords/${token}`)
      this.results.push(retrieveResult)

      if (retrieveResult.success) {
        console.log(`✅ Recuperação: ${retrieveResult.status} (${retrieveResult.responseTime}ms)`)
      } else {
        console.log(`❌ Recuperação falhou: ${retrieveResult.status} - ${retrieveResult.error}`)
      }
    }

    // Teste 3: Estatísticas
    console.log("📊 Testando estatísticas...")
    const statsResult = await this.makeRequest("/api/passwords/stats")
    this.results.push(statsResult)

    if (statsResult.success) {
      console.log(`✅ Estatísticas: ${statsResult.status} (${statsResult.responseTime}ms)`)
    } else {
      console.log(`❌ Estatísticas falhou: ${statsResult.status} - ${statsResult.error}`)
    }

    // Teste 4: Dados inválidos
    console.log("🚫 Testando validação de dados inválidos...")
    const invalidResult = await this.makeRequest("/api/passwords/create", "POST", {
      password: "", // Senha vazia
      networkUser: "",
      email: "invalid-email",
      expirationTime: "invalid",
      usageLimit: -5,
    })
    this.results.push(invalidResult)

    if (invalidResult.status === 400) {
      console.log(`✅ Validação: Rejeitou dados inválidos corretamente (${invalidResult.responseTime}ms)`)
    } else {
      console.log(`❌ Validação falhou: Deveria rejeitar dados inválidos`)
    }

    // Teste 5: Token inválido
    console.log("🔒 Testando token inválido...")
    const invalidTokenResult = await this.makeRequest("/api/passwords/invalid-token-123")
    this.results.push(invalidTokenResult)

    if (invalidTokenResult.status === 400 || invalidTokenResult.status === 404) {
      console.log(`✅ Token inválido: Rejeitado corretamente (${invalidTokenResult.responseTime}ms)`)
    } else {
      console.log(`❌ Token inválido: Deveria rejeitar token inválido`)
    }

    this.printAPISummary()
  }

  private printAPISummary(): void {
    const successful = this.results.filter((r) => r.success).length
    const failed = this.results.filter((r) => !r.success).length
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length

    console.log("\n" + "=".repeat(50))
    console.log("🌐 RESUMO DA VALIDAÇÃO DE APIs")
    console.log("=".repeat(50))
    console.log(`✅ Sucessos: ${successful}`)
    console.log(`❌ Falhas: ${failed}`)
    console.log(`⏱️  Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`)

    console.log("\n📋 DETALHES POR ENDPOINT:")
    this.results.forEach((result) => {
      const status = result.success ? "✅" : "❌"
      console.log(`   ${status} ${result.method} ${result.endpoint} - ${result.status} (${result.responseTime}ms)`)
      if (result.error) {
        console.log(`      Erro: ${result.error}`)
      }
    })
  }
}

// Executar validação se chamado diretamente
if (require.main === module) {
  const validator = new APIValidator()
  validator.validateAPIs().catch(console.error)
}

export { APIValidator }
