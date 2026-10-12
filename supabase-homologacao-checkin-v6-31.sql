-- =============================================================================
-- PX CUSTOM — PACOTE DE HOMOLOGAÇÃO DO CHECK-IN TRANSACIONAL (VERSÃO 6.31)
-- Arquivo: /supabase-homologacao-checkin-v6-31.sql
-- ESCOPO: 
--   1. Validação Prévia de Compatibilidade de Schema (anti-duplicatas, enums, constraints)
--   2. Instalação Idempotente Resiliente do Schema de Portaria com Índice Case-Insensitive
--   3. RPC fn_validate_and_checkin_ticket com Precedência Estrita (admin_users > profiles)
--   4. Carga Segura de Seeds Sintéticos com Prova Multifatorial de Propriedade
--   5. Bateria de 9 Asserções Unitárias em SQL (incluindo teste de conflito de precedência)
-- STATUS: Revisão Estática de Segurança e Ambiente — PENDENTE DE EXECUÇÃO EM POSTGRESQL REAL
-- =============================================================================
-- DIRETRIZ FUNDAMENTAL DE SEGURANÇA E ISOLAMENTO DE AMBIENTES:
-- 1. O isolamento real entre homologação e produção DEPENDE EXCLUSIVAMENTE da
--    segregação física em um projeto Supabase separado (ex.: px-custom-staging).
-- 2. No PostgreSQL do Supabase, o banco padrão sempre se chama 'postgres'. Portanto,
--    consultas genéricas como current_database() NÃO diferenciam staging de produção.
-- 3. A checagem de prefixos de ingressos ('PX-STAGING-%') NÃO substitui a confirmação
--    independente do Project Reference no painel ou no bootstrap local.
-- 4. O operador DEVE conferir visualmente no painel do Supabase (app.supabase.com)
--    o Project Name e o Project Reference antes de executar qualquer comando SQL.
-- =============================================================================

-- =============================================================================
-- PARTE 0: VALIDAÇÃO PRÉVIA DE COMPATIBILIDADE DE SCHEMA (PRE-FLIGHT CHECKS)
-- Aborta com mensagem explícita caso o banco possua anomalias ou duplicatas preexistentes.
-- =============================================================================

DO $$
BEGIN
    -- 0.1 Se a tabela tickets já existir, verificar duplicatas case-insensitive antes de criar índices
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tickets'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'ticket_code'
        ) THEN
            IF EXISTS (
                SELECT UPPER(TRIM(ticket_code))
                FROM public.tickets
                WHERE ticket_code IS NOT NULL
                GROUP BY UPPER(TRIM(ticket_code))
                HAVING COUNT(*) > 1
            ) THEN
                RAISE EXCEPTION '[BLOQUEIO DE SCHEMA: DUPLICIDADE EM TICKET_CODE] Detectados ingressos com códigos duplicados (busca case-insensitive). Corrija as inconsistências antes de prosseguir.';
            END IF;
        END IF;
    END IF;

    -- 0.2 Validar que enums preexistentes não possuam definições incompatíveis
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        -- Garantir que valores obrigatórios existam no enum
        ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'PAID';
        ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'PENDING';
        ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'USED';
        ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'CANCELLED';
        ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'REFUNDED';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'USER';
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ADMIN';
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CHECKIN_OPERATOR';
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'FINANCE';
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPPORT';
    END IF;
END $$;

-- =============================================================================
-- PARTE 1: ESTRUTURA MÍNIMA DE TABELAS E TIPOS EM HOMOLOGAÇÃO
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criação dos enums canônicos caso não existam
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'USER',
            'ADMIN',
            'SUPER_ADMIN',
            'CHECKIN_OPERATOR',
            'FINANCE',
            'SUPPORT'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE public.ticket_status AS ENUM (
            'PAID',
            'PENDING',
            'USED',
            'CANCELLED',
            'REFUNDED'
        );
    END IF;
END $$;

-- 1.1 Tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150),
    email VARCHAR(255) UNIQUE,
    role public.user_role NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'USER';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 1.2 Tabela admin_users (Fonte prioritária de autorização de operadores)
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'CHECKIN_OPERATOR';
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 1.3 Tabela events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    location VARCHAR(255),
    start_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 Tabela ticket_types (Lotes de ingressos)
CREATE TABLE IF NOT EXISTS public.ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Tabela tickets
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(100) NOT NULL UNIQUE,
    order_id UUID NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    ticket_type_id UUID NULL REFERENCES public.ticket_types(id) ON DELETE SET NULL,
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    holder_name VARCHAR(150) NOT NULL DEFAULT 'Participante PX',
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status public.ticket_status NOT NULL DEFAULT 'PAID',
    qr_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(100);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS status public.ticket_status NOT NULL DEFAULT 'PAID';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS holder_name VARCHAR(150) DEFAULT 'Participante PX';

-- Criação do índice funcional case-insensitive para otimização do SELECT ... FOR UPDATE da RPC
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_upper_ticket_code 
ON public.tickets (UPPER(TRIM(ticket_code)));

-- 1.6 Tabela checkins (Trilha oficial de auditoria da portaria)
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    checked_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_info TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS device_info TEXT;

CREATE INDEX IF NOT EXISTS idx_checkins_ticket_id ON public.checkins (ticket_id);

-- =============================================================================
-- PARTE 2: FUNÇÃO TRANSACIONAL DE CHECK-IN ATÔMICO COM PRECEDÊNCIA UNIFICADA (v6.31)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_validate_and_checkin_ticket(
    p_ticket_code VARCHAR,
    p_operator_name VARCHAR DEFAULT 'Operador PX Portaria',
    p_operator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_rec RECORD;
    v_profile_rec RECORD;
    v_ticket RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_clean_code VARCHAR;
    v_ticket_code_val VARCHAR;
    v_attendee_name VARCHAR := 'Participante PX';
    v_batch_name VARCHAR := 'Geral';
    v_event_name VARCHAR := 'PX CUSTOM';
    v_device_info TEXT;
BEGIN
    -- 1. Sanitização do código do ingresso recebido (suporta CODE ou CODE|EVENT_ID|STATUS)
    v_clean_code := UPPER(TRIM(SPLIT_PART(p_ticket_code, '|', 1)));

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'CÓDIGO AUSENTE',
            'details', 'Informe o código do ingresso ou escaneie o QR Code.'
        );
    END IF;

    -- 2. Identificador do operador é estritamente obrigatório
    IF p_operator_id IS NULL THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'OPERADOR NÃO IDENTIFICADO',
            'details', 'Identificador do operador de portaria é obrigatório para validação de check-in.'
        );
    END IF;

    -- 3. Validação Unificada de Autorização do Operador com Precedência Estrita
    -- 3.1 Fonte Prioritária: admin_users
    SELECT role::text AS role, is_active
    INTO v_admin_rec
    FROM public.admin_users
    WHERE user_id = p_operator_id;

    IF v_admin_rec IS NOT NULL AND v_admin_rec.role IS NOT NULL THEN
        -- Registro existe em admin_users: regra decisória mandatória
        IF v_admin_rec.is_active != TRUE OR v_admin_rec.role NOT IN ('ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR') THEN
            -- Operador inativo ou com papel não autorizado em admin_users: BLOQUEIO INCONDICIONAL
            -- Precedência estrita: proíbe contorno via profiles ativo
            RETURN jsonb_build_object(
                'authorized', FALSE,
                'reason', 'OPERADOR NÃO AUTORIZADO',
                'details', 'Conta de operador ou administrador inativa ou sem permissão em admin_users.'
            );
        END IF;
    ELSE
        -- 3.2 Fonte Secundária (Fallback): profiles (apenas quando não existe registro em admin_users)
        SELECT role::text AS role, is_active
        INTO v_profile_rec
        FROM public.profiles
        WHERE id = p_operator_id;

        IF v_profile_rec IS NULL OR v_profile_rec.is_active != TRUE OR v_profile_rec.role NOT IN ('ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR') THEN
            RETURN jsonb_build_object(
                'authorized', FALSE,
                'reason', 'OPERADOR NÃO AUTORIZADO',
                'details', 'O operador informado não possui credenciais autorizadas ou ativas em profiles.'
            );
        END IF;
    END IF;

    -- 4. Bloqueio pessimista de linha (FOR UPDATE) na tabela tickets
    SELECT *
    INTO v_ticket
    FROM public.tickets
    WHERE UPPER(TRIM(ticket_code)) = v_clean_code
    FOR UPDATE;

    -- 5. Validação de existência do ingresso
    IF v_ticket IS NULL OR v_ticket.id IS NULL THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'INGRESSO NÃO ENCONTRADO',
            'details', 'Código de ingresso não localizado na base oficial do evento.',
            'ticket', NULL
        );
    END IF;

    -- 6. Validação de status: Impedir reuso (Anti-Duplo Check-in)
    IF v_ticket.status::text IN ('USED', 'UTILIZADO') THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'INGRESSO JÁ UTILIZADO',
            'details', 'Este ingresso já realizou check-in anteriormente. Entrada duplicada proibida.',
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- 7. Validação de status: Pagamento pendente
    IF v_ticket.status::text IN ('PENDING', 'PENDENTE') THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'PAGAMENTO PENDENTE',
            'details', 'O pagamento deste ingresso ainda não foi confirmado pelo Mercado Pago.',
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- 8. Validação de status: Somente PAID / PAGO é elegível
    IF v_ticket.status::text NOT IN ('PAID', 'PAGO') THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', FORMAT('INGRESSO %s', v_ticket.status),
            'details', FORMAT('O status atual do ingresso é %s. Entrada não permitida.', v_ticket.status),
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- 9. Transação Atômica: Baixa do ingresso
    UPDATE public.tickets
    SET status = 'USED',
        updated_at = v_now
    WHERE id = v_ticket.id;

    v_ticket.status := 'USED';
    v_ticket.updated_at := v_now;

    -- 10. Resolução resiliente de metadados para auditoria
    BEGIN
        IF v_ticket.ticket_code IS NOT NULL AND TRIM(v_ticket.ticket_code) <> '' THEN
            v_ticket_code_val := TRIM(v_ticket.ticket_code);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ticket_code_val := v_clean_code;
    END;
    IF v_ticket_code_val IS NULL OR v_ticket_code_val = '' THEN
        v_ticket_code_val := v_clean_code;
    END IF;

    BEGIN
        IF v_ticket.holder_name IS NOT NULL AND TRIM(v_ticket.holder_name) <> '' THEN
            v_attendee_name := TRIM(v_ticket.holder_name);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_attendee_name := 'Participante PX';
    END;

    v_batch_name := 'Geral';
    IF v_ticket.ticket_type_id IS NOT NULL THEN
        BEGIN
            EXECUTE 'SELECT COALESCE(name, ''Geral'') FROM public.ticket_types WHERE id = $1'
            INTO v_batch_name
            USING v_ticket.ticket_type_id;
        EXCEPTION WHEN OTHERS THEN
            v_batch_name := 'Geral';
        END;
    END IF;
    IF v_batch_name IS NULL OR v_batch_name = '' THEN
        v_batch_name := 'Geral';
    END IF;

    BEGIN
        IF v_ticket.event_id IS NOT NULL THEN
            SELECT COALESCE(title, 'PX CUSTOM') INTO v_event_name
            FROM public.events
            WHERE id = v_ticket.event_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_event_name := 'PX CUSTOM';
    END;

    -- 11. Serialização dos metadados de portaria no campo device_info
    v_device_info := jsonb_build_object(
        'ticket_code', v_ticket_code_val,
        'attendee_name', v_attendee_name,
        'batch_name', v_batch_name,
        'event_name', v_event_name,
        'operator_name', COALESCE(p_operator_name, 'Operador PX Portaria'),
        'operator_id', p_operator_id,
        'status', 'CONFIRMADO',
        'checked_in_at', v_now
    )::text;

    -- 12. Transação Atômica: Inserção do registro de check-in em public.checkins
    INSERT INTO public.checkins (
        ticket_id,
        event_id,
        checked_by,
        checked_at,
        device_info,
        created_at
    ) VALUES (
        v_ticket.id,
        v_ticket.event_id,
        p_operator_id,
        v_now,
        v_device_info,
        v_now
    );

    -- 13. Retorno padronizado em JSONB
    RETURN jsonb_build_object(
        'authorized', TRUE,
        'reason', 'CHECK-IN AUTORIZADO',
        'details', 'Acesso liberado com sucesso. Bem-vindo à experiência PX CUSTOM!',
        'ticket', jsonb_build_object(
            'id', v_ticket.id,
            'ticket_code', v_ticket_code_val,
            'code', v_ticket_code_val,
            'status', 'USED',
            'event_id', v_ticket.event_id,
            'event_name', v_event_name,
            'eventName', v_event_name,
            'holder_name', v_attendee_name,
            'buyer_name', v_attendee_name,
            'buyerName', v_attendee_name,
            'batch_name', v_batch_name,
            'batchName', v_batch_name,
            'price', v_ticket.price,
            'qr_code', v_ticket.qr_code,
            'updated_at', v_now
        ),
        'log', jsonb_build_object(
            'ticketCode', v_ticket_code_val,
            'attendeeName', v_attendee_name,
            'batchName', v_batch_name,
            'eventName', v_event_name,
            'operatorName', COALESCE(p_operator_name, 'Operador PX Portaria'),
            'status', 'CONFIRMADO',
            'timestamp', TO_CHAR(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY • HH24:MI')
        )
    );
END;
$$;

-- Restrição estrita de privilégios de execução: acesso exclusivo via service_role
REVOKE EXECUTE ON FUNCTION public.fn_validate_and_checkin_ticket(VARCHAR, VARCHAR, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_validate_and_checkin_ticket(VARCHAR, VARCHAR, UUID)
TO service_role;

-- =============================================================================
-- PARTE 3: CARGA CONTROLADA DE DADOS SINTÉTICOS DE HOMOLOGAÇÃO
-- =============================================================================

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_operator_id UUID := '00000000-0000-0000-0000-000000000002';
    v_user_id UUID := '00000000-0000-0000-0000-000000000003';
    v_inactive_id UUID := '00000000-0000-0000-0000-000000000004';
    v_conflict_id UUID := '00000000-0000-0000-0000-000000000005';
    v_event_id UUID := '11111111-1111-1111-1111-111111111111';
    v_batch_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
    -- Validação multifatorial de propriedade dos dados antes de qualquer deleção:
    -- 1. Se houver ingressos não-sintéticos, abortar imediatamente.
    IF EXISTS (
        SELECT 1 FROM public.tickets 
        WHERE ticket_code NOT LIKE 'PX-STAGING-%'
    ) THEN
        RAISE EXCEPTION '[BLOQUEIO DE SEGURANÇA: DADOS NÃO SINTÉTICOS DETECTADOS] A tabela tickets contém ingressos fora do namespace PX-STAGING-%. Interrompendo para evitar destruição de dados reais!';
    END IF;

    -- 2. Se houver eventos não-sintéticos, abortar imediatamente.
    IF EXISTS (
        SELECT 1 FROM public.events 
        WHERE id <> v_event_id
    ) THEN
        RAISE EXCEPTION '[BLOQUEIO DE SEGURANÇA: EVENTOS NÃO HOMOLOGADOS DETECTADOS] A tabela events contém eventos fora do UUID sintético fixo. Abortando!';
    END IF;

    -- Execução das deleções cirúrgicas sintéticas comprovadas
    DELETE FROM public.checkins WHERE ticket_id IN (
        SELECT id FROM public.tickets WHERE ticket_code LIKE 'PX-STAGING-%'
    );
    DELETE FROM public.tickets WHERE ticket_code LIKE 'PX-STAGING-%';
    DELETE FROM public.ticket_types WHERE id = v_batch_id;
    DELETE FROM public.events WHERE id = v_event_id;
    DELETE FROM public.admin_users WHERE user_id IN (v_admin_id, v_operator_id, v_inactive_id, v_conflict_id);
    DELETE FROM public.profiles WHERE id IN (v_admin_id, v_operator_id, v_user_id, v_inactive_id, v_conflict_id);

    -- 3.1 Inserção dos Perfis Sintéticos
    INSERT INTO public.profiles (id, full_name, email, role, is_active)
    VALUES
        (v_admin_id, 'Operador Admin Sintético', 'admin.staging@pxcustom.local', 'ADMIN', true),
        (v_operator_id, 'Portaria Sintética', 'portaria.staging@pxcustom.local', 'CHECKIN_OPERATOR', true),
        (v_user_id, 'Cliente Comum Sintético', 'cliente.staging@pxcustom.local', 'USER', true),
        (v_inactive_id, 'Operador Desativado', 'desativado.staging@pxcustom.local', 'CHECKIN_OPERATOR', false),
        (v_conflict_id, 'Operador Conflitante', 'conflito.staging@pxcustom.local', 'ADMIN', true);

    -- 3.2 Inserção em admin_users
    -- Nota: v_conflict_id está ativo em profiles como ADMIN, mas inativo em admin_users (para provar precedência estrita)
    INSERT INTO public.admin_users (user_id, role, is_active)
    VALUES
        (v_admin_id, 'ADMIN', true),
        (v_operator_id, 'CHECKIN_OPERATOR', true),
        (v_inactive_id, 'CHECKIN_OPERATOR', false),
        (v_conflict_id, 'ADMIN', false);

    -- 3.3 Inserção de Evento e Lote Sintéticos
    INSERT INTO public.events (id, title, slug, location)
    VALUES (v_event_id, 'PX CUSTOM TRACK EXPERIENCE 2026', 'px-track-staging-2026', 'Autódromo Staging PX');

    INSERT INTO public.ticket_types (id, event_id, name, price)
    VALUES (v_batch_id, v_event_id, 'Camarote Paddock PX', 250.00);

    -- 3.4 Inserção dos Ingressos Sintéticos para Testes
    INSERT INTO public.tickets (id, ticket_code, event_id, ticket_type_id, user_id, holder_name, price, status, qr_code)
    VALUES
        (gen_random_uuid(), 'PX-STAGING-PAID-001', v_event_id, v_batch_id, v_user_id, 'Carlos Piloto Sintético', 250.00, 'PAID', 'PX-STAGING-PAID-001|STAGING'),
        (gen_random_uuid(), 'PX-STAGING-USED-001', v_event_id, v_batch_id, v_user_id, 'Mariana Drift Sintética', 250.00, 'USED', 'PX-STAGING-USED-001|STAGING'),
        (gen_random_uuid(), 'PX-STAGING-PENDING-001', v_event_id, v_batch_id, v_user_id, 'Eduardo Espera Sintético', 250.00, 'PENDING', 'PX-STAGING-PENDING-001|STAGING'),
        (gen_random_uuid(), 'PX-STAGING-CANCELLED-001', v_event_id, v_batch_id, v_user_id, 'Felipe Cancelado Sintético', 250.00, 'CANCELLED', 'PX-STAGING-CANCELLED-001|STAGING'),
        (gen_random_uuid(), 'PX-STAGING-CONCURRENT-001', v_event_id, v_batch_id, v_user_id, 'Concorrência Teste Sintético', 250.00, 'PAID', 'PX-STAGING-CONCURRENT-001|STAGING');

    RAISE NOTICE 'DADOS SINTÉTICOS DE HOMOLOGAÇÃO INSTALADOS COM SUCESSO.';
END $$;

-- =============================================================================
-- PARTE 4: BATERIA DE ASSERÇÕES UNITÁRIAS (SQL PROCEDURAL EXECUTÁVEL EM STAGING)
-- =============================================================================

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_operator_id UUID := '00000000-0000-0000-0000-000000000002';
    v_user_id UUID := '00000000-0000-0000-0000-000000000003';
    v_inactive_id UUID := '00000000-0000-0000-0000-000000000004';
    v_conflict_id UUID := '00000000-0000-0000-0000-000000000005';
    v_res JSONB;
    v_new_status TEXT;
    v_checkin_count INT;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'INICIANDO ASSERÇÕES UNITÁRIAS DA RPC EM HOMOLOGAÇÃO (v6.31)';
    RAISE NOTICE '=======================================================';

    -- TESTE 1: Operador ADMIN ativo validando ingresso PAID
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-PAID-001', 'Admin Homologação', v_admin_id);
    IF (v_res->>'authorized')::boolean = true AND (v_res->>'reason') = 'CHECK-IN AUTORIZADO' THEN
        RAISE NOTICE '[TESTE 1 APROVADO] ADMIN ativo realizou check-in com sucesso.';
    ELSE
        RAISE EXCEPTION '[TESTE 1 FALHOU] Resposta inesperada: %', v_res;
    END IF;

    -- Verificar efeito colateral no banco
    SELECT status::text INTO v_new_status FROM public.tickets WHERE ticket_code = 'PX-STAGING-PAID-001';
    SELECT COUNT(*) INTO v_checkin_count FROM public.checkins WHERE checked_by = v_admin_id;
    IF v_new_status = 'USED' AND v_checkin_count >= 1 THEN
        RAISE NOTICE '[TESTE 1.1 APROVADO] Efeito colateral confirmado: ticket=USED, checkins gravado.';
    ELSE
        RAISE EXCEPTION '[TESTE 1.1 FALHOU] Efeito colateral incorreto: status=%, checkins=%', v_new_status, v_checkin_count;
    END IF;

    -- TESTE 2: Anti-Duplicidade (tentativa de reuso de ingresso)
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-PAID-001', 'Admin Homologação', v_admin_id);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'INGRESSO JÁ UTILIZADO' THEN
        RAISE NOTICE '[TESTE 2 APROVADO] Anti-duplicidade bloqueou segundo check-in corretamente.';
    ELSE
        RAISE EXCEPTION '[TESTE 2 FALHOU] Anti-duplicidade permitiu reuso: %', v_res;
    END IF;

    -- TESTE 3: Usuário comum (USER) tentando validar check-in
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-USED-001', 'Cliente Comum', v_user_id);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'OPERADOR NÃO AUTORIZADO' THEN
        RAISE NOTICE '[TESTE 3 APROVADO] Usuário comum bloqueado pela RPC com OPERADOR NÃO AUTORIZADO.';
    ELSE
        RAISE EXCEPTION '[TESTE 3 FALHOU] Usuário comum não foi bloqueado: %', v_res;
    END IF;

    -- TESTE 4: Operador inativo (is_active = false)
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-USED-001', 'Operador Desativado', v_inactive_id);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'OPERADOR NÃO AUTORIZADO' THEN
        RAISE NOTICE '[TESTE 4 APROVADO] Operador inativo bloqueado com sucesso.';
    ELSE
        RAISE EXCEPTION '[TESTE 4 FALHOU] Operador inativo não foi bloqueado: %', v_res;
    END IF;

    -- TESTE 5: PRECEDÊNCIA ESTRITA E CONFLITO (admin_users inativo com profiles ativo)
    -- Deve ser BLOQUEADO. Prova que profiles.is_active = true NÃO contorna admin_users.is_active = false
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-USED-001', 'Operador Conflitante', v_conflict_id);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'OPERADOR NÃO AUTORIZADO' THEN
        RAISE NOTICE '[TESTE 5 APROVADO] Precedência estrita confirmada: admin_users inativo prevaleceu sobre profiles ativo.';
    ELSE
        RAISE EXCEPTION '[TESTE 5 FALHOU] Vulnerabilidade de precedência: profiles ativo contornou admin_users inativo: %', v_res;
    END IF;

    -- TESTE 6: Ingresso com pagamento pendente (PENDING)
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-PENDING-001', 'Admin Homologação', v_admin_id);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'PAGAMENTO PENDENTE' THEN
        RAISE NOTICE '[TESTE 6 APROVADO] Ingresso PENDING bloqueado corretamente.';
    ELSE
        RAISE EXCEPTION '[TESTE 6 FALHOU] Ingresso PENDING não foi bloqueado: %', v_res;
    END IF;

    -- TESTE 7: Ingresso cancelado (CANCELLED)
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-CANCELLED-001', 'Admin Homologação', v_admin_id);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'INGRESSO CANCELLED' THEN
        RAISE NOTICE '[TESTE 7 APROVADO] Ingresso CANCELLED bloqueado corretamente.';
    ELSE
        RAISE EXCEPTION '[TESTE 7 FALHOU] Ingresso CANCELLED não foi bloqueado: %', v_res;
    END IF;

    -- TESTE 8: Código inexistente
    v_res := public.fn_validate_and_checkin_ticket('PX-INEXISTENTE-999', 'Admin Homologação', v_admin_id);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'INGRESSO NÃO ENCONTRADO' THEN
        RAISE NOTICE '[TESTE 8 APROVADO] Código inexistente tratado com recusa segura.';
    ELSE
        RAISE EXCEPTION '[TESTE 8 FALHOU] Código inexistente resposta inesperada: %', v_res;
    END IF;

    -- TESTE 9: Identificador do operador nulo (p_operator_id = NULL)
    v_res := public.fn_validate_and_checkin_ticket('PX-STAGING-PENDING-001', 'Admin Homologação', NULL);
    IF (v_res->>'authorized')::boolean = false AND (v_res->>'reason') = 'OPERADOR NÃO IDENTIFICADO' THEN
        RAISE NOTICE '[TESTE 9 APROVADO] p_operator_id = NULL bloqueado imediatamente.';
    ELSE
        RAISE EXCEPTION '[TESTE 9 FALHOU] p_operator_id = NULL não foi bloqueado: %', v_res;
    END IF;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'ASSERÇÕES UNITÁRIAS CONCLUÍDAS COM SUCESSO NO POSTGRESQL (v6.31)!';
    RAISE NOTICE 'OBSERVAÇÃO: O ingresso PX-STAGING-CONCURRENT-001 permanece PAID para o teste de concorrência externo.';
    RAISE NOTICE '=======================================================';
END $$;
