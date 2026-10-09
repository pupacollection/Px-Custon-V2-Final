// PX CUSTOM — Tela Oficial de Login, Cadastro & Recuperação de Senha
import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  FileText,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { PxLogo } from '../../components/common/PxLogo';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  initialMode?: 'login' | 'register' | 'forgot';
  redirectTo?: string;
  onLoginSuccess: (redirectTarget?: string) => void;
  onCancel?: () => void;
  customNotice?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMode = 'login',
  redirectTo,
  onLoginSuccess,
  onCancel,
  customNotice,
}) => {
  const { login, register, resetPassword, supabaseConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [city, setCity] = useState('Manhuaçu');
  const [state, setState] = useState('MG');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // 1. Processar Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    setSubmitting(true);
    const { error, user } = await login(email, password);
    setSubmitting(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    if (user) {
      setSuccessMessage('Login efetuado com sucesso! Redirecionando...');
      setTimeout(() => {
        onLoginSuccess(redirectTo);
      }, 600);
    }
  };

  // 2. Processar Registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setSubmitting(true);
    const { error, user } = await register({
      name,
      email,
      password,
      phone,
      cpf,
      city,
      state,
    });
    setSubmitting(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    if (user) {
      setSuccessMessage('Conta criada com sucesso! Bem-vindo ao PX CUSTOM.');
      setTimeout(() => {
        onLoginSuccess(redirectTo);
      }, 800);
    }
  };

  // 3. Processar Recuperação de Senha
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!email.trim()) {
      setErrorMessage('Digite o e-mail cadastrado na sua conta.');
      return;
    }

    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setSuccessMessage(
      'Enviamos as instruções de recuperação para o seu e-mail. Verifique sua caixa de entrada e spam.'
    );
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-16 relative">
      {/* Background ambient automotive light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF1A2D]/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Header com Logo */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-block hover:scale-105 transition-transform">
            <PxLogo size="lg" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading tracking-wide">
              {mode === 'login' && 'Acessar Conta'}
              {mode === 'register' && 'Cadastre-se'}
              {mode === 'forgot' && 'Recuperar Senha'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {mode === 'login' && 'Entre para gerenciar seus ingressos, veículos e perfil oficial.'}
              {mode === 'register' && 'Participe do maior ecossistema automotivo do Brasil.'}
              {mode === 'forgot' && 'Enviaremos um link seguro para redefinir sua senha.'}
            </p>
          </div>

          {/* Aviso customizado caso redirecionado de rota protegida */}
          {customNotice && (
            <div className="p-3 rounded-xl bg-[#1f1616] border border-[#FF1A2D]/30 text-xs text-red-200 flex items-center gap-2.5 text-left">
              <Shield className="w-4 h-4 text-[#FF1A2D] shrink-0" />
              <span>{customNotice}</span>
            </div>
          )}
        </div>

        {/* Card Principal */}
        <div className="bg-[#0b0b0b] border border-[#1e1e1e] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 backdrop-blur-md">
          
          {!supabaseConfigured && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#141414] border border-[#2a2a2a] text-gray-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">Ambiente Preview (Supabase Offline)</span>
                <span className="text-[11px] text-gray-400 block leading-relaxed">
                  As credenciais VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão presentes neste ambiente. A navegação pública pelo catálogo de eventos e interface está 100% ativa.
                </span>
              </div>
            </div>
          )}

          {/* Mensagens de Alerta */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-[#FF1A2D] shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORMULÁRIO 1: LOGIN */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  E-mail Oficial
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetFeedback();
                      setMode('forgot');
                    }}
                    className="text-xs text-[#FF1A2D] hover:underline font-semibold"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Lembrar Login */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-[#1a1a1a] border-[#333] text-[#FF1A2D] focus:ring-[#FF1A2D] w-3.5 h-3.5 accent-[#FF1A2D]"
                  />
                  <span>Lembrar meu acesso</span>
                </label>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#FF1A2D] hover:bg-[#D90014] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar no PX CUSTOM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* FORMULÁRIO 2: CADASTRO */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  E-mail *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Telefone e CPF em 2 colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(33) 99999-9999"
                      className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl pl-8 pr-2.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    CPF (Opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl pl-8 pr-2.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Manhuaçu"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="MG"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Senha e Confirmação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botão Registrar */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-[#FF1A2D] hover:bg-[#D90014] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Criar Minha Conta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* FORMULÁRIO 3: ESQUECEU A SENHA */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  E-mail da sua conta
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-[#121212] border border-[#242424] focus:border-[#FF1A2D] rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-[#FF1A2D] hover:bg-[#D90014] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-red-950/40"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Enviar Link de Recuperação</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetFeedback();
                  setMode('login');
                }}
                className="w-full text-center text-xs text-gray-400 hover:text-white pt-2 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para o Login</span>
              </button>
            </form>
          )}

          {/* Alternadores de Modo no rodapé do Card */}
          <div className="mt-6 pt-5 border-t border-[#1a1a1a] text-center text-xs">
            {mode === 'login' ? (
              <p className="text-gray-400">
                Não tem uma conta oficial?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetFeedback();
                    setMode('register');
                  }}
                  className="text-[#FF1A2D] hover:underline font-bold"
                >
                  Cadastre-se agora
                </button>
              </p>
            ) : mode === 'register' ? (
              <p className="text-gray-400">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetFeedback();
                    setMode('login');
                  }}
                  className="text-[#FF1A2D] hover:underline font-bold"
                >
                  Faça login
                </button>
              </p>
            ) : null}
          </div>

        </div>

        {/* Botão de Cancelar / Voltar ao Início */}
        {onCancel && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-gray-300 transition inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao site da PX CUSTOM</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
