/**
 * PX CUSTOM — SUÍTE DE TESTES LOCAIS ISOLADOS DE CHECK-IN E AUTORIZAÇÃO (ETAPA 6.20)
 *
 * ESCOPO: Testar a lógica de autenticação/autorização de server.ts e a máquina de estados
 *         da função transacional de check-in (supabase-checkin-transacional.sql v6.17)
 *         utilizando estritamente simulação e mocks em memória.
 *
 * GARANTIAS DE SEGURANÇA:
 * - Zero conexões de rede (sem chamadas a Supabase, Hostinger, Mercado Pago ou APIs externas).
 * - Zero uso de credenciais ou chaves secretas de produção.
 * - Zero persistência em banco real de dados.
 */

import assert from 'node:assert/strict';

// =============================================================================
// TIPOS E ESTRUTURAS DE DADOS SINTÉTICOS
// =============================================================================

type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'CHECKIN_OPERATOR' | 'FINANCE' | 'SUPPORT';

interface MockAuthUser {
  id: string;
  email: string;
}

interface MockAdminUserRecord {
  user_id: string;
  role: string;
  is_active: boolean;
}

interface MockProfileRecord {
  id: string;
  role: string;
  is_active: boolean;
}

interface MockTicket {
  id: string;
  ticket_code: string;
  event_id: string;
  ticket_type_id?: string;
  holder_name: string;
  price: number;
  status: 'PENDING' | 'PAID' | 'USED' | 'CANCELLED';
  qr_code?: string;
  updated_at: string;
}

interface MockCheckinRecord {
  id: string;
  ticket_id: string;
  event_id: string;
  checked_by: string | null;
  checked_at: string;
  device_info: string;
  created_at: string;
}

interface MockDatabaseState {
  authUsers: Map<string, MockAuthUser>; // token -> user
  adminUsers: Map<string, MockAdminUserRecord>;
  profiles: Map<string, MockProfileRecord>;
  tickets: Map<string, MockTicket>;
  checkins: MockCheckinRecord[];
  events: Map<string, { id: string; title: string }>;
  ticketTypes: Map<string, { id: string; name: string }>;
  rpcAvailable: boolean;
}

// =============================================================================
// REPRODUÇÃO FIEL DA LÓGICA DO BACKEND (server.ts linhas 500-645)
// =============================================================================

interface BackendCheckinRequest {
  headers: {
    authorization?: string;
  };
  body: {
    code?: string;
    operatorName?: string;
  };
}

interface BackendCheckinResponse {
  statusCode: number;
  body: any;
}

async function handleBackendCheckinValidate(
  req: BackendCheckinRequest,
  db: MockDatabaseState
): Promise<BackendCheckinResponse> {
  const { code, operatorName } = req.body;

  if (!code || typeof code !== 'string') {
    return {
      statusCode: 400,
      body: {
        authorized: false,
        reason: 'CÓDIGO AUSENTE',
        details: 'Código de ingresso ou payload do QR Code não informado.',
      },
    };
  }

  const cleanRaw = code.trim().toUpperCase();
  const cleanCode = cleanRaw.includes('|') ? cleanRaw.split('|')[0].trim() : cleanRaw;

  // 1. Exigência estrita de cabeçalho Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: {
        authorized: false,
        reason: 'NÃO AUTORIZADO',
        details: 'Cabeçalho Authorization com token Bearer é obrigatório para validação de check-in.',
      },
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      body: {
        authorized: false,
        reason: 'NÃO AUTORIZADO',
        details: 'Token de autenticação não fornecido.',
      },
    };
  }

  // 2. Validação da sessão com Supabase Auth
  const operatorUser = db.authUsers.get(token);
  if (!operatorUser) {
    return {
      statusCode: 401,
      body: {
        authorized: false,
        reason: 'TOKEN INVÁLIDO',
        details: 'Token expirado, inválido ou sessão encerrada.',
      },
    };
  }

  // 3. Verificação de permissões do operador exclusivamente com is_active = true
  // Conforme server.ts linhas 546-559
  const adminRecord = Array.from(db.adminUsers.values()).find(
    (u) => u.user_id === operatorUser.id && u.is_active === true
  );

  const profileRecord = Array.from(db.profiles.values()).find(
    (p) => p.id === operatorUser.id && p.is_active === true
  );

  const roleFound = (adminRecord?.role || profileRecord?.role || '').trim().toUpperCase();
  let operatorRole = '';
  if (roleFound) {
    operatorRole = roleFound;
  }

  const isAuthorizedRole = [
    'ADMIN',
    'SUPER_ADMIN',
    'CHECKIN_OPERATOR',
    'OPERADOR',
    'OPERATOR',
    'PORTARIA',
  ].includes(operatorRole);

  if (!isAuthorizedRole) {
    return {
      statusCode: 403,
      body: {
        authorized: false,
        reason: 'ACESSO NEGADO',
        details: 'Seu usuário não possui permissão de operador ou administrador ativo para validar check-in.',
      },
    };
  }

  const op = operatorName || (operatorUser.email ? `Operador (${operatorUser.email})` : 'Operador PX Portaria 1');

  // 4. Execução da RPC transacional no banco
  if (!db.rpcAvailable) {
    return {
      statusCode: 503,
      body: {
        authorized: false,
        reason: 'SERVIÇO TRANSACIONAL INDISPONÍVEL',
        details: 'A função transacional de baixa do ingresso não pôde ser executada com segurança no banco de dados oficial.',
      },
    };
  }

  const rpcResult = executeRpcCheckinTicket(db, {
    p_ticket_code: cleanCode,
    p_operator_name: op,
    p_operator_id: operatorUser.id,
  });

  if (!rpcResult || typeof rpcResult !== 'object') {
    return {
      statusCode: 503,
      body: {
        authorized: false,
        reason: 'RESPOSTA INVÁLIDA DO BANCO',
        details: 'O serviço transacional retornou uma resposta não reconhecida.',
      },
    };
  }

  // Normalização de contrato para o frontend
  if (rpcResult.ticket && typeof rpcResult.ticket === 'object') {
    rpcResult.ticket.buyerName = rpcResult.ticket.buyerName || rpcResult.ticket.buyer_name || 'Participante PX';
    rpcResult.ticket.batchName = rpcResult.ticket.batchName || rpcResult.ticket.batch_name || 'Geral';
    rpcResult.ticket.code = rpcResult.ticket.code || rpcResult.ticket.ticket_code || cleanCode;
    rpcResult.ticket.eventName = rpcResult.ticket.eventName || rpcResult.ticket.event_name || 'PX CUSTOM';
  }

  return {
    statusCode: 200,
    body: rpcResult,
  };
}

// =============================================================================
// REPRODUÇÃO FIEL DA LÓGICA DA RPC (supabase-checkin-transacional.sql v6.17)
// =============================================================================

interface RpcArgs {
  p_ticket_code: string;
  p_operator_name?: string;
  p_operator_id?: string | null;
}

function executeRpcCheckinTicket(db: MockDatabaseState, args: RpcArgs): any {
  const { p_ticket_code, p_operator_name, p_operator_id } = args;

  // 1. Sanitização do código
  const v_clean_code = p_ticket_code ? p_ticket_code.trim().toUpperCase().split('|')[0].trim() : '';
  if (!v_clean_code) {
    return {
      authorized: false,
      reason: 'CÓDIGO AUSENTE',
      details: 'Informe o código do ingresso ou escaneie o QR Code.',
    };
  }

  // 2. Hardening: Identificador do operador é estritamente obrigatório
  if (!p_operator_id) {
    return {
      authorized: false,
      reason: 'OPERADOR NÃO IDENTIFICADO',
      details: 'Identificador do operador de portaria é obrigatório para validação de check-in.',
    };
  }

  // 3. Validação incondicional do operador com papéis canônicos e is_active = true
  const hasActiveAuthorizedRole =
    Array.from(db.adminUsers.values()).some(
      (u) =>
        u.user_id === p_operator_id &&
        ['ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR'].includes(u.role) &&
        u.is_active === true
    ) ||
    Array.from(db.profiles.values()).some(
      (p) =>
        p.id === p_operator_id &&
        ['ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR'].includes(p.role) &&
        p.is_active === true
    );

  if (!hasActiveAuthorizedRole) {
    return {
      authorized: false,
      reason: 'OPERADOR NÃO AUTORIZADO',
      details: 'O operador informado não possui credenciais autorizadas ou ativas para realizar check-in.',
    };
  }

  // 4. Bloqueio e busca do ingresso
  const ticket = Array.from(db.tickets.values()).find(
    (t) => t.ticket_code.toUpperCase() === v_clean_code
  );

  // 5. Existência
  if (!ticket) {
    return {
      authorized: false,
      reason: 'INGRESSO NÃO ENCONTRADO',
      details: 'Código de ingresso não localizado na base oficial do evento.',
      ticket: null,
    };
  }

  // 6. Já utilizado
  if (ticket.status === 'USED') {
    return {
      authorized: false,
      reason: 'INGRESSO JÁ UTILIZADO',
      details: 'Este ingresso já realizou check-in anteriormente. Entrada duplicada proibida.',
      ticket: { ...ticket },
    };
  }

  // 7. Pagamento pendente
  if (ticket.status === 'PENDING') {
    return {
      authorized: false,
      reason: 'PAGAMENTO PENDENTE',
      details: 'O pagamento deste ingresso ainda não foi confirmado pelo Mercado Pago.',
      ticket: { ...ticket },
    };
  }

  // 8. Somente PAID é elegível
  if (ticket.status !== 'PAID') {
    return {
      authorized: false,
      reason: `INGRESSO ${ticket.status}`,
      details: `O status atual do ingresso é ${ticket.status}. Entrada não permitida.`,
      ticket: { ...ticket },
    };
  }

  // 9. Transação Atômica: Baixa do ingresso
  const nowIso = new Date().toISOString();
  ticket.status = 'USED';
  ticket.updated_at = nowIso;

  // 10. Resolução de metadados
  const event = db.events.get(ticket.event_id);
  const eventName = event?.title || 'PX CUSTOM';
  const batchName = ticket.ticket_type_id ? db.ticketTypes.get(ticket.ticket_type_id)?.name || 'Geral' : 'Geral';
  const attendeeName = ticket.holder_name || 'Participante PX';

  const deviceInfoObj = {
    ticket_code: ticket.ticket_code,
    attendee_name: attendeeName,
    batch_name: batchName,
    event_name: eventName,
    operator_name: p_operator_name || 'Operador PX Portaria',
    operator_id: p_operator_id,
    status: 'CONFIRMADO',
    checked_in_at: nowIso,
  };

  // 12. Inserção em checkins com checked_by e checked_at (Etapa 6.17)
  db.checkins.push({
    id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    ticket_id: ticket.id,
    event_id: ticket.event_id,
    checked_by: p_operator_id,
    checked_at: nowIso,
    device_info: JSON.stringify(deviceInfoObj),
    created_at: nowIso,
  });

  // 13. Retorno JSON
  return {
    authorized: true,
    reason: 'CHECK-IN AUTORIZADO',
    details: 'Acesso liberado com sucesso. Bem-vindo à experiência PX CUSTOM!',
    ticket: {
      id: ticket.id,
      ticket_code: ticket.ticket_code,
      code: ticket.ticket_code,
      status: 'USED',
      event_id: ticket.event_id,
      event_name: eventName,
      eventName: eventName,
      holder_name: attendeeName,
      buyer_name: attendeeName,
      buyerName: attendeeName,
      batch_name: batchName,
      batchName: batchName,
      price: ticket.price,
      qr_code: ticket.qr_code,
      updated_at: nowIso,
    },
    log: {
      ticketCode: ticket.ticket_code,
      attendeeName: attendeeName,
      batchName: batchName,
      eventName: eventName,
      operatorName: p_operator_name || 'Operador PX Portaria',
      status: 'CONFIRMADO',
      timestamp: nowIso,
    },
  };
}

// =============================================================================
// GERADOR DE ESTADO SINTÉTICO INICIAL
// =============================================================================

function createInitialMockState(): MockDatabaseState {
  const db: MockDatabaseState = {
    authUsers: new Map(),
    adminUsers: new Map(),
    profiles: new Map(),
    tickets: new Map(),
    checkins: [],
    events: new Map([
      ['evt-001', { id: 'evt-001', title: 'PX CUSTOM FESTIVAL 2026' }],
    ]),
    ticketTypes: new Map([
      ['tt-vip', { id: 'tt-vip', name: 'CAMAROTE VIP' }],
      ['tt-pista', { id: 'tt-pista', name: 'PISTA PREMIUM' }],
    ]),
    rpcAvailable: true,
  };

  // Operadores de teste
  // 1. ADMIN ativo
  db.authUsers.set('token-admin', { id: 'usr-admin-uuid', email: 'admin@pxcustom.com.br' });
  db.adminUsers.set('usr-admin-uuid', { user_id: 'usr-admin-uuid', role: 'ADMIN', is_active: true });
  db.profiles.set('usr-admin-uuid', { id: 'usr-admin-uuid', role: 'ADMIN', is_active: true });

  // 2. SUPER_ADMIN ativo
  db.authUsers.set('token-superadmin', { id: 'usr-super-uuid', email: 'super@pxcustom.com.br' });
  db.adminUsers.set('usr-super-uuid', { user_id: 'usr-super-uuid', role: 'SUPER_ADMIN', is_active: true });
  db.profiles.set('usr-super-uuid', { id: 'usr-super-uuid', role: 'SUPER_ADMIN', is_active: true });

  // 3. CHECKIN_OPERATOR ativo
  db.authUsers.set('token-operator', { id: 'usr-operator-uuid', email: 'portaria@pxcustom.com.br' });
  db.adminUsers.set('usr-operator-uuid', { user_id: 'usr-operator-uuid', role: 'CHECKIN_OPERATOR', is_active: true });
  db.profiles.set('usr-operator-uuid', { id: 'usr-operator-uuid', role: 'CHECKIN_OPERATOR', is_active: true });

  // 4. Usuário comum USER
  db.authUsers.set('token-user', { id: 'usr-common-uuid', email: 'cliente@gmail.com' });
  db.profiles.set('usr-common-uuid', { id: 'usr-common-uuid', role: 'USER', is_active: true });

  // 5. Operador inativo (is_active = false)
  db.authUsers.set('token-inactive', { id: 'usr-inactive-uuid', email: 'demitido@pxcustom.com.br' });
  db.adminUsers.set('usr-inactive-uuid', { user_id: 'usr-inactive-uuid', role: 'CHECKIN_OPERATOR', is_active: false });
  db.profiles.set('usr-inactive-uuid', { id: 'usr-inactive-uuid', role: 'CHECKIN_OPERATOR', is_active: false });

  // 6. Usuário com papel não canônico ("PORTARIA")
  db.authUsers.set('token-portaria-alias', { id: 'usr-portaria-uuid', email: 'alias@pxcustom.com.br' });
  db.adminUsers.set('usr-portaria-uuid', { user_id: 'usr-portaria-uuid', role: 'PORTARIA', is_active: true });
  db.profiles.set('usr-portaria-uuid', { id: 'usr-portaria-uuid', role: 'PORTARIA', is_active: true });

  // Ingressos de teste
  db.tickets.set('tkt-paid-1', {
    id: 'tkt-paid-1',
    ticket_code: 'PX-PAID-001',
    event_id: 'evt-001',
    ticket_type_id: 'tt-vip',
    holder_name: 'Carlos Piloto',
    price: 150.0,
    status: 'PAID',
    updated_at: new Date().toISOString(),
  });

  db.tickets.set('tkt-pending-1', {
    id: 'tkt-pending-1',
    ticket_code: 'PX-PENDING-001',
    event_id: 'evt-001',
    ticket_type_id: 'tt-pista',
    holder_name: 'Marcos Espera',
    price: 80.0,
    status: 'PENDING',
    updated_at: new Date().toISOString(),
  });

  db.tickets.set('tkt-used-1', {
    id: 'tkt-used-1',
    ticket_code: 'PX-USED-001',
    event_id: 'evt-001',
    ticket_type_id: 'tt-vip',
    holder_name: 'Lucas Já Entrou',
    price: 150.0,
    status: 'USED',
    updated_at: new Date().toISOString(),
  });

  return db;
}

// =============================================================================
// EXECUÇÃO DOS TESTES
// =============================================================================

interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
}

const testResults: TestResult[] = [];

function recordTest(id: string, name: string, category: string, passed: boolean, message: string) {
  testResults.push({ id, name, category, passed, message });
  const statusIcon = passed ? '✅ PASSOU' : '❌ FALHOU';
  console.log(`[${statusIcon}] [${id}] ${name} (${category}) -> ${message}`);
}

async function runAllTests() {
  console.log('=============================================================================');
  console.log('PX CUSTOM — EXECUÇÃO DE TESTES LOCAIS ISOLADOS (ETAPA 6.20)');
  console.log('Ambiente: Mocks puros em memória, zero rede, zero segredos, zero Supabase');
  console.log('=============================================================================\n');

  // TESTE 1: ADMIN ativo autorizado
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-admin' },
        body: { code: 'PX-PAID-001', operatorName: 'Admin Central' },
      },
      db
    );
    const ok = res.statusCode === 200 && res.body.authorized === true && res.body.ticket.status === 'USED';
    recordTest(
      'T01',
      'Operador com papel ADMIN ativo',
      'Autorização & Check-in',
      ok,
      `HTTP ${res.statusCode}, authorized=${res.body?.authorized}, ticket status=${res.body?.ticket?.status}`
    );
  }

  // TESTE 2: SUPER_ADMIN ativo autorizado
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-superadmin' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    const ok = res.statusCode === 200 && res.body.authorized === true;
    recordTest(
      'T02',
      'Operador com papel SUPER_ADMIN ativo',
      'Autorização & Check-in',
      ok,
      `HTTP ${res.statusCode}, authorized=${res.body?.authorized}`
    );
  }

  // TESTE 3: CHECKIN_OPERATOR ativo autorizado
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-operator' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    const ok = res.statusCode === 200 && res.body.authorized === true;
    recordTest(
      'T03',
      'Operador com papel CHECKIN_OPERATOR ativo',
      'Autorização & Check-in',
      ok,
      `HTTP ${res.statusCode}, authorized=${res.body?.authorized}`
    );
  }

  // TESTE 4: Usuário comum (USER) recusado com HTTP 403
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-user' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    const ok = res.statusCode === 403 && res.body.authorized === false && res.body.reason === 'ACESSO NEGADO';
    recordTest(
      'T04',
      'Usuário comum (USER) tentando validar check-in',
      'Controle de Acesso',
      ok,
      `HTTP ${res.statusCode}, reason=${res.body?.reason}`
    );
  }

  // TESTE 5: Operador inativo (is_active = false) recusado com HTTP 403
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-inactive' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    const ok = res.statusCode === 403 && res.body.authorized === false && res.body.reason === 'ACESSO NEGADO';
    recordTest(
      'T05',
      'Operador inativo (is_active = false) no backend',
      'Controle de Acesso',
      ok,
      `HTTP ${res.statusCode}, reason=${res.body?.reason}`
    );
  }

  // TESTE 6: Token ausente tratado com HTTP 401
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: {},
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    const ok = res.statusCode === 401 && res.body.reason === 'NÃO AUTORIZADO';
    recordTest(
      'T06',
      'Requisição sem cabeçalho Authorization',
      'Autenticação',
      ok,
      `HTTP ${res.statusCode}, reason=${res.body?.reason}`
    );
  }

  // TESTE 7: Token inválido ou expirado tratado com HTTP 401
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-inexistente-ou-expirado' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    const ok = res.statusCode === 401 && res.body.reason === 'TOKEN INVÁLIDO';
    recordTest(
      'T07',
      'Token inválido/expirado não localizado na autenticação',
      'Autenticação',
      ok,
      `HTTP ${res.statusCode}, reason=${res.body?.reason}`
    );
  }

  // TESTE 8: Resposta da RPC com "authorized: true" e gravação em checkins com checked_by
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-admin' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    const checkinLog = db.checkins.find((c) => c.ticket_id === 'tkt-paid-1');
    const ok =
      res.statusCode === 200 &&
      res.body.authorized === true &&
      res.body.ticket.status === 'USED' &&
      checkinLog !== undefined &&
      checkinLog.checked_by === 'usr-admin-uuid';
    recordTest(
      'T08',
      'Resposta de sucesso e gravação de checked_by em checkins',
      'Integridade Transacional',
      ok,
      `checked_by=${checkinLog?.checked_by}, status=${res.body?.ticket?.status}`
    );
  }

  // TESTE 9: Ingresso já utilizado (USED) tratado como recusa sem falso sucesso
  {
    const db = createInitialMockState();
    const initialCheckinsCount = db.checkins.length;
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-admin' },
        body: { code: 'PX-USED-001' },
      },
      db
    );
    const ok =
      res.statusCode === 200 &&
      res.body.authorized === false &&
      res.body.reason === 'INGRESSO JÁ UTILIZADO' &&
      db.checkins.length === initialCheckinsCount; // Nenhuma inserção em checkins
    recordTest(
      'T09',
      'Ingresso já utilizado recusado sem falso sucesso',
      'Anti-Duplicidade',
      ok,
      `authorized=${res.body?.authorized}, reason=${res.body?.reason}, checkins_count=${db.checkins.length}`
    );
  }

  // TESTE 10: RPC indisponível tratada como erro (HTTP 503) sem fallback em memória
  {
    const db = createInitialMockState();
    db.rpcAvailable = false; // Simula indisponibilidade da RPC no Supabase
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-admin' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    // Ingresso NÃO deve ser alterado e retorno deve ser 503
    const ticketInDb = db.tickets.get('tkt-paid-1');
    const ok =
      res.statusCode === 503 &&
      res.body.authorized === false &&
      res.body.reason === 'SERVIÇO TRANSACIONAL INDISPONÍVEL' &&
      ticketInDb?.status === 'PAID';
    recordTest(
      'T10',
      'RPC indisponível com erro 503 e sem fallback em memória',
      'Resiliência e Segurança',
      ok,
      `HTTP ${res.statusCode}, status mantido=${ticketInDb?.status}`
    );
  }

  // TESTE 11: Papel não canônico ("PORTARIA") aceito no backend, mas barrado na RPC canônica
  {
    const db = createInitialMockState();
    // O operador 'usr-portaria-uuid' tem role 'PORTARIA'.
    // O backend permite passar (whitelist legacy), porém a RPC canônica deve rejeitar!
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-portaria-alias' },
        body: { code: 'PX-PAID-001' },
      },
      db
    );
    // Na RPC canônica, role 'PORTARIA' não está no enum ('ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR')
    // A RPC recusa com 'OPERADOR NÃO AUTORIZADO'
    const ok =
      res.statusCode === 200 &&
      res.body.authorized === false &&
      res.body.reason === 'OPERADOR NÃO AUTORIZADO';
    recordTest(
      'T11',
      'Papel não canônico ("PORTARIA") barrado na autoridade da RPC',
      'Harmonização de Papéis',
      ok,
      `Backend repassa mas RPC rejeita: authorized=${res.body?.authorized}, reason=${res.body?.reason}`
    );
  }

  // TESTE 12: Bloqueio estrito de p_operator_id = NULL na RPC
  {
    const db = createInitialMockState();
    const rpcRes = executeRpcCheckinTicket(db, {
      p_ticket_code: 'PX-PAID-001',
      p_operator_id: null,
    });
    const ok = rpcRes.authorized === false && rpcRes.reason === 'OPERADOR NÃO IDENTIFICADO';
    recordTest(
      'T12',
      'RPC bloqueia imediatamente quando p_operator_id é NULL',
      'Segurança da RPC',
      ok,
      `authorized=${rpcRes.authorized}, reason=${rpcRes.reason}`
    );
  }

  // TESTE 13: Ingresso com status PENDING recusado na RPC
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-admin' },
        body: { code: 'PX-PENDING-001' },
      },
      db
    );
    const ok =
      res.statusCode === 200 &&
      res.body.authorized === false &&
      res.body.reason === 'PAGAMENTO PENDENTE';
    recordTest(
      'T13',
      'Ingresso com pagamento PENDING recusado na validação',
      'Regra de Negócio',
      ok,
      `authorized=${res.body?.authorized}, reason=${res.body?.reason}`
    );
  }

  // TESTE 14: Ingresso inexistente recusado na RPC
  {
    const db = createInitialMockState();
    const res = await handleBackendCheckinValidate(
      {
        headers: { authorization: 'Bearer token-admin' },
        body: { code: 'PX-INEXISTENTE-999' },
      },
      db
    );
    const ok =
      res.statusCode === 200 &&
      res.body.authorized === false &&
      res.body.reason === 'INGRESSO NÃO ENCONTRADO';
    recordTest(
      'T14',
      'Código inexistente tratado com recusa segura',
      'Integridade',
      ok,
      `authorized=${res.body?.authorized}, reason=${res.body?.reason}`
    );
  }

  // Resumo Final
  const total = testResults.length;
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = total - passedCount;

  console.log('\n=============================================================================');
  console.log(`RESUMO: ${passedCount}/${total} testes aprovados (${failedCount} falhas)`);
  console.log('=============================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Erro fatal durante a execução dos testes:', err);
  process.exit(1);
});
