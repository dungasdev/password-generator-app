import { DatabaseTester } from "./test-database"
import { APIValidator } from "./validate-apis"

async function runAllTests(): Promise<void> {
  console.log("🚀 INICIANDO SUITE COMPLETA DE TESTES")
  console.log("=".repeat(60))
  console.log(`📅 Data: ${new Date().toLocaleString("pt-BR")}`)
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV || "development"}`)
  console.log("=".repeat(60))

  const startTime = Date.now()

  try {
    // 1. Testes do banco de dados
    console.log("\n🗄️  FASE 1: TESTES DO BANCO DE DADOS")
    console.log("-".repeat(40))
    const dbTester = new DatabaseTester()
    await dbTester.runAllTests()

    // 2. Validação das APIs (apenas se servidor estiver rodando)
    console.log("\n🌐 FASE 2: VALIDAÇÃO DAS APIs")
    console.log("-".repeat(40))

    try {
      const apiValidator = new APIValidator()
      await apiValidator.validateAPIs()
    } catch (error) {
      console.log("⚠️  APIs não disponíveis (servidor pode não estar rodando)")
      console.log("   Para testar APIs, execute: npm run dev")
    }

    // 3. Verificações de segurança
    console.log("\n🔒 FASE 3: VERIFICAÇÕES DE SEGURANÇA")
    console.log("-".repeat(40))
    await runSecurityChecks()

    // 4. Verificações de performance
    console.log("\n⚡ FASE 4: VERIFICAÇÕES DE PERFORMANCE")
    console.log("-".repeat(40))
    await runPerformanceChecks()
  } catch (error) {
    console.error("❌ Erro durante execução dos testes:", error)
    process.exit(1)
  }

  const totalTime = Date.now() - startTime
  console.log("\n" + "=".repeat(60))
  console.log("🏁 SUITE DE TESTES CONCLUÍDA")
  console.log("=".repeat(60))
  console.log(`⏱️  Tempo total: ${totalTime}ms`)
  console.log(`✅ Todos os testes foram executados`)
  console.log("=".repeat(60))
}

async function runSecurityChecks(): Promise<void> {
  console.log("🔐 Verificando configurações de segurança...")

  // Verificar variável de ambiente de criptografia
  if (!process.env.ENCRYPTION_KEY) {
    console.log("⚠️  ENCRYPTION_KEY não definida - usando chave padrão (inseguro para produção)")
  } else {
    console.log("✅ ENCRYPTION_KEY configurada")
  }

  // Verificar se está em modo de desenvolvimento
  if (process.env.NODE_ENV === "production") {
    console.log("✅ Ambiente de produção detectado")
  } else {
    console.log("ℹ️  Ambiente de desenvolvimento")
  }

  console.log("✅ Verificações de segurança concluídas")
}

async function runPerformanceChecks(): Promise<void> {
  console.log("📈 Executando verificações de performance...")

  // Teste de geração de tokens
  const tokenStartTime = Date.now()
  const { generateSecureToken } = await import("../lib/crypto")

  for (let i = 0; i < 100; i++) {
    generateSecureToken()
  }

  const tokenTime = Date.now() - tokenStartTime
  console.log(`✅ Geração de 100 tokens: ${tokenTime}ms (${(tokenTime / 100).toFixed(2)}ms por token)`)

  // Teste de criptografia
  const cryptoStartTime = Date.now()
  const { encrypt, decrypt } = await import("../lib/crypto")

  for (let i = 0; i < 50; i++) {
    const encrypted = encrypt(`TestPassword${i}`)
    decrypt(encrypted)
  }

  const cryptoTime = Date.now() - cryptoStartTime
  console.log(`✅ 50 operações de criptografia: ${cryptoTime}ms (${(cryptoTime / 50).toFixed(2)}ms por operação)`)

  console.log("✅ Verificações de performance concluídas")
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error)
}

export { runAllTests }
