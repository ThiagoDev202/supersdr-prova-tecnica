import type { ZodSchema } from 'zod';
import type { WebhookAdapter } from '../interfaces/WebhookAdapter.js';
import type { CreateNormalizedMessage } from '../../domain/entities/NormalizedMessage.js';
import { WebhookValidationError } from '../../domain/errors/WebhookErrors.js';
import { MetaWebhookSchema, type MetaWebhookPayload } from './MetaSchema.js';

/**
 * Adapter para normalização de webhooks da Meta Cloud API (WhatsApp Business).
 *
 * Responsabilidades:
 * - Validar payload da Meta usando Zod (fail-fast)
 * - Extrair primeira mensagem do payload aninhado
 * - Normalizar para formato único interno
 * - Identificar se o payload é da Meta
 *
 * NOTA: A Meta pode enviar múltiplas mensagens em um único webhook.
 * Este adapter processa apenas a PRIMEIRA mensagem.
 * Para processar todas, seria necessário retornar um array.
 */
export class MetaAdapter implements WebhookAdapter<MetaWebhookPayload> {
  readonly provider = 'meta' as const;
  readonly schema: ZodSchema<MetaWebhookPayload> = MetaWebhookSchema;

  /**
   * Valida o payload usando o schema Zod.
   * @throws WebhookValidationError se inválido (fail-fast, sem fallback)
   */
  validate(payload: unknown): MetaWebhookPayload {
    const result = this.schema.safeParse(payload);

    if (!result.success) {
      throw new WebhookValidationError(this.provider, result.error);
    }

    return result.data;
  }

  /**
   * Normaliza o payload da Meta para formato único interno.
   * Extrai a primeira mensagem do payload aninhado.
   */
  normalize(payload: MetaWebhookPayload): CreateNormalizedMessage {
    // Estrutura aninhada: entry[0].changes[0].value
    const entry = payload.entry[0];
    if (!entry) {
      throw new Error('Payload Meta sem entry');
    }

    const change = entry.changes[0];
    if (!change) {
      throw new Error('Payload Meta sem changes');
    }

    const value = change.value;
    const message = value.messages[0];
    const contact = value.contacts[0];

    if (!message) {
      throw new Error('Payload Meta sem messages');
    }

    if (!contact) {
      throw new Error('Payload Meta sem contacts');
    }

    return {
      externalId: message.id,
      provider: this.provider,
      contact: {
        phone: this.normalizePhone(message.from),
        name: contact.profile.name,
      },
      message: {
        type: 'text',
        content: message.text.body,
      },
      timestamp: new Date(parseInt(message.timestamp) * 1000), // Unix timestamp em segundos
      isFromMe: false, // Webhook da Meta só envia mensagens recebidas
    };
  }

  /**
   * Verifica se o payload é da Meta Cloud API.
   * Identifica pelo campo 'object' com valor 'whatsapp_business_account'.
   */
  canHandle(payload: unknown): boolean {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const obj = payload as Record<string, unknown>;

    // Meta sempre envia 'object': 'whatsapp_business_account'
    return obj['object'] === 'whatsapp_business_account';
  }

  /**
   * Normaliza número de telefone removendo caracteres especiais.
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
