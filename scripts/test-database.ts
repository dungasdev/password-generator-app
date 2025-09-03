import { getDatabase, storePassword, retrievePassword, getPasswordStats } from "../lib/database"
import { generateSecureToken } from "../lib/crypto"

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

class DatabaseTester {
  private results: TestResult[] = []

  private async runTest(name: string, testFn: () => Promise<void> | void): Promise<void> {
    const startTime = Date.now()
    try {
      await testFn()
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime,
      })
      console.log(`✅ ${name} - PASSOU (${Date.now() - startTime}ms)`)
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      })
      console.log(`❌ ${name} - FALHOU: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async runAllTests(): Promise<void> {
    console.log("🧪 Iniciando testes do banco de dados SQLite...\n")

    // Teste 1: Inicialização do banco
    await this.runTest("Inicialização do banco", () => {
      const db = getDatabase()
      if (!db) throw new Error("Falha ao inicializar banco")
    })

    // Teste 2: Armazenamento de credenciais
    let testToken: string
    await this.runTest("Armazenamento de credenciais", () => {
      testToken = generateSecureToken()
      const stored = storePassword(testToken, {
        password: "TestPassword123!",
        networkUser: "test.user",
        email: "test@amaranetzero.com",
        expirationHours: 24,
        usageLimit: 1,
      })

      if (!stored.token || stored.token !== testToken) {
        throw new Error("Token não corresponde")
      }
      if (!stored.expiresAt || stored.usageLimit !== 1) {
        throw new Error("Dados de expiração incorretos")
      }
    })

    // Teste 3: Recuperação de credenciais válidas
    await this.runTest("Recuperação de credenciais válidas", () => {
      const retrieved = retrievePassword(testToken)
      if (!retrieved) throw new Error("Credenciais não encontradas")
      if (!retrieved.isValid) throw new Error("Credenciais inválidas")
      if (retrieved.password !== "TestPassword123!") throw new Error("Senha incorreta")
      if (retrieved.networkUser !== "test.user") throw new Error("Usuário incorreto")
      if (retrieved.email !== "test@amaranetzero.com") throw new Error("Email incorreto")
    })

    // Teste 4: Limite de uso
    await this.runTest("Limite de uso", () => {
      const retrieved = retrievePassword(testToken)
      if (!retrieved) throw new Error("Credenciais não encontradas")
      if (retrieved.isValid) throw new Error("Credenciais ainda válidas após limite")
    })

    // Teste 5: Token inválido
    await this.runTest("Token inválido", () => {
      const retrieved = retrievePassword("invalid-token-123")
      if (retrieved !== null) throw new Error("Deveria retornar null para token inválido")
    })

    // Teste 6: Credenciais expiradas
    let expiredToken: string
    await this.runTest("Credenciais expiradas", () => {
      expiredToken = generateSecureToken()
      storePassword(expiredToken, {
        password: "ExpiredPassword123!",
        networkUser: "expired.user",
        email: "expired@amaranetzero.com",
        expirationHours: -1, // Já expirado
        usageLimit: 5,
      })

      const retrieved = retrievePassword(expiredToken)
      if (!retrieved) throw new Error("Deveria retornar dados mesmo expirado")
      if (retrieved.isValid) throw new Error("Credenciais expiradas não deveriam ser válidas")
      if (!retrieved.isExpired) throw new Error("Flag de expirado não definida")
    })

    // Teste 7: Estatísticas do banco
    await this.runTest("Estatísticas do banco", () => {
      const stats = getPasswordStats()
      if (typeof stats.total !== "number") throw new Error("Total inválido")
      if (typeof stats.active !== "number") throw new Error("Active inválido")
      if (typeof stats.expired !== "number") throw new Error("Expired inválido")
      if (stats.total < 0) throw new Error("Total negativo")
    })

    // Teste 8: Múltiplas credenciais
    await this.runTest("Múltiplas credenciais", () => {
      const tokens = []
      for (let i = 0; i < 5; i++) {
        const token = generateSecureToken()
        tokens.push(token)
        storePassword(token, {
          password: `Password${i}!`,
          networkUser: `user${i}`,
          email: `user${i}@amaranetzero.com`,
          expirationHours: 1,
          usageLimit: 3,
        })
      }

      // Verificar se todas foram armazenadas
      for (const token of tokens) {
        const retrieved = retrievePassword(token)
        if (!retrieved || !retrieved.isValid) {
          throw new Error(`Falha ao recuperar token: ${token}`)
        }
      }
    })

    this.printSummary()
  }

  private printSummary(): void {
    const passed = this.results.filter((r) => r.passed).length
    const failed = this.results.filter((r) => !r.passed).length
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log("\n" + "=".repeat(50))
    console.log("📊 RESUMO DOS TESTES")
    console.log("=".repeat(50))
    console.log(`✅ Passou: ${passed}`)
    console.log(`❌ Falhou: ${failed}`)
    console.log(`⏱️  Tempo total: ${totalTime}ms`)
    console.log(`📈 Taxa de sucesso: ${((passed / this.results.length) * 100).toFixed(1)}%`)

    if (failed > 0) {
      console.log("\n🔍 FALHAS DETALHADAS:")
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`   • ${r.name}: ${r.error}`)
        })
    }

    console.log("\n" + (failed === 0 ? "🎉 TODOS OS TESTES PASSARAM!" : "⚠️  ALGUNS TESTES FALHARAM"))
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new DatabaseTester()
  tester.runAllTests().catch(console.error)
}

export { DatabaseTester }
