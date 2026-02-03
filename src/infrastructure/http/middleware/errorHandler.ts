import type { Request, Response, NextFunction } from 'express';
import {
  WebhookError,
  WebhookValidationError,
  DuplicateMessageError,
} from '../../../domain/errors/WebhookErrors.js';

/**
 * Estrutura padrão de resposta de erro.
 */
interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Middleware global de tratamento de erros.
 * FAIL-FAST: Erros são sempre retornados, nunca silenciados.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log do erro para debug/monitoramento
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Erros do domínio (WebhookError e subclasses)
  if (err instanceof WebhookError) {
    const response: ErrorResponse = {
      error: err.code,
      message: err.message,
      timestamp: new Date().toISOString(),
    };

    // Adiciona detalhes específicos para erros de validação
    if (err instanceof WebhookValidationError) {
      response.details = err.getDetails();
    }

    // DuplicateMessageError retorna 200 (idempotência)
    if (err instanceof DuplicateMessageError) {
      res.status(err.statusCode).json({
        success: true,
        message: err.message,
        alreadyProcessed: true,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Erros inesperados (500)
  const response: ErrorResponse = {
    error: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor',
    timestamp: new Date().toISOString(),
  };

  // Em desenvolvimento, inclui detalhes do erro
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      name: err.name,
      message: err.message,
    };
  }

  res.status(500).json(response);
}
