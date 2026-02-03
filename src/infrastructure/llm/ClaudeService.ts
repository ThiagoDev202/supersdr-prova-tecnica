import Anthropic from '@anthropic-ai/sdk';
import type { ClassificationService } from '../../usecases/interfaces/ClassificationService.js';
import type { Classification } from '../../domain/entities/NormalizedMessage.js';
import { ProcessingError } from '../../domain/errors/WebhookErrors.js';

/**
 * Prompt de classificação de intenção.
 * Retorna JSON estruturado com intent e confidence.
 */
const CLASSIFICATION_PROMPT = `Você é um classificador de intenções de mensagens de WhatsApp para um sistema de vendas.

Classifique a mensagem abaixo em UMA das seguintes categorias:
- interesse_produto: Lead quer comprar ou saber mais sobre o produto
- duvida_produto: Pergunta sobre preço, características, disponibilidade
- suporte_tecnico: Problema técnico, dificuldade de uso
- reclamacao: Insatisfação, queixa, problema com compra
- saudacao: Apenas oi, olá, bom dia, sem conteúdo adicional
- outro: Não se encaixa em nenhuma categoria

Responda APENAS com JSON no formato:
{ "intent": "categoria", "confidence": 0.0 a 1.0 }

Mensagem: "{content}"`;

/**
 * Implementação do ClassificationService usando Claude LLM.
 *
 * Responsabilidades:
 * - Classificar intenção de mensagens de texto
 * - Retornar classificação estruturada (intent + confidence)
 *
 * Princípio: Fail-Fast - erros são propagados sem fallbacks.
 */
export class ClaudeService implements ClassificationService {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Classifica a intenção de uma mensagem usando Claude.
   *
   * @param content - Conteúdo textual da mensagem
   * @returns Classificação com intent e confidence
   * @throws ProcessingError se falhar ao classificar
   */
  async classify(content: string): Promise<Classification> {
    const prompt = CLASSIFICATION_PROMPT.replace('{content}', content);

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Mais rápido e econômico
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extrai o texto da resposta
      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Resposta do Claude não contém texto');
      }

      // Parseia o JSON da resposta
      const parsed = this.parseClassificationResponse(textBlock.text);

      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
      };
    } catch (error) {
      if (error instanceof ProcessingError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ProcessingError('classify_llm', error);
      }
      throw new ProcessingError('classify_llm', new Error('Unknown error'));
    }
  }

  /**
   * Parseia a resposta JSON do Claude.
   * Extrai o JSON mesmo se houver texto extra.
   */
  private parseClassificationResponse(text: string): { intent: string; confidence: number } {
    try {
      // Tenta extrair JSON de dentro da resposta (caso tenha texto extra)
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Valida campos obrigatórios
      if (typeof parsed.intent !== 'string') {
        throw new Error('Campo "intent" ausente ou inválido');
      }

      if (typeof parsed.confidence !== 'number') {
        throw new Error('Campo "confidence" ausente ou inválido');
      }

      // Valida range do confidence
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error('Campo "confidence" deve estar entre 0 e 1');
      }

      // Valida intent válido
      const validIntents = [
        'interesse_produto',
        'duvida_produto',
        'suporte_tecnico',
        'reclamacao',
        'saudacao',
        'outro',
      ];

      if (!validIntents.includes(parsed.intent)) {
        // Aceita mas loga warning - LLM pode ser criativo
        console.warn(`Intent não reconhecido: ${parsed.intent}, usando "outro"`);
        parsed.intent = 'outro';
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error) {
        throw new ProcessingError('parse_classification', error);
      }
      throw new ProcessingError('parse_classification', new Error('Failed to parse JSON'));
    }
  }
}
