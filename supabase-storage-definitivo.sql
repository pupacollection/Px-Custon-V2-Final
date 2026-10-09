-- =============================================================================
-- PX CUSTON — SCRIPT DE DEFINIÇÃO DE STORAGE DEFINITIVO (VERSÃO 3.1.6)
-- Arquivo: /app/applet/supabase-storage-definitivo.sql
-- ESCOPO: 4 Buckets Oficiais (events, vehicles, profiles, branding) e Políticas
-- NOTA DE AUDITORIA: Este script é estritamente idempotente (sem DROP destrutivo).
-- NENHUMA EXECUÇÃO REALIZADA NESTA ETAPA.
-- =============================================================================

-- =============================================================================
-- 1. CRIAÇÃO DOS 4 BUCKETS OFICIAIS (10MB, TIPOS MIME SEGUROS)
-- =============================================================================

-- 1.1 Bucket: events (Banners, capas e galeria de fotos de eventos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'events',
    'events',
    TRUE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 1.2 Bucket: vehicles (Garagem comunitária — Isolado por userId/vehicleId)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehicles',
    'vehicles',
    TRUE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 1.3 Bucket: profiles (Avatares de usuários — Isolado por userId)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profiles',
    'profiles',
    TRUE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 1.4 Bucket: branding (Logotipos, banners institucionais e identidade visual)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'branding',
    'branding',
    TRUE,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- 2. POLÍTICAS DE ACESSO E SEGURANÇA (storage.objects)
-- =============================================================================

-- =============================================================================
-- 2.1 BUCKET: EVENTS
-- Caminho: events/{eventId}/...
-- Leitura pública | Escrita restrita a ADMIN e SUPER_ADMIN
-- =============================================================================
DROP POLICY IF EXISTS "storage_events_select" ON storage.objects;
CREATE POLICY "storage_events_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'events');

DROP POLICY IF EXISTS "storage_events_insert_admin" ON storage.objects;
CREATE POLICY "storage_events_insert_admin" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'events' AND public.fn_is_admin());

DROP POLICY IF EXISTS "storage_events_update_admin" ON storage.objects;
CREATE POLICY "storage_events_update_admin" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'events' AND public.fn_is_admin());

DROP POLICY IF EXISTS "storage_events_delete_admin" ON storage.objects;
CREATE POLICY "storage_events_delete_admin" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'events' AND public.fn_is_admin());

-- =============================================================================
-- 2.2 BUCKET: VEHICLES
-- Caminho: vehicles/{userId}/{vehicleId}/...
-- Leitura pública | Escrita restrita ao proprietário (userId) ou ADMIN
-- =============================================================================
DROP POLICY IF EXISTS "storage_vehicles_select" ON storage.objects;
CREATE POLICY "storage_vehicles_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'vehicles');

DROP POLICY IF EXISTS "storage_vehicles_insert_own_or_admin" ON storage.objects;
CREATE POLICY "storage_vehicles_insert_own_or_admin" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'vehicles'
        AND (split_part(name, '/', 1) = auth.uid()::text OR public.fn_is_admin())
    );

DROP POLICY IF EXISTS "storage_vehicles_update_own_or_admin" ON storage.objects;
CREATE POLICY "storage_vehicles_update_own_or_admin" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'vehicles'
        AND (split_part(name, '/', 1) = auth.uid()::text OR public.fn_is_admin())
    );

DROP POLICY IF EXISTS "storage_vehicles_delete_own_or_admin" ON storage.objects;
CREATE POLICY "storage_vehicles_delete_own_or_admin" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'vehicles'
        AND (split_part(name, '/', 1) = auth.uid()::text OR public.fn_is_admin())
    );

-- =============================================================================
-- 2.3 BUCKET: PROFILES
-- Caminho: profiles/{userId}/...
-- Leitura pública | Escrita restrita ao próprio usuário (userId) ou ADMIN
-- =============================================================================
DROP POLICY IF EXISTS "storage_profiles_select" ON storage.objects;
CREATE POLICY "storage_profiles_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "storage_profiles_insert_own_or_admin" ON storage.objects;
CREATE POLICY "storage_profiles_insert_own_or_admin" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'profiles'
        AND (split_part(name, '/', 1) = auth.uid()::text OR public.fn_is_admin())
    );

DROP POLICY IF EXISTS "storage_profiles_update_own_or_admin" ON storage.objects;
CREATE POLICY "storage_profiles_update_own_or_admin" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'profiles'
        AND (split_part(name, '/', 1) = auth.uid()::text OR public.fn_is_admin())
    );

DROP POLICY IF EXISTS "storage_profiles_delete_own_or_admin" ON storage.objects;
CREATE POLICY "storage_profiles_delete_own_or_admin" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'profiles'
        AND (split_part(name, '/', 1) = auth.uid()::text OR public.fn_is_admin())
    );

-- =============================================================================
-- 2.4 BUCKET: BRANDING
-- Caminho: branding/{category}/...
-- Leitura pública | Escrita restrita exclusivamente a SUPER_ADMIN
-- =============================================================================
DROP POLICY IF EXISTS "storage_branding_select" ON storage.objects;
CREATE POLICY "storage_branding_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "storage_branding_insert_super_admin" ON storage.objects;
CREATE POLICY "storage_branding_insert_super_admin" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'branding' AND public.fn_is_super_admin());

DROP POLICY IF EXISTS "storage_branding_update_super_admin" ON storage.objects;
CREATE POLICY "storage_branding_update_super_admin" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'branding' AND public.fn_is_super_admin());

DROP POLICY IF EXISTS "storage_branding_delete_super_admin" ON storage.objects;
CREATE POLICY "storage_branding_delete_super_admin" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'branding' AND public.fn_is_super_admin());
