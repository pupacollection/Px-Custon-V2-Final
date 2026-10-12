import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// PX CUSTOM — TESTE UNITÁRIO ESTÁTICO DO SQL DE HOMOLOGAÇÃO (v6.32)
// Escopo: Auditoria estática de sintaxe, blocos transacionais, isolamento e enums
// =============================================================================

console.log('=============================================================================');
console.log('PX CUSTOM — AUDITORIA ESTÁTICA LOCAL DO SQL DE HOMOLOGAÇÃO (v6.32)');
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

const v632Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-32.sql');
const v631Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-31.sql');
const prodCanonPath = path.resolve(process.cwd(), 'supabase-checkin-transacional.sql');

runTestCase('1.1 Arquivo supabase-homologacao-checkin-v6-32.sql deve existir e não estar vazio', () => {
  assert.ok(fs.existsSync(v632Path), 'v6-32.sql não encontrado');
  const stat = fs.statSync(v632Path);
  assert.ok(stat.size > 10000, 'Tamanho do arquivo v6-32.sql é inesperadamente pequeno');
});

const sqlContent = fs.readFileSync(v632Path, 'utf8');

runTestCase('1.2 Arquivo canônico de produção e v6.31 devem estar preservados', () => {
  assert.ok(fs.existsSync(prodCanonPath), 'Arquivo canônico de produção não encontrado');
  assert.ok(fs.existsSync(v631Path), 'Arquivo v6.31 não encontrado');
  const prodContent = fs.readFileSync(prodCanonPath, 'utf8');
  assert.ok(prodContent.includes('fn_validate_and_checkin_ticket'), 'Conteúdo do canônico corrompido');
});

runTestCase('2.1 Nenhum comando ALTER TYPE ... ADD VALUE pode residir dentro de blocos DO $$', () => {
  // Regex para capturar todos os blocos DO $$ ... END $$
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

runTestCase('3.1 Parte 1 deve conter validações pré-voo anti-duplicação e códigos vazios', () => {
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
});

runTestCase('3.2 Parte 1 deve validar tipos de colunas em tickets, profiles, admin_users e checkins', () => {
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM TICKET_CODE]'), 'Falta checagem de tipo em ticket_code');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM TICKETS.ID]'), 'Falta checagem de tipo em tickets.id');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM TICKETS.EVENT_ID]'), 'Falta checagem de tipo em tickets.event_id');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM TICKETS.STATUS]'), 'Falta checagem de tipo em tickets.status');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM PROFILES.ID]'), 'Falta checagem de tipo em profiles.id');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM PROFILES.IS_ACTIVE]'), 'Falta checagem de tipo em profiles.is_active');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM ADMIN_USERS.USER_ID]'), 'Falta checagem de tipo em admin_users.user_id');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM ADMIN_USERS.IS_ACTIVE]'), 'Falta checagem de tipo em admin_users.is_active');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM CHECKINS.TICKET_ID]'), 'Falta checagem de tipo em checkins.ticket_id');
  assert.ok(sqlContent.includes('[BLOQUEIO DE SCHEMA: TIPO INCOMPATÍVEL EM CHECKINS.EVENT_ID]'), 'Falta checagem de tipo em checkins.event_id');
});

runTestCase('4.1 Índice funcional único case-insensitive deve ser criado para tickets(ticket_code)', () => {
  assert.ok(
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_tickets_upper_ticket_code\s+ON\s+public\.tickets\s*\(\s*UPPER\s*\(\s*TRIM\s*\(\s*ticket_code\s*\)\s*\)\s*\)/i.test(sqlContent),
    'Índice funcional único com UPPER(TRIM(ticket_code)) não encontrado'
  );
});

runTestCase('5.1 RPC deve possuir SECURITY DEFINER e SET search_path = public', () => {
  assert.ok(sqlContent.includes('SECURITY DEFINER'), 'Falta SECURITY DEFINER na RPC');
  assert.ok(sqlContent.includes('SET search_path = public'), 'Falta SET search_path = public na RPC');
});

runTestCase('5.2 RPC deve implementar bloqueio pessimista FOR UPDATE', () => {
  assert.ok(
    /SELECT\s+\*\s+INTO\s+v_ticket\s+FROM\s+public\.tickets\s+WHERE\s+UPPER\(TRIM\(ticket_code\)\)\s*=\s*v_clean_code\s+FOR\s+UPDATE/i.test(sqlContent),
    'Bloqueio FOR UPDATE não encontrado ou com cláusula incorreta'
  );
});

runTestCase('5.3 RPC deve aplicar precedência estrita: admin_users sobre profiles', () => {
  // admin_users deve vir antes da checagem de profiles
  const adminUsersIndex = sqlContent.indexOf('FROM public.admin_users');
  const profilesIndex = sqlContent.indexOf('FROM public.profiles');
  assert.ok(adminUsersIndex > 0, 'Consulta a admin_users não encontrada na RPC');
  assert.ok(profilesIndex > adminUsersIndex, 'Consulta a admin_users deve preceder consulta a profiles na RPC');
  assert.ok(
    sqlContent.includes('Precedência estrita: proíbe contorno via profiles ativo'),
    'Comentário e lógica de precedência estrita ausentes'
  );
});

runTestCase('5.4 RPC deve restringir privilégios (REVOKE de PUBLIC/anon/authenticated e GRANT exclusivo para service_role)', () => {
  assert.ok(
    /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_validate_and_checkin_ticket[\s\S]*?FROM\s+PUBLIC,\s*anon,\s*authenticated/i.test(sqlContent),
    'Falta REVOKE de anon, authenticated e PUBLIC'
  );
  assert.ok(
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_validate_and_checkin_ticket[\s\S]*?TO\s+service_role/i.test(sqlContent),
    'Falta GRANT para service_role'
  );
});

runTestCase('6.1 Salvaguardas multifatoriais contra perda de dados reais devem estar presentes', () => {
  assert.ok(
    sqlContent.includes('[BLOQUEIO DE SEGURANÇA: DADOS NÃO SINTÉTICOS DETECTADOS]'),
    'Falta salvaguarda anti-dados reais na tabela tickets'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO DE SEGURANÇA: EVENTOS NÃO HOMOLOGADOS DETECTADOS]'),
    'Falta salvaguarda anti-eventos reais na tabela events'
  );
  assert.ok(
    !/DROP\s+TABLE\s+public\.(tickets|events|profiles|admin_users)/i.test(sqlContent),
    'Proibido DROP TABLE destrutivo no script de homologação'
  );
  assert.ok(
    !/DROP\s+DATABASE/i.test(sqlContent),
    'Proibido DROP DATABASE no script de homologação'
  );
});

runTestCase('7.1 Bateria de asserções unitárias SQL deve conter os 9 casos de teste especificados', () => {
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
  assert.ok(
    sqlContent.includes('PX-STAGING-CONCURRENT-001'),
    'Ingresso concorrente PX-STAGING-CONCURRENT-001 deve ser preservado para testes'
  );
});

console.log('=============================================================================');
console.log(`SUCESSO TOTAL: ${passCount} de ${totalCount} asserções estáticas APROVADAS!`);
console.log('=============================================================================');
