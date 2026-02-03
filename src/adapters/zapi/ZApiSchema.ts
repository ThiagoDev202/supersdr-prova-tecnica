import { z } from 'zod';

/**
 * Schema Zod para validação do webhook de mensagem recebida do Z-API.
 *
 * Baseado na documentação oficial: https://developer.z-api.io/webhooks/on-message-received
 *
 * Suporta mensagens de TEXTO e IMAGEM (com caption).
 * Outros tipos serão aceitos mas normalizados como "outro" no adapter.
 */

/**
 * Schema para o objeto de texto da mensagem.
 */
const ZApiTextSchema = z.object({
  message: z.string().min(1),
});

/**
 * Schema para o objeto de imagem da mensagem.
 */
const ZApiImageSchema = z.object({
  imageUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  caption: z.string().optional(),
  mimeType: z.string().optional(),
  viewOnce: z.boolean().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

/**
 * Schema principal do webhook Z-API.
 *
 * Campos obrigatórios conforme documentação:
 * - instanceId: ID da instância Z-API
 * - messageId: ID único da mensagem
 * - phone: Número do remetente
 * - fromMe: Se a mensagem foi enviada por nós
 * - momment: Timestamp em millisegundos
 * - status: Status da mensagem
 * - chatName: Nome do chat/contato
 * - senderName: Nome do remetente
 * - type: Tipo do callback (ReceivedCallback)
 *
 * Campos opcionais (dependem do tipo de mensagem):
 * - text: Objeto contendo a mensagem de texto
 * - image: Objeto contendo imagem com caption opcional
 */
export const ZApiWebhookSchema = z.object({
  instanceId: z.string().min(1),
  messageId: z.string().min(1),
  phone: z.string().min(1),
  fromMe: z.boolean(),
  momment: z.number(), // Timestamp em millisegundos
  status: z.string(),
  chatName: z.string(),
  senderName: z.string(),
  senderPhoto: z.string().nullable().optional(),
  participantPhone: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
  broadcast: z.boolean().optional(),
  type: z.literal('ReceivedCallback'),
  // Tipos de mensagem (pelo menos um deve estar presente)
  text: ZApiTextSchema.optional(),
  image: ZApiImageSchema.optional(),
});

/**
 * Tipo inferido do schema Z-API.
 */
export type ZApiWebhookPayload = z.infer<typeof ZApiWebhookSchema>;
