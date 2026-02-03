import express, { type Application } from 'express';
import { webhookRoutes } from './routes/webhookRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

/**
 * Configura e retorna a aplicação Express.
 * Separado do server.ts para facilitar testes.
 */
export function createApp(): Application {
  const app = express();

  // Middlewares globais
  app.use(express.json());
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rotas
  app.use('/webhook', webhookRoutes);

  // Middleware de erro global (deve ser o último)
  app.use(errorHandler);

  return app;
}
