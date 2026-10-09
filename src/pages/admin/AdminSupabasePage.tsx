import React, { useState } from 'react';
import { Database, Copy, Check, CheckCircle2, ShieldAlert, Code2, Server, HardDrive, FolderCheck, Info } from 'lucide-react';
import { SUGGESTED_BUCKETS, isSupabaseStorageConnected } from '../../lib/supabaseStorage';
import { SUPABASE_STATUS } from '../../lib/supabase';

export const AdminSupabasePage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const isConnected = isSupabaseStorageConnected();

  const supabaseSqlSnippet = `-- PX CUSTOM — Storage Buckets & RLS Policies (Pronto para Executar no Supabase SQL Editor)

-- 1. FUNÇÃO AUXILIAR DE ADMIN (SECURITY DEFINER)
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

-- 2. CRIAÇÃO / ATUALIZAÇÃO DOS BUCKETS DEDICADOS
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

-- 3. LIMPEZA PREVENTIVA PARA IDEMPOTÊNCIA
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

-- 4. POLÍTICAS storage.objects
-- EVENTS
CREATE POLICY "Public can view event images" ON storage.objects FOR SELECT USING (bucket_id = 'events');
CREATE POLICY "Admins can upload event images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'events' AND public.is_admin());
CREATE POLICY "Admins can update event images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'events' AND public.is_admin())
  WITH CHECK (bucket_id = 'events' AND public.is_admin());
CREATE POLICY "Admins can delete event images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'events' AND public.is_admin());

-- VEHICLES
CREATE POLICY "Public can view vehicle images" ON storage.objects FOR SELECT USING (bucket_id = 'vehicles');
CREATE POLICY "Users can upload own vehicle photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "Users can update own vehicle photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()))
  WITH CHECK (bucket_id = 'vehicles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "Users can delete own vehicle photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- PROFILES
CREATE POLICY "Public can view profile avatars" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profiles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()))
  WITH CHECK (bucket_id = 'profiles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profiles' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- BRANDING
CREATE POLICY "Public can view branding assets" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admins can upload branding assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.is_admin());
CREATE POLICY "Admins can update branding assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin())
  WITH CHECK (bucket_id = 'branding' AND public.is_admin());
CREATE POLICY "Admins can delete branding assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin());`;

  const handleCopy = () => {
    navigator.clipboard.writeText(supabaseSqlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading flex items-center gap-3">
          <Database className="w-7 h-7 text-[#FF1A2D]" />
          <span>Banco de Dados & Storage Supabase</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Estrutura pronta para persistência relacional PostgreSQL, Row Level Security (RLS) e Supabase Storage de Mídia
        </p>
      </div>

      {/* Storage Architecture State Banner */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
        isConnected
          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
          : 'bg-[#121212] border-[#262626] text-gray-300'
      }`}>
        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isConnected ? 'text-emerald-400' : 'text-[#FF1A2D]'}`} />
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-heading uppercase">
              {isConnected ? 'Supabase Storage Conectado' : 'Modo de Demonstração (Storage Local Ativo)'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              isConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {isConnected ? 'STORAGE ATIVO' : 'LOCAL PREVIEW'}
            </span>
          </div>
          <p className="text-gray-400">
            {SUPABASE_STATUS.message}
          </p>
        </div>
      </div>

      {/* Buckets de Mídia Sugeridos para o Supabase Storage */}
      <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#181818]">
          <HardDrive className="w-5 h-5 text-[#FF1A2D]" />
          <div>
            <h3 className="text-base font-bold text-white font-heading uppercase">
              Estrutura de Buckets do Supabase Storage
            </h3>
            <p className="text-xs text-gray-400">
              Buckets dedicados configurados no helper <code className="text-gray-300">src/lib/supabaseStorage.ts</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SUGGESTED_BUCKETS.map((bucket) => (
            <div
              key={bucket.id}
              className="p-4 rounded-xl bg-[#121212] border border-[#222222] space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderCheck className="w-4 h-4 text-[#FF1A2D]" />
                    <span className="font-mono font-bold text-sm text-white">{bucket.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                    PÚBLICO
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {bucket.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1a1a1a] flex items-center justify-between text-[11px] text-gray-500">
                <span>Limite: {bucket.fileSizeLimit}</span>
                <span className="font-mono">{bucket.allowedMimes.map(m => m.split('/')[1]).join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Card PostgreSQL */}
      <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                Schema SQL Gerado & RLS Configurado
              </h3>
              <p className="text-xs text-gray-400">
                14 tabelas, enums customizados, índices de alta performance e políticas de segurança
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase">
            Pronto para Produção
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#121212] border border-[#1c1c1c] space-y-2 text-xs text-gray-300">
          <p className="font-semibold text-white">Como conectar com seu projeto Supabase:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Acesse o painel do seu projeto no Supabase (<span className="text-white">supabase.com</span>).</li>
            <li>Abra a aba <strong>SQL Editor</strong> e cole o conteúdo do arquivo <code className="text-[#FF1A2D]">/supabase-schema.sql</code> gerado no projeto.</li>
            <li>Clique em <strong>Run</strong> para criar todas as tabelas e políticas RLS de segurança.</li>
            <li>Crie os 4 buckets na aba <strong>Storage</strong>: <code className="text-white">events</code>, <code className="text-white">vehicles</code>, <code className="text-white">profiles</code> e <code className="text-white">branding</code>.</li>
            <li>Insira <code className="text-[#FF1A2D]">VITE_SUPABASE_URL</code> e <code className="text-[#FF1A2D]">VITE_SUPABASE_ANON_KEY</code> nas variáveis de ambiente.</li>
          </ol>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-bold text-white">Script SQL Inicial:</span>
            <button
              onClick={handleCopy}
              className="text-[#FF1A2D] hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar instrução'}</span>
            </button>
          </div>
          <pre className="bg-[#121212] border border-[#222222] rounded-xl p-3 text-[11px] font-mono text-gray-300 overflow-x-auto">
            {supabaseSqlSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
