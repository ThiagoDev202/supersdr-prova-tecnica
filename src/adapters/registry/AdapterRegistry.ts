import type { Provider } from '../../domain/entities/NormalizedMessage.js';
import type { WebhookAdapter } from '../interfaces/WebhookAdapter.js';
import { AdapterNotFoundError } from '../../domain/errors/WebhookErrors.js';

/**
 * Registry de adapters de webhook.
 * Implementa o padrão Factory Registry para gerenciar adapters.
 *
 * Benefícios:
 * - Open/Closed Principle: adicionar novo adapter não modifica código existente
 * - Desacoplamento: quem usa não precisa conhecer implementações específicas
 * - Extensibilidade: novos provedores são apenas novas classes + registro
 */
export class AdapterRegistry {
  private adapters: Map<Provider, WebhookAdapter> = new Map();

  /**
   * Registra um adapter para um provedor.
   * @param adapter - Instância do adapter a ser registrado
   */
  register(adapter: WebhookAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      console.warn(`[AdapterRegistry] Substituindo adapter existente para: ${adapter.provider}`);
    }
    this.adapters.set(adapter.provider, adapter);
    console.log(`[AdapterRegistry] Adapter registrado: ${adapter.provider}`);
  }

  /**
   * Obtém o adapter para um provedor específico.
   * @param provider - Identificador do provedor
   * @throws AdapterNotFoundError se o adapter não estiver registrado
   */
  getAdapter(provider: Provider): WebhookAdapter {
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new AdapterNotFoundError(provider);
    }

    return adapter;
  }

  /**
   * Verifica se existe adapter registrado para um provedor.
   */
  hasAdapter(provider: Provider): boolean {
    return this.adapters.has(provider);
  }

  /**
   * Tenta identificar automaticamente qual adapter pode processar o payload.
   * Útil quando o provedor não é especificado na rota.
   * @param payload - Payload bruto recebido
   * @returns Adapter que pode processar o payload, ou undefined
   */
  findAdapterForPayload(payload: unknown): WebhookAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(payload)) {
        return adapter;
      }
    }
    return undefined;
  }

  /**
   * Lista todos os provedores registrados.
   */
  getRegisteredProviders(): Provider[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Instância singleton do registry.
 * Deve ser populada no startup da aplicação.
 */
export const adapterRegistry = new AdapterRegistry();
