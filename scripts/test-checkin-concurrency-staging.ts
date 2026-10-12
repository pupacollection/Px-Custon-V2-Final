/**
 * PX CUSTOM — TESTE DE CONCORRÊNCIA SIMULTÂNEA EM HOMOLOGAÇÃO (ETAPA 6.24)
 * Arquivo: scripts/test-checkin-concurrency-staging.ts
 *
 * ESCOPO:
 * Disparar 2 requisições HTTP verdadeiramente simultâneas contra o endpoint real
 * POST /api/checkin/validate disputando o mesmo ingresso sintético (PX-STAGING-CONCURRENT-001).
 *
 * GARANTIAS:
 * 1. Zero conexões com o ambiente de produção.
 * 2. Autenticação real via cabeçalho Authorization: Bearer <token>.
 * 3. Validação do bloqueio pessimista FOR UPDATE no PostgreSQL de homologação.
 * 4. Verificação de que exatamente 1 requisição obtém sucesso e 1 é recusada por reuso.
 * 5. Verificação de que exatamente 1 registro de check-in foi persistido no banco.
 * 6. Falha explícita (exit code 1) se qualquer asserção for violada.
 */

import assert from 'node:assert/strict';

// Configurações de Homologação (Passadas via Variáveis de Ambiente)
const BACKEND_URL = (process.env.STAGING_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const OPERATOR_TOKEN_1 = process.env.STAGING_OPERATOR_TOKEN_1 || process.env.STAGING_OPERATOR_TOKEN || '';
const OPERATOR_TOKEN_2 = process.env.STAGING_OPERATOR_TOKEN_2 || process.env.STAGING_OPERATOR_TOKEN || '';
const TICKET_CODE = process.env.STAGING_CONCURRENT_TICKET || 'PX-STAGING-CONCURRENT-001';

interface CheckinResponse {
  authorized: boolean;
  reason: string;
  details?: string;
  ticket?: any;
  log?: any;
}

async function sendCheckinRequest(
  requestLabel: string,
  token: string,
  operatorName: string
): Promise<{ status: number; data: CheckinResponse }> {
  const url = `${BACKEND_URL}/api/checkin/validate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      code: TICKET_CODE,
      operatorName,
    }),
  });

  const data = (await response.json()) as CheckinResponse;
  return { status: response.status, data };
}

async function verifyCheckinCount(token: string, targetTicketId?: string): Promise<{ count: number; matchedBy: string }> {
  const url = `${BACKEND_URL}/api/checkins`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar /api/checkins: HTTP ${response.status}`);
  }

  const checkins = (await response.json()) as Array<{
    id?: string;
    ticket_id?: string;
    event_id?: string;
    checked_by?: string;
    checked_at?: string;
    device_info?: string;
    created_at?: string;
  }>;

  // 1. Se o ticket_id oficial foi retornado pelo check-in, auditar estritamente pela chave estrangeira
  if (targetTicketId) {
    const matchingById = checkins.filter((c) => c.ticket_id === targetTicketId);
    return { count: matchingById.length, matchedBy: `ticket_id (${targetTicketId})` };
  }

  // 2. Fallback: Auditar pela estrutura serializada no device_info
  const matchingByCode = checkins.filter((c) => {
    if (!c.device_info) return false;
    try {
      const parsed = JSON.parse(c.device_info);
      return parsed.ticket_code === TICKET_CODE;
    } catch {
      return c.device_info.includes(TICKET_CODE);
    }
  });

  return { count: matchingByCode.length, matchedBy: `device_info (código ${TICKET_CODE})` };
}

async function runConcurrencyTest() {
  console.log('=============================================================================');
  console.log('PX CUSTOM — TESTE DE CONCORRÊNCIA SIMULTÂNEA REAL EM HOMOLOGAÇÃO');
  console.log('=============================================================================');
  console.log(`Backend Alvo: ${BACKEND_URL}`);
  console.log(`Código Testado: ${TICKET_CODE}`);

  // 1. Validação de pré-requisitos de ambiente de homologação
  if (!OPERATOR_TOKEN_1 || !OPERATOR_TOKEN_2) {
    console.error('\n[ERRO DE CONFIGURAÇÃO DE STAGING]');
    console.error('Para executar este teste contra o ambiente de homologação, defina as variáveis:');
    console.error('  export STAGING_BACKEND_URL="http://localhost:3000"');
    console.error('  export STAGING_OPERATOR_TOKEN_1="<jwt_operador_staging_1>"');
    console.error('  export STAGING_OPERATOR_TOKEN_2="<jwt_operador_staging_2>"');
    console.error('  export STAGING_CONCURRENT_TICKET="PX-STAGING-CONCURRENT-001"');
    console.error('\nNenhuma credencial de produção deve ser fornecida. Teste abortado de forma segura.');
    process.exit(1);
  }

  console.log('Tokens de operadores de homologação configurados (mascarados por segurança).');
  console.log('Disparando 2 solicitações simultâneas via Promise.all...');

  const startTime = Date.now();

  // 2. Disparo verdadeiramente concorrente e simultâneo
  const [res1, res2] = await Promise.all([
    sendCheckinRequest('REQ_1', OPERATOR_TOKEN_1, 'Portaria Simultânea 1'),
    sendCheckinRequest('REQ_2', OPERATOR_TOKEN_2, 'Portaria Simultânea 2'),
  ]);

  const durationMs = Date.now() - startTime;
  console.log(`Respostas recebidas em ${durationMs}ms.`);

  // 3. Inspeção e Asserções Rígidas de Concorrência
  console.log('\n--- RESULTADOS DAS REQUISIÇÕES SIMULTÂNEAS ---');
  console.log(`Requisição 1: HTTP ${res1.status} | authorized=${res1.data.authorized} | reason="${res1.data.reason}"`);
  console.log(`Requisição 2: HTTP ${res2.status} | authorized=${res2.data.authorized} | reason="${res2.data.reason}"`);

  // Asserção A: Ambas devem responder com HTTP 200 (a recusa de negócio vem dentro do payload JSON)
  assert.equal(res1.status, 200, `Requisição 1 retornou HTTP inesperado: ${res1.status}`);
  assert.equal(res2.status, 200, `Requisição 2 retornou HTTP inesperado: ${res2.status}`);

  // Asserção B: Não pode haver duplo sucesso (falha de concorrência)
  const bothAuthorized = res1.data.authorized && res2.data.authorized;
  assert.equal(
    bothAuthorized,
    false,
    'FALHA CRÍTICA DE CONCORRÊNCIA: Ambas as requisições simultâneas foram autorizadas! O bloqueio FOR UPDATE falhou.'
  );

  // Asserção C: Exatamente uma deve ser autorizada
  const exactlyOneAuthorized =
    (res1.data.authorized && !res2.data.authorized) ||
    (!res1.data.authorized && res2.data.authorized);

  assert.equal(
    exactlyOneAuthorized,
    true,
    'FALHA: Nenhuma das requisições simultâneas foi autorizada ou ambas falharam de forma anômala.'
  );

  // Asserção D: A requisição rejeitada deve ter o motivo exato de 'INGRESSO JÁ UTILIZADO'
  const rejectedResponse = res1.data.authorized ? res2.data : res1.data;
  assert.equal(
    rejectedResponse.reason,
    'INGRESSO JÁ UTILIZADO',
    `Motivo de rejeição inesperado: "${rejectedResponse.reason}". Esperado: "INGRESSO JÁ UTILIZADO"`
  );

  console.log('\n[ASSERÇÃO 1 APROVADA] Exatamente 1 requisição autorizada e 1 recusada com "INGRESSO JÁ UTILIZADO".');

  // 4. Verificação de Persistência Única no Banco
  const authorizedResponse = res1.data.authorized ? res1.data : res2.data;
  const targetTicketId = authorizedResponse.ticket?.id;

  console.log('Consultando histórico de check-ins no backend de homologação...');
  const { count: recordedCount, matchedBy } = await verifyCheckinCount(OPERATOR_TOKEN_1, targetTicketId);
  console.log(`Registros de check-in encontrados por ${matchedBy}: ${recordedCount}`);

  assert.equal(
    recordedCount,
    1,
    `FALHA DE INTEGRIDADE: Esperado exatamente 1 registro de check-in gravado para ${TICKET_CODE}, mas encontrados ${recordedCount}.`
  );

  console.log('[ASSERÇÃO 2 APROVADA] Exatamente 1 registro gravado na tabela checkins.');
  console.log('\n=============================================================================');
  console.log('TESTE DE CONCORRÊNCIA EM HOMOLOGAÇÃO: APROVADO COM 100% DE SUCESSO!');
  console.log('Atomicidade e controle pessimista comprovados contra o banco de homologação.');
  console.log('=============================================================================');
}

runConcurrencyTest().catch((err) => {
  console.error('\n[FALHA FATAL NO TESTE DE CONCORRÊNCIA]');
  console.error(err.message || err);
  process.exit(1);
});
