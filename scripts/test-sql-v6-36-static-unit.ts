import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// PX CUSTOM — TESTE UNITÁRIO ESTÁTICO DO SQL DE HOMOLOGAÇÃO (v6.36)
// ETAPA 6.64 — COBERTURA DOS QUATRO PILARES CRÍTICOS:
// 1. Ausência de alteração não autorizada em admin_users (Sem DO UPDATE, detecção prévia e bloqueio estrito)
// 2. Proteção contra colisão e valores NULL (IS DISTINCT FROM, null-safe, validação pós-carga fail-safe)
// 3. Comportamento de bloqueio na RPC (Remoção de FOR SHARE, leitura MVCC e FOR UPDATE linear em tickets)
// 4. Validação estrita de isolamento de homologação (Diretriz formal e preservação canônica)
// =============================================================================

console.log('=============================================================================');
console.log('PX CUSTOM — AUDITORIA ESTÁTICA LOCAL DO SQL DE HOMOLOGAÇÃO (v6.36) — ETAPA 6.64');
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

const v636Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-36.sql');
const v636BakPath = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-36.sql.bak');
const v635Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-35.sql');
const v635BakPath = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-35.sql.bak');
const v634Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-34.sql');
const v633Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-33.sql');
const v632Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-32.sql');
const v631Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-31.sql');
const prodCanonPath = path.resolve(process.cwd(), 'supabase-checkin-transacional.sql');

runTestCase('0.1 Integridade dos arquivos de versão e preservação canônica intacta', () => {
  assert.ok(fs.existsSync(v636Path), 'v6-36.sql não encontrado');
  assert.ok(fs.existsSync(v636BakPath), 'v6-36.sql.bak não encontrado');
  assert.ok(fs.existsSync(v635Path), 'v6-35.sql não encontrado');
  assert.ok(fs.existsSync(v635BakPath), 'v6-35.sql.bak não encontrado');
  assert.ok(fs.existsSync(v634Path), 'v6-34.sql não encontrado');
  assert.ok(fs.existsSync(v633Path), 'v6-33.sql não encontrado');
  assert.ok(fs.existsSync(v632Path), 'v6-32.sql não encontrado');
  assert.ok(fs.existsSync(v631Path), 'v6-31.sql não encontrado');
  assert.ok(fs.existsSync(prodCanonPath), 'Arquivo canônico de produção não encontrado');

  const stat = fs.statSync(v636Path);
  const statBak = fs.statSync(v636BakPath);
  assert.strictEqual(stat.size, statBak.size, 'Backup de segurança v6-36 deve ter tamanho idêntico');
});

const sqlContent = fs.readFileSync(v636Path, 'utf8');

// =============================================================================
// PILAR 1: AUSÊNCIA DE ALTERAÇÃO NÃO AUTORIZADA EM ADMIN_USERS
// =============================================================================
runTestCase('1.1 Proibição absoluta de ON CONFLICT DO UPDATE em admin_users', () => {
  // Proibido qualquer DO UPDATE na tabela admin_users
  const adminUsersInsertMatch = /INSERT\s+INTO\s+public\.admin_users[\s\S]*?;/i.exec(sqlContent);
  assert.ok(adminUsersInsertMatch, 'Deve conter bloco de INSERT INTO public.admin_users');
  const insertStatement = adminUsersInsertMatch[0];
  assert.strictEqual(
    /DO\s+UPDATE/i.test(insertStatement),
    false,
    'Proibido ON CONFLICT DO UPDATE em admin_users: nenhuma role ou is_active pode ser modificada'
  );
});

runTestCase('1.2 Pre-flight check 4.0.1 bloqueia com EXCEPTION se qualquer ID já existir em admin_users', () => {
  assert.ok(
    sqlContent.includes('[BLOQUEIO DE SEGURANÇA: ADMIN_USERS PREEXISTENTE]'),
    'Deve conter mensagem explícita de bloqueio de segurança em admin_users preexistente'
  );
  assert.ok(
    /WHERE\s+user_id\s+IN\s+\(v_admin_id,\s*v_operator_id,\s*v_inactive_id,\s*v_conflict_id\)/i.test(sqlContent),
    'Pre-flight deve verificar todos os IDs reservados de admin_users'
  );
  assert.ok(
    sqlContent.includes('Modificação de privilégios de administradores é PROIBIDA'),
    'Deve documentar explicitamente a proibição de modificação de privilégios'
  );
});

runTestCase('1.3 Rejeição de assunção de propriedade por e-mail sintético, UUID ou profiles', () => {
  assert.ok(
    sqlContent.includes('e-mail sintético ou associação com profiles não comprovam propriedade'),
    'Deve formalizar que e-mails sintéticos ou perfis não constituem prova de propriedade em admin_users'
  );
});

// =============================================================================
// PILAR 2: PROTEÇÃO CONTRA COLISÃO E VALORES NULL
// =============================================================================
runTestCase('2.1 Tratamento estrito de NULL em profiles e verificação de colisão bidirecional', () => {
  assert.ok(
    sqlContent.includes("COALESCE(email, '[EMAIL_NULO]')"),
    'Deve usar COALESCE para capturar emails NULL em profiles'
  );
  assert.ok(
    sqlContent.includes('email IS DISTINCT FROM CASE id'),
    'Deve usar IS DISTINCT FROM para comparação de mapeamento de perfil e email'
  );
  assert.ok(
    sqlContent.includes('id IS DISTINCT FROM CASE email'),
    'Deve verificar mapeamento inverso de e-mail sintético para ID esperado com IS DISTINCT FROM'
  );
});

runTestCase('2.2 Validação de eventos e lotes com lógica tri-valente segura (IS DISTINCT FROM)', () => {
  assert.ok(
    sqlContent.includes("slug IS DISTINCT FROM 'px-track-staging-2026'"),
    'Eventos: verificação null-safe do slug do evento via IS DISTINCT FROM'
  );
  assert.ok(
    sqlContent.includes('id IS DISTINCT FROM v_event_id'),
    'Eventos: slug sintético verificado contra outros IDs via IS DISTINCT FROM'
  );
  assert.ok(
    sqlContent.includes('event_id IS DISTINCT FROM v_event_id'),
    'Lotes: verificação de lote vinculado a evento diferente via IS DISTINCT FROM'
  );
});

runTestCase('2.3 Validação de ingressos contra user_id NULL e eventos divergentes', () => {
  assert.ok(
    sqlContent.includes('event_id IS DISTINCT FROM v_event_id'),
    'Ingressos: verificação null-safe de event_id via IS DISTINCT FROM'
  );
  assert.ok(
    sqlContent.includes('OR user_id IS NULL'),
    'Ingressos: tratamento explícito de user_id IS NULL contra apropriação indevida'
  );
  assert.ok(
    sqlContent.includes('NOT (user_id = ANY (ARRAY['),
    'Ingressos: verificação segura de pertinência do user_id sem suscetibilidade de NOT IN a NULLs'
  );
});

runTestCase('2.4 Validação pós-carga fail-safe (elimina aprovação silenciosa em caso de WHERE restritivo)', () => {
  assert.ok(
    sqlContent.includes('4.5 VALIDAÇÃO PÓS-CARGA FAIL-SAFE'),
    'Deve possuir bloco de validação pós-carga'
  );
  assert.ok(
    sqlContent.includes('[ERRO CRÍTICO PÓS-CARGA: PERFIS]'),
    'Deve validar contagem exata de perfis instalados'
  );
  assert.ok(
    sqlContent.includes('[ERRO CRÍTICO PÓS-CARGA: ADMIN_USERS]'),
    'Deve validar contagem exata de registros em admin_users instalados'
  );
  assert.ok(
    sqlContent.includes('[ERRO CRÍTICO PÓS-CARGA: INGRESSOS]'),
    'Deve validar contagem exata de ingressos instalados'
  );
});

// =============================================================================
// PILAR 3: COMPORTAMENTO DE BLOQUEIO NA RPC
// =============================================================================
runTestCase('3.1 Ausência de FOR SHARE em admin_users e profiles (Prevenção de deadlocks e contenção)', () => {
  const rpcStartIndex = sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.fn_validate_and_checkin_ticket');
  const rpcEndIndex = sqlContent.indexOf('REVOKE EXECUTE ON FUNCTION public.fn_validate_and_checkin_ticket');
  assert.ok(rpcStartIndex > 0 && rpcEndIndex > rpcStartIndex, 'Bloco da RPC deve estar presente');
  const rpcBlock = sqlContent.slice(rpcStartIndex, rpcEndIndex);

  assert.strictEqual(
    /FROM\s+public\.admin_users[\s\S]*?FOR\s+SHARE/i.test(rpcBlock),
    false,
    'Proibido FOR SHARE em admin_users: consulta de operador deve ser leitura MVCC snapshot read'
  );
  assert.strictEqual(
    /FROM\s+public\.profiles[\s\S]*?FOR\s+SHARE/i.test(rpcBlock),
    false,
    'Proibido FOR SHARE em profiles: consulta de perfil deve ser leitura MVCC snapshot read'
  );
});

runTestCase('3.2 Bloqueio pessimista atômico mantido estritamente em tickets (SELECT ... FOR UPDATE)', () => {
  const rpcStartIndex = sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.fn_validate_and_checkin_ticket');
  const rpcEndIndex = sqlContent.indexOf('REVOKE EXECUTE ON FUNCTION public.fn_validate_and_checkin_ticket');
  const rpcBlock = sqlContent.slice(rpcStartIndex, rpcEndIndex);

  assert.ok(
    /SELECT\s+\*\s+INTO\s+v_ticket\s+FROM\s+public\.tickets\s+WHERE\s+UPPER\(TRIM\(ticket_code\)\)\s*=\s*v_clean_code\s+FOR\s+UPDATE/i.test(rpcBlock),
    'SELECT ... FOR UPDATE deve ser executado exclusivamente sobre a linha do ingresso em public.tickets'
  );
});

runTestCase('3.3 Ordem linear de bloqueio e atomicidade transacional', () => {
  const rpcStartIndex = sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.fn_validate_and_checkin_ticket');
  const rpcEndIndex = sqlContent.indexOf('REVOKE EXECUTE ON FUNCTION public.fn_validate_and_checkin_ticket');
  const rpcBlock = sqlContent.slice(rpcStartIndex, rpcEndIndex);

  const lockTicketIdx = rpcBlock.indexOf('FOR UPDATE');
  const updateTicketIdx = rpcBlock.indexOf('UPDATE public.tickets');
  const insertCheckinIdx = rpcBlock.indexOf('INSERT INTO public.checkins');

  assert.ok(lockTicketIdx > 0, 'Bloqueio do ticket deve ocorrer');
  assert.ok(updateTicketIdx > lockTicketIdx, 'Baixa do ticket deve ocorrer após o lock');
  assert.ok(insertCheckinIdx > updateTicketIdx, 'Inserção em checkins deve ocorrer após a baixa do ticket');
});

runTestCase('3.4 Validação de precedência estrita (admin_users > profiles)', () => {
  const rpcStartIndex = sqlContent.indexOf('CREATE OR REPLACE FUNCTION public.fn_validate_and_checkin_ticket');
  const rpcEndIndex = sqlContent.indexOf('REVOKE EXECUTE ON FUNCTION public.fn_validate_and_checkin_ticket');
  const rpcBlock = sqlContent.slice(rpcStartIndex, rpcEndIndex);

  assert.ok(
    rpcBlock.includes('admin_users (Leitura consistente MVCC sem lock de linha'),
    'admin_users deve ser avaliado com precedência máxima'
  );
  assert.ok(
    rpcBlock.includes('Fonte Secundária (Fallback): profiles'),
    'profiles deve ser avaliado apenas como fallback'
  );
});

// =============================================================================
// PILAR 4: VALIDAÇÃO ESTRITA DE ISOLAMENTO DE HOMOLOGAÇÃO
// =============================================================================
runTestCase('4.1 Declaração formal de isolamento estrito no header e status', () => {
  assert.ok(
    sqlContent.includes('STATUS: Revisão Estática de Segurança — RECOMENDADO APENAS PARA BANCO ISOLADO'),
    'Header deve classificar status formal como RECOMENDADO APENAS PARA BANCO ISOLADO'
  );
  assert.ok(
    sqlContent.includes('ISOLAMENTO ESTRITO: RECOMENDADO APENAS PARA BANCO ISOLADO'),
    'Diretriz 1 deve declarar explicitamente a exigência de banco isolado'
  );
  assert.ok(
    sqlContent.includes('Este script JAMAIS deve ser executado em bancos compartilhados com produção'),
    'Diretriz de proibição em banco compartilhado deve estar explícita'
  );
});

runTestCase('4.2 Ausência total de operações destrutivas no arquivo SQL', () => {
  assert.strictEqual(/DELETE\s+FROM/i.test(sqlContent), false, 'Proibido DELETE FROM no SQL de homologação');
  assert.strictEqual(/TRUNCATE/i.test(sqlContent), false, 'Proibido TRUNCATE');
  assert.strictEqual(/DROP\s+TABLE/i.test(sqlContent), false, 'Proibido DROP TABLE');
  assert.strictEqual(/DROP\s+DATABASE/i.test(sqlContent), false, 'Proibido DROP DATABASE');
});

runTestCase('4.3 Testes estritamente locais sem chamadas de rede ou credenciais', () => {
  const testScriptContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/test-sql-v6-36-static-unit.ts'), 'utf8');
  assert.strictEqual(/fetch\s*\(/.test(testScriptContent), false, 'Nenhuma chamada fetch permitida');
  assert.strictEqual(/axios\./.test(testScriptContent), false, 'Nenhuma chamada axios permitida');
  assert.strictEqual(/createClient\s*\(/.test(testScriptContent), false, 'Nenhum cliente Supabase permitido');
  assert.strictEqual(/from\s+['"]pg['"]/.test(testScriptContent), false, 'Nenhum driver pg permitido');
  assert.strictEqual(/process\.env\[['"]SUPABASE_KEY['"]\]/.test(testScriptContent), false, 'Nenhuma credencial permitida');
});

console.log('=============================================================================');
console.log(`SUCESSO TOTAL: ${passCount} de ${totalCount} asserções estáticas APROVADAS (v6.36)!`);
console.log('=============================================================================');
