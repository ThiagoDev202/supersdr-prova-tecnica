import type { ZodSchema } from 'zod';
import type { WebhookAdapter } from '../interfaces/WebhookAdapter.js';
import type { CreateNormalizedMessage } from '../../domain/entities/NormalizedMessage.js';
import { WebhookValidationError } from '../../domain/errors/WebhookErrors.js';
import { ZApiWebhookSchema, type ZApiWebhookPayload } from './ZApiSchema.js';

/**
 * Adapter para normalização de webhooks do Z-API.
 *
 * Responsabilidades:
 * - Validar payload do Z-API usando Zod (fail-fast)
 * - Normalizar para formato único interno
 * - Identificar se o payload é do Z-API
 */
export class ZApiAdapter implements WebhookAdapter<ZApiWebhookPayload> {
  readonly provider = 'zapi' as const;
  readonly schema: ZodSchema<ZApiWebhookPayload> = ZApiWebhookSchema;

  /**
   * Valida o payload usando o schema Zod.
   * @throws WebhookValidationError se inválido (fail-fast, sem fallback)
   */
  validate(payload: unknown): ZApiWebhookPayload {
    const result = this.schema.safeParse(payload);

    if (!result.success) {
      throw new WebhookValidationError(this.provider, result.error);
    }

    return result.data;
  }

  /**
   * Normaliza o payload do Z-API para formato único interno.
   * Suporta mensagens de texto e imagens (usando caption).
   */
  normalize(payload: ZApiWebhookPayload): CreateNormalizedMessage {
    // Extrai conteúdo: texto > caption da imagem > placeholder
    const content = this.extractContent(payload);

    return {
      externalId: payload.messageId,
      provider: this.provider,
      contact: {
        phone: this.normalizePhone(payload.phone),
        name: payload.senderName || payload.chatName,
      },
      message: {
        type: 'text',
        content,
      },
      timestamp: new Date(payload.momment),
      isFromMe: payload.fromMe,
    };
  }

  /**
   * Extrai o conteúdo textual da mensagem.
   * Prioridade: texto > caption da imagem > placeholder
   */
  private extractContent(payload: ZApiWebhookPayload): string {
    // Mensagem de texto
    if (payload.text?.message) {
      return payload.text.message;
    }

    // Imagem com caption
    if (payload.image?.caption) {
      return payload.image.caption;
    }

    // Imagem sem caption
    if (payload.image) {
      return '[Imagem recebida]';
    }

    // Fallback para outros tipos de mídia
    return '[Mídia recebida]';
  }

  /**
   * Verifica se o payload é do Z-API.
   * Identifica pelo campo 'type' com valor 'ReceivedCallback'.
   */
  canHandle(payload: unknown): boolean {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const obj = payload as Record<string, unknown>;

    // Z-API sempre envia 'type': 'ReceivedCallback' para mensagens recebidas
    // e possui 'instanceId' e 'messageId'
    return (
      obj['type'] === 'ReceivedCallback' &&
      typeof obj['instanceId'] === 'string' &&
      typeof obj['messageId'] === 'string'
    );
  }

  /**
   * Normaliza número de telefone removendo caracteres especiais.
   * Z-API envia apenas números, mas garantimos consistência.
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
