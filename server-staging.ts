/**
 * PX CUSTOM — SERVIDOR DE TESTE E HOMOLOGAÇÃO (ETAPA 6.46)
 * Arquivo: server-staging.ts
 *
 * ESCOPO:
 * Executar o backend do PX CUSTOM estritamente isolado para homologação,
 * utilizando o módulo de validação de ambiente de staging (validateAndBootstrapStaging).
 *
 * GARANTIAS (ETAPA 6.46):
 * 1. O servidor NÃO inicia se PX_ENV !== 'staging'.
 * 2. O servidor NÃO inicia se STAGING_SUPABASE_URL não corresponder ao STAGING_PROJECT_REF informado.
 * 3. Separação pura de variáveis: STAGING_SUPABASE_URL e STAGING_SUPABASE_SERVICE_ROLE_KEY.
 * 4. Zero fallback para SUPABASE_URL, VITE_SUPABASE_URL ou credenciais de produção.
 * 5. Barreira independente para impedir colisão com a referência do projeto de produção.
 * 6. Preserva integralmente o arquivo de produção server.ts.
 * 7. Autorização rigorosa com precedência estrita e bloqueio incondicional de administrativos inativos.
 * 8. Projeção mínima explícita na consulta do histórico de check-ins (sem select *).
 */

import express from 'express';
import { validateAndBootstrapStaging } from './src/server/staging-bootstrap';

// =============================================================================
// CONSTANTES E TIPOS DE AUTORIZAÇÃO E AUDITORIA
// =============================================================================

export const AUTHORIZED_OPERATOR_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'CHECKIN_OPERATOR',
] as const;

export type AuthorizedOperatorRole = typeof AUTHORIZED_OPERATOR_ROLES[number];

export const CHECKIN_HISTORY_COLUMNS = [
  'id',
  'ticket_id',
  'event_id',
  'checked_by',
  'checked_at',
  'device_info',
  'created_at',
] as const;

export const CHECKIN_HISTORY_COLUMNS_SQL = CHECKIN_HISTORY_COLUMNS.join(', ');

export interface OperatorAuthResult {
  authenticated: boolean;
  user?: any;
  role?: string;
  statusCode?: number;
  reason?: string;
  details?: string;
}

/**
 * Validação rigorosa de autenticação e autorização de operadores e administradores.
 *
 * REGRAS DE PRECEDÊNCIA E SEGURANÇA (ETAPA 6.39):
 * 1. Token validado via GoTrue (supabase.auth.getUser).
 * 2. Fonte primária de autoridade: public.admin_users (tabela de operadores/gestores do PX CONTROL).
 *    - Se registro existe em admin_users:
 *      * Se is_active === false: BLOQUEIO INCONDICIONAL (403 ACESSO NEGADO).
 *        Precedência estrita: um registro inativo em admin_users NUNCA pode ser contornado
 *        ou reativado por um perfil ativo em profiles.
 *      * Se is_active === true: o papel deve pertencer exclusivamente a AUTHORIZED_OPERATOR_ROLES
 *        ('ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR').
 * 3. Fonte secundária (fallback): public.profiles (quando o usuário não possui registro em admin_users):
 *    - Se perfil existe:
 *      * Se is_active === false: BLOQUEIO (403 ACESSO NEGADO).
 *      * Se is_active === true: o papel deve pertencer a AUTHORIZED_OPERATOR_ROLES.
 *    - Se perfil não existe: BLOQUEIO (403 ACESSO NEGADO).
 * 4. Falhas de consulta (erros retornados por admin_users ou profiles):
 *    - Tratados ESTRITAMENTE como falha de autorização (401 FALHA DE AUTENTICAÇÃO), NUNCA como permissão concedida.
 * 5. Aliases não comprovados no schema ('OPERADOR', 'OPERATOR', 'PORTARIA') são REJEITADOS.
 */
export async function verifyOperatorAuthorization(
  supabaseClient: any,
  authHeader: string | undefined,
  actionDescription: string
): Promise<OperatorAuthResult> {
  // 1. Exigência estrita de cabeçalho Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      statusCode: 401,
      reason: 'NÃO AUTORIZADO',
      details: `Cabeçalho Authorization com token Bearer é obrigatório para ${actionDescription}.`,
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      authenticated: false,
      statusCode: 401,
      reason: 'NÃO AUTORIZADO',
      details: 'Token de autenticação não fornecido.',
    };
  }

  // 2. Validação obrigatória da sessão e identidade do operador via Supabase Auth
  let operatorUser: any = null;
  try {
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return {
        authenticated: false,
        statusCode: 401,
        reason: 'TOKEN INVÁLIDO',
        details: 'Token expirado, inválido ou sessão encerrada.',
      };
    }
    operatorUser = userData.user;
  } catch (authErr) {
    console.warn(`[PX CHECKIN STAGING] Falha na validação do token do operador (${actionDescription}):`, authErr);
    return {
      authenticated: false,
      statusCode: 401,
      reason: 'TOKEN INVÁLIDO',
      details: 'Erro ao validar token de autenticação.',
    };
  }

  // 3. Verificação em admin_users (Fonte primária autoritativa)
  try {
    const { data: adminRecord, error: adminErr } = await supabaseClient
      .from('admin_users')
      .select('role, is_active')
      .eq('user_id', operatorUser.id)
      .maybeSingle();

    if (adminErr) {
      console.warn(`[PX CHECKIN STAGING] Erro ao consultar admin_users para ${operatorUser.id}:`, adminErr.message || adminErr);
      return {
        authenticated: false,
        statusCode: 401,
        reason: 'FALHA DE AUTENTICAÇÃO',
        details: 'Erro ao verificar permissões administrativas do usuário.',
      };
    }

    if (adminRecord) {
      // Regra 3.1: Conta administrativa inativa bloqueia incondicionalmente sem fallback
      if (adminRecord.is_active !== true) {
        return {
          authenticated: false,
          statusCode: 403,
          reason: 'ACESSO NEGADO',
          details: 'Conta de operador ou administrador inativa no sistema.',
        };
      }

      // Regra 3.2: Validação estrita de papéis canônicos suportados
      const role = String(adminRecord.role || '').trim().toUpperCase();
      const isAuthorized = (AUTHORIZED_OPERATOR_ROLES as readonly string[]).includes(role);

      if (!isAuthorized) {
        return {
          authenticated: false,
          statusCode: 403,
          reason: 'ACESSO NEGADO',
          details: `Seu usuário não possui permissão de operador ou administrador ativo para ${actionDescription}.`,
        };
      }

      return {
        authenticated: true,
        user: operatorUser,
        role,
      };
    }

    // 4. Verificação em profiles (Fallback seguro quando não há registro em admin_users)
    const { data: profileRecord, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', operatorUser.id)
      .maybeSingle();

    if (profileErr) {
      console.warn(`[PX CHECKIN STAGING] Erro ao consultar profiles para ${operatorUser.id}:`, profileErr.message || profileErr);
      return {
        authenticated: false,
        statusCode: 401,
        reason: 'FALHA DE AUTENTICAÇÃO',
        details: 'Erro ao verificar perfil do usuário.',
      };
    }

    if (!profileRecord) {
      return {
        authenticated: false,
        statusCode: 403,
        reason: 'ACESSO NEGADO',
        details: 'Perfil de usuário não encontrado no sistema.',
      };
    }

    if (profileRecord.is_active !== true) {
      return {
        authenticated: false,
        statusCode: 403,
        reason: 'ACESSO NEGADO',
        details: 'Perfil de usuário inativo no sistema.',
      };
    }

    const role = String(profileRecord.role || '').trim().toUpperCase();
    const isAuthorized = (AUTHORIZED_OPERATOR_ROLES as readonly string[]).includes(role);

    if (!isAuthorized) {
      return {
        authenticated: false,
        statusCode: 403,
        reason: 'ACESSO NEGADO',
        details: `Seu usuário não possui permissão de operador ou administrador ativo para ${actionDescription}.`,
      };
    }

    return {
      authenticated: true,
      user: operatorUser,
      role,
    };
  } catch (err: any) {
    console.warn(`[PX CHECKIN STAGING] Falha interna ao verificar autorização do operador (${actionDescription}):`, err?.message || err);
    return {
      authenticated: false,
      statusCode: 401,
      reason: 'FALHA DE AUTENTICAÇÃO',
      details: 'Erro interno ao validar credenciais de acesso.',
    };
  }
}

/**
 * Cria a aplicação Express de homologação com injeção segura de dependências.
 */
export function createStagingApp(
  supabaseAdmin: any,
  port: number = 3001,
  projectRef: string = 'staging'
): express.Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health Check de Homologação
  app.get('/api/health/staging', (_req, res) => {
    return res.json({
      status: 'ONLINE',
      environment: 'staging',
      projectRef,
      port,
      supabaseConfigured: true,
      note: 'Indica apenas inicialização das credenciais do SDK no bootstrap; existência do schema e conectividade dependem da execução transacional.',
    });
  });

  // Endpoint de Validação de Check-in (Fluxo Real de Portaria)
  app.post('/api/checkin/validate', async (req, res) => {
    const { code, operatorName } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        authorized: false,
        reason: 'CÓDIGO INVÁLIDO',
        details: 'Informe o código do ingresso ou escaneie o QR Code.',
      });
    }

    const cleanRaw = code.trim().toUpperCase();
    const cleanCode = cleanRaw.includes('|') ? cleanRaw.split('|')[0].trim() : cleanRaw;

    // 1. Exigência estrita de autenticação e permissão de operador
    const auth = await verifyOperatorAuthorization(supabaseAdmin, req.headers.authorization, 'validação de check-in');
    if (!auth.authenticated) {
      return res.status(auth.statusCode || 401).json({
        authorized: false,
        reason: auth.reason,
        details: auth.details,
      });
    }

    const operatorUser = auth.user;
    const op = operatorName || (operatorUser?.email ? `Operador (${operatorUser.email})` : 'Operador PX Portaria Staging');

    try {
      // Invocação da RPC transacional com bloqueio FOR UPDATE
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('fn_validate_and_checkin_ticket', {
        p_ticket_code: cleanCode,
        p_operator_name: op,
        p_operator_id: operatorUser?.id || null,
      });

      if (rpcError) {
        console.error('[PX CHECKIN STAGING] Falha na execução da RPC no Supabase Staging:', rpcError.message);
        return res.status(503).json({
          authorized: false,
          reason: 'SERVIÇO TRANSACIONAL INDISPONÍVEL',
          details: 'A função transacional de baixa do ingresso não pôde ser executada no banco de homologação.',
        });
      }

      if (!rpcResult || typeof rpcResult !== 'object') {
        return res.status(503).json({
          authorized: false,
          reason: 'RESPOSTA INVÁLIDA DO BANCO',
          details: 'O serviço transacional retornou uma resposta não reconhecida.',
        });
      }

      const resObj = rpcResult as Record<string, any>;

      if (resObj.ticket && typeof resObj.ticket === 'object') {
        resObj.ticket.buyerName = resObj.ticket.buyerName || resObj.ticket.buyer_name || 'Participante PX';
        resObj.ticket.batchName = resObj.ticket.batchName || resObj.ticket.batch_name || 'Geral';
        resObj.ticket.code = resObj.ticket.code || resObj.ticket.ticket_code || cleanCode;
        resObj.ticket.eventName = resObj.ticket.eventName || resObj.ticket.event_name || 'PX CUSTOM';
      }

      return res.json(resObj);
    } catch (err: any) {
      console.error('[PX CHECKIN STAGING] Erro operacional ao validar check-in:', err?.message || err);
      return res.status(500).json({
        authorized: false,
        reason: 'ERRO OPERACIONAL',
        details: 'Erro interno ao processar a validação transacional de check-in.',
      });
    }
  });

  // Endpoint de Consulta de Histórico de Check-ins (Auditado Diretamente do Supabase Staging)
  app.get('/api/checkins', async (req, res) => {
    // 1. Exigência estrita de autenticação e validação de operador/administrador
    const auth = await verifyOperatorAuthorization(supabaseAdmin, req.headers.authorization, 'consultar histórico de check-ins');
    if (!auth.authenticated) {
      return res.status(auth.statusCode || 401).json({
        error: auth.reason,
        details: auth.details,
      });
    }

    try {
      // 2. Consulta com projeção mínima explícita das colunas canônicas existentes no banco
      const { data, error } = await supabaseAdmin
        .from('checkins')
        .select(CHECKIN_HISTORY_COLUMNS_SQL)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[PX CHECKIN STAGING] Erro ao consultar checkins no Supabase Staging:', error.message);
        return res.status(500).json({
          error: 'Falha ao consultar histórico de check-ins no banco de homologação.',
        });
      }

      return res.json(data || []);
    } catch (err: any) {
      console.error('[PX CHECKIN STAGING] Erro operacional ao listar checkins:', err?.message || err);
      return res.status(500).json({
        error: 'Erro interno ao consultar histórico de check-ins.',
      });
    }
  });

  return app;
}

// -----------------------------------------------------------------------------
// Inicialização Controlada do Servidor quando executado diretamente
// -----------------------------------------------------------------------------
const isDirectExecution =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('server-staging.ts') || process.argv[1].endsWith('server-staging.js'));

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  const stagingConfig = validateAndBootstrapStaging();
  const supabaseAdmin = stagingConfig.supabaseAdmin;
  const PORT = stagingConfig.port;

  const app = createStagingApp(supabaseAdmin, PORT, stagingConfig.projectRef);
  app.listen(PORT, () => {
    console.log(`[PX STAGING] Servidor de homologação ouvindo na porta ${PORT}`);
  });
}
