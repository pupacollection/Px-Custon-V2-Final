-- ==============================================================================
-- PX CUSTOM — SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Sistema Oficial PX CUSTOM para Gestão de Eventos Automotivos, Ingressos,
-- Check-in QR Code, Veículos e Módulo Administrativo PX CONTROL.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE event_status_enum AS ENUM ('EM_BREVE', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO');
CREATE TYPE ticket_status_enum AS ENUM ('PENDENTE', 'PAGO', 'UTILIZADO', 'CANCELADO', 'ESTORNADO', 'EXPIRADO');
CREATE TYPE user_role_enum AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR', 'FINANCE', 'SUPPORT');
CREATE TYPE payment_method_enum AS ENUM ('PIX', 'CARTAO', 'BOLETO');
CREATE TYPE vehicle_type_enum AS ENUM ('Carro', 'Moto', 'Caminhão', 'Outro');

-- 3. PROFILES (Vinculado a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30),
    cpf VARCHAR(20),
    city VARCHAR(100) DEFAULT 'Manhuaçu',
    state VARCHAR(10) DEFAULT 'MG',
    avatar_url TEXT,
    role user_role_enum DEFAULT 'USER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VEHICLES (Meus Veículos)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type vehicle_type_enum DEFAULT 'Carro',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(50) NOT NULL,
    plate VARCHAR(20),
    category VARCHAR(50) DEFAULT 'Rebaixado',
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EVENTS (Apenas PX CUSTOM cria e gerencia)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    description TEXT NOT NULL,
    date_badge VARCHAR(20) NOT NULL, -- ex: '15 NOV'
    date_display VARCHAR(100) NOT NULL, -- ex: '15 de Novembro de 2025'
    time_display VARCHAR(100) NOT NULL, -- ex: 'Das 08:00 às 22:00'
    location VARCHAR(255) NOT NULL, -- 'Parque de Exposições - Manhuaçu/MG'
    city VARCHAR(100) NOT NULL DEFAULT 'Manhuaçu',
    state VARCHAR(10) NOT NULL DEFAULT 'MG',
    status event_status_enum DEFAULT 'EM_BREVE',
    banner_image TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    has_cars BOOLEAN DEFAULT TRUE,
    has_motos BOOLEAN DEFAULT TRUE,
    has_audio BOOLEAN DEFAULT TRUE,
    has_food BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EVENT IMAGES (Galeria & Banners Oficiais - Supabase Storage bucket 'events')
CREATE TABLE IF NOT EXISTS public.event_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    bucket VARCHAR(50) DEFAULT 'events',
    storage_path TEXT NOT NULL, -- events/{event_id}/banner/{uuid}.{ext} ou cover ou gallery
    public_url TEXT NOT NULL,
    image_url TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT,
    display_order INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.1 VEHICLE IMAGES (Galeria de Fotos dos Veículos - Supabase Storage bucket 'vehicles')
CREATE TABLE IF NOT EXISTS public.vehicle_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bucket VARCHAR(50) DEFAULT 'vehicles',
    storage_path TEXT NOT NULL, -- vehicles/{user_id}/{vehicle_id}/{uuid}.{ext}
    public_url TEXT NOT NULL,
    image_url TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT,
    display_order INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 UNIFIED MEDIA RECORDS (Registro Unificado de Mídias Persistidas)
CREATE TABLE IF NOT EXISTS public.media_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_path TEXT NOT NULL,
    bucket VARCHAR(50) NOT NULL, -- 'events' | 'vehicles' | 'profiles' | 'branding'
    public_url TEXT NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'event_banner' | 'event_cover' | 'event_gallery' | 'vehicle' | 'profile' | 'branding'
    resource_id VARCHAR(100),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TICKET BATCHES (Lotes de Ingressos: Pista, Camarote, VIP)
CREATE TABLE IF NOT EXISTS public.ticket_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    total_quantity INT NOT NULL,
    sold_quantity INT DEFAULT 0,
    batch_number INT DEFAULT 1,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ORDERS (Pedidos de Compra)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_cpf VARCHAR(20) NOT NULL,
    buyer_phone VARCHAR(30) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method payment_method_enum NOT NULL,
    status ticket_status_enum DEFAULT 'PENDENTE',
    mercadopago_payment_id VARCHAR(100),
    mercadopago_preference_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TICKETS (Ingressos Emitidos com QR Code Único)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- ex: 'PX-2025-ENC-74892'
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.ticket_batches(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_cpf VARCHAR(20) NOT NULL,
    batch_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status ticket_status_enum DEFAULT 'PAGO',
    qr_payload TEXT NOT NULL,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CHECK-INS (Registro de Validação na Portaria)
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
    ticket_code VARCHAR(50) NOT NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    operator_name VARCHAR(255) NOT NULL,
    attendee_name VARCHAR(255) NOT NULL,
    batch_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'CONFIRMADO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PAYMENTS & WEBHOOK EVENTS (Mercado Pago)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'MERCADOPAGO',
    provider_payment_id VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'INFO',
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. AUDIT LOGS (Rastreabilidade Administrativa PX CONTROL)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    target_resource VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. APP SETTINGS (Configurações Gerais & Mercado Pago)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES PARA PERFORMANCE MÁXIMA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON public.checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON public.checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_event_images_event_id ON public.event_images(event_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON public.vehicle_images(vehicle_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Regras Profiles: Usuário lê e edita o próprio perfil; Administradores lêem todos
CREATE POLICY "Public profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')
  ));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Regras Veículos: Usuário gerencia seus próprios veículos; Admins lêem
CREATE POLICY "Users can view own vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
  ));

CREATE POLICY "Users can manage own vehicles"
  ON public.vehicles FOR ALL
  USING (auth.uid() = user_id);

-- Regras Eventos: Todos podem visualizar eventos públicos; Somente admins podem criar/editar
CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
  ));

-- Regras Ingressos: Comprador acessa seus ingressos; Operadores e Admins validam
CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'CHECKIN_OPERATOR')
  ));

-- Regras Media Records
ALTER TABLE public.media_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public media records"
  ON public.media_records FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own media records"
  ON public.media_records FOR ALL
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
  ));

-- ==============================================================================
-- 15. SUPABASE STORAGE — BUCKETS & STORAGE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 15.1 FUNÇÃO AUXILIAR DE SEGURANÇA PARA CHECAGEM DE ADMIN (SECURITY DEFINER)
-- Evita recursão infinita e bypass de RLS na tabela public.profiles durante validação no Storage
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'ADMIN')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 15.2 CRIAÇÃO DOS BUCKETS DEDICADOS
-- events: Banners, capas e galerias de eventos (10 MB, público)
-- vehicles: Fotos dos veículos dos usuários (10 MB, público)
-- profiles: Avatares dos participantes (5 MB, público)
-- branding: Identidade visual oficial e logos institucionais (10 MB, público, permite SVG)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('events', 'events', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]),
  ('vehicles', 'vehicles', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]),
  ('profiles', 'profiles', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]),
  ('branding', 'branding', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 15.3 LIMPEZA PREVENTIVA DE POLÍTICAS ANTERIORES PARA IDEMPOTÊNCIA
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;

DROP POLICY IF EXISTS "Public can view vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own vehicle photos" ON storage.objects;

DROP POLICY IF EXISTS "Public can view profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Public can view branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete branding assets" ON storage.objects;

-- 15.4 POLÍTICAS DE SEGURANÇA (STORAGE.OBJECTS)

-- ------------------------------------------------------------------------------
-- BUCKET: events
-- Leitura pública; inserção, atualização e exclusão por SUPER_ADMIN/ADMIN
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'events');

CREATE POLICY "Admins can upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'events'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Admins can update event images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'events'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    bucket_id = 'events'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Admins can delete event images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'events'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ------------------------------------------------------------------------------
-- BUCKET: vehicles
-- Caminho: {userId}/{vehicleId}/{uuid}.{ext}
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view vehicle images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicles');

CREATE POLICY "Users can upload own vehicle photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Users can update own vehicle photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    bucket_id = 'vehicles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Users can delete own vehicle photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ------------------------------------------------------------------------------
-- BUCKET: profiles
-- Caminho gerado: {userId}/{uuid}.{ext}
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view profile avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profiles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profiles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    bucket_id = 'profiles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profiles'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ------------------------------------------------------------------------------
-- BUCKET: branding
-- Caminho gerado: {category}/{uuid}.{ext}
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view branding assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Admins can update branding assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Admins can delete branding assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND (
      public.is_admin()
      OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ==============================================================================
-- FIM DO SCHEMA PX CUSTOM
-- ==============================================================================
