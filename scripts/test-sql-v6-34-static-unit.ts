import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// PX CUSTOM — TESTE UNITÁRIO ESTÁTICO DO SQL DE HOMOLOGAÇÃO (v6.34)
// Escopo: Auditoria estática de sintaxe, eliminação de DELETEs, proteção anti-colisão,
//         bloqueios fail-safe de registros não-sintéticos, updates condicionados,
//         blocos transacionais, isolamento de dados e enums
// =============================================================================

console.log('=============================================================================');
console.log('PX CUSTOM — AUDITORIA ESTÁTICA LOCAL DO SQL DE HOMOLOGAÇÃO (v6.34)');
console.log('=============================================================================');

let passCount = 0;
let totalCount = 0;

function runTestCase(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    passCount++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: unknown) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

const v634Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-34.sql');
const v634BakPath = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-34.sql.bak');
const v633Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-33.sql');
const v632Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-32.sql');
const v631Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-31.sql');
const prodCanonPath = path.resolve(process.cwd(), 'supabase-checkin-transacional.sql');

runTestCase('1.1 Arquivo supabase-homologacao-checkin-v6-34.sql e seu backup devem existir e não estar vazios', () => {
  assert.ok(fs.existsSync(v634Path), 'v6-34.sql não encontrado');
  assert.ok(fs.existsSync(v634BakPath), 'v6-34.sql.bak (cópia de segurança) não encontrado');
  const stat = fs.statSync(v634Path);
  assert.ok(stat.size > 10000, 'Tamanho do arquivo v6-34.sql é inesperadamente pequeno');
});

const sqlContent = fs.readFileSync(v634Path, 'utf8');

runTestCase('1.2 Arquivo canônico de produção, v6.31, v6.32 e v6.33 devem estar estritamente preservados', () => {
  assert.ok(fs.existsSync(prodCanonPath), 'Arquivo canônico de produção não encontrado');
  assert.ok(fs.existsSync(v631Path), 'Arquivo v6.31 não encontrado');
  assert.ok(fs.existsSync(v632Path), 'Arquivo v6.32 não encontrado');
  assert.ok(fs.existsSync(v633Path), 'Arquivo v6.33 não encontrado');
  const prodContent = fs.readFileSync(prodCanonPath, 'utf8');
  assert.ok(prodContent.includes('fn_validate_and_checkin_ticket'), 'Conteúdo do canônico corrompido');
});

runTestCase('2.1 Nenhum comando ALTER TYPE ... ADD VALUE pode residir dentro de blocos DO $$', () => {
  const doBlocks = sqlContent.match(/DO\s*\$\$(?:[\s\S]*?)\$\$;/g) || [];
  assert.ok(doBlocks.length >= 3, 'Esperava-se pelo menos 3 blocos procedurais DO $$');

  for (let i = 0; i < doBlocks.length; i++) {
    const block = doBlocks[i];
    const hasAlterTypeInside = /ALTER\s+TYPE\s+[\s\S]*?ADD\s+VALUE/i.test(block);
    assert.strictEqual(
      hasAlterTypeInside,
      false,
      `Bloco DO $$ #${i + 1} contém comando ilegal 'ALTER TYPE ... ADD VALUE' dentro do bloco procedural`
    );
  }
});

runTestCase('2.2 Instruções ALTER TYPE ... ADD VALUE devem estar no nível superior (Parte 0)', () => {
  const alterMatches = sqlContent.match(/ALTER\s+TYPE\s+public\.(user_role|ticket_status)\s+ADD\s+VALUE\s+IF\s+NOT\s+EXISTS/gi) || [];
  assert.ok(alterMatches.length >= 11, `Esperava-se pelo menos 11 instruções ALTER TYPE, encontrado: ${alterMatches.length}`);
});

runTestCase('3.1 Parte 1 deve conter validações pré-voo de compatibilidade de schema', () => {
  assert.ok(
    sqlContent.includes('[BLOQUEIO DE SCHEMA: CÓDIGOS NULOS OU VAZIOS EM TICKET_CODE]'),
    'Falta validação de códigos nulos ou vazios em tickets'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO DE SCHEMA: DUPLICIDADE EM TICKET_CODE]'),
    'Falta validação de duplicidade case-insensitive em tickets'
  );
  assert.ok(
    sqlContent.includes('UPPER(TRIM(ticket_code))'),
    'Falta normalização UPPER(TRIM(ticket_code)) na checagem de duplicidade'
  );
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM TICKET_CODE]'), 'Falta checagem de tipo em ticket_code');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM TICKETS.ID]'), 'Falta checagem de tipo em tickets.id');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM PROFILES.ID]'), 'Falta checagem de tipo em profiles.id');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM ADMIN_USERS.USER_ID]'), 'Falta checagem de tipo em admin_users.user_id');
});

runTestCase('4.1 Índices para tickets devem estar presentes (case-insensitive e unique nativo)', () => {
  assert.ok(
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_tickets_upper_ticket_code\s+ON\s+public\.tickets\s*\(\s*UPPER\s*\(\s*TRIM\s*\(\s*ticket_code\s*\)\s*\)\s*\)/i.test(sqlContent),
    'Índice funcional único com UPPER(TRIM(ticket_code)) não encontrado'
  );
  assert.ok(
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_tickets_ticket_code_unique\s+ON\s+public\.tickets\s*\(\s*ticket_code\s*\)/i.test(sqlContent),
    'Índice único direto em tickets(ticket_code) não encontrado'
  );
});

runTestCase('5.1 RPC deve possuir SECURITY DEFINER, SET search_path = public e bloqueio FOR UPDATE', () => {
  assert.ok(sqlContent.includes('SECURITY DEFINER'), 'Falta SECURITY DEFINER na RPC');
  assert.ok(sqlContent.includes('SET search_path = public'), 'Falta SET search_path = public na RPC');
  assert.ok(
    /SELECT\s+\*\s+INTO\s+v_ticket\s+FROM\s+public\.tickets\s+WHERE\s+UPPER\(TRIM\(ticket_code\)\)\s*=\s*v_clean_code\s+FOR\s+UPDATE/i.test(sqlContent),
    'Bloqueio FOR UPDATE não encontrado'
  );
  const adminUsersIndex = sqlContent.indexOf('FROM public.admin_users');
  const profilesIndex = sqlContent.indexOf('FROM public.profiles');
  assert.ok(adminUsersIndex > 0 && profilesIndex > adminUsersIndex, 'Precedência estrita admin_users > profiles deve ser mantida');
});

runTestCase('6.1 Eliminação total de comandos DELETE / DROP automáticos no script', () => {
  const hasDeleteCommand = /DELETE\s+FROM/i.test(sqlContent);
  assert.strictEqual(hasDeleteCommand, false, 'O script v6.34 contém comandos DELETE FROM');
  assert.ok(!/DROP\s+TABLE/i.test(sqlContent), 'Proibido DROP TABLE no script de homologação');
  assert.ok(!/DROP\s+DATABASE/i.test(sqlContent), 'Proibido DROP DATABASE no script de homologação');
});

runTestCase('7.1 TAREFA ETAPA 6.61: Validações Pré-Execução Anti-Colisão (Fail-Safe) na Parte 4', () => {
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: PERFIL NÃO SINTÉTICO]'),
    'Falta validação de perfis não sintéticos ocupando UUIDs de staging'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: E-MAIL SINTÉTICO EM OUTRO ID]'),
    'Falta validação de e-mails sintéticos em outros UUIDs'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: EVENTO NÃO SINTÉTICO]'),
    'Falta validação de evento colidindo com evento real'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: SLUG DE EVENTO EM OUTRO ID]'),
    'Falta validação de slug em outro ID'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: LOTE NÃO SINTÉTICO]'),
    'Falta validação de lote não sintético'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: INGRESSO COLIDINDO COM DADOS REAIS]'),
    'Falta validação de ingressos sintéticos colidindo com dados reais'
  );
});

runTestCase('7.2 TAREFA ETAPA 6.61: Cláusulas ON CONFLICT com WHERE estrito e proteção contra sobrescrita cega', () => {
  // Profiles
  assert.ok(
    /WHERE\s+public\.profiles\.email\s+LIKE\s+'%@pxcustom\.local'/i.test(sqlContent),
    'Cláusula WHERE restritiva para profiles.email ausente no ON CONFLICT DO UPDATE'
  );
  // Events
  assert.ok(
    /WHERE\s+public\.events\.slug\s*=\s*'px-track-staging-2026'/i.test(sqlContent),
    'Cláusula WHERE restritiva para events.slug ausente no ON CONFLICT DO UPDATE'
  );
  // Ticket types
  assert.ok(
    /WHERE\s+public\.ticket_types\.event_id\s*=\s*v_event_id/i.test(sqlContent),
    'Cláusula WHERE restritiva para ticket_types.event_id ausente no ON CONFLICT DO UPDATE'
  );
  // Tickets
  assert.ok(
    /WHERE\s+public\.tickets\.ticket_code\s+LIKE\s+'PX-STAGING-%'\s+AND\s+public\.tickets\.event_id\s*=\s*v_event_id/i.test(sqlContent),
    'Cláusula WHERE restritiva para tickets ausente no ON CONFLICT DO UPDATE'
  );
});

runTestCase('8.1 Bateria de asserções unitárias SQL deve conter os 9 casos de teste especificados', () => {
  assert.ok(sqlContent.includes('[TESTE 1 APROVADO]'), 'Falta Teste 1 (ADMIN ativo)');
  assert.ok(sqlContent.includes('[TESTE 1.1 APROVADO]'), 'Falta Teste 1.1 (efeito colateral)');
  assert.ok(sqlContent.includes('[TESTE 2 APROVADO]'), 'Falta Teste 2 (anti-duplicidade)');
  assert.ok(sqlContent.includes('[TESTE 3 APROVADO]'), 'Falta Teste 3 (usuário comum)');
  assert.ok(sqlContent.includes('[TESTE 4 APROVADO]'), 'Falta Teste 4 (operador inativo)');
  assert.ok(sqlContent.includes('[TESTE 5 APROVADO]'), 'Falta Teste 5 (precedência estrita)');
  assert.ok(sqlContent.includes('[TESTE 6 APROVADO]'), 'Falta Teste 6 (pagamento pendente)');
  assert.ok(sqlContent.includes('[TESTE 7 APROVADO]'), 'Falta Teste 7 (ingresso cancelado)');
  assert.ok(sqlContent.includes('[TESTE 8 APROVADO]'), 'Falta Teste 8 (código inexistente)');
  assert.ok(sqlContent.includes('[TESTE 9 APROVADO]'), 'Falta Teste 9 (operador nulo)');
  assert.ok(sqlContent.includes('PX-STAGING-CONCURRENT-001'), 'Ingresso concorrente PX-STAGING-CONCURRENT-001 ausente');
});

console.log('=============================================================================');
console.log(`SUCESSO TOTAL: ${passCount} de ${totalCount} asserções estáticas APROVADAS!`);
console.log('=============================================================================');
