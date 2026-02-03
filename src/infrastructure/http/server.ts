import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';
import { createApp } from './app.js';

// Infrastructure
import { PrismaMessageRepository } from '../database/repositories/PrismaMessageRepository.js';
import { ClaudeService } from '../llm/ClaudeService.js';

// Adapters
import { initializeAdapters, adapterRegistry } from '../../adapters/index.js';

// Use Cases
import { ProcessWebhookUseCase } from '../../usecases/ProcessWebhookUseCase.js';
import { ClassifyMessageUseCase } from '../../usecases/ClassifyMessageUseCase.js';

/**
 * Composição de dependências (Composition Root).
 * Todas as dependências são instanciadas aqui e injetadas nas camadas superiores.
 */
async function bootstrap(): Promise<void> {
  console.log('🔧 Inicializando dependências...');

  // 1. Prisma Client
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Conectado ao banco de dados');

  // 2. Repository
  const messageRepository = new PrismaMessageRepository(prisma);

  // 3. Services
  const claudeService = new ClaudeService(env.ANTHROPIC_API_KEY);

  // 4. Adapter Registry (inicializa o singleton)
  initializeAdapters();

  // 5. Use Cases
  const processWebhookUseCase = new ProcessWebhookUseCase(
    adapterRegistry,
    messageRepository
  );

  const classifyMessageUseCase = new ClassifyMessageUseCase(
    messageRepository,
    claudeService
  );

  // 6. Express App com dependências
  const app = createApp({
    processWebhookUseCase,
    classifyMessageUseCase,
    messageRepository,
  });

  // 7. Start server
  app.listen(env.PORT, () => {
    console.log('');
    console.log('🚀 Servidor rodando na porta ' + env.PORT);
    console.log('📍 Health check: http://localhost:' + env.PORT + '/health');
    console.log('📨 Webhook Z-API: POST http://localhost:' + env.PORT + '/webhook/zapi');
    console.log('📨 Webhook Meta: POST http://localhost:' + env.PORT + '/webhook/meta');
    console.log('');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} recebido. Encerrando...`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Inicializa aplicação
bootstrap().catch((error) => {
  console.error('❌ Falha ao iniciar aplicação:', error);
  process.exit(1);
});
