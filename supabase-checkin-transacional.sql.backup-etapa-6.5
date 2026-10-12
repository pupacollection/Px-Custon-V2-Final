-- =============================================================================
-- PX CUSTON — FUNÇÃO TRANSACIONAL DE CHECK-IN ATÔMICO
-- Arquivo: /supabase-checkin-transacional.sql
-- ESCOPO: Prevenir concorrência e garantir atomicidade (ingresso + log de check-in)
-- INSTRUÇÃO: Executar no SQL Editor do Supabase como migração não-destrutiva.
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
    v_ticket RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_clean_code VARCHAR;
BEGIN
    -- Sanitização do código do ingresso
    v_clean_code := UPPER(TRIM(SPLIT_PART(p_ticket_code, '|', 1)));

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'CÓDIGO AUSENTE',
            'details', 'Informe o código do ingresso ou escaneie o QR Code.'
        );
    END IF;

    -- Verificação de autorização do operador (se ID fornecido)
    IF p_operator_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.admin_users WHERE user_id = p_operator_id
            UNION
            SELECT 1 FROM public.profiles WHERE id = p_operator_id AND role IN ('ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR', 'OPERADOR')
        ) AND (
            -- Só restringe se houver administradores configurados no sistema
            EXISTS (SELECT 1 FROM public.admin_users) OR EXISTS (SELECT 1 FROM public.profiles WHERE role IN ('ADMIN', 'SUPER_ADMIN'))
        ) THEN
            RETURN jsonb_build_object(
                'authorized', FALSE,
                'reason', 'OPERADOR NÃO AUTORIZADO',
                'details', 'O operador informado não possui credenciais autorizadas para realizar check-in.'
            );
        END IF;
    END IF;

    -- 1. Bloqueio pessimista de linha (FOR UPDATE) na tabela tickets pela coluna oficial ticket_code
    SELECT *
    INTO v_ticket
    FROM public.tickets
    WHERE ticket_code = v_clean_code
    FOR UPDATE;

    -- Ingresso não encontrado
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'INGRESSO NÃO ENCONTRADO',
            'details', 'Código de ingresso não localizado na base oficial do evento.',
            'ticket', NULL
        );
    END IF;

    -- Ingresso já utilizado
    IF v_ticket.status::text IN ('USED', 'UTILIZADO') THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'INGRESSO JÁ UTILIZADO',
            'details', 'Este ingresso já realizou check-in anteriormente. Entrada duplicada proibida.',
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- Pagamento pendente
    IF v_ticket.status::text IN ('PENDING', 'PENDENTE') THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', 'PAGAMENTO PENDENTE',
            'details', 'O pagamento deste ingresso ainda não foi confirmado pelo Mercado Pago.',
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- Outro status não permitido (CANCELLED, REFUNDED, etc)
    IF v_ticket.status::text NOT IN ('PAID', 'PAGO') THEN
        RETURN jsonb_build_object(
            'authorized', FALSE,
            'reason', FORMAT('INGRESSO %s', v_ticket.status),
            'details', FORMAT('O status atual do ingresso é %s. Entrada não permitida.', v_ticket.status),
            'ticket', row_to_json(v_ticket)
        );
    END IF;

    -- 2. Transação Atômica: Atualização do status do ingresso para USED
    UPDATE public.tickets
    SET status = 'USED'
    WHERE id = v_ticket.id;

    v_ticket.status := 'USED';

    -- 3. Transação Atômica: Inserção do log em public.checkins
    INSERT INTO public.checkins (
        ticket_id,
        event_id,
        device_info,
        created_at
    ) VALUES (
        v_ticket.id,
        v_ticket.event_id,
        jsonb_build_object(
            'operator_name', p_operator_name,
            'operator_id', p_operator_id,
            'ticket_code', v_clean_code,
            'status', 'CONFIRMADO',
            'timestamp', v_now
        )::text,
        v_now
    );

    RETURN jsonb_build_object(
        'authorized', TRUE,
        'reason', 'CHECK-IN AUTORIZADO',
        'details', 'Acesso liberado com sucesso. Bem-vindo à experiência PX CUSTOM!',
        'ticket', row_to_json(v_ticket)
    );
END;
$$;

-- Permissão de execução restrita a authenticated e service_role
GRANT EXECUTE ON FUNCTION public.fn_validate_and_checkin_ticket(VARCHAR, VARCHAR, UUID) TO authenticated, service_role;

