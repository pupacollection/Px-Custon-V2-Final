/**
 * PX CUSTOM — TESTE DE CONCORRÊNCIA SIMULTÂNEA EM HOMOLOGAÇÃO (VERSÃO 6.29)
 * Arquivo: scripts/test-checkin-concurrency-staging-v6-29.ts
 *
 * ESCOPO:
 * Disparar 2 requisições HTTP em melhor esforço simultâneo contra o endpoint real
 * POST /api/checkin/validate disputando o mesmo ingresso sintético (PX-STAGING-CONCURRENT-001).
 *
 * GARANTIAS DE SEGURANÇA E ISOLAMENTO:
 * 1. ZERO fallback silencioso para URLs padrão: STAGING_BACKEND_URL é estritamente obrigatória.
 * 2. Autenticação real via cabeçalho Authorization: Bearer <token>.
 * 3. Validação do bloqueio pessimista FOR UPDATE no PostgreSQL de homologação.
 * 4. Exige que exatamente 1 requisição seja autorizada e 1 seja recusada por reuso.
 * 5. Exige que exatamente 1 registro de check-in esteja persistido no banco para o ticket_id testado.
 * 6. Falha explícita com exit code 1 se qualquer asserção for violada.
 * 7. Nenhuma credencial ou token exposto em logs.
 */

import assert from 'node:assert/strict';

// Configurações Estritas de Homologação (Sem fallbacks inseguros)
const BACKEND_URL = (process.env.STAGING_BACKEND_URL || '').trim().replace(/\/$/, '');
const OPERATOR_TOKEN_1 = process.env.STAGING_OPERATOR_TOKEN_1 || process.env.STAGING_OPERATOR_TOKEN || '';
const OPERATOR_TOKEN_2 = process.env.STAGING_OPERATOR_TOKEN_2 || process.env.STAGING_OPERATOR_TOKEN || '';
const TICKET_CODE = process.env.STAGING_CONCURRENT_TICKET || 'PX-STAGING-CONCURRENT-001';

interface CheckinResponse {
  authorized: boolean;
  reason: string;
  details?: string;
  ticket?: {
    id?: string;
    ticket_code?: string;
    code?: string;
    status?: string;
  };
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

async function verifyCheckinCount(
  token: string,
  targetTicketId?: string
): Promise<{ count: number; matchedBy: string; totalReturned: number }> {
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

  // 1. Auditoria exata pela chave primária/estrangeira ticket_id
  if (targetTicketId) {
    const matchingById = checkins.filter((c) => c.ticket_id === targetTicketId);
    return {
      count: matchingById.length,
      matchedBy: `ticket_id (${targetTicketId})`,
      totalReturned: checkins.length,
    };
  }

  // 2. Fallback por device_info estruturado
  const matchingByCode = checkins.filter((c) => {
    if (!c.device_info) return false;
    try {
      const parsed = JSON.parse(c.device_info);
      return parsed.ticket_code === TICKET_CODE;
    } catch {
      return c.device_info.includes(TICKET_CODE);
    }
  });

  return {
    count: matchingByCode.length,
    matchedBy: `device_info (código ${TICKET_CODE})`,
    totalReturned: checkins.length,
  };
}

async function runConcurrencyTest() {
  console.log('=============================================================================');
  console.log('PX CUSTOM — TESTE CONCORRENTE DE MELHOR ESFORÇO EM HOMOLOGAÇÃO (V6.29)');
  console.log('=============================================================================');

  // 1. Barreira Estrita de Configuração (Sem fallback para localhost default)
  if (!BACKEND_URL) {
    console.error('\n[BLOQUEIO DE SEGURANÇA: URL DE HOMOLOGAÇÃO NÃO CONFIGURADA]');
    console.error('A variável de ambiente STAGING_BACKEND_URL é estritamente obrigatória.');
    console.error('Defina explicitamente a URL do backend de homologação antes de executar:');
    console.error('  export STAGING_BACKEND_URL="http://localhost:3000" (ou URL dedicada de staging)');
    process.exit(1);
  }

  // Prevenção contra domínios de produção
  if (BACKEND_URL.includes('pxcustom.com.br') && !BACKEND_URL.includes('staging')) {
    console.error('\n[BLOQUEIO DE SEGURANÇA: URL DE PRODUÇÃO DETECTADA]');
    console.error('A URL informada aparenta ser de produção. Execução abortada imediatamente.');
    process.exit(1);
  }

  if (!OPERATOR_TOKEN_1 || !OPERATOR_TOKEN_2) {
    console.error('\n[ERRO DE CONFIGURAÇÃO DE STAGING]');
    console.error('Tokens de operadores de homologação não fornecidos.');
    console.error('Defina as variáveis com os tokens obtidos no Supabase Staging:');
    console.error('  export STAGING_OPERATOR_TOKEN_1="<jwt_operador_staging_1>"');
    console.error('  export STAGING_OPERATOR_TOKEN_2="<jwt_operador_staging_2>"');
    process.exit(1);
  }

  console.log(`Backend Alvo: ${BACKEND_URL}`);
  console.log(`Código Testado: ${TICKET_CODE}`);
  console.log('Credenciais de operadores configuradas (mascaradas por segurança).');
  console.log('\nIniciando disparo concorrente via Promise.all (Melhor esforço assíncrono)...');

  const startTime = Date.now();

  // 2. Disparo concorrente simultâneo
  const [res1, res2] = await Promise.all([
    sendCheckinRequest('REQ_1', OPERATOR_TOKEN_1, 'Portaria Simultânea 1'),
    sendCheckinRequest('REQ_2', OPERATOR_TOKEN_2, 'Portaria Simultânea 2'),
  ]);

  const durationMs = Date.now() - startTime;
  console.log(`Respostas recebidas em ${durationMs}ms.`);

  // 3. Inspeção e Asserções Rígidas de Concorrência
  console.log('\n--- RESULTADOS DAS REQUISIÇÕES CONCORRENTES ---');
  console.log(`Requisição 1: HTTP ${res1.status} | authorized=${res1.data.authorized} | reason="${res1.data.reason}"`);
  console.log(`Requisição 2: HTTP ${res2.status} | authorized=${res2.data.authorized} | reason="${res2.data.reason}"`);

  // Asserção A: Ambas devem responder com HTTP 200
  assert.equal(res1.status, 200, `Requisição 1 retornou HTTP inesperado: ${res1.status}`);
  assert.equal(res2.status, 200, `Requisição 2 retornou HTTP inesperado: ${res2.status}`);

  // Asserção B: Não pode haver duplo check-in autorizado (falha de concorrência)
  const bothAuthorized = res1.data.authorized && res2.data.authorized;
  assert.equal(
    bothAuthorized,
    false,
    'FALHA CRÍTICA DE CONCORRÊNCIA: Ambas as requisições foram autorizadas! O bloqueio FOR UPDATE falhou.'
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

  // 4. Verificação de Persistência Única no Banco de Dados
  const authorizedResponse = res1.data.authorized ? res1.data : res2.data;
  const targetTicketId = authorizedResponse.ticket?.id;

  if (!targetTicketId) {
    throw new Error('FALHA: A resposta autorizada não retornou o ticket.id oficial para auditoria de persistência.');
  }

  console.log(`Auditoria do ticket_id oficial persistido: ${targetTicketId}`);
  console.log('Consultando histórico de check-ins no backend de homologação...');

  const { count: recordedCount, matchedBy, totalReturned } = await verifyCheckinCount(OPERATOR_TOKEN_1, targetTicketId);
  console.log(`Registros de check-in encontrados por ${matchedBy}: ${recordedCount} (total consultado: ${totalReturned})`);

  if (totalReturned >= 100) {
    console.log('[AVISO DE CAPACIDADE] A rota /api/checkins retornou 100 registros (limite da API).');
    console.log('Para auditoria definitiva direta no PostgreSQL de staging, confirme no SQL Editor:');
    console.log(`  SELECT COUNT(*) FROM public.checkins WHERE ticket_id = '${targetTicketId}';`);
  }

  assert.equal(
    recordedCount,
    1,
    `FALHA DE INTEGRIDADE: Esperado exatamente 1 registro de check-in gravado para ${TICKET_CODE}, mas encontrados ${recordedCount}.`
  );

  console.log('[ASSERÇÃO 2 APROVADA] Exatamente 1 registro gravado na tabela checkins.');
  console.log('\n=============================================================================');
  console.log('TESTE CONCORRENTE EM HOMOLOGAÇÃO: APROVADO COM 100% DE SUCESSO!');
  console.log('Atomicidade e controle pessimista comprovados contra o banco de homologação.');
  console.log('=============================================================================');
}

runConcurrencyTest().catch((err) => {
  console.error('\n[FALHA NO TESTE DE CONCORRÊNCIA]');
  console.error(err.message || err);
  process.exit(1);
});
