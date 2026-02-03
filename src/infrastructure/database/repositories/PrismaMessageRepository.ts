import { PrismaClient, type Message } from '@prisma/client';
import type { MessageRepository } from '../../../usecases/interfaces/MessageRepository.js';
import type {
  NormalizedMessage,
  CreateNormalizedMessage,
  Classification,
  Provider,
} from '../../../domain/entities/NormalizedMessage.js';
import { ProcessingError } from '../../../domain/errors/WebhookErrors.js';

/**
 * Implementação do MessageRepository usando Prisma.
 *
 * Responsabilidades:
 * - Persistir mensagens normalizadas no PostgreSQL
 * - Verificar duplicatas (idempotência)
 * - Atualizar classificações
 *
 * Princípio: Fail-Fast - erros são propagados sem fallbacks.
 */
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Salva uma nova mensagem no banco.
   */
  async save(message: CreateNormalizedMessage): Promise<NormalizedMessage> {
    try {
      const created = await this.prisma.message.create({
        data: {
          externalId: message.externalId,
          provider: message.provider,
          contactPhone: message.contact.phone,
          contactName: message.contact.name,
          messageType: message.message.type,
          messageContent: message.message.content,
          timestamp: message.timestamp,
          isFromMe: message.isFromMe,
        },
      });

      return this.mapToEntity(created);
    } catch (error) {
      if (error instanceof Error) {
        throw new ProcessingError('save_message', error);
      }
      throw new ProcessingError('save_message', new Error('Unknown error'));
    }
  }

  /**
   * Busca uma mensagem pelo ID interno.
   */
  async findById(id: string): Promise<NormalizedMessage | null> {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return null;
    }

    return this.mapToEntity(message);
  }

  /**
   * Busca uma mensagem pelo ID externo e provedor.
   * Usado para verificar duplicatas (idempotência).
   */
  async findByExternalId(
    provider: string,
    externalId: string
  ): Promise<NormalizedMessage | null> {
    const message = await this.prisma.message.findUnique({
      where: {
        provider_externalId: {
          provider,
          externalId,
        },
      },
    });

    if (!message) {
      return null;
    }

    return this.mapToEntity(message);
  }

  /**
   * Atualiza a classificação de uma mensagem.
   */
  async updateClassification(
    id: string,
    classification: Classification
  ): Promise<NormalizedMessage> {
    try {
      const updated = await this.prisma.message.update({
        where: { id },
        data: {
          intent: classification.intent,
          intentConfidence: classification.confidence,
        },
      });

      return this.mapToEntity(updated);
    } catch (error) {
      if (error instanceof Error) {
        throw new ProcessingError('update_classification', error);
      }
      throw new ProcessingError('update_classification', new Error('Unknown error'));
    }
  }

  /**
   * Mapeia um registro do Prisma para a entidade de domínio.
   */
  private mapToEntity(record: Message): NormalizedMessage {
    const message: NormalizedMessage = {
      id: record.id,
      externalId: record.externalId,
      provider: record.provider as Provider,
      contact: {
        phone: record.contactPhone,
        name: record.contactName,
      },
      message: {
        type: record.messageType as 'text',
        content: record.messageContent,
      },
      timestamp: record.timestamp,
      receivedAt: record.receivedAt,
      isFromMe: record.isFromMe,
    };

    // Adiciona classificação se existir
    if (record.intent && record.intentConfidence !== null) {
      message.classification = {
        intent: record.intent,
        confidence: record.intentConfidence,
      };
    }

    return message;
  }
}
