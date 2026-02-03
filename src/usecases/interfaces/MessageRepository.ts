import type { NormalizedMessage, CreateNormalizedMessage, Classification } from '../../domain/entities/NormalizedMessage.js';

/**
 * Interface do repositório de mensagens.
 * Define as operações de persistência sem acoplar à implementação (Prisma).
 */
export interface MessageRepository {
  /**
   * Salva uma nova mensagem no banco.
   * @throws ProcessingError se falhar ao salvar
   */
  save(message: CreateNormalizedMessage): Promise<NormalizedMessage>;

  /**
   * Busca uma mensagem pelo ID interno.
   */
  findById(id: string): Promise<NormalizedMessage | null>;

  /**
   * Busca uma mensagem pelo ID externo e provedor.
   * Usado para verificar duplicatas (idempotência).
   */
  findByExternalId(provider: string, externalId: string): Promise<NormalizedMessage | null>;

  /**
   * Atualiza a classificação de uma mensagem.
   * @throws ProcessingError se mensagem não existir ou falhar ao atualizar
   */
  updateClassification(id: string, classification: Classification): Promise<NormalizedMessage>;
}
