import { z } from 'zod';

/**
 * Schema Zod para validação do webhook da Meta Cloud API (WhatsApp Business).
 *
 * Baseado na documentação oficial e exemplo do arquivo de requisitos.
 *
 * IMPORTANTE: Este schema valida apenas mensagens de TEXTO recebidas.
 * A estrutura da Meta é aninhada: entry[].changes[].value.messages[]
 */

/**
 * Schema para o objeto de texto da mensagem.
 */
const MetaTextSchema = z.object({
  body: z.string().min(1),
});

/**
 * Schema para uma mensagem individual.
 */
const MetaMessageSchema = z.object({
  from: z.string().min(1),
  id: z.string().min(1),
  timestamp: z.string(), // Unix timestamp como string
  type: z.literal('text'),
  text: MetaTextSchema,
});

/**
 * Schema para informações do contato.
 */
const MetaContactSchema = z.object({
  profile: z.object({
    name: z.string(),
  }),
  wa_id: z.string(),
});

/**
 * Schema para metadados.
 */
const MetaMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

/**
 * Schema para o objeto value dentro de changes.
 */
const MetaValueSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: MetaMetadataSchema,
  contacts: z.array(MetaContactSchema).min(1),
  messages: z.array(MetaMessageSchema).min(1),
});

/**
 * Schema para o objeto changes.
 */
const MetaChangeSchema = z.object({
  value: MetaValueSchema,
  field: z.literal('messages'),
});

/**
 * Schema para o objeto entry.
 */
const MetaEntrySchema = z.object({
  id: z.string(),
  changes: z.array(MetaChangeSchema).min(1),
});

/**
 * Schema principal do webhook Meta Cloud API.
 */
export const MetaWebhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(MetaEntrySchema).min(1),
});

/**
 * Tipo inferido do schema Meta.
 */
export type MetaWebhookPayload = z.infer<typeof MetaWebhookSchema>;

/**
 * Tipo para uma mensagem individual extraída do payload.
 */
export interface MetaExtractedMessage {
  messageId: string;
  from: string;
  contactName: string;
  text: string;
  timestamp: number;
}
