/**
 * Provedores de WhatsApp suportados pelo sistema.
 */
export type Provider = 'zapi' | 'meta';

/**
 * Tipos de mensagem suportados.
 * MVP: Apenas texto.
 */
export type MessageType = 'text';

/**
 * Informações do contato que enviou a mensagem.
 */
export interface Contact {
  /** Número de telefone normalizado (apenas dígitos). Ex: "5511988888888" */
  phone: string;
  /** Nome do contato conforme salvo no WhatsApp */
  name: string;
}

/**
 * Conteúdo da mensagem.
 */
export interface MessageContent {
  /** Tipo da mensagem */
  type: MessageType;
  /** Conteúdo textual da mensagem */
  content: string;
}

/**
 * Classificação de intenção gerada pelo LLM.
 */
export interface Classification {
  /** Intenção identificada (ex: "interesse_produto", "duvida", "reclamacao") */
  intent: string;
  /** Nível de confiança da classificação (0.0 a 1.0) */
  confidence: number;
}

/**
 * Formato normalizado de mensagem.
 * Todos os provedores são convertidos para este formato único.
 */
export interface NormalizedMessage {
  /** UUID gerado internamente */
  id: string;
  /** ID original da mensagem no provedor */
  externalId: string;
  /** Identificador do provedor de origem */
  provider: Provider;

  /** Informações do contato */
  contact: Contact;
  /** Conteúdo da mensagem */
  message: MessageContent;

  /** Momento da mensagem original (timestamp do provedor) */
  timestamp: Date;
  /** Momento do recebimento no sistema */
  receivedAt: Date;
  /** Se a mensagem foi enviada por nós (não pelo contato) */
  isFromMe: boolean;

  /** Classificação de intenção (preenchido após processamento LLM) */
  classification?: Classification;
}

/**
 * Dados para criar uma nova mensagem normalizada (sem id e receivedAt).
 */
export type CreateNormalizedMessage = Omit<NormalizedMessage, 'id' | 'receivedAt' | 'classification'>;
