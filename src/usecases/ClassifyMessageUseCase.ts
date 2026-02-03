import type { NormalizedMessage, Classification } from '../domain/entities/NormalizedMessage.js';
import type { MessageRepository } from './interfaces/MessageRepository.js';
import type { ClassificationService } from './interfaces/ClassificationService.js';
import { ProcessingError } from '../domain/errors/WebhookErrors.js';

/**
 * Input do caso de uso ClassifyMessage.
 */
export interface ClassifyMessageInput {
  /** ID da mensagem a ser classificada */
  messageId: string;
}

/**
 * Output do caso de uso ClassifyMessage.
 */
export interface ClassifyMessageOutput {
  /** Mensagem com classificação atualizada */
  message: NormalizedMessage;
  /** Classificação gerada */
  classification: Classification;
}

/**
 * Caso de Uso: Classificar Intenção de Mensagem
 *
 * Responsabilidades:
 * - Buscar mensagem pelo ID
 * - Chamar serviço de classificação (LLM)
 * - Atualizar mensagem com classificação
 *
 * Princípio: Fail-Fast - erros são propagados imediatamente, sem fallbacks.
 */
export class ClassifyMessageUseCase {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly classificationService: ClassificationService
  ) {}

  /**
   * Executa a classificação de uma mensagem.
   *
   * @param input - ID da mensagem a classificar
   * @returns Mensagem atualizada com classificação
   * @throws ProcessingError se mensagem não existir ou classificação falhar
   */
  async execute(input: ClassifyMessageInput): Promise<ClassifyMessageOutput> {
    const { messageId } = input;

    // 1. Busca a mensagem no banco
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new ProcessingError(
        'find_message',
        new Error(`Mensagem não encontrada: ${messageId}`)
      );
    }

    // 2. Se já foi classificada, retorna sem reprocessar
    if (message.classification) {
      return {
        message,
        classification: message.classification,
      };
    }

    // 3. Classifica via LLM
    let classification: Classification;
    try {
      classification = await this.classificationService.classify(
        message.message.content
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new ProcessingError('classify_message', error);
      }
      throw new ProcessingError('classify_message', new Error('Unknown error'));
    }

    // 4. Atualiza a mensagem com a classificação
    try {
      const updatedMessage = await this.messageRepository.updateClassification(
        messageId,
        classification
      );

      return {
        message: updatedMessage,
        classification,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new ProcessingError('update_classification', error);
      }
      throw new ProcessingError('update_classification', new Error('Unknown error'));
    }
  }

  /**
   * Classifica conteúdo diretamente, sem buscar no banco.
   * Útil para classificação inline durante o processamento do webhook.
   *
   * @param content - Conteúdo textual a classificar
   * @returns Classificação gerada
   * @throws ProcessingError se classificação falhar
   */
  async classifyContent(content: string): Promise<Classification> {
    try {
      return await this.classificationService.classify(content);
    } catch (error) {
      if (error instanceof Error) {
        throw new ProcessingError('classify_content', error);
      }
      throw new ProcessingError('classify_content', new Error('Unknown error'));
    }
  }
}
