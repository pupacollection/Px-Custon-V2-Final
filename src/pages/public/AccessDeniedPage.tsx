// PX CUSTOM — Tela 403 Acesso Negado (Acesso Restrito ao PX CONTROL)
import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, User as UserIcon, Home } from 'lucide-react';
import { UserProfile } from '../../types';
import { PxLogo } from '../../components/common/PxLogo';

interface AccessDeniedPageProps {
  user: UserProfile | null;
  onBackToHome: () => void;
  onNavigateProfile?: () => void;
  onLogout: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  user,
  onBackToHome,
  onNavigateProfile,
  onLogout,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      {/* Red ambient warning glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-[#FF1A2D]/15 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-md w-full relative z-10 text-center space-y-6">
        
        {/* Logo */}
        <div className="inline-block">
          <PxLogo variant="control" size="md" />
        </div>

        {/* Warning Card */}
        <div className="bg-[#0b0b0b] border border-[#2b1818] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/20 backdrop-blur-md space-y-5">
          
          {/* Icon Shield */}
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-[#FF1A2D]/50 text-[#FF1A2D] mx-auto flex items-center justify-center shadow-lg shadow-red-950/50">
            <ShieldAlert className="w-8 h-8" />
          </div>

          {/* Badge */}
          <div className="inline-block px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-[11px] font-black uppercase tracking-wider">
            HTTP 403 • Acesso Restrito
          </div>

          {/* Title & Info */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase font-heading">
              Acesso Negado ao PX CONTROL
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              O módulo administrativo da <span className="text-white font-bold">PX CUSTOM</span> é restrito a administradores autorizados com perfil <span className="text-[#FF1A2D] font-mono font-bold">ADMIN</span> ou <span className="text-[#FF1A2D] font-mono font-bold">SUPER_ADMIN</span>.
            </p>
          </div>

          {/* User info card */}
          {user && (
            <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 text-left text-xs space-y-1">
              <div className="text-gray-400">Usuário Conectado:</div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{user.name}</span>
                <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 font-mono text-[10px]">
                  {user.role}
                </span>
              </div>
              <div className="text-gray-500 text-[11px] truncate">{user.email}</div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={onBackToHome}
              className="w-full py-3 px-4 rounded-xl bg-[#FF1A2D] hover:bg-[#D90014] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/40"
            >
              <Home className="w-4 h-4" />
              <span>Voltar à Página Inicial</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-gray-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FF1A2D]" />
              <span>Alternar Conta / Sair</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
