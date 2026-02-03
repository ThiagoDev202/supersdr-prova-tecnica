/**
 * Módulo de Adapters
 *
 * Exporta todos os adapters e o registry.
 * Também inicializa o registry com os adapters disponíveis.
 */

// Interfaces
export type { WebhookAdapter } from './interfaces/WebhookAdapter.js';

// Registry
export { AdapterRegistry, adapterRegistry } from './registry/AdapterRegistry.js';

// Adapters
export { ZApiAdapter } from './zapi/ZApiAdapter.js';
export { MetaAdapter } from './meta/MetaAdapter.js';

// Schemas (para uso em testes)
export { ZApiWebhookSchema, type ZApiWebhookPayload } from './zapi/ZApiSchema.js';
export { MetaWebhookSchema, type MetaWebhookPayload } from './meta/MetaSchema.js';

// ============================================================
// Inicialização dos Adapters
// ============================================================

import { adapterRegistry } from './registry/AdapterRegistry.js';
import { ZApiAdapter } from './zapi/ZApiAdapter.js';
import { MetaAdapter } from './meta/MetaAdapter.js';

/**
 * Inicializa o registry com todos os adapters disponíveis.
 * Deve ser chamado no startup da aplicação.
 */
export function initializeAdapters(): void {
  adapterRegistry.register(new ZApiAdapter());
  adapterRegistry.register(new MetaAdapter());

  console.log(
    `[Adapters] Inicializados: ${adapterRegistry.getRegisteredProviders().join(', ')}`
  );
}
