import React from 'react';
import { Calendar, Clock, MapPin, ArrowRight, Ticket, Car, Bell, Plus, ShieldCheck, Flame, Volume2, Award } from 'lucide-react';
import { EventItem, Vehicle, UserProfile } from '../../types';

interface HomePageProps {
  events: EventItem[];
  user: UserProfile;
  vehicles: Vehicle[];
  unreadNotifsCount: number;
  onSelectEvent: (slug: string) => void;
  onNavigate: (tab: string) => void;
  onAddVehicleClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  events,
  user,
  vehicles,
  unreadNotifsCount,
  onSelectEvent,
  onNavigate,
  onAddVehicleClick,
}) => {
  return (
    <div className="space-y-12 sm:space-y-16">
      
      {/* 1. HERO SECTION (Identical to Top-Left in Mockup) */}
      <section className="relative min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] flex items-center overflow-hidden rounded-2xl sm:rounded-3xl border border-[#1a1a1a] mx-2 sm:mx-6 lg:mx-8 mt-2 sm:mt-4">
        {/* Background automotive image with cinematic dark gradient */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-103"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=2000&q=85')`,
          }}
        >
          {/* Multi-layer gradient overlays for authentic dark automotive feel */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl px-6 sm:px-12 py-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111]/80 border border-[#2a2a2a] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#FF1A2D] animate-ping" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gray-300">
              PX CUSTOM APRESENTA
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight uppercase font-heading leading-none">
            EVENTOS QUE <br />
            <span className="text-[#FF1A2D] glow-red-text">MOVEM PAIXÕES</span>
          </h1>

          <p className="text-gray-300 text-sm sm:text-lg max-w-xl leading-relaxed">
            Acompanhe nossos próximos eventos, garanta seu ingresso e faça parte dessa experiência única.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('events')}
              className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-sm sm:text-base tracking-wide transition-all transform hover:-translate-y-0.5 shadow-lg shadow-red-950/50 cursor-pointer"
            >
              <span>Ver Eventos</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => onNavigate('tickets')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#111111]/90 hover:bg-[#181818] border border-[#2a2a2a] hover:border-[#FF1A2D] text-gray-200 font-semibold text-sm transition cursor-pointer backdrop-blur-md"
            >
              <Ticket className="w-4 h-4 text-[#FF1A2D]" />
              <span>Meus Ingressos</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. USER MOBILE / QUICK ACTIONS DASHBOARD (Matching Mockup Phone Screen) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0b0b0b] border border-[#1a1a1a] rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#181818]">
            <div className="flex items-center gap-3.5">
              <img
                src={user?.avatarUrl || user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt={user?.name || 'Participante'}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#FF1A2D] shadow-md shadow-red-950/40"
              />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                  Olá, {(user?.name || 'Visitante').split(' ')[0]}!
                </h3>
                <p className="text-xs text-gray-400">Seja bem-vindo de volta à PX CUSTOM!</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400 bg-[#141414] px-3 py-1.5 rounded-lg border border-[#222222]">
                📍 {user?.city || 'Manhuaçu'} - {user?.state || 'MG'}
              </span>
            </div>
          </div>

          {/* Quick Action Tiles */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-5">
            <button
              onClick={() => onNavigate('tickets')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-[#111111] hover:bg-[#181818] border border-[#1f1f1f] hover:border-[#FF1A2D] transition group cursor-pointer"
            >
              <div className="p-2 sm:p-2.5 rounded-lg bg-[#181818] group-hover:bg-[#FF1A2D]/20 text-[#FF1A2D] mb-1.5 transition">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-200">Meus Ingressos</span>
              <span className="text-[10px] text-gray-400">2 ativos</span>
            </button>

            <button
              onClick={() => onNavigate('vehicles')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-[#111111] hover:bg-[#181818] border border-[#1f1f1f] hover:border-[#FF1A2D] transition group cursor-pointer"
            >
              <div className="p-2 sm:p-2.5 rounded-lg bg-[#181818] group-hover:bg-[#FF1A2D]/20 text-[#FF1A2D] mb-1.5 transition">
                <Car className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-200">Meus Veículos</span>
              <span className="text-[10px] text-gray-400">{(vehicles || []).length} cadastrados</span>
            </button>

            <button
              onClick={() => onNavigate('notifications')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-[#111111] hover:bg-[#181818] border border-[#1f1f1f] hover:border-[#FF1A2D] transition group cursor-pointer relative"
            >
              {unreadNotifsCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF1A2D] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifsCount}
                </span>
              )}
              <div className="p-2 sm:p-2.5 rounded-lg bg-[#181818] group-hover:bg-[#FF1A2D]/20 text-[#FF1A2D] mb-1.5 transition">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-200">Notificações</span>
              <span className="text-[10px] text-gray-400">{unreadNotifsCount} novas</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. PRÓXIMOS EVENTOS (Matching Mockup Home Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading">
              Próximos Eventos
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Experiências oficiais produzidas exclusivamente pela PX CUSTOM
            </p>
          </div>

          <button
            onClick={() => onNavigate('events')}
            className="text-xs sm:text-sm font-bold text-gray-400 hover:text-[#FF1A2D] flex items-center gap-1 transition cursor-pointer"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(events || []).map((event) => {
            const isLive = event.status === 'EM_ANDAMENTO';
            const dateParts = (event.dateBadge || 'PX CUSTOM').split(' ');
            return (
              <div
                key={event.id}
                className="group bg-[#0e0e0e] border border-[#1c1c1c] hover:border-[#FF1A2D]/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/80 flex flex-col justify-between"
              >
                <div>
                  {/* Image container with date badge */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-black">
                    <img
                      src={event.bannerImage}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />

                    {/* Date Badge (Top Left - e.g. 15 NOV) */}
                    <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md border border-[#2a2a2a] rounded-xl px-3 py-1.5 text-center shadow-lg">
                      <span className="block text-xs font-black text-[#FF1A2D] uppercase leading-tight font-heading">
                        {dateParts[0] || 'PX'}
                      </span>
                      <span className="block text-[10px] font-bold text-white uppercase tracking-wider">
                        {dateParts[1] || 'CUSTOM'}
                      </span>
                    </div>

                    {/* Status Pill (Top Right) */}
                    <div className="absolute top-3 right-3">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Em andamento
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#181818]/85 text-gray-300 border border-[#2e2e2e] text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                          Em breve
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-xl font-black text-white font-heading group-hover:text-[#FF1A2D] transition-colors">
                      {event.name}
                    </h3>

                    <div className="space-y-1.5 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#FF1A2D] shrink-0" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{event.time}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card CTA Button (Matching Mockup) */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => onSelectEvent(event.slug)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-950/30"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. MEUS VEÍCULOS PREVIEW SECTION (Matching Mockup Home Component) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0b0b0b] border border-[#1a1a1a] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white font-heading uppercase">
                Meus Veículos
              </h3>
              <p className="text-xs text-gray-400">
                Veículos cadastrados para exposição e credenciamento oficial
              </p>
            </div>

            <button
              onClick={() => onNavigate('vehicles')}
              className="text-xs font-bold text-gray-400 hover:text-[#FF1A2D] flex items-center gap-1 transition"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => onNavigate('vehicles')}
                className="bg-[#121212] border border-[#1f1f1f] hover:border-[#FF1A2D]/50 rounded-xl p-3 flex items-center gap-3.5 transition cursor-pointer group"
              >
                <img
                  src={v.photoUrl || 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=400&q=80'}
                  alt={`${v.brand} ${v.model}`}
                  className="w-16 h-14 rounded-lg object-cover border border-[#2a2a2a] group-hover:border-[#FF1A2D]"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate font-heading">
                    {v.brand} {v.model}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {v.year} • {v.color}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1a1a1a] text-[#FF1A2D] border border-[#2a2a2a]">
                    {v.category || 'Rebaixado'}
                  </span>
                </div>
              </div>
            ))}

            {/* Add vehicle card */}
            <button
              onClick={onAddVehicleClick}
              className="border-2 border-dashed border-[#222222] hover:border-[#FF1A2D] rounded-xl p-4 flex flex-col items-center justify-center text-center transition group min-h-[80px] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#181818] group-hover:bg-[#FF1A2D] text-gray-400 group-hover:text-white flex items-center justify-center transition mb-1">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">
                Cadastrar novo veículo
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. EXPERIÊNCIA PX CUSTOM PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-5 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white font-heading">Carros Rebaixados</h4>
            <p className="text-[11px] text-gray-400">Projetos insanos, suspensão a ar e estática de alto nível</p>
          </div>

          <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-5 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white font-heading">Som Automotivo</h4>
            <p className="text-[11px] text-gray-400">Paredões regulados, arenas dedicadas e medição técnica</p>
          </div>

          <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-5 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white font-heading">Motos & Tuning</h4>
            <p className="text-[11px] text-gray-400">Espaço exclusivo para motos customizadas e esportivas</p>
          </div>

          <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-5 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white font-heading">Estrutura Premium</h4>
            <p className="text-[11px] text-gray-400">Praça de alimentação, segurança privada e total conforto</p>
          </div>
        </div>
      </section>

    </div>
  );
};
