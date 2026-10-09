import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  QrCode,
  Users,
  Car,
  CreditCard,
  Bell,
  FileText,
  Settings,
  ShieldCheck,
  Menu,
  X,
  ArrowLeft,
  ChevronDown,
  Database,
  Palette,
  LogOut,
} from 'lucide-react';
import { PxLogo } from '../../components/common/PxLogo';
import { useAuth } from '../../context/AuthContext';

interface AdminLayoutProps {
  currentSection: string;
  onNavigateSection: (section: string) => void;
  onExitToPublic: () => void;
  selectedEvent: string;
  onSelectEvent: (event: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentSection,
  onNavigateSection,
  onExitToPublic,
  selectedEvent,
  onSelectEvent,
  children,
}) => {
  const { profile, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'tickets', label: 'Ingressos', icon: Ticket },
    { id: 'checkin', label: 'Check-in', icon: QrCode },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'vehicles', label: 'Veículos', icon: Car },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'mercadopago', label: 'Configurações', icon: Settings },
    { id: 'branding', label: 'Branding & Mídia', icon: Palette },
    { id: 'admins', label: 'Administradores', icon: ShieldCheck },
    { id: 'supabase', label: 'Banco Supabase', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row antialiased">
      
      {/* 1. DESKTOP SIDEBAR (Identical to Mockup Bottom-Left) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#080808] border-r border-[#1a1a1a] shrink-0 sticky top-0 h-screen select-none">
        
        {/* PX CONTROL Official Logo Header */}
        <div className="p-5 border-b border-[#181818] flex items-center justify-between">
          <PxLogo variant="control" size="md" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'bg-[#FF1A2D] text-white shadow-md shadow-red-950/50'
                    : 'text-gray-400 hover:text-white hover:bg-[#121212]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with System Version */}
        <div className="p-4 border-t border-[#181818] space-y-2 bg-[#050505]">
          <button
            onClick={onExitToPublic}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#141414] hover:bg-[#1c1c1c] border border-[#242424] text-xs font-bold text-gray-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FF1A2D]" />
            <span>Voltar ao Site Oficial</span>
          </button>

          <button
            onClick={async () => {
              await logout();
              onExitToPublic();
            }}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-transparent hover:bg-red-950/20 text-xs font-semibold text-red-400 hover:text-red-300 transition cursor-pointer"
          >
            <LogOut className="w-3 h-3 text-[#FF1A2D]" />
            <span>Encerrar Sessão</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[11px] text-gray-500 pt-1">
            <span>PX CUSTOM</span>
            <span className="font-mono text-[#FF1A2D]">PX CONTROL v1.0</span>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOPBAR */}
      <div className="md:hidden bg-[#080808] border-b border-[#1a1a1a] p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 rounded-lg bg-[#141414] text-gray-300"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <PxLogo variant="control" size="sm" />
        </div>

        <button
          onClick={onExitToPublic}
          className="text-xs text-[#FF1A2D] font-bold flex items-center gap-1"
        >
          <span>Sair</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/90 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#222222]">
            <PxLogo variant="control" size="sm" />
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 py-4 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigateSection(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${
                    active ? 'bg-[#FF1A2D] text-white' : 'text-gray-300 hover:bg-[#141414]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#222222]">
            <button
              onClick={onExitToPublic}
              className="w-full py-3 bg-[#181818] rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-[#FF1A2D]" />
              <span>Voltar ao Site Oficial</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN ADMIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Control Bar (Matching Mockup with Event & Date Filter) */}
        <header className="bg-[#0a0a0a] border-b border-[#181818] px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">
              Filtro ativo:
            </span>

            {/* Event selector dropdown */}
            <div className="relative">
              <select
                value={selectedEvent}
                onChange={(e) => onSelectEvent(e.target.value)}
                className="bg-[#141414] border border-[#2a2a2a] focus:border-[#FF1A2D] text-xs font-bold text-white py-1.5 pl-3 pr-8 rounded-lg appearance-none cursor-pointer focus:outline-none"
              >
                <option value="all">Todos os eventos</option>
                <option value="encontro-px-custom">Encontro PX Custom</option>
                <option value="festival-da-familia">Festival da Família</option>
                <option value="mega-encontro">Mega Encontro</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date filter pill */}
            <span className="text-xs font-mono font-bold bg-[#141414] border border-[#2a2a2a] px-2.5 py-1.5 rounded-lg text-gray-300">
              📅 15/11/2025
            </span>
          </div>

          {/* Right Operator profile info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-white">{profile?.name || 'Administrador'}</span>
              <span className="block text-[10px] text-[#FF1A2D] font-mono font-bold">
                {profile?.role || 'SUPER_ADMIN'}
              </span>
            </div>
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name || 'Admin'}
                className="w-8 h-8 rounded-full border border-[#FF1A2D] object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#FF1A2D]/20 text-[#FF1A2D] border border-[#FF1A2D] flex items-center justify-center font-bold text-xs">
                {(profile?.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-black">
          {children}
        </main>
      </div>

    </div>
  );
};
