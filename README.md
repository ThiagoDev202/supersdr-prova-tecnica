# SuperSDR - Sistema de Normalização de Webhooks

Sistema para receber webhooks de provedores de WhatsApp (Z-API e Meta Cloud API), normalizar para formato único interno, persistir em PostgreSQL e classificar intenção via Claude LLM.

---

## Funcionalidades Implementadas

- [x] Recebimento de webhooks Z-API
- [x] Recebimento de webhooks Meta Cloud API
- [x] Validação de payloads com Zod (fail-fast)
- [x] Normalização para formato único interno
- [x] Persistência em PostgreSQL via Prisma
- [x] Idempotência (mensagens duplicadas são ignoradas)
- [x] Classificação de intenção via Claude LLM
- [x] MockClaudeService para testes sem custo de API
- [x] Suporte a mensagens de texto e imagem (caption)
- [x] Health check endpoint
- [x] Tratamento de erros estruturado
- [x] Docker + docker-compose para deploy
- [x] Documentação completa

---

## Decisões Técnicas

### Pattern Utilizado: Adapter Pattern + Factory Registry

**Por que Adapter Pattern?**

O Adapter Pattern foi escolhido porque o problema central é transformar interfaces incompatíveis (webhooks de diferentes provedores) em um formato único interno. Cada provedor (Z-API, Meta) envia payloads com estruturas completamente diferentes:

```
Z-API:  { messageId, phone, text: { message }, momment, ... }
Meta:   { entry: [{ changes: [{ value: { messages: [...] } }] }] }
```

Com o Adapter Pattern, cada provedor tem seu próprio adapter isolado que:
1. **Valida** o payload usando schema Zod específico
2. **Normaliza** para o formato `NormalizedMessage` padronizado

**Por que Factory Registry?**

O AdapterRegistry atua como uma factory que:
- Registra adapters disponíveis em tempo de inicialização
- Seleciona automaticamente o adapter correto baseado no provider da URL
- Permite adicionar novos provedores sem modificar código existente

**Benefícios alcançados:**
- **Open/Closed Principle**: Adicionar novo provedor = criar novo adapter, zero mudanças no código existente
- **Single Responsibility**: Cada adapter cuida apenas do seu provedor
- **Testabilidade**: Adapters podem ser testados isoladamente

### Estrutura de Banco de Dados

```prisma
model Message {
  id          String   @id @default(uuid())
  externalId  String                        // ID original do provedor
  provider    String                        // 'zapi' | 'meta'

  contactPhone String                       // Telefone normalizado
  contactName  String                       // Nome do contato

  messageType    String                     // 'text' (extensível)
  messageContent String                     // Conteúdo da mensagem

  timestamp   DateTime                      // Momento original
  receivedAt  DateTime @default(now())      // Momento do recebimento
  isFromMe    Boolean  @default(false)      // Direção da mensagem

  intent           String?                  // Classificação LLM
  intentConfidence Float?                   // Confiança (0.0 a 1.0)

  @@unique([provider, externalId])          // Garante idempotência
  @@index([contactPhone])                   // Busca por contato
  @@index([timestamp])                      // Ordenação temporal
  @@index([provider])                       // Filtro por provedor
  @@index([intent])                         // Análise por intenção
}
```

**Decisões de modelagem:**
- **UUID como PK**: Evita exposição de sequência e facilita sharding futuro
- **Unique constraint (provider + externalId)**: Garante idempotência nativa
- **Índices estratégicos**: Otimiza queries mais comuns (busca por contato, filtro por provedor)
- **Campos de classificação nullable**: Preenchidos após processamento LLM

### Como a Extensibilidade foi Garantida

**1. Adicionar novo provedor (ex: Twilio):**

```typescript
// 1. Criar schema: src/adapters/twilio/TwilioSchema.ts
export const TwilioWebhookSchema = z.object({ ... });

// 2. Criar adapter: src/adapters/twilio/TwilioAdapter.ts
export class TwilioAdapter implements WebhookAdapter { ... }

// 3. Registrar: src/adapters/index.ts
registry.register('twilio', new TwilioAdapter());
```

Zero mudanças no código existente. A rota `/webhook/twilio` passa a funcionar automaticamente.

**2. Adicionar novo tipo de mensagem:**

O schema Z-API já suporta extensão para novos tipos (áudio, vídeo, documento) apenas adicionando novos schemas opcionais.

**3. Adicionar nova intenção de classificação:**

Basta atualizar o prompt do ClaudeService - não requer mudanças estruturais.

### Desafios Encontrados e Soluções

**1. Payloads reais diferem da documentação**

*Problema:* O Z-API envia campos como `senderPhoto: null` em vez de omitir o campo, e mensagens de imagem não têm o campo `text`.

*Solução:* Ajustei o schema Zod para:
- Aceitar campos nullable: `senderPhoto: z.string().nullable().optional()`
- Tornar `text` opcional e adicionar schema para `image`
- Criar método `extractContent()` que prioriza: texto > caption > placeholder

**2. Custo de API durante desenvolvimento**

*Problema:* Cada teste consumia créditos da API Anthropic.

*Solução:* Criei `MockClaudeService` que classifica usando regras de palavras-chave, ativado via `USE_MOCK_LLM=true`. Permite desenvolvimento completo sem custo.

**3. Validação fail-fast vs. experiência do desenvolvedor**

*Problema:* Erros de validação Zod são técnicos demais para debug rápido.

*Solução:* Middleware `errorHandler` transforma erros Zod em respostas estruturadas com `path` e `message` para cada campo inválido.

---

## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Runtime | Node.js 20 | LTS, performance, ecossistema |
| Framework | Express | Simplicidade, maturidade, documentação |
| ORM | Prisma | Type-safe, migrations, excelente DX |
| Database | PostgreSQL | Robusto, ACID, suporte a JSON |
| Validação | Zod | Schema-first, inferência de tipos |
| LLM | Claude (Anthropic) | Qualidade de classificação |
| Deploy | Docker | Reprodutibilidade, isolamento |

---

## Quick Start

### Com Docker Compose (Recomendado)

```bash
# Clonar e configurar
git clone <repo-url>
cd supersdr-prova-tecnica
cp .env.example .env
# Editar .env com suas credenciais

# Subir serviços
docker-compose up -d

# Aplicar schema do banco
docker-compose exec app npx prisma db push

# Testar
curl http://localhost:3000/health
```

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Subir PostgreSQL
docker run -d --name supersdr-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=supersdr_webhooks \
  -p 5432:5432 postgres:15-alpine

# Configurar banco
npm run db:push

# Iniciar (hot-reload)
npm run dev
```

---

## Estrutura do Projeto

```
src/
├── adapters/              # Adapter Pattern
│   ├── zapi/              # Z-API adapter + schema Zod
│   ├── meta/              # Meta adapter + schema Zod
│   └── registry/          # Factory registry
├── domain/                # Entidades e erros
│   ├── entities/          # NormalizedMessage
│   └── errors/            # WebhookErrors (fail-fast)
├── usecases/              # Casos de uso
│   ├── ProcessWebhookUseCase.ts
│   └── ClassifyMessageUseCase.ts
├── infrastructure/        # Implementações concretas
│   ├── http/              # Express, routes, middlewares
│   ├── database/          # Prisma repository
│   └── llm/               # Claude + Mock service
└── config/                # Variáveis de ambiente (Zod)
```

---

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| POST | `/webhook/zapi` | Recebe webhook Z-API |
| POST | `/webhook/meta` | Recebe webhook Meta |
| GET | `/webhook/meta` | Verificação Meta (challenge) |

---

## Classificação de Intenções

| Intent | Descrição | Exemplo |
|--------|-----------|---------|
| `interesse_produto` | Lead quer comprar | "Quero saber o preço" |
| `duvida_produto` | Pergunta técnica | "Como funciona?" |
| `suporte_tecnico` | Problema/erro | "Não consigo acessar" |
| `reclamacao` | Insatisfação | "Péssimo atendimento" |
| `saudacao` | Cumprimento | "Oi, bom dia" |
| `outro` | Não classificável | "..." |

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_URL` | URL PostgreSQL | Sim |
| `ANTHROPIC_API_KEY` | Chave Claude API | Sim* |
| `USE_MOCK_LLM` | Usar mock (true/false) | Não |
| `PORT` | Porta do servidor | Não (3000) |
| `ZAPI_INSTANCE_ID` | ID instância Z-API | Produção |
| `ZAPI_TOKEN` | Token Z-API | Produção |

\* Pode usar `USE_MOCK_LLM=true` para desenvolvimento sem custo.

---

## Tratamento de Erros

| Código | Erro | Causa |
|--------|------|-------|
| 400 | `VALIDATION_ERROR` | Payload inválido |
| 400 | `UNKNOWN_PROVIDER` | Provedor não identificado |
| 501 | `PROVIDER_NOT_IMPLEMENTED` | Adapter não registrado |
| 500 | `PROCESSING_ERROR` | Erro interno (banco, LLM) |

---

## Uso de IA

Este projeto utilizou IA (Claude) como auxílio em:

- **Arquitetura**: Discussão e validação do design pattern escolhido
- **Documentação**: Estruturação do README e comentários de código
- **Schemas Zod**: Geração inicial dos schemas de validação baseados na documentação dos provedores
- **Setup Inicial**: Setup inicial do ambiente de desenvolvimento

