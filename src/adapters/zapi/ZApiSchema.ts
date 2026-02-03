import { z } from 'zod';

/**
 * Schema Zod para validação do webhook de mensagem recebida do Z-API.
 *
 * Baseado na documentação oficial: https://developer.z-api.io/webhooks/on-message-received
 *
 * IMPORTANTE: Este schema valida apenas mensagens de TEXTO recebidas.
 * Outros tipos (imagem, áudio, etc.) serão ignorados neste MVP.
 */

/**
 * Schema para o objeto de texto da mensagem.
 */
const ZApiTextSchema = z.object({
  message: z.string().min(1),
});

/**
 * Schema principal do webhook Z-API para mensagens de texto.
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
 * - text: Objeto contendo a mensagem de texto
 * - type: Tipo do callback (ReceivedCallback)
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
  senderPhoto: z.string().optional(),
  participantPhone: z.string().nullable().optional(),
  photo: z.string().optional(),
  broadcast: z.boolean().optional(),
  type: z.literal('ReceivedCallback'),
  text: ZApiTextSchema,
});

/**
 * Tipo inferido do schema Z-API.
 */
export type ZApiWebhookPayload = z.infer<typeof ZApiWebhookSchema>;
