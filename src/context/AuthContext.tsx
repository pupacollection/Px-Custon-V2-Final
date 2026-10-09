// PX CUSTOM — Auth Context & Real RBAC Session Management
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { UserProfile, RegisterData } from '../types';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  supabaseConfigured: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null; user?: User | null }>;
  register: (data: RegisterData) => Promise<{ error: string | null; user?: User | null }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Busca o profile real na tabela public.profiles vinculada a auth.users(id)
  const fetchProfile = useCallback(async (userId: string, authUser?: User | null): Promise<UserProfile | null> => {
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[PX AUTH] Erro ao buscar profile no Supabase:', error.message);
      }

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          name: data.name || authUser?.user_metadata?.name || 'Participante PX',
          email: data.email || authUser?.email || '',
          phone: data.phone || authUser?.user_metadata?.phone || '',
          cpf: data.cpf || authUser?.user_metadata?.cpf || '',
          city: data.city || authUser?.user_metadata?.city || 'Manhuaçu',
          state: data.state || authUser?.user_metadata?.state || 'MG',
          avatarUrl: data.avatar_url || authUser?.user_metadata?.avatar_url || DEFAULT_AVATAR,
          avatar_url: data.avatar_url,
          role: data.role || 'USER',
          is_active: data.is_active ?? true,
          createdAt: data.created_at || new Date().toISOString(),
          created_at: data.created_at,
        };
        setProfile(userProfile);
        return userProfile;
      }

      // Se o registro em public.profiles ainda não existe (ex: recém-criado antes do trigger ou trigger em processamento)
      if (authUser) {
        const meta = authUser.user_metadata || {};
        const fallbackProfile: UserProfile = {
          id: authUser.id,
          name: meta.name || authUser.email?.split('@')[0] || 'Participante PX',
          email: authUser.email || '',
          phone: meta.phone || '',
          cpf: meta.cpf || '',
          city: meta.city || 'Manhuaçu',
          state: meta.state || 'MG',
          avatarUrl: meta.avatar_url || DEFAULT_AVATAR,
          role: 'USER',
          is_active: true,
          createdAt: new Date().toISOString(),
        };

        // Tenta sincronizar persistência em profiles
        try {
          await supabase.from('profiles').upsert({
            id: authUser.id,
            name: fallbackProfile.name,
            email: fallbackProfile.email,
            phone: fallbackProfile.phone,
            cpf: fallbackProfile.cpf,
            city: fallbackProfile.city,
            state: fallbackProfile.state,
            role: 'USER',
            is_active: true,
          });
        } catch {
          // Ignora caso trigger já tenha gravado
        }

        setProfile(fallbackProfile);
        return fallbackProfile;
      }

      setProfile(null);
      return null;
    } catch (err) {
      console.warn('[PX AUTH] Falha segura ao buscar profile:', err);
      setProfile(null);
      return null;
    }
  }, []);

  // 1. Iniciar loading=true
  // 2. Chamar supabase.auth.getSession()
  // 3. Se existir sessão: session, user, buscar profile
  // 4. Se não existir: user=null, profile=null, session=null
  // 5. Registrar onAuthStateChange
  // 6. Finalizar loading=false
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (!supabase) {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[PX AUTH] Aviso de sessão inicial:', error.message);
        }

        if (isMounted) {
          const currentSession = data?.session ?? null;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id, currentSession.user);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn('[PX AUTH] Falha segura na inicialização da autenticação:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Inscrição em tempo real nas mudanças de autenticação
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      if (supabase?.auth) {
        const subResult = supabase.auth.onAuthStateChange(
          async (_event, currentSession) => {
            if (!isMounted) return;
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
              await fetchProfile(currentSession.user.id, currentSession.user);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }
        );
        subscription = subResult?.data?.subscription ?? null;
      }
    } catch (err) {
      console.warn('[PX AUTH] Erro ao registrar listener de autenticação:', err);
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // Recarrega o perfil atual
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  // Login com e-mail e senha
  const login = async (email: string, password: string): Promise<{ error: string | null; user?: User | null }> => {
    if (!supabase) {
      return {
        error: 'O banco de dados Supabase não está conectado neste ambiente. Configure as credenciais VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
        user: null,
      };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: translateAuthError(error), user: null };
      }

      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
        const userProf = await fetchProfile(data.user.id, data.user);

        // Se usuário estiver marcado como inativo no banco
        if (userProf && userProf.is_active === false) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setSession(null);
          return { error: 'Esta conta foi desativada pelo administrador. Entre em contato com o suporte da PX CUSTOM.' };
        }

        return { error: null, user: data.user };
      }

      return { error: 'Falha na autenticação. Tente novamente.', user: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar login';
      return { error: message, user: null };
    } finally {
      setLoading(false);
    }
  };

  // Registro de nova conta
  const register = async (regData: RegisterData): Promise<{ error: string | null; user?: User | null }> => {
    if (!supabase) {
      return {
        error: 'O banco de dados Supabase não está conectado neste ambiente. Configure as credenciais VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
        user: null,
      };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: regData.email.trim(),
        password: regData.password,
        options: {
          data: {
            name: regData.name.trim(),
            phone: regData.phone?.trim() || '',
            cpf: regData.cpf?.trim() || '',
            city: regData.city?.trim() || 'Manhuaçu',
            state: regData.state?.trim() || 'MG',
          },
        },
      });

      if (error) {
        return { error: translateAuthError(error), user: null };
      }

      if (data?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: regData.name.trim(),
            email: regData.email.trim(),
            phone: regData.phone?.trim() || '',
            cpf: regData.cpf?.trim() || '',
            city: regData.city?.trim() || 'Manhuaçu',
            state: regData.state?.trim() || 'MG',
            role: 'USER',
            is_active: true,
          });
        } catch (dbErr) {
          console.warn('[PX AUTH] Aviso ao salvar dados complementares do profile:', dbErr);
        }

        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user);
        return { error: null, user: data.user };
      }

      return { error: 'Não foi possível concluir o cadastro.', user: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no cadastro';
      return { error: message, user: null };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[PX AUTH] Erro ao encerrar sessão no Supabase:', err);
      }
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  // Recuperação de senha por e-mail
  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      return {
        error: 'O banco de dados Supabase não está conectado neste ambiente.',
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { error: translateAuthError(error) };
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao solicitar recuperação de senha';
      return { error: message };
    }
  };

  // Atualização direta do Profile em public.profiles
  const updateProfile = async (data: Partial<UserProfile>): Promise<{ error: string | null }> => {
    if (!supabase || !user) {
      return { error: 'Usuário não autenticado ou banco offline.' };
    }

    try {
      const updatePayload: Record<string, unknown> = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.city !== undefined) updatePayload.city = data.city;
      if (data.state !== undefined) updatePayload.state = data.state;
      if (data.avatarUrl !== undefined) updatePayload.avatar_url = data.avatarUrl;
      if (data.avatar_url !== undefined) updatePayload.avatar_url = data.avatar_url;

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      await refreshProfile();
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      return { error: message };
    }
  };

  // RBAC: Verificação de Administrador (baseada no banco public.profiles)
  const isAdmin = Boolean(
    profile &&
    (profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN') &&
    profile.is_active !== false
  );

  const isAuthenticated = Boolean(user && session);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAuthenticated,
        isAdmin,
        supabaseConfigured,
        login,
        register,
        logout,
        resetPassword,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
};

// Tradutor de erros do Supabase Auth para mensagens amigáveis em português
function translateAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Este e-mail já está cadastrado. Tente entrar ou recupere sua senha.';
  }
  if (msg.includes('password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique a mensagem enviada para sua caixa de entrada.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes antes de tentar novamente.';
  }

  return error.message || 'Ocorreu um erro na autenticação.';
}
