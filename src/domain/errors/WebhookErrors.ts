import type { ZodError } from 'zod';

/**
 * Erro base para todos os erros de webhook.
 * Permite identificar erros do domínio vs erros inesperados.
 */
export abstract class WebhookError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Payload do webhook não passou na validação Zod.
 * HTTP 400 - Bad Request
 */
export class WebhookValidationError extends WebhookError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';

  constructor(
    public readonly provider: string,
    public readonly zodError: ZodError
  ) {
    super(`Payload inválido do provedor ${provider}`);
  }

  /**
   * Retorna os detalhes do erro de validação formatados.
   */
  getDetails(): Array<{ path: string; message: string }> {
    return this.zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }
}

/**
 * Não foi possível identificar o provedor pelo payload/rota.
 * HTTP 400 - Bad Request
 */
export class UnknownProviderError extends WebhookError {
  readonly statusCode = 400;
  readonly code = 'UNKNOWN_PROVIDER';

  constructor(public readonly receivedProvider?: string) {
    super(
      receivedProvider
        ? `Provedor desconhecido: ${receivedProvider}`
        : 'Não foi possível identificar o provedor do webhook'
    );
  }
}

/**
 * Provedor identificado, mas não há adapter registrado para ele.
 * HTTP 501 - Not Implemented
 */
export class AdapterNotFoundError extends WebhookError {
  readonly statusCode = 501;
  readonly code = 'PROVIDER_NOT_IMPLEMENTED';

  constructor(public readonly provider: string) {
    super(`Adapter não encontrado para provedor: ${provider}`);
  }
}

/**
 * Erro durante o processamento do webhook (banco, LLM, etc).
 * HTTP 500 - Internal Server Error
 */
export class ProcessingError extends WebhookError {
  readonly statusCode = 500;
  readonly code = 'PROCESSING_ERROR';

  constructor(
    public readonly step: string,
    public readonly originalError: Error
  ) {
    super(`Erro no passo "${step}": ${originalError.message}`);
  }
}

/**
 * Mensagem duplicada (já processada anteriormente).
 * Não é exatamente um erro, mas indica idempotência.
 * HTTP 200 - OK (já processado)
 */
export class DuplicateMessageError extends WebhookError {
  readonly statusCode = 200;
  readonly code = 'DUPLICATE_MESSAGE';

  constructor(
    public readonly provider: string,
    public readonly externalId: string
  ) {
    super(`Mensagem já processada: ${provider}/${externalId}`);
  }
}
