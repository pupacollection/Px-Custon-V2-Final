-- ==============================================================================
-- PX CUSTOM — SUPABASE STORAGE SETUP & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase para provisionar
-- os buckets oficiais e aplicar as diretrizes de segurança rigorosas.
-- ==============================================================================

-- 1. CRIAÇÃO DOS BUCKETS OFICIAIS
-- events:   10 MB - JPG, PNG, WEBP (Banners, capas e galerias de eventos)
-- vehicles: 10 MB - JPG, PNG, WEBP (Fotos dos veículos dos participantes)
-- profiles:  5 MB - JPG, PNG, WEBP (Fotos de perfil / avatares)
-- branding: 10 MB - JPG, PNG, WEBP, SVG (Identidade visual institucional)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('events', 'events', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('vehicles', 'vehicles', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('profiles', 'profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('branding', 'branding', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================================================
-- 2. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) NO STORAGE.OBJECTS
-- ==============================================================================
-- Supabase ativa RLS por padrão no schema storage. As políticas abaixo
-- garantem acesso controlado por papel (Role-Based Access Control - RBAC).

-- ------------------------------------------------------------------------------
-- 2.1 BUCKET: EVENTS
-- Caminhos:
--   events/{eventId}/banner/{uuid}.{ext}
--   events/{eventId}/cover/{uuid}.{ext}
--   events/{eventId}/gallery/{uuid}.{ext}
-- Regras:
--   - Leitura pública (para exibição de ingressos e eventos).
--   - Modificação restrita a SUPER_ADMIN e ADMIN.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
CREATE POLICY "Public can view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'events');

DROP POLICY IF EXISTS "Admins can upload event images" ON storage.objects;
CREATE POLICY "Admins can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'events'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can update event images" ON storage.objects;
CREATE POLICY "Admins can update event images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'events'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can delete event images" ON storage.objects;
CREATE POLICY "Admins can delete event images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'events'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ------------------------------------------------------------------------------
-- 2.2 BUCKET: VEHICLES
-- Caminhos:
--   vehicles/{userId}/{vehicleId}/{uuid}.{ext}
-- Regras:
--   - Leitura pública (para visualização dos projetos credenciados).
--   - Usuário envia, altera e deleta apenas as fotos nos seus próprios caminhos.
--   - SUPER_ADMIN e ADMIN possuem permissão administrativa de moderação.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view vehicle images" ON storage.objects;
CREATE POLICY "Public can view vehicle images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicles');

DROP POLICY IF EXISTS "Users can upload own vehicle photos" ON storage.objects;
CREATE POLICY "Users can upload own vehicle photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own vehicle photos" ON storage.objects;
CREATE POLICY "Users can update own vehicle photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own vehicle photos" ON storage.objects;
CREATE POLICY "Users can delete own vehicle photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 2.3 BUCKET: PROFILES
-- Caminhos:
--   profiles/{userId}/{uuid}.{ext}
-- Regras:
--   - Leitura pública dos avatares para visualização na plataforma.
--   - Usuário altera exclusivamente a sua própria foto de perfil.
--   - SUPER_ADMIN e ADMIN possuem permissão de suporte.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view profile avatars" ON storage.objects;
CREATE POLICY "Public can view profile avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profiles'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 2.4 BUCKET: BRANDING
-- Caminhos:
--   branding/{category}/{uuid}.{ext}
-- Regras:
--   - Leitura pública (logos, favicons, artes institucionais).
--   - Apenas SUPER_ADMIN e ADMIN podem fazer upload, substituir ou excluir.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view branding assets" ON storage.objects;
CREATE POLICY "Public can view branding assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Admins can upload branding assets" ON storage.objects;
CREATE POLICY "Admins can upload branding assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can update branding assets" ON storage.objects;
CREATE POLICY "Admins can update branding assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can delete branding assets" ON storage.objects;
CREATE POLICY "Admins can delete branding assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ==============================================================================
-- FIM DAS DIRETRIZES DE STORAGE PX CUSTOM
-- ==============================================================================
