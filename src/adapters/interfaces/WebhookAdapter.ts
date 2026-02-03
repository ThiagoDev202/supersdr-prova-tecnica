import type { ZodSchema } from 'zod';
import type { CreateNormalizedMessage, Provider } from '../../domain/entities/NormalizedMessage.js';

/**
 * Interface que todo adapter de webhook deve implementar.
 * Cada provedor (Z-API, Meta, etc.) terá seu próprio adapter.
 *
 * Responsabilidades:
 * - Validar payload recebido do provedor
 * - Normalizar payload para formato único interno
 */
export interface WebhookAdapter<TPayload = unknown> {
  /**
   * Identificador único do provedor.
   */
  readonly provider: Provider;

  /**
   * Schema Zod para validação do payload.
   */
  readonly schema: ZodSchema<TPayload>;

  /**
   * Valida o payload recebido usando o schema Zod.
   * @throws WebhookValidationError se o payload for inválido
   */
  validate(payload: unknown): TPayload;

  /**
   * Normaliza o payload validado para o formato único interno.
   * @param payload - Payload já validado pelo schema
   * @returns Mensagem normalizada pronta para persistência
   */
  normalize(payload: TPayload): CreateNormalizedMessage;

  /**
   * Verifica se este adapter deve processar o payload.
   * Útil para identificação automática de provedor.
   * @param payload - Payload bruto recebido
   * @returns true se este adapter reconhece o formato
   */
  canHandle(payload: unknown): boolean;
}
