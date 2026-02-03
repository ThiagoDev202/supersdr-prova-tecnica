import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Provider } from '../../../domain/entities/NormalizedMessage.js';
import type { ProcessWebhookUseCase } from '../../../usecases/ProcessWebhookUseCase.js';
import type { ClassifyMessageUseCase } from '../../../usecases/ClassifyMessageUseCase.js';
import type { MessageRepository } from '../../../usecases/interfaces/MessageRepository.js';
import { UnknownProviderError } from '../../../domain/errors/WebhookErrors.js';

/**
 * Provedores suportados pelo sistema.
 */
const SUPPORTED_PROVIDERS = ['zapi', 'meta'] as const;

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
 * Extrai valor de query param (pode ser string, array ou undefined).
 */
function getQueryParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * Dependências necessárias para as rotas de webhook.
 */
export interface WebhookRoutesDependencies {
  processWebhookUseCase: ProcessWebhookUseCase;
  classifyMessageUseCase: ClassifyMessageUseCase;
  messageRepository: MessageRepository;
}

/**
 * Factory function para criar rotas de webhook.
 * Recebe dependências por injeção.
 */
export function createWebhookRoutes(deps: WebhookRoutesDependencies): Router {
  const router = Router();
  const { processWebhookUseCase, classifyMessageUseCase, messageRepository } = deps;

  /**
   * POST /webhook/:provider
   * Recebe webhooks de provedores de WhatsApp.
   *
   * Fluxo:
   * 1. Valida provedor
   * 2. Processa webhook (valida, normaliza, salva)
   * 3. Classifica intenção via LLM (apenas mensagens novas)
   * 4. Retorna resultado
   */
  router.post(
    '/:provider',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const provider = getParam(req.params['provider']);

        // 1. Valida se o provedor foi informado e é suportado
        if (!provider || !isValidProvider(provider)) {
          throw new UnknownProviderError(provider);
        }

        console.log(`[WEBHOOK] Recebido de ${provider}`);

        // 2. Processa webhook (valida, normaliza, salva)
        const result = await processWebhookUseCase.execute({
          provider,
          payload: req.body,
        });

        // 3. Se duplicata, retorna a existente sem reprocessar
        if (result.isDuplicate) {
          console.log(`[WEBHOOK] Mensagem duplicada: ${result.message.id}`);
          return res.status(200).json({
            success: true,
            messageId: result.message.id,
            duplicate: true,
            message: 'Mensagem já processada anteriormente',
          });
        }

        // 4. Classifica intenção via LLM (apenas para mensagens novas)
        const classification = await classifyMessageUseCase.classifyContent(
          result.message.message.content
        );

        // 5. Atualiza mensagem com classificação
        await messageRepository.updateClassification(
          result.message.id,
          classification
        );

        console.log(
          `[WEBHOOK] Mensagem ${result.message.id} classificada como "${classification.intent}" (${classification.confidence})`
        );

        // 6. Retorna sucesso com detalhes
        return res.status(200).json({
          success: true,
          messageId: result.message.id,
          provider: result.message.provider,
          intent: classification.intent,
          confidence: classification.confidence,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /webhook/meta
   * Verificação de webhook da Meta (challenge).
   * Necessário para configurar webhook no painel do Facebook.
   */
  router.get('/meta', (req: Request, res: Response) => {
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

  return router;
}
