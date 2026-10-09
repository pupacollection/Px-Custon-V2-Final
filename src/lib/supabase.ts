// PX CUSTOM — Supabase Integration Client & Safe Config
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';
const rawAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';

// Validação segura para evitar crash com URLs de placeholder ou inválidas
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('your-project.supabase.co')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('[PX CUSTOM] Erro ao instanciar Supabase Client:', err);
    client = null;
  }
}

export const supabase: SupabaseClient | null = client;
export const supabaseConfigured: boolean = Boolean(client);

export interface SupabaseConfigState {
  isConfigured: boolean;
  url: string | null;
  hasAnonKey: boolean;
}

export const getSupabaseConfig = (): SupabaseConfigState => {
  return {
    isConfigured: Boolean(client),
    url: isSupabaseConfigured ? rawUrl : null,
    hasAnonKey: isSupabaseConfigured && Boolean(rawAnonKey),
  };
};

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

export const SUPABASE_STATUS = {
  configured: Boolean(client),
  message: Boolean(client)
    ? 'Supabase Conectado (Armazenamento permanente e Auth ativado)'
    : 'Modo de demonstração: Supabase não conectado neste ambiente. Funcionalidades públicas operando normalmente.',
};
