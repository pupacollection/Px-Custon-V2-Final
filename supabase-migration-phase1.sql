-- ==============================================================================
-- PX CUSTOM — MIGRATION IDEMPOTENTE FASE 1 (ALINHAMENTO DO SCHEMA)
-- ==============================================================================
-- Execução segura, idempotente, incremental sem perdas de dados e sem DROP TABLE.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUM (Idempotente com blocos DO)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status_enum') THEN
        CREATE TYPE event_status_enum AS ENUM ('EM_BREVE', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status_enum') THEN
        CREATE TYPE ticket_status_enum AS ENUM ('PENDENTE', 'PAGO', 'UTILIZADO', 'CANCELADO', 'ESTORNADO', 'EXPIRADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'CHECKIN_OPERATOR', 'FINANCE', 'SUPPORT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('PIX', 'CARTAO', 'BOLETO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type_enum') THEN
        CREATE TYPE vehicle_type_enum AS ENUM ('Carro', 'Moto', 'Caminhão', 'Outro');
    END IF;
END $$;

-- 3. FUNÇÃO AUXILIAR DE ADMIN (SECURITY DEFINER)
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

-- 4. TABELAS & COLUNAS INCREMENTAIS (ADD COLUMN IF NOT EXISTS)

-- 4.1 PROFILES
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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Manhuaçu';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'MG';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role_enum DEFAULT 'USER';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4.2 VEHICLES
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
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS type vehicle_type_enum DEFAULT 'Carro';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Rebaixado';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4.3 EVENTS
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    tagline VARCHAR(255),
    description TEXT,
    date_badge VARCHAR(20) DEFAULT 'EM BREVE',
    date_display VARCHAR(100) DEFAULT 'A definir',
    time_display VARCHAR(100) DEFAULT 'A definir',
    location VARCHAR(255) DEFAULT 'Parque de Exposições - Manhuaçu/MG',
    city VARCHAR(100) NOT NULL DEFAULT 'Manhuaçu',
    state VARCHAR(10) NOT NULL DEFAULT 'MG',
    status event_status_enum DEFAULT 'EM_BREVE',
    banner_image TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    has_cars BOOLEAN DEFAULT TRUE,
    has_motos BOOLEAN DEFAULT TRUE,
    has_audio BOOLEAN DEFAULT TRUE,
    has_food BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date_badge VARCHAR(20) DEFAULT 'EM BREVE';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date_display VARCHAR(100) DEFAULT 'A definir';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS time_display VARCHAR(100) DEFAULT 'A definir';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Parque de Exposições - Manhuaçu/MG';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Manhuaçu';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS state VARCHAR(10) DEFAULT 'MG';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_cars BOOLEAN DEFAULT TRUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_motos BOOLEAN DEFAULT TRUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_audio BOOLEAN DEFAULT TRUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_food BOOLEAN DEFAULT TRUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sincronizar nome caso coluna legada 'title' contenha valor
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'title'
    ) THEN
        UPDATE public.events SET name = title WHERE name IS NULL AND title IS NOT NULL;
    END IF;
END $$;

-- 4.4 EVENT IMAGES
CREATE TABLE IF NOT EXISTS public.event_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    bucket VARCHAR(50) DEFAULT 'events',
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    image_url TEXT,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT,
    display_order INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.event_images ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.event_images ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE public.event_images ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE public.event_images ADD COLUMN IF NOT EXISTS file_size INT;
ALTER TABLE public.event_images ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE public.event_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4.5 VEHICLE IMAGES
CREATE TABLE IF NOT EXISTS public.vehicle_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bucket VARCHAR(50) DEFAULT 'vehicles',
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    image_url TEXT,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT,
    display_order INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.6 MEDIA RECORDS
CREATE TABLE IF NOT EXISTS public.media_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_path TEXT NOT NULL,
    bucket VARCHAR(50) NOT NULL,
    public_url TEXT NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
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

-- 4.7 TICKET BATCHES
CREATE TABLE IF NOT EXISTS public.ticket_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    total_quantity INT DEFAULT 500,
    sold_quantity INT DEFAULT 0,
    batch_number INT DEFAULT 1,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS total_quantity INT DEFAULT 500;
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS batch_number INT DEFAULT 1;
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4.8 ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(255) DEFAULT '',
    buyer_email VARCHAR(255) DEFAULT '',
    buyer_cpf VARCHAR(20) DEFAULT '',
    buyer_phone VARCHAR(30) DEFAULT '',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_method payment_method_enum DEFAULT 'PIX',
    status ticket_status_enum DEFAULT 'PENDENTE',
    mercadopago_payment_id VARCHAR(100),
    mercadopago_preference_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255) DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(255) DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_cpf VARCHAR(20) DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(30) DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method payment_method_enum DEFAULT 'PIX';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mercadopago_payment_id VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mercadopago_preference_id VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4.9 TICKETS
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    buyer_name VARCHAR(255) DEFAULT '',
    buyer_email VARCHAR(255) DEFAULT '',
    buyer_cpf VARCHAR(20) DEFAULT '',
    batch_name VARCHAR(100) DEFAULT 'Pista',
    price DECIMAL(10, 2) DEFAULT 0.00,
    status ticket_status_enum DEFAULT 'PAGO',
    qr_payload TEXT,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE RESTRICT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255) DEFAULT '';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(255) DEFAULT '';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_cpf VARCHAR(20) DEFAULT '';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100) DEFAULT 'Pista';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS qr_payload TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4.10 CHECKINS
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE RESTRICT,
    ticket_code VARCHAR(50) DEFAULT '',
    event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT,
    operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    operator_name VARCHAR(255) DEFAULT 'Operador PX Portaria',
    attendee_name VARCHAR(255) DEFAULT 'Participante',
    batch_name VARCHAR(100) DEFAULT 'Geral',
    status VARCHAR(20) DEFAULT 'CONFIRMADO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(50) DEFAULT '';
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS operator_name VARCHAR(255) DEFAULT 'Operador PX Portaria';
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS attendee_name VARCHAR(255) DEFAULT 'Participante';
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100) DEFAULT 'Geral';
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'CONFIRMADO';

-- 4.11 PAYMENT EVENTS
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'MERCADOPAGO',
    provider_payment_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(100);
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- 4.12 NOTIFICATIONS
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
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- 4.13 AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    target_resource VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_resource VARCHAR(100) DEFAULT 'system';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

-- 4.14 APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÍNDICES ESSENCIAIS (CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON public.checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON public.checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_event_images_event_id ON public.event_images(event_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON public.vehicle_images(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
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
ALTER TABLE public.media_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 7. POLICIES IDEMPOTENTES (DROP IF EXISTS & CREATE)

-- 7.1 PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Public profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 7.2 VEHICLES
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;
CREATE POLICY "Users can view own vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can manage own vehicles" ON public.vehicles;
CREATE POLICY "Users can manage own vehicles"
  ON public.vehicles FOR ALL
  USING (auth.uid() = user_id OR public.is_admin());

-- 7.3 EVENTS & TICKET BATCHES
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view ticket batches" ON public.ticket_batches;
CREATE POLICY "Anyone can view ticket batches"
  ON public.ticket_batches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage ticket batches" ON public.ticket_batches;
CREATE POLICY "Admins can manage ticket batches"
  ON public.ticket_batches FOR ALL
  USING (public.is_admin());

-- 7.4 ORDERS
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- 7.5 TICKETS
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('CHECKIN_OPERATOR')
  ));

DROP POLICY IF EXISTS "Admins and Operators can manage tickets" ON public.tickets;
CREATE POLICY "Admins and Operators can manage tickets"
  ON public.tickets FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('CHECKIN_OPERATOR')
  ));

-- 7.6 CHECKINS
DROP POLICY IF EXISTS "Operators and Admins can view checkins" ON public.checkins;
CREATE POLICY "Operators and Admins can view checkins"
  ON public.checkins FOR SELECT
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('CHECKIN_OPERATOR')
  ));

DROP POLICY IF EXISTS "Operators and Admins can insert checkins" ON public.checkins;
CREATE POLICY "Operators and Admins can insert checkins"
  ON public.checkins FOR INSERT
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('CHECKIN_OPERATOR')
  ));

-- 7.7 NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 7.8 APP SETTINGS
DROP POLICY IF EXISTS "Public can view public settings" ON public.app_settings;
CREATE POLICY "Public can view public settings"
  ON public.app_settings FOR SELECT
  USING (is_public = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL
  USING (public.is_admin());

-- 8. STORAGE BUCKETS (PROVISIONAMENTO SEGURO)
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

-- 9. STORAGE POLICIES
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
CREATE POLICY "Public can view event images"
  ON storage.objects FOR SELECT USING (bucket_id = 'events');

DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
CREATE POLICY "Admins can upload event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'events' AND public.is_admin());

DROP POLICY IF EXISTS "Public can view vehicle images" ON storage.objects;
CREATE POLICY "Public can view vehicle images"
  ON storage.objects FOR SELECT USING (bucket_id = 'vehicles');

DROP POLICY IF EXISTS "Users can upload own vehicle photos" ON storage.objects;
CREATE POLICY "Users can upload own vehicle photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicles' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Public can view profile avatars" ON storage.objects;
CREATE POLICY "Public can view profile avatars"
  ON storage.objects FOR SELECT USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profiles' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Public can view branding assets" ON storage.objects;
CREATE POLICY "Public can view branding assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Admins can upload branding assets" ON storage.objects;
CREATE POLICY "Admins can upload branding assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.is_admin());
