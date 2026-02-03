/**
 * Re-exporta todos os tipos do domínio para facilitar importações.
 */
export type {
  Provider,
  MessageType,
  Contact,
  MessageContent,
  Classification,
  NormalizedMessage,
  CreateNormalizedMessage,
} from '../domain/entities/NormalizedMessage.js';

export {
  WebhookError,
  WebhookValidationError,
  UnknownProviderError,
  AdapterNotFoundError,
  ProcessingError,
  DuplicateMessageError,
} from '../domain/errors/WebhookErrors.js';
