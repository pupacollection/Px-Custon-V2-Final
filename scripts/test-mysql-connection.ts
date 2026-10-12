// PX CUSTOM — Script Isolado de Teste de Conexão MySQL (Ambiente de Homologação)
// Execução: npx tsx scripts/test-mysql-connection.ts
// NUNCA execute apontando para credenciais de produção da Hostinger.

import dotenv from 'dotenv';
import { isMySqlConfigured, testConnection, closeMySqlPool, getSanitizedConfig } from '../src/server/db/pool.ts';

dotenv.config();

async function run() {
  console.log('================================================================');
  console.log('PX CUSTOM — TESTE ISOLADO DE CONECTIVIDADE MYSQL (HOMOLOGAÇÃO)');
  console.log('================================================================\n');

  const config = getSanitizedConfig();
  console.log(`Status de Configuração: ${config.isConfigured ? 'VARIÁVEIS DETECTADAS' : 'NÃO CONFIGURADO'}`);
  console.log(`Porta Alvo: ${config.port}`);
  console.log(`Database Alvo: ${config.database || '(não definido)'}`);
  console.log(`Limite de Conexões: ${config.connectionLimit}\n`);

  if (!isMySqlConfigured()) {
    console.log('[RESULTADO]: Conexão NÃO TESTADA.');
    console.log('[MOTIVO]: Variáveis de ambiente MYSQL_HOST, MYSQL_USER e MYSQL_DATABASE não configuradas.');
    console.log('[ORIENTAÇÃO]: Defina as credenciais do banco de homologação isolado no arquivo .env local.');
    process.exit(0);
  }

  console.log('Testando ping (SELECT 1 AS ping)...');
  const result = await testConnection();

  if (result.connected) {
    console.log('\n[SUCESSO]: Conexão com o banco MySQL de homologação estabelecida com sucesso!');
  } else {
    console.log(`\n[FALHA]: Não foi possível conectar ao MySQL. Código retornado: ${result.code || 'UNKNOWN'}`);
  }

  await closeMySqlPool();
  process.exit(result.connected ? 0 : 1);
}

run().catch((err) => {
  console.error('[ERRO FATAL NO TESTE]:', err?.message || 'Erro inesperado');
  process.exit(1);
});
