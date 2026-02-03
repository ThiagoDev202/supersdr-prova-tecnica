import { env } from '../../config/env.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${env.PORT}`);
  console.log(`📍 Health check: http://localhost:${env.PORT}/health`);
  console.log(`📨 Webhook Z-API: POST http://localhost:${env.PORT}/webhook/zapi`);
  console.log(`📨 Webhook Meta: POST http://localhost:${env.PORT}/webhook/meta`);
});
