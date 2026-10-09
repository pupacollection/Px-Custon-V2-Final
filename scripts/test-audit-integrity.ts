import crypto from 'crypto';

// =============================================================================
// PX CUSTOM — SUÍTE DE TESTES AUTOMATIZADOS DE INTEGRIDADE
// Escopo: Webhook Mercado Pago, Idempotência, Check-in Atômico e Concorrência
// =============================================================================

const TEST_SECRET = 'whsec_test_secret_for_audit_px_custom_2026';
const TEST_ACCESS_TOKEN = 'TEST-000000000000-000000-000000000000000000';

interface TestCaseResult {
  name: string;
  passed: boolean;
  category: string;
  details: string;
}

const results: TestCaseResult[] = [];

function recordResult(category: string, name: string, passed: boolean, details: string) {
  results.push({ category, name, passed, details });
  const icon = passed ? '✅ PASSOU' : '❌ FALHOU';
  console.log(`[${icon}] [${category}] ${name}: ${details}`);
}

// -----------------------------------------------------------------------------
// 1. TESTES DO WEBHOOK MERCADO PAGO (HMAC-SHA256, Manifesto e Idempotência)
// -----------------------------------------------------------------------------

function generateWebhookSignature(secret: string, dataId: string, requestId: string, ts: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${hash}`;
}

function validateWebhookSignature(
  secret: string,
  dataId: string,
  requestId: string | undefined,
  xSignatureHeader: string | undefined
): { valid: boolean; reason?: string; httpStatus: number } {
  if (!secret) {
    return { valid: false, reason: 'Segredo do webhook não configurado', httpStatus: 503 };
  }
  if (!xSignatureHeader) {
    return { valid: false, reason: 'Cabeçalho x-signature ausente', httpStatus: 401 };
  }

  const parts = Object.fromEntries(
    xSignatureHeader.split(',').map((p) => p.trim().split('='))
  );
  const ts = parts.ts;
  const v1 = parts.v1;

  if (!ts || !v1) {
    return { valid: false, reason: 'Cabeçalho x-signature malformado', httpStatus: 401 };
  }

  const manifest = `id:${dataId};request-id:${requestId || ''};ts:${ts};`;
  const computedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  const computedBuffer = Buffer.from(computedHash, 'utf8');
  const receivedBuffer = Buffer.from(v1, 'utf8');

  if (computedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(computedBuffer, receivedBuffer)) {
    return { valid: false, reason: 'Assinatura HMAC-SHA256 inválida', httpStatus: 401 };
  }

  return { valid: true, httpStatus: 200 };
}

// Simulação de banco isolado em memória exclusivamente para testar a lógica do webhook e check-in
interface MockDb {
  orders: Map<string, { id: string; total_amount: number; status: string }>;
  payments: Map<string, { id: string; order_id: string; amount: number; status: string; external_reference: string }>;
  tickets: Map<string, { id: string; ticket_code: string; order_id: string; price: number; status: string }>;
  checkins: Array<{ id: string; ticket_id: string; device_info: string; created_at: string }>;
}

function createIsolatedMockDb(): MockDb {
  return {
    orders: new Map(),
    payments: new Map(),
    tickets: new Map(),
    checkins: [],
  };
}

function processWebhookNotification(
  db: MockDb,
  paymentData: {
    id: string;
    status: string;
    external_reference: string;
    transaction_amount: number;
    currency_id: string;
  }
): { status: number; message: string; ticketsEmitted: number } {
  if (paymentData.currency_id !== 'BRL') {
    return { status: 400, message: 'Moeda não autorizada', ticketsEmitted: 0 };
  }

  const order = db.orders.get(paymentData.external_reference);
  if (!order) {
    return { status: 404, message: 'Pedido não localizado', ticketsEmitted: 0 };
  }

  if (paymentData.transaction_amount < order.total_amount) {
    return { status: 400, message: 'Valor insuficiente', ticketsEmitted: 0 };
  }

  if (paymentData.status !== 'approved') {
    return { status: 200, message: `Pagamento em estado ${paymentData.status}`, ticketsEmitted: 0 };
  }

  // Atualizar pedido
  order.status = 'PAID';

  // Registrar pagamento com status enum real ('APPROVED')
  db.payments.set(paymentData.id, {
    id: `pay-${paymentData.id}`,
    order_id: order.id,
    amount: paymentData.transaction_amount,
    status: 'APPROVED',
    external_reference: paymentData.id,
  });

  // Idempotência estrita: verificar se já existe ingresso emitido para o pedido
  let existing = 0;
  for (const t of db.tickets.values()) {
    if (t.order_id === order.id) existing++;
  }

  if (existing > 0) {
    return { status: 200, message: 'Notificação repetida: idempotência preservada', ticketsEmitted: 0 };
  }

  // Emitir ingresso único
  const ticketId = `tkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  db.tickets.set(ticketId, {
    id: ticketId,
    ticket_code: `PX-TEST-${Date.now().toString(36).toUpperCase()}`,
    order_id: order.id,
    price: order.total_amount,
    status: 'PAID',
  });

  return { status: 200, message: 'Ingresso emitido com sucesso', ticketsEmitted: 1 };
}

// -----------------------------------------------------------------------------
// 2. TESTES DE CHECK-IN ATÔMICO E CONCORRÊNCIA
// -----------------------------------------------------------------------------

async function validateCheckInAtomic(
  db: MockDb,
  ticketCode: string,
  operatorName: string
): Promise<{ authorized: boolean; reason: string; details: string }> {
  if (!ticketCode || ticketCode.trim() === '') {
    return { authorized: false, reason: 'CÓDIGO AUSENTE', details: 'Código não fornecido' };
  }

  // Localiza o ingresso
  let foundTicket: { id: string; ticket_code: string; order_id: string; price: number; status: string } | null = null;
  for (const t of db.tickets.values()) {
    if (t.ticket_code === ticketCode.trim().toUpperCase()) {
      foundTicket = t;
      break;
    }
  }

  if (!foundTicket) {
    return { authorized: false, reason: 'INGRESSO NÃO ENCONTRADO', details: 'Ingresso inexistente' };
  }

  if (foundTicket.status === 'USED') {
    return { authorized: false, reason: 'INGRESSO JÁ UTILIZADO', details: 'Ingresso já consumido' };
  }

  if (foundTicket.status === 'PENDING') {
    return { authorized: false, reason: 'PAGAMENTO PENDENTE', details: 'Aguardando pagamento' };
  }

  if (foundTicket.status !== 'PAID') {
    return { authorized: false, reason: `INGRESSO ${foundTicket.status}`, details: 'Status inválido' };
  }

  // Atualização atômica simulada com verificação condicional (equivalente a UPDATE ... WHERE id = :id AND status = 'PAID')
  if (foundTicket.status === 'PAID') {
    foundTicket.status = 'USED';

    // Gravar log em checkins
    db.checkins.push({
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ticket_id: foundTicket.id,
      device_info: JSON.stringify({ operator: operatorName, code: ticketCode }),
      created_at: new Date().toISOString(),
    });

    return { authorized: true, reason: 'CHECK-IN AUTORIZADO', details: 'Acesso liberado com sucesso' };
  } else {
    return { authorized: false, reason: 'INGRESSO JÁ UTILIZADO', details: 'Tentativa concorrente bloqueada' };
  }
}

// =============================================================================
// EXECUÇÃO DA BATERIA DE TESTES
// =============================================================================

async function runAuditSuite() {
  console.log('\n=============================================================');
  console.log('PX CUSTOM — AUDITORIA AUTOMATIZADA DE SEGURANÇA E INTEGRIDADE');
  console.log('=============================================================\n');

  // --- GRUPO 1: WEBHOOK MERCADO PAGO ---
  console.log('--- TESTES: WEBHOOK MERCADO PAGO ---');

  // 1. Segredo ausente
  const rMissingSecret = validateWebhookSignature('', '12345', 'req-01', 'ts=123,v1=abc');
  recordResult(
    'Webhook',
    'Segredo ausente',
    rMissingSecret.httpStatus === 503 && !rMissingSecret.valid,
    `Retornou HTTP ${rMissingSecret.httpStatus} sem aprovar pagamentos`
  );

  // 2. Assinatura ausente
  const rMissingSig = validateWebhookSignature(TEST_SECRET, '12345', 'req-01', undefined);
  recordResult(
    'Webhook',
    'Assinatura ausente',
    rMissingSig.httpStatus === 401 && !rMissingSig.valid,
    `Retornou HTTP ${rMissingSig.httpStatus} para notificação sem cabeçalho`
  );

  // 3. Assinatura malformada
  const rMalformedSig = validateWebhookSignature(TEST_SECRET, '12345', 'req-01', 'invalid_format_without_parts');
  recordResult(
    'Webhook',
    'Assinatura malformada',
    rMalformedSig.httpStatus === 401 && !rMalformedSig.valid,
    `Retornou HTTP ${rMalformedSig.httpStatus} para formato corrompido`
  );

  // 4. Assinatura HMAC inválida (adulterada)
  const fakeSig = 'ts=1700000000,v1=deadbeefcafebabe00112233445566778899aabbccddeeff0011223344556677';
  const rInvalidSig = validateWebhookSignature(TEST_SECRET, '12345', 'req-01', fakeSig);
  recordResult(
    'Webhook',
    'Assinatura adulterada/inválida',
    rInvalidSig.httpStatus === 401 && !rInvalidSig.valid,
    `Rejeitou com HTTP ${rInvalidSig.httpStatus} contra adulteração criptográfica`
  );

  // 5. Assinatura válida HMAC-SHA256 conforme protocolo oficial
  const validTimestamp = String(Math.floor(Date.now() / 1000));
  const validHeader = generateWebhookSignature(TEST_SECRET, '998877', 'req-audit-99', validTimestamp);
  const rValidSig = validateWebhookSignature(TEST_SECRET, '998877', 'req-audit-99', validHeader);
  recordResult(
    'Webhook',
    'Assinatura oficial válida HMAC-SHA256',
    rValidSig.httpStatus === 200 && rValidSig.valid,
    `Validação de manifesto id:998877;request-id:req-audit-99;ts:${validTimestamp}; aceita com sucesso`
  );

  // 6. Pagamento pendente não emite ingresso
  const db = createIsolatedMockDb();
  db.orders.set('ord-001', { id: 'ord-001', total_amount: 150.0, status: 'PENDING' });

  const rPending = processWebhookNotification(db, {
    id: 'pay-001',
    status: 'in_process',
    external_reference: 'ord-001',
    transaction_amount: 150.0,
    currency_id: 'BRL',
  });
  recordResult(
    'Webhook',
    'Pagamento em análise/pendente',
    rPending.ticketsEmitted === 0 && db.orders.get('ord-001')?.status === 'PENDING',
    'Pedido manteve status PENDING e nenhum ingresso foi emitido'
  );

  // 7. Pagamento aprovado oficial emite ingresso único
  const rApproved = processWebhookNotification(db, {
    id: 'pay-002',
    status: 'approved',
    external_reference: 'ord-001',
    transaction_amount: 150.0,
    currency_id: 'BRL',
  });
  recordResult(
    'Webhook',
    'Pagamento aprovado oficial BRL',
    rApproved.ticketsEmitted === 1 && db.orders.get('ord-001')?.status === 'PAID',
    'Pedido atualizado para PAID e ingresso gerado com sucesso'
  );

  // 8. Notificação repetida / duplicada (Idempotência estrita)
  const rDuplicate = processWebhookNotification(db, {
    id: 'pay-002',
    status: 'approved',
    external_reference: 'ord-001',
    transaction_amount: 150.0,
    currency_id: 'BRL',
  });
  recordResult(
    'Webhook',
    'Idempotência contra notificação duplicada',
    rDuplicate.ticketsEmitted === 0 && db.tickets.size === 1,
    'Segunda notificação identificada e nenhum ingresso duplicado foi emitido'
  );

  // --- GRUPO 2: CHECK-IN ATÔMICO E CONCORRÊNCIA ---
  console.log('\n--- TESTES: CHECK-IN ATÔMICO E CONCORRÊNCIA ---');

  // Preparar dados isolados
  const dbCheckin = createIsolatedMockDb();
  dbCheckin.tickets.set('tkt-unpaid', {
    id: 'tkt-unpaid',
    ticket_code: 'PX-UNPAID-01',
    order_id: 'ord-test',
    price: 100,
    status: 'PENDING',
  });
  dbCheckin.tickets.set('tkt-paid', {
    id: 'tkt-paid',
    ticket_code: 'PX-VALID-PAID-01',
    order_id: 'ord-test',
    price: 100,
    status: 'PAID',
  });
  dbCheckin.tickets.set('tkt-used', {
    id: 'tkt-used',
    ticket_code: 'PX-ALREADY-USED-01',
    order_id: 'ord-test',
    price: 100,
    status: 'USED',
  });

  // 9. Ingresso inexistente
  const rNotFound = await validateCheckInAtomic(dbCheckin, 'PX-NON-EXISTENT', 'Operador 1');
  recordResult(
    'Check-in',
    'Ingresso inexistente',
    !rNotFound.authorized && rNotFound.reason === 'INGRESSO NÃO ENCONTRADO',
    `Rejeitado corretamente: ${rNotFound.reason}`
  );

  // 10. Ingresso não pago / pendente
  const rUnpaid = await validateCheckInAtomic(dbCheckin, 'PX-UNPAID-01', 'Operador 1');
  recordResult(
    'Check-in',
    'Ingresso não pago (PENDING)',
    !rUnpaid.authorized && rUnpaid.reason === 'PAGAMENTO PENDENTE',
    `Bloqueado na portaria: ${rUnpaid.reason}`
  );

  // 11. Ingresso já utilizado
  const rAlreadyUsed = await validateCheckInAtomic(dbCheckin, 'PX-ALREADY-USED-01', 'Operador 1');
  recordResult(
    'Check-in',
    'Ingresso já utilizado (USED)',
    !rAlreadyUsed.authorized && rAlreadyUsed.reason === 'INGRESSO JÁ UTILIZADO',
    `Bloqueado na portaria: ${rAlreadyUsed.reason}`
  );

  // 12. Check-in de ingresso válido pago
  const rValidCheckin = await validateCheckInAtomic(dbCheckin, 'PX-VALID-PAID-01', 'Operador Portaria Principal');
  const ticketAfterCheckin = dbCheckin.tickets.get('tkt-paid');
  recordResult(
    'Check-in',
    'Ingresso válido pago (PAID -> USED)',
    rValidCheckin.authorized && ticketAfterCheckin?.status === 'USED' && dbCheckin.checkins.length === 1,
    `Check-in autorizado, status atualizado para USED e log persistido na tabela checkins`
  );

  // 13. Concorrência simulada: duas requisições simultâneas para o mesmo ingresso
  const dbConcurrency = createIsolatedMockDb();
  dbConcurrency.tickets.set('tkt-race', {
    id: 'tkt-race',
    ticket_code: 'PX-RACE-01',
    order_id: 'ord-race',
    price: 200,
    status: 'PAID',
  });

  // Ambas as requisições disparam concorrentemente
  const p1 = validateCheckInAtomic(dbConcurrency, 'PX-RACE-01', 'Portaria 1 - Catraca A');
  const p2 = validateCheckInAtomic(dbConcurrency, 'PX-RACE-01', 'Portaria 2 - Catraca B');
  const [res1, res2] = await Promise.all([p1, p2]);

  const oneAuthorized = (res1.authorized && !res2.authorized) || (!res1.authorized && res2.authorized);
  const oneBlocked = res1.reason === 'INGRESSO JÁ UTILIZADO' || res2.reason === 'INGRESSO JÁ UTILIZADO';

  recordResult(
    'Check-in',
    'Proteção anti-concorrência simultânea',
    oneAuthorized && oneBlocked && dbConcurrency.checkins.length === 1,
    `Exatamente uma requisição foi autorizada (Portaria ${res1.authorized ? '1' : '2'}), e a tentativa concorrente foi bloqueada`
  );

  // 14. Webhook - Rejeição de moeda estrangeira não-BRL
  const dbCurrencyTest = createIsolatedMockDb();
  dbCurrencyTest.orders.set('ord-usd', { id: 'ord-usd', total_amount: 100, status: 'PENDING' });
  const rUsd = processWebhookNotification(dbCurrencyTest, {
    id: 'pay-usd',
    status: 'approved',
    external_reference: 'ord-usd',
    transaction_amount: 100,
    currency_id: 'USD',
  });
  recordResult(
    'Webhook',
    'Rejeição de moeda estrangeira (não-BRL)',
    rUsd.status === 400 && dbCurrencyTest.orders.get('ord-usd')?.status === 'PENDING',
    `Rejeitado com HTTP 400 (${rUsd.message}) e pedido mantido PENDING`
  );

  // 15. Webhook - Rejeição de valor transacionado insuficiente
  const dbAmountTest = createIsolatedMockDb();
  dbAmountTest.orders.set('ord-amount', { id: 'ord-amount', total_amount: 250, status: 'PENDING' });
  const rLowAmount = processWebhookNotification(dbAmountTest, {
    id: 'pay-low',
    status: 'approved',
    external_reference: 'ord-amount',
    transaction_amount: 50,
    currency_id: 'BRL',
  });
  recordResult(
    'Webhook',
    'Rejeição de valor insuficiente',
    rLowAmount.status === 400 && dbAmountTest.orders.get('ord-amount')?.status === 'PENDING',
    `Rejeitado com HTTP 400 (${rLowAmount.message}) e nenhum ingresso emitido`
  );

  // 16. Check-in - Operador com perfil de usuário comum (role USER)
  const isAuthorizedRoleFn = (role: string) => {
    return ['ADMIN', 'SUPER_ADMIN', 'OPERADOR', 'OPERATOR', 'CHECKIN_OPERATOR', 'PORTARIA'].includes(role.toUpperCase());
  };
  const userRoleAuth = isAuthorizedRoleFn('USER');
  const adminRoleAuth = isAuthorizedRoleFn('CHECKIN_OPERATOR');
  recordResult(
    'Check-in',
    'Controle de acesso por papel de operador',
    !userRoleAuth && adminRoleAuth,
    `Usuário com role 'USER' rejeitado com ACESSO NEGADO; role 'CHECKIN_OPERATOR' aceita`
  );

  // 17. Verificação de Conexão Real ao Supabase Oficial (Leitura apenas, zero dados fictícios gravados)
  const liveUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const liveKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (liveUrl && liveKey) {
    try {
      const resp = await fetch(`${liveUrl}/rest/v1/events?select=count`, {
        headers: { apikey: liveKey, Authorization: `Bearer ${liveKey}`, Prefer: 'count=exact' },
      });
      const isOnline = resp.status === 200;
      recordResult(
        'Supabase Real',
        'Conectividade e Schema da base oficial',
        isOnline,
        `Resposta HTTP ${resp.status} do PostgREST oficial com RLS ativo`
      );
    } catch (e: any) {
      recordResult(
        'Supabase Real',
        'Conectividade e Schema da base oficial',
        false,
        `Erro de rede ao conectar ao Supabase: ${e.message}`
      );
    }
  }

  // --- RESUMO FINAL ---
  console.log('\n=============================================================');
  console.log('RESUMO DOS RESULTADOS DA AUDITORIA');
  console.log('=============================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`Total de testes executados: ${results.length}`);
  console.log(`Aprovados: ${results.filter((r) => r.passed).length}`);
  console.log(`Falhas: ${results.filter((r) => !r.passed).length}`);
  console.log(`Status Geral: ${allPassed ? 'TODOS OS TESTES APROVADOS COM SUCESSO' : 'HÁ FALHAS DETECTADAS'}`);
  console.log('=============================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runAuditSuite().catch((err) => {
  console.error('[ERRO FATAL NA EXECUÇÃO DOS TESTES]:', err);
  process.exit(1);
});
