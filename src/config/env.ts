import { z } from 'zod';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Schema de validação das variáveis de ambiente.
 * FAIL-FAST: Todas as variáveis obrigatórias devem estar presentes.
 * NÃO usa valores padrão para variáveis críticas de produção.
 */
const envSchema = z.object({
  // Servidor
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://'),

  // Z-API
  ZAPI_INSTANCE_ID: z.string().min(1),
  ZAPI_TOKEN: z.string().min(1),
  ZAPI_CLIENT_TOKEN: z.string().min(1),

  // Meta Cloud API (opcional para simulação)
  META_VERIFY_TOKEN: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),

  // Anthropic (Claude LLM)
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
});

/**
 * Valida as variáveis de ambiente no startup da aplicação.
 * Se alguma variável obrigatória estiver faltando, a aplicação NÃO inicia.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Variáveis de ambiente inválidas:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
