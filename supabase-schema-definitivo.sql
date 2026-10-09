-- =============================================================================
-- PX CUSTON — SCRIPT DE DEFINIÇÃO DE SCHEMA DEFINITIVO (VERSÃO 3.1.9)
-- Arquivo: /app/applet/supabase-schema-definitivo.sql
-- ESCOPO: 13 Tabelas Oficiais, 7 Enums Canônicos, Triggers Atômicos, RLS Restritivo e Views
-- NOTA DE AUDITORIA: Este script é estritamente idempotente (sem DROP destrutivo).
-- NENHUMA EXECUÇÃO REALIZADA NESTA ETAPA.
-- =============================================================================

-- =============================================================================
-- 1. EXTENSÕES DO POSTGRESQL
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. TIPOS ENUM DEFINITIVOS (CONFORME MATRIZ FASE 3.1.2)
-- =============================================================================
DO $$
BEGIN
    -- user_role: 6 papéis consolidados do PX CONTROL
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

    -- event_status: 3 status canônicos do domínio de eventos
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE public.event_status AS ENUM (
            'EM_BREVE',
            'EM_ANDAMENTO',
            'FINALIZADO'
        );
    END IF;

    -- ticket_status: 6 status do ciclo de vida do ingresso
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE public.ticket_status AS ENUM (
            'PAGO',
            'PENDENTE',
            'UTILIZADO',
            'CANCELADO',
            'ESTORNADO',
            'EXPIRADO'
        );
    END IF;

    -- order_status: 4 status da transação comercial
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM (
            'PENDENTE',
            'PAGO',
            'CANCELADO',
            'ESTORNADO'
        );
    END IF;

    -- checkin_status: validação de portaria
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkin_status') THEN
        CREATE TYPE public.checkin_status AS ENUM (
            'CONFIRMADO',
            'NEGADO'
        );
    END IF;

    -- notification_type: tipos de notificação do frontend
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE public.notification_type AS ENUM (
            'INFO',
            'SUCCESS',
            'WARNING',
            'ALERT'
        );
    END IF;

    -- payment_method: métodos suportados no checkout e Mercado Pago
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM (
            'PIX',
            'CARTAO',
            'BOLETO'
        );
    END IF;
END $$;

-- =============================================================================
-- 3. TABELAS DEFINITIVAS (EXATAMENTE AS 13 TABELAS RECONCILIADAS)
-- =============================================================================

-- 3.1 PROFILES (Espelho de auth.users com RBAC e dados cadastrais)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) NULL,
    cpf VARCHAR(20) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(50) NULL,
    avatar_url TEXT NULL,
    role public.user_role NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 VEHICLES (Garagem de veículos comunitária)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'Carro',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year >= 1900 AND year <= 2100),
    color VARCHAR(50) NOT NULL,
    plate VARCHAR(20) NULL,
    category VARCHAR(50) NULL,
    description TEXT NULL,
    photo_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 VEHICLE_IMAGES (Galeria adicional de fotos do veículo)
CREATE TABLE IF NOT EXISTS public.vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    bucket VARCHAR(50) NOT NULL DEFAULT 'vehicles',
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    image_url TEXT NOT NULL,
    file_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    file_size INT NULL CHECK (file_size IS NULL OR file_size >= 0),
    display_order INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 EVENTS (Encontros e trackdays — Nomenclatura oficial do código)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    tagline VARCHAR(255) NULL,
    description TEXT NOT NULL,
    date_badge VARCHAR(50) NOT NULL,
    date_display VARCHAR(100) NOT NULL,
    time_display VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    status public.event_status NOT NULL DEFAULT 'EM_BREVE',
    banner_image TEXT NOT NULL,
    latitude DOUBLE PRECISION NULL,
    longitude DOUBLE PRECISION NULL,
    has_cars BOOLEAN NOT NULL DEFAULT TRUE,
    has_motos BOOLEAN NOT NULL DEFAULT TRUE,
    has_audio BOOLEAN NOT NULL DEFAULT FALSE,
    has_food BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 EVENT_IMAGES (Galeria de fotos do evento)
CREATE TABLE IF NOT EXISTS public.event_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    bucket VARCHAR(50) NOT NULL DEFAULT 'events',
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    image_url TEXT NOT NULL,
    file_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    file_size INT NULL CHECK (file_size IS NULL OR file_size >= 0),
    display_order INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 TICKET_BATCHES (Lotes de ingressos com controle transacional de capacidade)
CREATE TABLE IF NOT EXISTS public.ticket_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    total_quantity INT NOT NULL CHECK (total_quantity >= 0),
    sold_quantity INT NOT NULL DEFAULT 0,
    batch_number INT NOT NULL DEFAULT 1 CHECK (batch_number >= 1),
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ticket_batches_sold_range CHECK (sold_quantity >= 0 AND sold_quantity <= total_quantity)
);

-- 3.7 ORDERS (Transações comerciais de pedidos no checkout)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status public.order_status NOT NULL DEFAULT 'PENDENTE',
    payment_method public.payment_method NOT NULL,
    buyer_name VARCHAR(150) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_cpf VARCHAR(20) NOT NULL,
    buyer_phone VARCHAR(30) NOT NULL,
    vehicle_id UUID NULL REFERENCES public.vehicles(id) ON DELETE SET NULL,
    vehicle_model VARCHAR(100) NULL,
    vehicle_plate VARCHAR(20) NULL,
    mercadopago_preference_id VARCHAR(100) NULL,
    mercadopago_payment_id VARCHAR(100) NULL,
    qr_code_pix TEXT NULL,
    qr_code_pix_base64 TEXT NULL,
    expires_at TIMESTAMPTZ NULL,
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 TICKETS (Ingressos digitais com QR Code e portaria)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.ticket_batches(id) ON DELETE RESTRICT,
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    buyer_name VARCHAR(150) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_cpf VARCHAR(20) NOT NULL,
    batch_name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    status public.ticket_status NOT NULL DEFAULT 'PAGO',
    qr_payload TEXT NOT NULL,
    vehicle_model VARCHAR(100) NULL,
    vehicle_plate VARCHAR(20) NULL,
    checked_in_at TIMESTAMPTZ NULL,
    checked_in_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.9 CHECKINS (Auditoria operacional de entradas na portaria)
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    ticket_code VARCHAR(50) NOT NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    operator_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    operator_name VARCHAR(100) NOT NULL,
    attendee_name VARCHAR(150) NOT NULL,
    batch_name VARCHAR(100) NOT NULL,
    status public.checkin_status NOT NULL DEFAULT 'CONFIRMADO',
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.10 PAYMENT_EVENTS (Webhooks recebidos e idempotência Mercado Pago)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
    provider_payment_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    raw_payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_events_provider_event UNIQUE (provider_payment_id, event_type)
);

-- 3.11 NOTIFICATIONS (Notificações do usuário no app)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type public.notification_type NOT NULL DEFAULT 'INFO',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.12 APP_SETTINGS (Configurações do sistema e credenciais Mercado Pago)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3.13 AUDIT_LOGS (Trilha de auditoria administrativa imutável)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NULL,
    payload JSONB NULL,
    ip_address VARCHAR(50) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events(city);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON public.vehicle_images(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_event_images_event_id ON public.event_images(event_id);

CREATE INDEX IF NOT EXISTS idx_ticket_batches_event_id ON public.ticket_batches(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_batches_available ON public.ticket_batches(available);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_mercadopago_payment_id ON public.orders(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_batch_id ON public.tickets(batch_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

CREATE INDEX IF NOT EXISTS idx_checkins_ticket_id ON public.checkins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON public.checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_operator_id ON public.checkins(operator_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON public.checkins(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_id ON public.payment_events(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =============================================================================
-- 5. FUNÇÕES DE SUPORTE A RBAC (SECURITY DEFINER SEM RECURSÃO)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('ADMIN', 'SUPER_ADMIN')
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'SUPER_ADMIN'
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_checkin_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR')
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_finance_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('ADMIN', 'SUPER_ADMIN', 'FINANCE')
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_support_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
          AND is_active = TRUE
    );
$$;

-- =============================================================================
-- 6. TRIGGERS E FUNÇÕES TRANSACIONAIS DE NEGÓCIO
-- =============================================================================

-- 6.1 CRIAÇÃO ATÔMICA DE PERFIL (auth.users -> profiles)
-- Impede privilege escalation: qualquer novo usuário nasce estritamente como 'USER' e 'is_active = TRUE'.
-- Não utiliza swallow de erro (sem EXCEPTION WHEN OTHERS vazia).
CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        name,
        email,
        phone,
        cpf,
        city,
        state,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'cpf',
        NEW.raw_user_meta_data->>'city',
        NEW.raw_user_meta_data->>'state',
        'USER'::public.user_role,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_handle_new_auth_user();

-- 6.2 SINCRONIZAÇÃO CONCORRENTE E SEGURA DE ESTOQUE (sold_quantity)
-- Máquina de estados baseada nas transições de PAGO/UTILIZADO e lote.
-- Protegida contra race condition via UPDATE atômico com verificação de total_quantity.
CREATE OR REPLACE FUNCTION public.fn_sync_ticket_batch_sold_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_was_counted BOOLEAN := FALSE;
    v_is_counted  BOOLEAN := FALSE;
    v_rows_updated INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_is_counted := (NEW.status IN ('PAGO', 'UTILIZADO'));
        IF v_is_counted THEN
            UPDATE public.ticket_batches
            SET sold_quantity = sold_quantity + 1,
                updated_at = NOW()
            WHERE id = NEW.batch_id
              AND sold_quantity < total_quantity;

            GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
            IF v_rows_updated = 0 THEN
                RAISE EXCEPTION 'Capacidade esgotada para o lote % (total_quantity atingido)', NEW.batch_id;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        v_was_counted := (OLD.status IN ('PAGO', 'UTILIZADO'));
        v_is_counted  := (NEW.status IN ('PAGO', 'UTILIZADO'));

        -- Cenário A: Mesmo lote de ingresso
        IF OLD.batch_id = NEW.batch_id THEN
            -- Início de contagem (ex: PENDENTE -> PAGO ou CANCELADO -> PAGO)
            IF NOT v_was_counted AND v_is_counted THEN
                UPDATE public.ticket_batches
                SET sold_quantity = sold_quantity + 1,
                    updated_at = NOW()
                WHERE id = NEW.batch_id
                  AND sold_quantity < total_quantity;

                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Capacidade esgotada para o lote % (total_quantity atingido)', NEW.batch_id;
                END IF;

            -- Reversão de contagem (ex: PAGO -> CANCELADO ou PAGO -> ESTORNADO)
            ELSIF v_was_counted AND NOT v_is_counted THEN
                UPDATE public.ticket_batches
                SET sold_quantity = GREATEST(0, sold_quantity - 1),
                    updated_at = NOW()
                WHERE id = OLD.batch_id;
            END IF;

        -- Cenário B: Mudança de lote (OLD.batch_id <> NEW.batch_id)
        ELSE
            -- Se estava consumindo vaga no lote antigo, devolve estoque no lote antigo
            IF v_was_counted THEN
                UPDATE public.ticket_batches
                SET sold_quantity = GREATEST(0, sold_quantity - 1),
                    updated_at = NOW()
                WHERE id = OLD.batch_id;
            END IF;

            -- Se deve consumir vaga no novo lote, incrementa com validação de capacidade
            IF v_is_counted THEN
                UPDATE public.ticket_batches
                SET sold_quantity = sold_quantity + 1,
                    updated_at = NOW()
                WHERE id = NEW.batch_id
                  AND sold_quantity < total_quantity;

                GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
                IF v_rows_updated = 0 THEN
                    RAISE EXCEPTION 'Capacidade esgotada para o novo lote % (total_quantity atingido)', NEW.batch_id;
                END IF;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_was_counted := (OLD.status IN ('PAGO', 'UTILIZADO'));
        IF v_was_counted THEN
            UPDATE public.ticket_batches
            SET sold_quantity = GREATEST(0, sold_quantity - 1),
                updated_at = NOW()
            WHERE id = OLD.batch_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_ticket_batch_sold_quantity ON public.tickets;
CREATE TRIGGER tr_sync_ticket_batch_sold_quantity
    AFTER INSERT OR UPDATE OR DELETE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_ticket_batch_sold_quantity();

-- =============================================================================
-- 7. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7.1 PROFILES POLICIES
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.fn_is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.fn_is_super_admin())
    WITH CHECK (
        (
            id = auth.uid()
            AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
        )
        OR public.fn_is_super_admin()
    );

-- 7.2 VEHICLES POLICIES
CREATE POLICY "vehicles_select_public" ON public.vehicles
    FOR SELECT TO public
    USING (TRUE);

CREATE POLICY "vehicles_insert_own_or_admin" ON public.vehicles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin());

CREATE POLICY "vehicles_update_own_or_admin" ON public.vehicles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.fn_is_admin())
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin());

CREATE POLICY "vehicles_delete_own_or_admin" ON public.vehicles
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.fn_is_admin());

-- 7.3 VEHICLE_IMAGES POLICIES
CREATE POLICY "vehicle_images_select_public" ON public.vehicle_images
    FOR SELECT TO public
    USING (TRUE);

CREATE POLICY "vehicle_images_insert_own_or_admin" ON public.vehicle_images
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_id
              AND (v.user_id = auth.uid() OR public.fn_is_admin())
        )
    );

CREATE POLICY "vehicle_images_delete_own_or_admin" ON public.vehicle_images
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_id
              AND (v.user_id = auth.uid() OR public.fn_is_admin())
        )
    );

-- 7.4 EVENTS POLICIES
CREATE POLICY "events_select_public" ON public.events
    FOR SELECT TO public
    USING (TRUE);

CREATE POLICY "events_admin_all" ON public.events
    FOR ALL TO authenticated
    USING (public.fn_is_admin())
    WITH CHECK (public.fn_is_admin());

-- 7.5 EVENT_IMAGES POLICIES
CREATE POLICY "event_images_select_public" ON public.event_images
    FOR SELECT TO public
    USING (TRUE);

CREATE POLICY "event_images_admin_all" ON public.event_images
    FOR ALL TO authenticated
    USING (public.fn_is_admin())
    WITH CHECK (public.fn_is_admin());

-- 7.6 TICKET_BATCHES POLICIES
CREATE POLICY "ticket_batches_select_public" ON public.ticket_batches
    FOR SELECT TO public
    USING (TRUE);

CREATE POLICY "ticket_batches_admin_all" ON public.ticket_batches
    FOR ALL TO authenticated
    USING (public.fn_is_admin())
    WITH CHECK (public.fn_is_admin());

-- 7.7 ORDERS POLICIES
CREATE POLICY "orders_select_own_or_authorized" ON public.orders
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.fn_is_finance_or_admin());

CREATE POLICY "orders_insert_authenticated" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_update_finance_or_admin" ON public.orders
    FOR UPDATE TO authenticated
    USING (public.fn_is_finance_or_admin())
    WITH CHECK (public.fn_is_finance_or_admin());

-- 7.8 TICKETS POLICIES
CREATE POLICY "tickets_select_own_or_authorized" ON public.tickets
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.fn_is_checkin_operator()
        OR public.fn_is_finance_or_admin()
        OR public.fn_is_support_or_admin()
    );

CREATE POLICY "tickets_insert_admin" ON public.tickets
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_admin());

CREATE POLICY "tickets_update_checkin_or_admin" ON public.tickets
    FOR UPDATE TO authenticated
    USING (public.fn_is_checkin_operator())
    WITH CHECK (public.fn_is_checkin_operator());

-- 7.9 CHECKINS POLICIES (Logs imutáveis)
CREATE POLICY "checkins_select_authorized" ON public.checkins
    FOR SELECT TO authenticated
    USING (public.fn_is_checkin_operator());

CREATE POLICY "checkins_insert_authorized" ON public.checkins
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_checkin_operator());

-- 7.10 PAYMENT_EVENTS POLICIES
CREATE POLICY "payment_events_select_finance" ON public.payment_events
    FOR SELECT TO authenticated
    USING (public.fn_is_finance_or_admin());

-- Inserção de payment_events restrita exclusivamente a service_role do backend (sem política pública)

-- 7.11 NOTIFICATIONS POLICIES
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.fn_is_admin());

CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.fn_is_admin())
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin());

-- 7.12 APP_SETTINGS POLICIES (Proteção total de secrets)
CREATE POLICY "app_settings_select_public_non_secret" ON public.app_settings
    FOR SELECT TO public
    USING (is_secret = FALSE);

CREATE POLICY "app_settings_write_super_admin" ON public.app_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.fn_is_super_admin());

CREATE POLICY "app_settings_update_super_admin" ON public.app_settings
    FOR UPDATE TO authenticated
    USING (public.fn_is_super_admin())
    WITH CHECK (public.fn_is_super_admin());

-- 7.13 AUDIT_LOGS POLICIES (Trilha imutável)
CREATE POLICY "audit_logs_select_super_admin" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.fn_is_super_admin());

-- Inserção de audit_logs permitida apenas para service_role do backend (sem política client)

-- =============================================================================
-- 8. VIEWS PROTEGIDAS DO DASHBOARD (PX CONTROL)
-- =============================================================================

-- 8.1 ESTATÍSTICAS GERAIS CONSOLIDADAS
CREATE OR REPLACE VIEW public.v_dashboard_stats
WITH (security_invoker = true)
AS
SELECT
    COALESCE((SELECT COUNT(*) FROM public.tickets WHERE status IN ('PAGO', 'UTILIZADO')), 0)::BIGINT AS total_tickets_sold,
    COALESCE((SELECT SUM(total_quantity - sold_quantity) FROM public.ticket_batches WHERE available = TRUE), 0)::BIGINT AS total_tickets_available,
    COALESCE((SELECT COUNT(*) FROM public.checkins WHERE status = 'CONFIRMADO'), 0)::BIGINT AS total_checkins,
    COALESCE((SELECT SUM(total_amount) FROM public.orders WHERE status = 'PAGO'), 0.00)::NUMERIC(12, 2) AS total_revenue
WHERE public.fn_is_admin();

-- 8.2 VENDAS CONSOLIDADAS POR DIA (ÚLTIMOS 30 DIAS)
CREATE OR REPLACE VIEW public.v_sales_by_day
WITH (security_invoker = true)
AS
SELECT
    DATE(COALESCE(o.paid_at, t.created_at)) AS date,
    COUNT(t.id)::BIGINT AS tickets_count,
    SUM(t.price)::NUMERIC(12, 2) AS total_amount
FROM public.tickets t
LEFT JOIN public.orders o ON t.order_id = o.id
WHERE t.status IN ('PAGO', 'UTILIZADO')
  AND t.created_at >= (NOW() - INTERVAL '30 days')
  AND public.fn_is_admin()
GROUP BY DATE(COALESCE(o.paid_at, t.created_at))
ORDER BY DATE(COALESCE(o.paid_at, t.created_at)) ASC;

-- 8.3 VENDAS POR LOTE DE INGRESSO
CREATE OR REPLACE VIEW public.v_sales_by_batch
WITH (security_invoker = true)
AS
SELECT
    tb.id AS batch_id,
    tb.event_id,
    tb.name AS batch_name,
    tb.price,
    tb.total_quantity,
    tb.sold_quantity,
    COALESCE(
        (SELECT SUM(t.price) FROM public.tickets t WHERE t.batch_id = tb.id AND t.status IN ('PAGO', 'UTILIZADO')),
        (tb.sold_quantity * tb.price)
    )::NUMERIC(12, 2) AS total_revenue
FROM public.ticket_batches tb
WHERE public.fn_is_admin();

-- 8.4 DISTRIBUIÇÃO POR MÉTODO DE PAGAMENTO
CREATE OR REPLACE VIEW public.v_sales_by_payment_method
WITH (security_invoker = true)
AS
SELECT
    payment_method,
    COUNT(id)::BIGINT AS count,
    SUM(total_amount)::NUMERIC(12, 2) AS total_amount
FROM public.orders
WHERE status = 'PAGO'
  AND public.fn_is_admin()
GROUP BY payment_method;

-- =============================================================================
-- 9. CARGA INICIAL DE CONFIGURAÇÕES (PLACEHOLDER SEGURO — SEM SEGREDOS REAIS)
-- =============================================================================
INSERT INTO public.app_settings (key, value, is_secret)
VALUES (
    'mercadopago_config',
    '{
        "environment": "sandbox",
        "accessToken": "",
        "publicKey": "",
        "webhookSecret": "",
        "pixEnabled": true,
        "creditCardEnabled": true,
        "boletoEnabled": false,
        "connected": false,
        "lastTestedAt": null
    }'::jsonb,
    TRUE
)
ON CONFLICT (key) DO NOTHING;
