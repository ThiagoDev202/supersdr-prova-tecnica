import type { Provider, NormalizedMessage } from '../domain/entities/NormalizedMessage.js';
import type { MessageRepository } from './interfaces/MessageRepository.js';
import type { AdapterRegistry } from '../adapters/registry/AdapterRegistry.js';
import { DuplicateMessageError, ProcessingError } from '../domain/errors/WebhookErrors.js';

/**
 * Input do caso de uso ProcessWebhook.
 */
export interface ProcessWebhookInput {
  /** Provedor do webhook (zapi, meta) */
  provider: Provider;
  /** Payload bruto recebido do provedor */
  payload: unknown;
}

/**
 * Output do caso de uso ProcessWebhook.
 */
export interface ProcessWebhookOutput {
  /** Mensagem normalizada e salva */
  message: NormalizedMessage;
  /** Se a mensagem já existia (duplicata) */
  isDuplicate: boolean;
}

/**
 * Caso de Uso: Processar Webhook
 *
 * Responsabilidades:
 * - Obter adapter correto para o provedor
 * - Validar payload usando o adapter
 * - Normalizar para formato interno
 * - Verificar duplicatas (idempotência)
 * - Persistir no banco de dados
 *
 * Princípio: Fail-Fast - erros são propagados imediatamente, sem fallbacks.
 */
export class ProcessWebhookUseCase {
  constructor(
    private readonly adapterRegistry: AdapterRegistry,
    private readonly messageRepository: MessageRepository
  ) {}

  /**
   * Executa o processamento do webhook.
   *
   * @param input - Provider e payload do webhook
   * @returns Mensagem processada e flag de duplicata
   * @throws AdapterNotFoundError se adapter não existir
   * @throws WebhookValidationError se payload inválido
   * @throws ProcessingError se falhar ao salvar
   */
  async execute(input: ProcessWebhookInput): Promise<ProcessWebhookOutput> {
    const { provider, payload } = input;

    // 1. Obtém o adapter para o provedor
    // Throws AdapterNotFoundError se não existir
    const adapter = this.adapterRegistry.getAdapter(provider);

    // 2. Valida o payload usando o schema Zod do adapter
    // Throws WebhookValidationError se inválido
    const validatedPayload = adapter.validate(payload);

    // 3. Normaliza para formato interno
    const normalizedData = adapter.normalize(validatedPayload);

    // 4. Verifica se já existe (idempotência)
    const existingMessage = await this.messageRepository.findByExternalId(
      normalizedData.provider,
      normalizedData.externalId
    );

    if (existingMessage) {
      // Mensagem já processada - retorna a existente com flag de duplicata
      // Não é erro, apenas informativo (HTTP 200)
      return {
        message: existingMessage,
        isDuplicate: true,
      };
    }

    // 5. Persiste no banco de dados
    try {
      const savedMessage = await this.messageRepository.save(normalizedData);

      return {
        message: savedMessage,
        isDuplicate: false,
      };
    } catch (error) {
      // Wrap erro inesperado em ProcessingError
      if (error instanceof Error) {
        throw new ProcessingError('save_message', error);
      }
      throw new ProcessingError('save_message', new Error('Unknown error'));
    }
  }
}
