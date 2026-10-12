/**
 * PX CUSTOM — SUÍTE DE TESTES UNITÁRIOS DE AUTORIZAÇÃO E PROJEÇÃO EM STAGING (ETAPA 6.39)
 * Arquivo: scripts/test-staging-authorization-unit.ts
 *
 * ESCOPO:
 * Validar estaticamente e de forma 100% isolada a lógica de autorização e projeção
 * do servidor de homologação (server-staging.ts):
 * 1. Precedência estrita de permissões (admin_users vs profiles).
 * 2. Bloqueio incondicional de administrativos inativos (sem bypass por profiles).
 * 3. Rejeição de aliases não canônicos ('PORTARIA', 'OPERADOR', 'OPERATOR').
 * 4. Tratamento de erros de banco em admin_users e profiles como falha de autorização.
 * 5. Projeção mínima de colunas permitidas no histórico de check-ins (sem select *).
 * 6. Tratamento de erro na listagem de check-ins sem vazamento de detalhes internos.
 *
 * GARANTIAS:
 * - Zero conexões de rede (sem chamadas a Supabase, Hostinger, Mercado Pago ou APIs).
 * - Zero execução de SQL em banco real.
 * - Mocks puros em memória.
 */

import assert from 'node:assert/strict';

// Garantir que server-staging.ts não inicie bootstrap ou servidor HTTP ao ser importado
process.env.NODE_ENV = 'test';

import {
  verifyOperatorAuthorization,
  createStagingApp,
  AUTHORIZED_OPERATOR_ROLES,
  CHECKIN_HISTORY_COLUMNS,
  CHECKIN_HISTORY_COLUMNS_SQL,
} from '../server-staging';

// =============================================================================
// INFRAESTRUTURA DE MOCK EM MEMÓRIA
// =============================================================================

interface MockDbState {
  authTokens: Map<string, { id: string; email: string }>;
  adminUsers: Map<string, { user_id: string; role: string; is_active: boolean }>;
  profiles: Map<string, { id: string; role: string; is_active: boolean }>;
  checkins: Array<{
    id: string;
    ticket_id: string;
    event_id: string;
    checked_by: string | null;
    checked_at: string;
    device_info: string;
    created_at: string;
    internal_debug_secret?: string;
  }>;
  errors: {
    adminUsers?: { message: string };
    profiles?: { message: string };
    checkins?: { message: string };
  };
  rpcHandlers?: {
    fn_validate_and_checkin_ticket?: (args: any) => Promise<{ data: any; error: any }>;
  };
  spy: {
    lastCheckinsSelectCols?: string;
  };
}

function createMockSupabaseClient(state: MockDbState) {
  return {
    auth: {
      getUser: async (token: string) => {
        const user = state.authTokens.get(token);
        if (!user) {
          return { data: { user: null }, error: { message: 'Invalid or expired JWT token' } };
        }
        return { data: { user }, error: null };
      },
    },
    rpc: async (fnName: string, args: any) => {
      if (state.rpcHandlers && (state.rpcHandlers as any)[fnName]) {
        return (state.rpcHandlers as any)[fnName](args);
      }
      return { data: null, error: { message: `RPC ${fnName} not mocked` } };
    },
    from: (table: string) => {
      if (table === 'admin_users') {
        return {
          select: (_cols: string) => ({
            eq: (_field: string, val: string) => ({
              maybeSingle: async () => {
                if (state.errors.adminUsers) {
                  return { data: null, error: state.errors.adminUsers };
                }
                const record = state.adminUsers.get(val);
                return { data: record || null, error: null };
              },
            }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: (_cols: string) => ({
            eq: (_field: string, val: string) => ({
              maybeSingle: async () => {
                if (state.errors.profiles) {
                  return { data: null, error: state.errors.profiles };
                }
                const record = state.profiles.get(val);
                return { data: record || null, error: null };
              },
            }),
          }),
        };
      }

      if (table === 'checkins') {
        return {
          select: (cols: string) => {
            state.spy.lastCheckinsSelectCols = cols;
            return {
              order: (_col: string, _opts: any) => ({
                limit: (_lim: number) => {
                  if (state.errors.checkins) {
                    return Promise.resolve({ data: null, error: state.errors.checkins });
                  }
                  // Retorna apenas as colunas projetadas se não for *
                  const projected = state.checkins.map((item) => {
                    if (cols === '*') return item;
                    const selectedCols = cols.split(',').map((c) => c.trim());
                    const obj: Record<string, any> = {};
                    for (const c of selectedCols) {
                      obj[c] = (item as any)[c];
                    }
                    return obj;
                  });
                  return Promise.resolve({ data: projected, error: null });
                },
              }),
            };
          },
        };
      }

      throw new Error(`Tabela mock não configurada: ${table}`);
    },
  };
}

// =============================================================================
// RUNNER DE TESTES
// =============================================================================

let totalTests = 0;
let passedTests = 0;

async function runTestCase(name: string, fn: () => Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Erro: ${err.message || err}`);
    throw err;
  }
}

// =============================================================================
// CENÁRIOS DE TESTE
// =============================================================================

async function runAllTests() {
  console.log('=============================================================================');
  console.log('PX CUSTOM — TESTES UNITÁRIOS DE AUTORIZAÇÃO E PROJEÇÃO (ETAPA 6.39)');
  console.log('=============================================================================');
  console.log('Executando asserções puras em memória (sem rede, sem Supabase real, sem SQL)...\n');

  // ---------------------------------------------------------------------------
  // 1. TOKEN AUSENTE OU INVÁLIDO
  // ---------------------------------------------------------------------------
  console.log('1. Validação de Token de Autenticação:');

  await runTestCase('1.1 Deve rejeitar requisição sem cabeçalho Authorization (HTTP 401)', async () => {
    const db: MockDbState = {
      authTokens: new Map(),
      adminUsers: new Map(),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, undefined, 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.reason, 'NÃO AUTORIZADO');
  });

  await runTestCase('1.2 Deve rejeitar cabeçalho sem formato Bearer (HTTP 401)', async () => {
    const db: MockDbState = {
      authTokens: new Map(),
      adminUsers: new Map(),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Basic dXNlcjpwYXNz', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.reason, 'NÃO AUTORIZADO');
  });

  await runTestCase('1.3 Deve rejeitar token Bearer vazio (HTTP 401)', async () => {
    const db: MockDbState = {
      authTokens: new Map(),
      adminUsers: new Map(),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer   ', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.reason, 'NÃO AUTORIZADO');
  });

  await runTestCase('1.4 Deve rejeitar token inválido ou não encontrado no GoTrue (HTTP 401)', async () => {
    const db: MockDbState = {
      authTokens: new Map(),
      adminUsers: new Map(),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer token_inexistente_123', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.reason, 'TOKEN INVÁLIDO');
  });

  // ---------------------------------------------------------------------------
  // 2. PAPEL NÃO AUTORIZADO E ALIASES NÃO CANÔNICOS
  // ---------------------------------------------------------------------------
  console.log('\n2. Papéis Não Autorizados e Aliases Não Suportados:');

  await runTestCase('2.1 Deve rejeitar usuário comum (USER) em admin_users (HTTP 403)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-user', { id: 'usr-1', email: 'user@px.com' }]]),
      adminUsers: new Map([['usr-1', { user_id: 'usr-1', role: 'USER', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-user', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 403);
    assert.equal(result.reason, 'ACESSO NEGADO');
  });

  await runTestCase('2.2 Deve rejeitar usuário comum (USER) em profiles (HTTP 403)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-user', { id: 'usr-2', email: 'user2@px.com' }]]),
      adminUsers: new Map(),
      profiles: new Map([['usr-2', { id: 'usr-2', role: 'USER', is_active: true }]]),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-user', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 403);
    assert.equal(result.reason, 'ACESSO NEGADO');
  });

  await runTestCase('2.3 Deve rejeitar aliases não canônicos ("PORTARIA", "OPERADOR", "OPERATOR") (HTTP 403)', async () => {
    const nonCanonicalRoles = ['PORTARIA', 'OPERADOR', 'OPERATOR', 'STAFF', 'GATE'];
    for (const fakeRole of nonCanonicalRoles) {
      const db: MockDbState = {
        authTokens: new Map([['tok-alias', { id: 'usr-alias', email: 'alias@px.com' }]]),
        adminUsers: new Map([['usr-alias', { user_id: 'usr-alias', role: fakeRole, is_active: true }]]),
        profiles: new Map(),
        checkins: [],
        errors: {},
        spy: {},
      };
      const client = createMockSupabaseClient(db);
      const result = await verifyOperatorAuthorization(client, 'Bearer tok-alias', 'teste');
      assert.equal(result.authenticated, false, `Falha: papel não canônico "${fakeRole}" foi aceito!`);
      assert.equal(result.statusCode, 403);
      assert.equal(result.reason, 'ACESSO NEGADO');
    }
  });

  // ---------------------------------------------------------------------------
  // 3. ADMINISTRADOR INATIVO COM PERFIL APARENTEMENTE AUTORIZADO
  // ---------------------------------------------------------------------------
  console.log('\n3. Precedência de Segurança e Bloqueio de Inativos:');

  await runTestCase('3.1 Administrador inativo em admin_users com perfil ativo em profiles DEVE SER BLOQUEADO (HTTP 403)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-inactive-admin', { id: 'usr-inactive', email: 'inactive@px.com' }]]),
      // admin_users inativo (is_active = false)
      adminUsers: new Map([['usr-inactive', { user_id: 'usr-inactive', role: 'ADMIN', is_active: false }]]),
      // profiles ativo com role ADMIN (tentativa de contorno)
      profiles: new Map([['usr-inactive', { id: 'usr-inactive', role: 'ADMIN', is_active: true }]]),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-inactive-admin', 'teste');
    assert.equal(result.authenticated, false, 'VULNERABILIDADE: Administrador inativo contornou bloqueio via profiles!');
    assert.equal(result.statusCode, 403);
    assert.equal(result.reason, 'ACESSO NEGADO');
    assert.ok(result.details?.includes('inativa'));
  });

  await runTestCase('3.2 Usuário com profiles inativo (is_active = false) DEVE SER BLOQUEADO (HTTP 403)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-inactive-profile', { id: 'usr-p-inact', email: 'p@px.com' }]]),
      adminUsers: new Map(),
      profiles: new Map([['usr-p-inact', { id: 'usr-p-inact', role: 'CHECKIN_OPERATOR', is_active: false }]]),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-inactive-profile', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 403);
    assert.equal(result.reason, 'ACESSO NEGADO');
  });

  await runTestCase('3.3 Usuário com papel administrativo não autorizado em admin_users (FINANCE) e ativo em profiles DEVE SER BLOQUEADO (HTTP 403)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-conflict-role', { id: 'usr-conflict', email: 'fin@px.com' }]]),
      // admin_users define papel FINANCE (não autorizado na portaria)
      adminUsers: new Map([['usr-conflict', { user_id: 'usr-conflict', role: 'FINANCE', is_active: true }]]),
      // profiles ativo com role ADMIN (tentativa de bypass por papel mais amplo)
      profiles: new Map([['usr-conflict', { id: 'usr-conflict', role: 'ADMIN', is_active: true }]]),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-conflict-role', 'teste');
    assert.equal(result.authenticated, false, 'Precedência estrita: admin_users não autorizado deve bloquear mesmo se profiles for ADMIN!');
    assert.equal(result.statusCode, 403);
    assert.equal(result.reason, 'ACESSO NEGADO');
  });

  await runTestCase('3.4 Usuário inativo em admin_users e inativo em profiles DEVE SER BLOQUEADO (HTTP 403)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-both-inact', { id: 'usr-both-inact', email: 'both@px.com' }]]),
      adminUsers: new Map([['usr-both-inact', { user_id: 'usr-both-inact', role: 'CHECKIN_OPERATOR', is_active: false }]]),
      profiles: new Map([['usr-both-inact', { id: 'usr-both-inact', role: 'CHECKIN_OPERATOR', is_active: false }]]),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-both-inact', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 403);
    assert.equal(result.reason, 'ACESSO NEGADO');
  });

  await runTestCase('3.5 Usuário sem registro em admin_users e sem registro em profiles DEVE SER BLOQUEADO (HTTP 403)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-no-records', { id: 'usr-ghost', email: 'ghost@px.com' }]]),
      adminUsers: new Map(),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-no-records', 'teste');
    assert.equal(result.authenticated, false);
    assert.equal(result.statusCode, 403);
    assert.equal(result.reason, 'ACESSO NEGADO');
  });

  // ---------------------------------------------------------------------------
  // 4. ERROS DE CONSULTA EM ADMIN_USERS E PROFILES
  // ---------------------------------------------------------------------------
  console.log('\n4. Tratamento de Erros de Consulta como Falha de Autorização:');

  await runTestCase('4.1 Erro de consulta em admin_users deve falhar autorização imediatamente (HTTP 401)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-err', { id: 'usr-err', email: 'err@px.com' }]]),
      adminUsers: new Map(),
      profiles: new Map([['usr-err', { id: 'usr-err', role: 'ADMIN', is_active: true }]]),
      checkins: [],
      errors: {
        adminUsers: { message: 'Connection timeout ao consultar admin_users' },
      },
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-err', 'teste');
    assert.equal(result.authenticated, false, 'Falha de consulta em admin_users não pode conceder acesso!');
    assert.equal(result.statusCode, 401);
    assert.equal(result.reason, 'FALHA DE AUTENTICAÇÃO');
  });

  await runTestCase('4.2 Erro de consulta em profiles deve falhar autorização imediatamente (HTTP 401)', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-err2', { id: 'usr-err2', email: 'err2@px.com' }]]),
      adminUsers: new Map(), // não encontrado em admin_users
      profiles: new Map(),
      checkins: [],
      errors: {
        profiles: { message: 'Network I/O error ao consultar profiles' },
      },
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-err2', 'teste');
    assert.equal(result.authenticated, false, 'Falha de consulta em profiles não pode conceder acesso!');
    assert.equal(result.statusCode, 401);
    assert.equal(result.reason, 'FALHA DE AUTENTICAÇÃO');
  });

  // ---------------------------------------------------------------------------
  // 5. OPERADOR ATIVO AUTORIZADO
  // ---------------------------------------------------------------------------
  console.log('\n5. Operadores Ativos e Autorizados:');

  await runTestCase('5.1 CHECKIN_OPERATOR ativo em admin_users deve ser autorizado com sucesso', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-op', { id: 'usr-op', email: 'op@px.com' }]]),
      adminUsers: new Map([['usr-op', { user_id: 'usr-op', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-op', 'teste');
    assert.equal(result.authenticated, true);
    assert.equal(result.role, 'CHECKIN_OPERATOR');
    assert.equal(result.user?.id, 'usr-op');
  });

  await runTestCase('5.2 ADMIN ativo em admin_users deve ser autorizado com sucesso', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-admin', { id: 'usr-adm', email: 'adm@px.com' }]]),
      adminUsers: new Map([['usr-adm', { user_id: 'usr-adm', role: 'ADMIN', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-admin', 'teste');
    assert.equal(result.authenticated, true);
    assert.equal(result.role, 'ADMIN');
  });

  await runTestCase('5.3 SUPER_ADMIN ativo em admin_users deve ser autorizado com sucesso', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-sadmin', { id: 'usr-sadm', email: 'sadm@px.com' }]]),
      adminUsers: new Map([['usr-sadm', { user_id: 'usr-sadm', role: 'SUPER_ADMIN', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-sadmin', 'teste');
    assert.equal(result.authenticated, true);
    assert.equal(result.role, 'SUPER_ADMIN');
  });

  await runTestCase('5.4 CHECKIN_OPERATOR ativo em profiles (fallback) deve ser autorizado com sucesso', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-prof-op', { id: 'usr-p-op', email: 'prof-op@px.com' }]]),
      adminUsers: new Map(),
      profiles: new Map([['usr-p-op', { id: 'usr-p-op', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const result = await verifyOperatorAuthorization(client, 'Bearer tok-prof-op', 'teste');
    assert.equal(result.authenticated, true);
    assert.equal(result.role, 'CHECKIN_OPERATOR');
  });

  // ---------------------------------------------------------------------------
  // 6. PROJEÇÃO MÍNIMA E CONSULTA DO HISTÓRICO DE CHECK-INS
  // ---------------------------------------------------------------------------
  console.log('\n6. Projeção Mínima na Consulta de Histórico de Check-ins (GET /api/checkins):');

  await runTestCase('6.1 Consulta deve selecionar explicitamente apenas as 7 colunas canônicas (sem select *)', async () => {
    const sampleRecord = {
      id: 'chk-001',
      ticket_id: 'tkt-001',
      event_id: 'evt-001',
      checked_by: 'usr-op',
      checked_at: new Date().toISOString(),
      device_info: JSON.stringify({ ticket_code: 'PX-123' }),
      created_at: new Date().toISOString(),
      internal_debug_secret: 'CRITICAL_SECRET_SHOULD_NEVER_BE_SELECTED',
    };

    const db: MockDbState = {
      authTokens: new Map([['tok-valid', { id: 'usr-op', email: 'op@px.com' }]]),
      adminUsers: new Map([['usr-op', { user_id: 'usr-op', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [sampleRecord],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    // Executa simulação manual da rota GET /api/checkins
    let responseStatus = 0;
    let responseJson: any = null;

    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid' },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    // Invocação direta da camada de middleware / rota
    const routes = (app as any)._router.stack;
    const checkinRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkins' && r.route.methods.get);
    assert.ok(checkinRoute, 'Rota GET /api/checkins não encontrada no Express app');

    await checkinRoute.route.stack[0].handle(mockReq, mockRes);

    // Asserção A: A consulta executada no cliente Supabase usou as colunas exatas
    assert.equal(
      db.spy.lastCheckinsSelectCols,
      CHECKIN_HISTORY_COLUMNS_SQL,
      `Projeção SQL incorreta! Esperado: "${CHECKIN_HISTORY_COLUMNS_SQL}", Recebido: "${db.spy.lastCheckinsSelectCols}"`
    );
    assert.notEqual(db.spy.lastCheckinsSelectCols, '*', 'VULNERABILIDADE: A rota utilizou select("*") em vez de projeção explícita!');

    // Asserção B: O objeto retornado possui apenas as colunas autorizadas
    assert.equal(Array.isArray(responseJson), true);
    assert.equal(responseJson.length, 1);
    const returnedItem = responseJson[0];

    for (const allowedCol of CHECKIN_HISTORY_COLUMNS) {
      assert.ok(allowedCol in returnedItem, `Coluna permitida "${allowedCol}" ausente no retorno`);
    }

    assert.equal(
      returnedItem.internal_debug_secret,
      undefined,
      'VULNERABILIDADE: Coluna não autorizada vazou na resposta JSON!'
    );
  });

  await runTestCase('6.2 Falha na consulta de checkins deve retornar HTTP 500 sem vazar detalhes internos', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-valid', { id: 'usr-op', email: 'op@px.com' }]]),
      adminUsers: new Map([['usr-op', { user_id: 'usr-op', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {
        checkins: { message: 'FATAL: disk full on /var/lib/postgresql/data (credentials: secret_db_pass)' },
      },
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseStatus = 0;
    let responseJson: any = null;

    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid' },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const checkinRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkins' && r.route.methods.get);
    await checkinRoute.route.stack[0].handle(mockReq, mockRes);

    assert.equal(responseStatus, 500);
    assert.equal(
      responseJson?.error,
      'Falha ao consultar histórico de check-ins no banco de homologação.',
      'Mensagem amigável de erro sanitizada esperada'
    );
    assert.equal(
      JSON.stringify(responseJson).includes('secret_db_pass'),
      false,
      'VAZAMENTO DE SEGURANÇA: Detalhes internos do banco vazaram no erro HTTP!'
    );
  });

  // ---------------------------------------------------------------------------
  // 7. VALIDAÇÃO DE CHECK-IN EM PORTARIA (POST /api/checkin/validate)
  // ---------------------------------------------------------------------------
  console.log('\n7. Validação de Check-in em Portaria (POST /api/checkin/validate):');

  await runTestCase('7.1 Ingresso PAID válido validado com sucesso via POST /api/checkin/validate', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-valid-op', { id: 'usr-op1', email: 'op1@px.com' }]]),
      adminUsers: new Map([['usr-op1', { user_id: 'usr-op1', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
      rpcHandlers: {
        fn_validate_and_checkin_ticket: async (args: any) => {
          assert.equal(args.p_ticket_code, 'PX-PAID-001');
          assert.equal(args.p_operator_id, 'usr-op1');
          return {
            data: {
              authorized: true,
              reason: 'CHECK-IN AUTORIZADO',
              details: 'Acesso liberado com sucesso.',
              ticket: { id: 'tkt-001', code: 'PX-PAID-001', status: 'USED' },
            },
            error: null,
          };
        },
      },
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseStatus = 0;
    let responseJson: any = null;

    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid-op' },
      body: { code: 'PX-PAID-001', operatorName: 'Operador Teste' },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const validateRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkin/validate' && r.route.methods.post);
    assert.ok(validateRoute, 'Rota POST /api/checkin/validate não encontrada');

    await validateRoute.route.stack[0].handle(mockReq, mockRes);
    assert.equal(responseJson.authorized, true);
    assert.equal(responseJson.reason, 'CHECK-IN AUTORIZADO');
  });

  await runTestCase('7.2 Ingresso já utilizado rejeitado com "INGRESSO JÁ UTILIZADO"', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-valid-op', { id: 'usr-op1', email: 'op1@px.com' }]]),
      adminUsers: new Map([['usr-op1', { user_id: 'usr-op1', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
      rpcHandlers: {
        fn_validate_and_checkin_ticket: async () => ({
          data: {
            authorized: false,
            reason: 'INGRESSO JÁ UTILIZADO',
            details: 'Entrada duplicada proibida.',
          },
          error: null,
        }),
      },
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseJson: any = null;
    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid-op' },
      body: { code: 'PX-USED-001' },
    };
    const mockRes: any = {
      status: (_code: number) => mockRes,
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const validateRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkin/validate' && r.route.methods.post);
    await validateRoute.route.stack[0].handle(mockReq, mockRes);
    assert.equal(responseJson.authorized, false);
    assert.equal(responseJson.reason, 'INGRESSO JÁ UTILIZADO');
  });

  await runTestCase('7.3 Ingresso não encontrado rejeitado com "INGRESSO NÃO ENCONTRADO"', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-valid-op', { id: 'usr-op1', email: 'op1@px.com' }]]),
      adminUsers: new Map([['usr-op1', { user_id: 'usr-op1', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
      rpcHandlers: {
        fn_validate_and_checkin_ticket: async () => ({
          data: {
            authorized: false,
            reason: 'INGRESSO NÃO ENCONTRADO',
            details: 'Código de ingresso não localizado.',
          },
          error: null,
        }),
      },
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseJson: any = null;
    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid-op' },
      body: { code: 'PX-NONEXISTENT' },
    };
    const mockRes: any = {
      status: (_code: number) => mockRes,
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const validateRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkin/validate' && r.route.methods.post);
    await validateRoute.route.stack[0].handle(mockReq, mockRes);
    assert.equal(responseJson.authorized, false);
    assert.equal(responseJson.reason, 'INGRESSO NÃO ENCONTRADO');
  });

  await runTestCase('7.4 Ingresso pendente rejeitado com "PAGAMENTO PENDENTE"', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-valid-op', { id: 'usr-op1', email: 'op1@px.com' }]]),
      adminUsers: new Map([['usr-op1', { user_id: 'usr-op1', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
      rpcHandlers: {
        fn_validate_and_checkin_ticket: async () => ({
          data: {
            authorized: false,
            reason: 'PAGAMENTO PENDENTE',
            details: 'Pagamento não confirmado.',
          },
          error: null,
        }),
      },
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseJson: any = null;
    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid-op' },
      body: { code: 'PX-PENDING-001' },
    };
    const mockRes: any = {
      status: (_code: number) => mockRes,
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const validateRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkin/validate' && r.route.methods.post);
    await validateRoute.route.stack[0].handle(mockReq, mockRes);
    assert.equal(responseJson.authorized, false);
    assert.equal(responseJson.reason, 'PAGAMENTO PENDENTE');
  });

  await runTestCase('7.5 Código ausente ou inválido deve retornar HTTP 400', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-valid-op', { id: 'usr-op1', email: 'op1@px.com' }]]),
      adminUsers: new Map([['usr-op1', { user_id: 'usr-op1', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseStatus = 0;
    let responseJson: any = null;
    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid-op' },
      body: { code: '' },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const validateRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkin/validate' && r.route.methods.post);
    await validateRoute.route.stack[0].handle(mockReq, mockRes);
    assert.equal(responseStatus, 400);
    assert.equal(responseJson.authorized, false);
    assert.equal(responseJson.reason, 'CÓDIGO INVÁLIDO');
  });

  await runTestCase('7.6 Falha na execução da RPC no Supabase deve retornar HTTP 503 sanitizado', async () => {
    const db: MockDbState = {
      authTokens: new Map([['tok-valid-op', { id: 'usr-op1', email: 'op1@px.com' }]]),
      adminUsers: new Map([['usr-op1', { user_id: 'usr-op1', role: 'CHECKIN_OPERATOR', is_active: true }]]),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
      rpcHandlers: {
        fn_validate_and_checkin_ticket: async () => ({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      },
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseStatus = 0;
    let responseJson: any = null;
    const mockReq: any = {
      headers: { authorization: 'Bearer tok-valid-op' },
      body: { code: 'PX-VALID-001' },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const validateRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkin/validate' && r.route.methods.post);
    await validateRoute.route.stack[0].handle(mockReq, mockRes);
    assert.equal(responseStatus, 503);
    assert.equal(responseJson.authorized, false);
    assert.equal(responseJson.reason, 'SERVIÇO TRANSACIONAL INDISPONÍVEL');
  });

  await runTestCase('7.7 Chamada sem autenticação de operador deve retornar HTTP 401', async () => {
    const db: MockDbState = {
      authTokens: new Map(),
      adminUsers: new Map(),
      profiles: new Map(),
      checkins: [],
      errors: {},
      spy: {},
    };
    const client = createMockSupabaseClient(db);
    const app = createStagingApp(client, 3001, 'staging-unit-test');

    let responseStatus = 0;
    let responseJson: any = null;
    const mockReq: any = {
      headers: {},
      body: { code: 'PX-VALID-001' },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    const routes = (app as any)._router.stack;
    const validateRoute = routes.find((r: any) => r.route && r.route.path === '/api/checkin/validate' && r.route.methods.post);
    await validateRoute.route.stack[0].handle(mockReq, mockRes);
    assert.equal(responseStatus, 401);
    assert.equal(responseJson.authorized, false);
    assert.equal(responseJson.reason, 'NÃO AUTORIZADO');
  });

  console.log('\n=============================================================================');
  console.log(`SUCESSO TOTAL: ${passedTests} de ${totalTests} testes unitários APROVADOS!`);
  console.log('Todas as regras de autorização, precedência e projeção mínima foram validadas.');
  console.log('=============================================================================');
}

runAllTests().catch((err) => {
  console.error('\n[FALHA NA SUÍTE DE TESTES UNITÁRIOS DE AUTORIZAÇÃO]');
  console.error(err.message || err);
  process.exit(1);
});
