/**
 * Módulo de Use Cases
 *
 * Exporta todos os casos de uso e suas interfaces.
 */

// Interfaces (contratos para infraestrutura)
export type { MessageRepository } from './interfaces/MessageRepository.js';
export type { ClassificationService } from './interfaces/ClassificationService.js';

// Use Cases
export {
  ProcessWebhookUseCase,
  type ProcessWebhookInput,
  type ProcessWebhookOutput,
} from './ProcessWebhookUseCase.js';

export {
  ClassifyMessageUseCase,
  type ClassifyMessageInput,
  type ClassifyMessageOutput,
} from './ClassifyMessageUseCase.js';
