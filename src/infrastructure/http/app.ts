import express, { type Application } from 'express';
import { createWebhookRoutes, type WebhookRoutesDependencies } from './routes/webhookRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

/**
 * Configura e retorna a aplicação Express.
 * Recebe dependências por injeção.
 */
export function createApp(deps: WebhookRoutesDependencies): Application {
  const app = express();

  // Middlewares globais
  app.use(express.json());
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rotas de webhook com dependências injetadas
  app.use('/webhook', createWebhookRoutes(deps));

  // Middleware de erro global (deve ser o último)
  app.use(errorHandler);

  return app;
}
