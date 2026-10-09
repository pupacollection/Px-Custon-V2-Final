import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  Shield,
  User,
  Menu,
  X,
  Ticket,
  Car,
  Compass,
  LogIn,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { PxLogo } from './PxLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  unreadCount = 2,
}) => {
  const { isAuthenticated, profile, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown de usuário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Início' },
    { id: 'events', label: 'Eventos' },
    { id: 'tickets', label: 'Meus Ingressos' },
    { id: 'vehicles', label: 'Meus Veículos' },
    { id: 'profile', label: 'Perfil' },
  ];

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
    onNavigate('home');
  };

  const displayName = profile?.name ? profile.name.split(' ')[0] : 'Conta';
  const displayAvatar = profile?.avatarUrl || profile?.avatar_url;

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-[#181818]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* Left: Official Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="cursor-pointer transition-transform hover:scale-102 flex items-center"
          >
            <PxLogo size="md" />
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
            {navLinks.map((link) => {
              const active = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'text-[#FF1A2D] bg-[#181818]/70 border-b-2 border-[#FF1A2D]'
                      : 'text-gray-300 hover:text-white hover:bg-[#111111]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions, Search, Notifications, PX CONTROL & User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Toggle */}
            <div className="relative">
              {searchOpen ? (
                <div className="flex items-center bg-[#111111] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 w-44 sm:w-60">
                  <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar evento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onNavigate('events');
                        setSearchOpen(false);
                      }
                    }}
                    autoFocus
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="text-gray-400 hover:text-white text-xs ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#111111] transition cursor-pointer"
                  title="Pesquisar"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Notifications */}
            <button
              onClick={() => onNavigate('notifications')}
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#111111] transition cursor-pointer"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FF1A2D] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton compact />

            {/* Admin Switcher: PX CONTROL (Acessível com destaque quando autenticado/admin) */}
            <button
              onClick={() => onNavigate('px-control')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer group shadow-sm ${
                isAdmin
                  ? 'bg-red-950/30 hover:bg-red-950/50 border-[#FF1A2D]/60 text-white'
                  : 'bg-[#181818] hover:bg-[#222222] border-[#262626] hover:border-[#FF1A2D] text-gray-200'
              }`}
              title="Acessar painel administrativo PX CONTROL"
            >
              <Shield className="w-3.5 h-3.5 text-[#FF1A2D] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">PX CONTROL</span>
              {isAdmin && (
                <span className="hidden lg:inline px-1.5 py-0.2 rounded bg-[#FF1A2D] text-[9px] font-black text-white">
                  PRO
                </span>
              )}
            </button>

            {/* User Profile or Entrar */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#111111] hover:bg-[#181818] border border-[#222222] text-xs font-semibold text-white transition cursor-pointer group"
                >
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={profile?.name || 'Perfil'}
                      className="w-6 h-6 rounded-full object-cover border border-[#FF1A2D]"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#FF1A2D]/20 text-[#FF1A2D] flex items-center justify-center font-bold text-xs border border-[#FF1A2D]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden lg:inline">{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-white transition-transform" />
                </button>

                {/* Dropdown Menu do Usuário */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#0c0c0c] border border-[#222222] rounded-2xl shadow-2xl shadow-black/90 py-2 z-50 animate-fadeIn">
                    <div className="px-3.5 py-2.5 border-b border-[#1c1c1c]">
                      <p className="text-xs font-bold text-white truncate">{profile?.name || 'Participante'}</p>
                      <p className="text-[10px] text-gray-400 truncate">{profile?.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black bg-[#FF1A2D]/20 text-[#FF1A2D] border border-[#FF1A2D]/40 uppercase">
                          {profile?.role}
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-[#161616] transition cursor-pointer text-left"
                      >
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>Meu Perfil</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigate('vehicles');
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-[#161616] transition cursor-pointer text-left"
                      >
                        <Car className="w-3.5 h-3.5 text-gray-400" />
                        <span>Meus Veículos</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigate('tickets');
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-[#161616] transition cursor-pointer text-left"
                      >
                        <Ticket className="w-3.5 h-3.5 text-gray-400" />
                        <span>Meus Ingressos</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('px-control');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-[#FF1A2D] hover:bg-[#FF1A2D]/10 transition cursor-pointer text-left"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#FF1A2D]" />
                          <span>Painel PX CONTROL</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1 border-t border-[#1c1c1c]">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair da Conta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF1A2D] hover:bg-[#D90014] text-xs font-bold text-white transition cursor-pointer shadow-md shadow-red-950/40"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#111111] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#080808] border-b border-[#1f1f1f] px-4 pt-3 pb-5 space-y-2 animate-fadeIn">
          {/* Identificação do Usuário no Mobile */}
          {isAuthenticated ? (
            <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-2.5">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={profile?.name || 'Perfil'}
                    className="w-9 h-9 rounded-full object-cover border border-[#FF1A2D]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#FF1A2D]/20 text-[#FF1A2D] flex items-center justify-center font-bold text-sm border border-[#FF1A2D]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white">{profile?.name}</p>
                  <p className="text-[10px] text-gray-400">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 font-bold p-1"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="pb-3 border-b border-[#1a1a1a]">
              <button
                onClick={() => {
                  onNavigate('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF1A2D] text-white text-xs font-bold uppercase tracking-wider"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar / Cadastrar-se</span>
              </button>
            </div>
          )}

          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                onNavigate(link.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                currentTab === link.id
                  ? 'text-[#FF1A2D] bg-[#181818] border-l-4 border-[#FF1A2D]'
                  : 'text-gray-300 hover:text-white hover:bg-[#111111]'
              }`}
            >
              {link.label}
            </button>
          ))}

          <div className="pt-2 border-t border-[#1a1a1a]">
            <button
              onClick={() => {
                onNavigate('px-control');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#181818] text-white font-bold text-sm border border-[#2a2a2a]"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FF1A2D]" />
                <span>PX CONTROL (Administração)</span>
              </div>
              <span className="text-xs text-[#FF1A2D]">Acessar →</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
