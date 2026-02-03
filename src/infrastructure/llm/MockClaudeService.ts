import type { ClassificationService } from '../../usecases/interfaces/ClassificationService.js';
import type { Classification } from '../../domain/entities/NormalizedMessage.js';

/**
 * Mock do ClaudeService para testes locais sem custo de API.
 *
 * Classifica mensagens usando regras simples baseadas em palavras-chave.
 * Use quando não tiver créditos na API Anthropic ou para testes automatizados.
 */
export class MockClaudeService implements ClassificationService {
  /**
   * Classifica a intenção de uma mensagem usando regras simples.
   *
   * @param content - Conteúdo textual da mensagem
   * @returns Classificação com intent e confidence
   */
  async classify(content: string): Promise<Classification> {
    const lowerContent = content.toLowerCase();

    // Regras simples de classificação baseadas em palavras-chave
    if (this.containsAny(lowerContent, ['comprar', 'quero', 'preço', 'valor', 'quanto custa', 'interesse'])) {
      return { intent: 'interesse_produto', confidence: 0.85 };
    }

    if (this.containsAny(lowerContent, ['dúvida', 'como funciona', 'qual', 'quando', 'onde', 'características'])) {
      return { intent: 'duvida_produto', confidence: 0.80 };
    }

    if (this.containsAny(lowerContent, ['suporte', 'ajuda', 'problema', 'erro', 'não funciona', 'bug'])) {
      return { intent: 'suporte_tecnico', confidence: 0.85 };
    }

    if (this.containsAny(lowerContent, ['reclamação', 'insatisfeito', 'péssimo', 'ruim', 'horrível', 'decepcionado'])) {
      return { intent: 'reclamacao', confidence: 0.90 };
    }

    if (this.containsAny(lowerContent, ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'opa'])) {
      return { intent: 'saudacao', confidence: 0.95 };
    }

    // Default: outro
    return { intent: 'outro', confidence: 0.60 };
  }

  /**
   * Verifica se o texto contém alguma das palavras-chave.
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}
