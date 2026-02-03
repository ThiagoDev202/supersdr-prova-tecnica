import type { Classification } from '../../domain/entities/NormalizedMessage.js';

/**
 * Interface do serviço de classificação de intenção.
 * Define o contrato sem acoplar à implementação (Claude LLM).
 */
export interface ClassificationService {
  /**
   * Classifica a intenção de uma mensagem.
   *
   * @param content - Conteúdo textual da mensagem
   * @returns Classificação com intent e confidence
   * @throws ProcessingError se falhar ao classificar
   */
  classify(content: string): Promise<Classification>;
}
