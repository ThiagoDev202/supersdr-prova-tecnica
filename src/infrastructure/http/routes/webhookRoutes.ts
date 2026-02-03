import { Router, type Request, type Response, type NextFunction } from 'express';
import { UnknownProviderError } from '../../../domain/errors/WebhookErrors.js';

export const webhookRoutes = Router();

/**
 * Provedores suportados pelo sistema.
 * Adicionar novos provedores aqui conforme implementados.
 */
const SUPPORTED_PROVIDERS = ['zapi', 'meta'] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

function isValidProvider(provider: string): provider is Provider {
  return SUPPORTED_PROVIDERS.includes(provider as Provider);
}

/**
 * Extrai valor de param (pode ser string ou array).
 */
function getParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * POST /webhook/:provider
 * Recebe webhooks de provedores de WhatsApp.
 *
 * :provider - Identificador do provedor (zapi, meta)
 */
webhookRoutes.post(
  '/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = getParam(req.params['provider']);

      // Valida se o provedor foi informado e é suportado
      if (!provider || !isValidProvider(provider)) {
        throw new UnknownProviderError(provider);
      }

      // TODO: Implementar ProcessWebhookUseCase na Fase 4
      // Por enquanto, retorna sucesso com o payload recebido
      console.log(`[WEBHOOK] Recebido de ${provider}:`, JSON.stringify(req.body, null, 2));

      res.status(200).json({
        success: true,
        message: `Webhook recebido de ${provider}`,
        provider,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Extrai valor de query param (pode ser string, array ou undefined).
 */
function getQueryParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * GET /webhook/meta
 * Verificação de webhook da Meta (challenge).
 * Necessário para configurar webhook no painel do Facebook.
 */
webhookRoutes.get('/meta', (req: Request, res: Response) => {
  const mode = getQueryParam(req.query['hub.mode']);
  const token = getQueryParam(req.query['hub.verify_token']);
  const challenge = getQueryParam(req.query['hub.challenge']);

  // Verifica se é uma requisição de verificação
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[META] Webhook verificado com sucesso');
    res.status(200).send(challenge);
    return;
  }

  console.log('[META] Falha na verificação do webhook');
  res.status(403).send('Forbidden');
});
