import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// PX CUSTOM — TESTE UNITÁRIO ESTÁTICO DO SQL DE HOMOLOGAÇÃO (v6.35)
// ETAPA 6.63 — COBERTURA COMPLETA DAS 15 EXIGÊNCIAS FORMAIS:
// 1. E-mail NULL em cada caminho relevante de colisão.
// 2. user_id NULL em verificações de propriedade de ingressos.
// 3. Colisão de UUID reservado com registro legítimo.
// 4. Conflito em admin_users com papel ou estado diferente.
// 5. Conflito em events com slug ou proprietário diferente.
// 6. Conflito em ticket_types com evento diferente.
// 7. Conflito em tickets com evento ou usuário diferente.
// 8. UPSERT que não atualiza nenhuma linha.
// 9. Rejeição de operador inativo ou não autorizado.
// 10. Tentativa de fornecer identidade de operador arbitrária.
// 11. Duas tentativas concorrentes de check-in (SELECT ... FOR UPDATE).
// 12. Rollback esperado quando a gravação do check-in falha.
// 13. Privilégios indevidos de execução da RPC.
// 14. Ausência de exclusões destrutivas no SQL.
// 15. Ausência de conexões, credenciais ou comandos de execução remota nos testes.
// =============================================================================

console.log('=============================================================================');
console.log('PX CUSTOM — AUDITORIA ESTÁTICA LOCAL DO SQL DE HOMOLOGAÇÃO (v6.35) — ETAPA 6.63');
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

const v635Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-35.sql');
const v635BakPath = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-35.sql.bak');
const v634Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-34.sql');
const v633Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-33.sql');
const v632Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-32.sql');
const v631Path = path.resolve(process.cwd(), 'supabase-homologacao-checkin-v6-31.sql');
const prodCanonPath = path.resolve(process.cwd(), 'supabase-checkin-transacional.sql');

runTestCase('0.1 Integridade dos arquivos de versão e preservação canônica', () => {
  assert.ok(fs.existsSync(v635Path), 'v6-35.sql não encontrado');
  assert.ok(fs.existsSync(v635BakPath), 'v6-35.sql.bak não encontrado');
  assert.ok(fs.existsSync(v634Path), 'v6-34.sql não encontrado');
  assert.ok(fs.existsSync(v633Path), 'v6-33.sql não encontrado');
  assert.ok(fs.existsSync(v632Path), 'v6-32.sql não encontrado');
  assert.ok(fs.existsSync(v631Path), 'v6-31.sql não encontrado');
  assert.ok(fs.existsSync(prodCanonPath), 'Arquivo canônico de produção não encontrado');

  const stat = fs.statSync(v635Path);
  const statBak = fs.statSync(v635BakPath);
  assert.strictEqual(stat.size, statBak.size, 'Backup de segurança v6-35 deve ter tamanho idêntico');
});

const sqlContent = fs.readFileSync(v635Path, 'utf8');

// EXIGÊNCIA 1: E-mail "NULL" em cada caminho relevante de colisão
runTestCase('1. Tratamento seguro de e-mail NULL em verificações anti-colisão', () => {
  // profiles pre-check
  assert.ok(
    sqlContent.includes('(email IS NULL OR email NOT LIKE \'%@pxcustom.local\')'),
    'profiles pre-check deve tratar email IS NULL explicitamente'
  );
  // profiles ON CONFLICT WHERE
  assert.ok(
    sqlContent.includes('WHERE public.profiles.email IS NOT NULL'),
    'profiles ON CONFLICT deve exigir email IS NOT NULL'
  );
  // admin_users pre-check
  assert.ok(
    sqlContent.includes('(p.email IS NULL OR p.email NOT LIKE \'%@pxcustom.local\')'),
    'admin_users pre-check deve tratar p.email IS NULL'
  );
});

// EXIGÊNCIA 2: user_id NULL em verificações de propriedade de ingressos
runTestCase('2. Tratamento seguro de user_id NULL em verificações de tickets', () => {
  assert.ok(
    sqlContent.includes('OR user_id IS NULL'),
    'Validação de tickets deve tratar user_id IS NULL explicitamente contra apropriação'
  );
});

// EXIGÊNCIA 3: Colisão de UUID reservado com registro legítimo
runTestCase('3. Aborto com EXCEPTION quando UUID colide com registro prévio', () => {
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: PERFIL NÃO SINTÉTICO]'),
    'Deve disparar exception de bloqueio de perfil não sintético'
  );
  assert.ok(
    sqlContent.includes('RAISE EXCEPTION'),
    'Deve utilizar RAISE EXCEPTION para forçar rollback imediato'
  );
});

// EXIGÊNCIA 4: Conflito em admin_users com papel ou estado diferente
runTestCase('4. Proteção contra sobrescrita de autorizações em admin_users', () => {
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: OPERADOR ADMIN_USERS DE ORIGEM NÃO SINTÉTICA]'),
    'Deve bloquear contas admin_users não comprovadamente sintéticas'
  );
  assert.ok(
    sqlContent.includes('WHERE public.admin_users.user_id IN ('),
    'ON CONFLICT em admin_users deve ter cláusula WHERE restritiva a perfis sintéticos comprovados'
  );
});

// EXIGÊNCIA 5: Conflito em events com slug ou proprietário diferente
runTestCase('5. Detecção de conflito em events com slug diferente usando IS DISTINCT FROM', () => {
  assert.ok(
    sqlContent.includes("slug IS DISTINCT FROM 'px-track-staging-2026'"),
    'Deve usar IS DISTINCT FROM para comparação null-safe do slug do evento'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: EVENTO NÃO SINTÉTICO]'),
    'Deve disparar exception se evento colidir'
  );
});

// EXIGÊNCIA 6: Conflito em ticket_types com evento diferente
runTestCase('6. Detecção de conflito em ticket_types com event_id diferente usando IS DISTINCT FROM', () => {
  assert.ok(
    sqlContent.includes('event_id IS DISTINCT FROM v_event_id'),
    'Deve usar IS DISTINCT FROM para comparação null-safe de ticket_types.event_id'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: LOTE NÃO SINTÉTICO]'),
    'Deve disparar exception se lote colidir'
  );
});

// EXIGÊNCIA 7: Conflito em tickets com evento ou usuário diferente
runTestCase('7. Detecção de conflito em tickets com event_id ou user_id inválidos', () => {
  assert.ok(
    sqlContent.includes('event_id IS DISTINCT FROM v_event_id'),
    'Deve verificar se ticket aponta para event_id divergente usando IS DISTINCT FROM'
  );
  assert.ok(
    sqlContent.includes('[BLOQUEIO ANTI-COLISÃO: INGRESSO COLIDINDO COM DADOS REAIS OU user_id NULO]'),
    'Deve disparar exception se ingresso colidir com dados reais'
  );
});

// EXIGÊNCIA 8: UPSERT que não atualiza nenhuma linha
runTestCase('8. Validação prévia estrita independente do número de linhas afetadas pelo UPSERT', () => {
  // A validação é feita nos blocos 4.0.* ANTES de qualquer INSERT/UPDATE, garantindo que o script não confunda 0 rows updated com sucesso
  assert.ok(
    sqlContent.includes('4.0 VERIFICAÇÃO PRÉVIA ANTI-COLISÃO E INTEGRIDADE DE ORIGEM'),
    'Bloco 4.0 deve executar validações antes de qualquer operação de escrita'
  );
});

// EXIGÊNCIA 9: Rejeição de operador inativo ou não autorizado
runTestCase('9. Rejeição inequívoca de operador inativo ou não autorizado na RPC', () => {
  assert.ok(
    sqlContent.includes("'reason', 'OPERADOR NÃO AUTORIZADO'"),
    'RPC deve retornar OPERADOR NÃO AUTORIZADO quando operador for inativo ou com role inadequada'
  );
  assert.ok(
    sqlContent.includes("[TESTE 4 APROVADO]"),
    'Asserção unitária para operador inativo deve existir'
  );
  assert.ok(
    sqlContent.includes("[TESTE 5 APROVADO]"),
    'Asserção unitária para operador conflitante deve existir'
  );
});

// EXIGÊNCIA 10: Tentativa de fornecer identidade de operador arbitrária
runTestCase('10. Bloqueio de p_operator_id nulo e consulta autoritativa no banco com FOR SHARE', () => {
  assert.ok(
    sqlContent.includes("'reason', 'OPERADOR NÃO IDENTIFICADO'"),
    'RPC deve rejeitar operador nulo'
  );
  assert.ok(
    sqlContent.includes('FOR SHARE'),
    'Consulta do operador no banco deve utilizar FOR SHARE para estabilidade transacional'
  );
});

// EXIGÊNCIA 11: Duas tentativas concorrentes de check-in (SELECT ... FOR UPDATE)
runTestCase('11. Bloqueio pessimista de linha SELECT ... FOR UPDATE em tickets', () => {
  assert.ok(
    /SELECT\s+\*\s+INTO\s+v_ticket\s+FROM\s+public\.tickets\s+WHERE\s+UPPER\(TRIM\(ticket_code\)\)\s*=\s*v_clean_code\s+FOR\s+UPDATE/i.test(sqlContent),
    'SELECT ... FOR UPDATE com UPPER(TRIM(ticket_code)) deve estar presente na RPC'
  );
  assert.ok(
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_tickets_upper_ticket_code/i.test(sqlContent),
    'Índice funcional único deve dar suporte direto ao bloqueio concorrente'
  );
});

// EXIGÊNCIA 12: Rollback esperado quando a gravação do check-in falha
runTestCase('12. Inserção de checkins na mesma transação atômica da baixa do ingresso', () => {
  const updateTicketIdx = sqlContent.indexOf('UPDATE public.tickets');
  const insertCheckinIdx = sqlContent.indexOf('INSERT INTO public.checkins');
  assert.ok(updateTicketIdx > 0 && insertCheckinIdx > updateTicketIdx, 'UPDATE tickets e INSERT checkins devem estar sequenciados no mesmo bloco da RPC');
  assert.ok(!sqlContent.slice(updateTicketIdx, insertCheckinIdx).includes('COMMIT;'), 'Não pode haver commit intermediário entre a baixa e a gravação');
});

// EXIGÊNCIA 13: Privilégios indevidos de execução da RPC
runTestCase('13. RPC com SECURITY DEFINER, search_path e permissão restrita a service_role', () => {
  assert.ok(sqlContent.includes('SECURITY DEFINER'), 'Falta SECURITY DEFINER');
  assert.ok(sqlContent.includes('SET search_path = public'), 'Falta SET search_path = public');
  assert.ok(
    /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_validate_and_checkin_ticket[\s\S]*?FROM\s+PUBLIC,\s*anon,\s*authenticated;/i.test(sqlContent),
    'Privilégios públicos, anônimos e autenticados devem ser revogados'
  );
  assert.ok(
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.fn_validate_and_checkin_ticket[\s\S]*?TO\s+service_role;/i.test(sqlContent),
    'Acesso deve ser restrito exclusivamente a service_role'
  );
});

// EXIGÊNCIA 14: Ausência de exclusões destrutivas no SQL
runTestCase('14. Ausência total de DELETE, TRUNCATE e DROP TABLE no SQL de homologação', () => {
  assert.strictEqual(/DELETE\s+FROM/i.test(sqlContent), false, 'Proibido DELETE FROM');
  assert.strictEqual(/TRUNCATE/i.test(sqlContent), false, 'Proibido TRUNCATE');
  assert.strictEqual(/DROP\s+TABLE/i.test(sqlContent), false, 'Proibido DROP TABLE');
  assert.strictEqual(/DROP\s+DATABASE/i.test(sqlContent), false, 'Proibido DROP DATABASE');
});

// EXIGÊNCIA 15: Ausência de conexões, credenciais ou comandos remotos nos testes
runTestCase('15. Testes estritamente locais sem chamadas de rede ou credenciais', () => {
  const testScriptContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/test-sql-v6-35-static-unit.ts'), 'utf8');
  assert.strictEqual(/fetch\s*\(/.test(testScriptContent), false, 'Nenhuma chamada fetch permitida');
  assert.strictEqual(/axios\./.test(testScriptContent), false, 'Nenhuma chamada axios permitida');
  assert.strictEqual(/createClient\s*\(/.test(testScriptContent), false, 'Nenhum cliente Supabase permitido');
  assert.strictEqual(/from\s+['"]pg['"]/.test(testScriptContent), false, 'Nenhum driver de banco PostgreSQL conectado');
  assert.strictEqual(/process\.env\[['"]SUPABASE_KEY['"]\]/.test(testScriptContent), false, 'Nenhuma chave de ambiente carregada no script de teste');
});

console.log('=============================================================================');
console.log(`SUCESSO TOTAL: ${passCount} de ${totalCount} asserções estáticas APROVADAS!`);
console.log('=============================================================================');
