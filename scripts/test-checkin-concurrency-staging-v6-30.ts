/**
 * PX CUSTOM — TESTE DE CONCORRÊNCIA SIMULTÂNEA EM HOMOLOGAÇÃO (VERSÃO 6.30)
 * Arquivo: scripts/test-checkin-concurrency-staging-v6-30.ts
 *
 * ESCOPO:
 * Disparar 2 requisições HTTP em melhor esforço concorrente contra o endpoint real
 * POST /api/checkin/validate disputando o mesmo ingresso sintético (PX-STAGING-CONCURRENT-001).
 *
 * REQUISITOS DE ISOLAMENTO E VALIDAÇÃO DE AMBIENTE:
 * 1. ZERO fallback silencioso para URLs padrão: STAGING_BACKEND_URL é estritamente obrigatória.
 * 2. Rejeição explícita de hostnames de produção conhecidos.
 * 3. Validação explícita de autorização de ambiente (STAGING_PROJECT_REF e STAGING_TARGET_ACK).
 * 4. Autenticação real via cabeçalho Authorization: Bearer <token>.
 * 5. Validação do bloqueio pessimista FOR UPDATE no PostgreSQL de homologação.
 * 6. Exige que exatamente 1 requisição seja autorizada e 1 seja recusada por reuso.
 * 7. Exige que exatamente 1 registro de check-in esteja persistido no banco para o ticket_id testado.
 * 8. Falha explícita com exit code 1 se qualquer asserção for violada.
 * 9. Nenhuma credencial ou token exposto em logs.
 */

/**
 * PX CUSTOM — TESTE DE CONCORRÊNCIA SIMULTÂNEA EM HOMOLOGAÇÃO (VERSÃO 6.30 — HARDENED ETAPA 6.43)
 * Arquivo: scripts/test-checkin-concurrency-staging-v6-30.ts
 *
 * ESCOPO:
 * Disparar 2 requisições HTTP em melhor esforço concorrente contra o endpoint real
 * POST /api/checkin/validate disputando o mesmo ingresso sintético (PX-STAGING-CONCURRENT-001).
 *
 * REQUISITOS DE ISOLAMENTO E VALIDAÇÃO DE AMBIENTE (ETAPA 6.43):
 * 1. ZERO fallback silencioso para URLs padrão: STAGING_BACKEND_URL é estritamente obrigatória.
 * 2. Validação rigorosa de URL: rejeição de userinfo (username:password), query strings, fragmentos,
 *    caminhos não autorizados e portas inválidas. Exige HTTPS para hosts remotos.
 * 3. Rejeição incondicional de hostnames de produção conhecidos (blacklist).
 * 4. Validação explícita de autorização de ambiente (STAGING_PROJECT_REF e STAGING_TARGET_ACK).
 * 5. HANDSHAKE OBRIGATÓRIO PRELIMINAR (GET /api/health/staging):
 *    - Exige HTTP 200.
 *    - Exige environment === "staging".
 *    - Exige projectRef === STAGING_PROJECT_REF (comparação exata).
 *    - Timeout explícito e falha fechada antes de enviar QUALQUER requisição de check-in.
 *    - STAGING_TARGET_ACK jamais substitui ou contorna o handshake.
 *    - Nenhum token de operador é enviado para o health check.
 * 6. Autenticação real via cabeçalho Authorization: Bearer <token> somente nos endpoints de portaria.
 * 7. Validação do bloqueio pessimista FOR UPDATE no PostgreSQL de homologação.
 * 8. Exige que exatamente 1 requisição seja autorizada e 1 seja recusada por reuso ("INGRESSO JÁ UTILIZADO").
 * 9. Exige que exatamente 1 registro de check-in esteja persistido no banco para o ticket_id testado.
 * 10. Falha explícita com exit code 1 se qualquer asserção for violada.
 * 11. Nenhuma credencial ou token exposto em logs.
 */

import assert from 'node:assert/strict';

// =============================================================================
// 1. CONSTANTES E TIPOS
// =============================================================================

// Domínios de produção estritamente proibidos (comparação exata de hostname)
export const FORBIDDEN_PRODUCTION_HOSTS = new Set([
  'pxcustom.com.br',
  'www.pxcustom.com.br',
  'app.pxcustom.com.br',
  'api.pxcustom.com.br',
  'ais-dev-hg3yxq6tvgs5xkza2zwway-628087736879.us-east1.run.app',
  'ais-pre-hg3yxq6tvgs5xkza2zwway-628087736879.us-east1.run.app',
]);

export interface StagingHealthResponse {
  status: string;
  environment: string;
  projectRef: string;
  port: number;
  supabaseConfigured: boolean;
}

export interface CheckinResponse {
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

export interface ConcurrencyTestOptions {
  backendUrl?: string;
  stagingProjectRef?: string;
  targetAck?: string;
  operatorToken1?: string;
  operatorToken2?: string;
  ticketCode?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

// =============================================================================
// 2. FUNÇÕES DE VALIDAÇÃO DE URL E AMBIENTE (PURAS E TESTÁVEIS)
// =============================================================================

/**
 * Validação rigorosa e normalização da URL do backend de homologação.
 */
export function validateTargetUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('[BLOQUEIO DE SEGURANÇA: URL DE HOMOLOGAÇÃO NÃO INFORMADA] A variável STAGING_BACKEND_URL é estritamente obrigatória.');
  }

  const trimmedUrl = rawUrl.trim();
  if (trimmedUrl === '') {
    throw new Error('[BLOQUEIO DE SEGURANÇA: URL DE HOMOLOGAÇÃO VAZIA] A URL fornecida não contém caracteres válidos.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    throw new Error(`[BLOQUEIO DE SEGURANÇA: URL INVÁLIDA] Formato de URL sintaticamente inválido: "${trimmedUrl}"`);
  }

  // 1. Rejeição de credenciais embutidas na URL (username ou password)
  if (parsed.username || parsed.password) {
    throw new Error('[BLOQUEIO DE SEGURANÇA: CREDENCIAIS NA URL] URLs com usuário ou senha embutidos são proibidas.');
  }

  // 2. Rejeição de hostname vazio
  if (!parsed.hostname || parsed.hostname.trim() === '') {
    throw new Error('[BLOQUEIO DE SEGURANÇA: HOSTNAME VAZIO] O hostname da URL não pode ser vazio.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Rejeição incondicional de hostnames de produção conhecidos
  if (FORBIDDEN_PRODUCTION_HOSTS.has(hostname)) {
    throw new Error(`[BLOQUEIO DE SEGURANÇA: DESTINO DE PRODUÇÃO RECUSADO] O hostname "${hostname}" está catalogado como ambiente de produção.`);
  }

  // 4. Rejeição de caminhos não previstos (a URL base não deve conter subpastas como /api ou /admin)
  if (parsed.pathname !== '' && parsed.pathname !== '/') {
    throw new Error(`[BLOQUEIO DE SEGURANÇA: CAMINHO NÃO AUTORIZADO] A URL base não pode conter subpastas ou caminhos: "${parsed.pathname}".`);
  }

  // 5. Rejeição de query strings e fragmentos
  if (parsed.search || parsed.hash) {
    throw new Error('[BLOQUEIO DE SEGURANÇA: PARÂMETROS NÃO AUTORIZADOS] A URL não pode conter query string ou fragmento (#).');
  }

  // 6. Validação de protocolo por tipo de destino
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]';

  if (isLocalhost) {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`[BLOQUEIO DE SEGURANÇA: PROTOCOLO INVÁLIDO] Destinos locais devem utilizar http: ou https:. Recebido: "${parsed.protocol}"`);
    }
  } else {
    // Destinos remotos DEVEM utilizar estritamente HTTPS
    if (parsed.protocol !== 'https:') {
      throw new Error(`[BLOQUEIO DE SEGURANÇA: PROTOCOLO INSEGURO] Destinos remotos devem utilizar estritamente https:. Recebido: "${parsed.protocol}"`);
    }
  }

  // 7. Validação de porta (se fornecida, deve ser um inteiro válido entre 1 e 65535)
  if (parsed.port) {
    const portNum = Number(parsed.port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error(`[BLOQUEIO DE SEGURANÇA: PORTA INVÁLIDA] Porta fora do intervalo permitido (1-65535): "${parsed.port}"`);
    }
  }

  return parsed.origin;
}

/**
 * Aplica as barreiras de confirmação do ambiente.
 * Nota: STAGING_TARGET_ACK jamais substitui a validação técnica de handshake.
 */
export function validateEnvironmentBarriers(parsedOrigin: string, projectRef: string, targetAck: string): void {
  const url = new URL(parsedOrigin);
  const hostname = url.hostname.toLowerCase();
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]';

  if (isLocalhost) {
    if (!projectRef || projectRef.trim() === '' || targetAck !== 'true') {
      throw new Error(
        '[BLOQUEIO DE SEGURANÇA: CONFIRMAÇÃO DE AMBIENTE LOCAL OBRIGATÓRIA] ' +
        'O backend local pode estar apontado acidentalmente para o Supabase de produção. ' +
        'Defina STAGING_PROJECT_REF e STAGING_TARGET_ACK="true".'
      );
    }
  } else {
    const isAuthorizedStagingHost =
      hostname.includes('staging') ||
      hostname.includes('homolog') ||
      hostname.includes('preview');

    if (!isAuthorizedStagingHost && targetAck !== 'true') {
      throw new Error(
        `[BLOQUEIO DE SEGURANÇA: DESTINO NÃO HOMOLOGADO] ` +
        `O hostname "${hostname}" não possui indicador explícito de staging/homologação. ` +
        `Se este for o host correto, defina STAGING_TARGET_ACK="true" para autorizar.`
      );
    }
  }
}

// =============================================================================
// 3. HANDSHAKE OBRIGATÓRIO PRELIMINAR (GET /api/health/staging)
// =============================================================================

/**
 * Realiza handshake mandatório com o backend antes de qualquer teste de concorrência.
 *
 * REQUISITOS (ETAPA 6.43):
 * 1. Consulta GET /api/health/staging com timeout explícito.
 * 2. ZERO tokens ou cabeçalhos de autenticação enviados para o health check.
 * 3. Exige HTTP 200.
 * 4. Valida se o corpo retornado é JSON válido com campos esperados.
 * 5. Exige environment === "staging".
 * 6. Exige projectRef === expectedProjectRef com comparação exata.
 * 7. Falha fechada em qualquer anomalia antes de permitir chamadas POST.
 */
export async function performStagingHandshake(
  backendUrl: string,
  expectedProjectRef: string,
  options?: { timeoutMs?: number; fetchFn?: typeof fetch }
): Promise<StagingHealthResponse> {
  if (!expectedProjectRef || typeof expectedProjectRef !== 'string' || expectedProjectRef.trim() === '') {
    throw new Error('[BLOQUEIO DE SEGURANÇA: STAGING_PROJECT_REF NÃO INFORMADO] O identificador do projeto de staging é obrigatório para o handshake.');
  }

  const cleanExpectedRef = expectedProjectRef.trim().toLowerCase();
  const timeoutMs = options?.timeoutMs ?? 5000;
  const activeFetch = options?.fetchFn ?? fetch;

  const healthUrl = `${backendUrl}/api/health/staging`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    // IMPORTANTE: Nenhum token de operador é enviado no health check
    response = await activeFetch(healthUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      redirect: 'error',
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || controller.signal.aborted) {
      throw new Error(
        `[BLOQUEIO DE SEGURANÇA: TIMEOUT NO HANDSHAKE] O backend de homologação em "${backendUrl}" não respondeu ao health check dentro de ${timeoutMs}ms.`
      );
    }
    if (err.message?.toLowerCase().includes('redirect') || err.name === 'RedirectError') {
      throw new Error(
        `[BLOQUEIO DE SEGURANÇA: REDIRECIONAMENTO PROIBIDO] O endpoint de health check tentou redirecionamento HTTP, o que é estritamente proibido.`
      );
    }
    throw new Error(
      `[BLOQUEIO DE SEGURANÇA: FALHA DE REDE NO HANDSHAKE] Não foi possível conectar ao endpoint de health check do backend (${healthUrl}): ${err.message || err}`
    );
  }

  clearTimeout(timeoutId);

  // 1. Exige resposta HTTP 200
  if (response.status !== 200) {
    throw new Error(
      `[BLOQUEIO DE SEGURANÇA: RESPOSTA ANÔMALA DO HEALTH CHECK] O backend respondeu com HTTP ${response.status} em vez de 200.`
    );
  }

  // 2. Interpretação com validação de formato JSON
  let healthData: any;
  try {
    healthData = await response.json();
  } catch (jsonErr: any) {
    throw new Error(
      `[BLOQUEIO DE SEGURANÇA: JSON INVÁLIDO NO HEALTH CHECK] A resposta do endpoint não é um JSON válido: ${jsonErr.message || jsonErr}`
    );
  }

  if (!healthData || typeof healthData !== 'object' || Array.isArray(healthData)) {
    throw new Error(
      '[BLOQUEIO DE SEGURANÇA: ESTRUTURA INVÁLIDA NO HEALTH CHECK] O corpo da resposta do health check não é um objeto JSON válido.'
    );
  }

  // 3. Exige environment === "staging"
  if (healthData.environment !== 'staging') {
    throw new Error(
      `[BLOQUEIO DE SEGURANÇA: AMBIENTE DIVERGENTE] O backend respondeu com environment="${healthData.environment || '<ausente>'}". ` +
      `Esperado estritamente "staging". Operação abortada para evitar impacto em ambiente indevido.`
    );
  }

  // 4. Exige campo projectRef presente e válido
  if (!healthData.projectRef || typeof healthData.projectRef !== 'string') {
    throw new Error(
      '[BLOQUEIO DE SEGURANÇA: RESPOSTA SEM projectRef] O backend de homologação não informou o identificador do projeto Supabase vinculado.'
    );
  }

  const returnedProjectRef = healthData.projectRef.trim().toLowerCase();

  // 5. Comparação exata de Project Reference
  if (returnedProjectRef !== cleanExpectedRef) {
    throw new Error(
      `[BLOQUEIO DE SEGURANÇA: PROJETO SUPABASE DIVERGENTE] ` +
      `O backend de homologação está conectado ao projeto Supabase "${returnedProjectRef}", ` +
      `mas o teste espera o projeto "${cleanExpectedRef}". ` +
      `Operação imediatamente abortada antes de enviar qualquer requisição de check-in.`
    );
  }

  // 6. Confirmação de configuração do Supabase
  if (healthData.supabaseConfigured !== true) {
    throw new Error(
      '[BLOQUEIO DE SEGURANÇA: SUPABASE NÃO CONFIGURADO NO BACKEND] O backend de homologação reportou que o Supabase não está configurado.'
    );
  }

  return healthData as StagingHealthResponse;
}

// =============================================================================
// 4. FUNÇÕES DE DISPARO DE CHECK-IN E AUDITORIA
// =============================================================================

export async function sendCheckinRequest(
  backendUrl: string,
  ticketCode: string,
  requestLabel: string,
  token: string,
  operatorName: string,
  fetchFn: typeof fetch = fetch
): Promise<{ status: number; data: CheckinResponse }> {
  const url = `${backendUrl}/api/checkin/validate`;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      redirect: 'error',
      body: JSON.stringify({
        code: ticketCode,
        operatorName,
      }),
    });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('redirect') || err.name === 'RedirectError') {
      throw new Error(
        `[BLOQUEIO DE SEGURANÇA: REDIRECIONAMENTO PROIBIDO] O endpoint de validação de check-in tentou redirecionamento HTTP, o que é proibido.`
      );
    }
    throw err;
  }

  const data = (await response.json()) as CheckinResponse;
  return { status: response.status, data };
}

export async function verifyCheckinCount(
  backendUrl: string,
  ticketCode: string,
  token: string,
  targetTicketId?: string,
  fetchFn: typeof fetch = fetch
): Promise<{ count: number; matchedBy: string; totalReturned: number }> {
  const url = `${backendUrl}/api/checkins`;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      redirect: 'error',
    });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('redirect') || err.name === 'RedirectError') {
      throw new Error(
        `[BLOQUEIO DE SEGURANÇA: REDIRECIONAMENTO PROIBIDO] O endpoint de histórico de check-ins tentou redirecionamento HTTP, o que é proibido.`
      );
    }
    throw err;
  }

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

  // 1. Auditoria exata pela chave estrangeira ticket_id
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
      return parsed.ticket_code === ticketCode;
    } catch {
      return c.device_info.includes(ticketCode);
    }
  });

  return {
    count: matchingByCode.length,
    matchedBy: `device_info (código ${ticketCode})`,
    totalReturned: checkins.length,
  };
}

// =============================================================================
// 5. ORQUESTRADOR DO TESTE CONCORRENTE
// =============================================================================

export async function runConcurrencyTest(options?: ConcurrencyTestOptions) {
  const rawBackendUrl = options?.backendUrl ?? (process.env.STAGING_BACKEND_URL || '').trim();
  const stagingProjectRef = options?.stagingProjectRef ?? (process.env.STAGING_PROJECT_REF || '').trim();
  const targetAck = options?.targetAck ?? (process.env.STAGING_TARGET_ACK || '').trim();
  const ticketCode = options?.ticketCode ?? (process.env.STAGING_CONCURRENT_TICKET || 'PX-STAGING-CONCURRENT-001');
  const activeFetch = options?.fetchFn ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 5000;

  console.log('=============================================================================');
  console.log('PX CUSTOM — TESTE CONCORRENTE DE MELHOR ESFORÇO EM HOMOLOGAÇÃO (V6.30/V6.43)');
  console.log('=============================================================================');

  // Passo 1: Validação rigorosa da URL de destino
  const backendUrl = validateTargetUrl(rawBackendUrl);
  console.log(`Backend Autorizado: ${backendUrl}`);

  // Passo 2: Aplicação das barreiras de ambiente
  validateEnvironmentBarriers(backendUrl, stagingProjectRef, targetAck);

  // Passo 3: Verificação preliminar de tokens de operadores
  const rawToken1 = options?.operatorToken1 ?? (process.env.STAGING_OPERATOR_TOKEN_1 || '');
  const rawToken2 = options?.operatorToken2 ?? (process.env.STAGING_OPERATOR_TOKEN_2 || '');
  const fallbackToken = process.env.STAGING_OPERATOR_TOKEN || '';

  const opToken1 = rawToken1 || fallbackToken;
  const opToken2 = rawToken2 || fallbackToken;

  if (!opToken1 || !opToken2) {
    throw new Error(
      '[ERRO DE CONFIGURAÇÃO DE STAGING] Tokens de operadores de homologação não fornecidos. ' +
      'Defina STAGING_OPERATOR_TOKEN_1 e STAGING_OPERATOR_TOKEN_2 com JWTs válidos do Supabase Staging.'
    );
  }

  const isSameToken = opToken1 === opToken2;
  const isFallbackUsed = (!rawToken1 || !rawToken2) && Boolean(fallbackToken);

  if (isSameToken) {
    console.log('\n--- CLASSIFICAÇÃO DE CREDENCIAIS DOS OPERADORES ---');
    console.log('[MODO DE CONCORRÊNCIA: OPERADOR ÚNICO / MESMO TOKEN]');
    if (isFallbackUsed) {
      console.log('AVISO: Ambas as requisições estão utilizando o token único de fallback (STAGING_OPERATOR_TOKEN).');
    } else {
      console.log('AVISO: STAGING_OPERATOR_TOKEN_1 e STAGING_OPERATOR_TOKEN_2 contêm o mesmo token JWT.');
    }
    console.log('Classificação do Teste: CONCORRÊNCIA MONO-OPERADOR (Valida atomicidade do ingresso, mas não concorrência multi-operador).');
    console.log('---------------------------------------------------\n');
  } else {
    console.log('\n--- CLASSIFICAÇÃO DE CREDENCIAIS DOS OPERADORES ---');
    console.log('[MODO DE CONCORRÊNCIA: DOIS OPERADORES DISTINTOS]');
    console.log('Credenciais independentes confirmadas para REQ_1 e REQ_2 (JWTs distintos).');
    console.log('Classificação do Teste: CONCORRÊNCIA DUAL-OPERADOR (Fidelidade máxima de portarias simultâneas).');
    console.log('---------------------------------------------------\n');
  }

  // Passo 4: HANDSHAKE OBRIGATÓRIO PRELIMINAR ANTES DE QUALQUER POST DE CONCORRÊNCIA
  console.log('Realizando handshake de segurança obrigatório com o backend (/api/health/staging)...');
  const health = await performStagingHandshake(backendUrl, stagingProjectRef, {
    timeoutMs,
    fetchFn: activeFetch,
  });

  console.log(`[HANDSHAKE APROVADO] Backend confirmado em modo "${health.environment}" vinculado ao projeto Supabase "${health.projectRef}".`);
  console.log('NOTA DE AUDITORIA: O status "supabaseConfigured: true" no health check indica inicialização das credenciais do SDK no bootstrap.');
  console.log('A existência das tabelas e o comportamento transacional serão comprovados durante a validação do check-in.');
  console.log(`Código do Ingresso Testado: ${ticketCode}`);

  // Passo 5: DISPARO CONCORRENTE VIA PROMISE.ALL
  console.log('\nIniciando disparo concorrente via Promise.all (Melhor esforço assíncrono)...');

  const startTime = Date.now();

  const [res1, res2] = await Promise.all([
    sendCheckinRequest(backendUrl, ticketCode, 'REQ_1', opToken1, 'Portaria Simultânea 1', activeFetch),
    sendCheckinRequest(backendUrl, ticketCode, 'REQ_2', opToken2, 'Portaria Simultânea 2', activeFetch),
  ]);

  const durationMs = Date.now() - startTime;
  console.log(`Respostas recebidas em ${durationMs}ms.`);

  // Inspeção dos resultados
  console.log('\n--- RESULTADOS DAS REQUISIÇÕES CONCORRENTES ---');
  console.log(`Requisição 1: HTTP ${res1.status} | authorized=${res1.data.authorized} | reason="${res1.data.reason}"`);
  console.log(`Requisição 2: HTTP ${res2.status} | authorized=${res2.data.authorized} | reason="${res2.data.reason}"`);

  // Asserção A: Ambas devem responder com HTTP 200
  assert.equal(res1.status, 200, `Requisição 1 retornou HTTP inesperado: ${res1.status}`);
  assert.equal(res2.status, 200, `Requisição 2 retornou HTTP inesperado: ${res2.status}`);

  // Asserção B: Não pode haver duplo check-in autorizado
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

  // Passo 6: Verificação de Persistência Única no Banco
  const authorizedResponse = res1.data.authorized ? res1.data : res2.data;
  const targetTicketId = authorizedResponse.ticket?.id;

  if (!targetTicketId) {
    throw new Error('FALHA: A resposta autorizada não retornou o ticket.id oficial para auditoria de persistência.');
  }

  console.log(`Auditoria do ticket_id oficial persistido: ${targetTicketId}`);
  console.log('Consultando histórico de check-ins no backend de homologação...');

  const { count: recordedCount, matchedBy, totalReturned } = await verifyCheckinCount(
    backendUrl,
    ticketCode,
    opToken1,
    targetTicketId,
    activeFetch
  );
  console.log(`Registros de check-in encontrados por ${matchedBy}: ${recordedCount} (total consultado: ${totalReturned})`);

  if (totalReturned >= 100) {
    console.log('[AVISO DE CAPACIDADE] A rota /api/checkins retornou 100 registros (limite da API).');
    console.log('Para auditoria definitiva direta no PostgreSQL de staging, confirme no SQL Editor:');
    console.log(`  SELECT COUNT(*) FROM public.checkins WHERE ticket_id = '${targetTicketId}';`);
  }

  assert.equal(
    recordedCount,
    1,
    `FALHA DE INTEGRIDADE: Esperado exatamente 1 registro de check-in gravado para ${ticketCode}, mas encontrados ${recordedCount}.`
  );

  console.log('[ASSERÇÃO 2 APROVADA] Exatamente 1 registro gravado na tabela checkins.');
  const isSimulatedExecution = options?.fetchFn !== undefined || process.env.NODE_ENV === 'test';

  console.log('\n=============================================================================');
  if (isSimulatedExecution) {
    console.log('TESTE CONCORRENTE LOCAL: SIMULAÇÃO COM MOCKS CONCLUÍDA COM SUCESSO!');
    console.log('AVISO DE AUDITORIA: Este teste foi executado com respostas simuladas em memória.');
    console.log('Ele valida a máquina de estados, o tratamento de cabeçalhos e a lógica TypeScript.');
    console.log('NÃO comprova atomicidade transacional nem o bloqueio FOR UPDATE no banco PostgreSQL.');
  } else {
    console.log('TESTE CONCORRENTE EM HOMOLOGAÇÃO: APROVADO COM 100% DE SUCESSO CONTRA O BACKEND!');
    console.log('Atomicidade e controle pessimista validados contra o servidor de homologação.');
  }
  console.log('=============================================================================');

  return {
    success: true,
    recordedCount,
    operatorConcurrencyMode: isSameToken ? 'SINGLE_OPERATOR_CONCURRENCY' : 'DUAL_OPERATORS_DISTINCT',
    isFallbackUsed,
    isSimulatedExecution,
    atomicProof: isSimulatedExecution ? 'SIMULATED_MOCK_ONLY' : 'BACKEND_VALIDATED',
  };
}

// -----------------------------------------------------------------------------
// 6. EXECUÇÃO CONTROLADA VIA CLI
// -----------------------------------------------------------------------------
const isDirectExecution =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('test-checkin-concurrency-staging-v6-30.ts') ||
    process.argv[1].endsWith('test-checkin-concurrency-staging-v6-30.js'));

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  runConcurrencyTest().catch((err) => {
    console.error('\n[FALHA NO TESTE DE CONCORRÊNCIA]');
    console.error(err.message || err);
    process.exit(1);
  });
}

