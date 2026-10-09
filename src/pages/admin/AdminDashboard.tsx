import React from 'react';
import {
  Ticket,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  MapPin,
  ChevronRight,
  User,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardStats, EventItem } from '../../types';

interface AdminDashboardProps {
  stats: DashboardStats;
  events: EventItem[];
  onNavigateSection: (section: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  events,
  onNavigateSection,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Dashboard Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading">
          Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Visão geral da plataforma oficial PX CUSTOM
        </p>
      </div>

      {/* 1. TOP 4 METRIC CARDS (Exact match from Mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Ingressos Vendidos (742) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Ingressos Vendidos</span>
            <div className="w-9 h-9 rounded-xl bg-[#1a080a] text-[#FF1A2D] border border-[#FF1A2D]/30 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-black text-white font-heading">
              {stats.ticketsSold}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>↑ {stats.ticketsSoldGrowth}% em relação ao evento anterior</span>
          </div>
        </div>

        {/* Card 2: Ingressos Disponíveis (258) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Ingressos Disponíveis</span>
            <div className="w-9 h-9 rounded-xl bg-[#141414] text-gray-300 border border-[#2a2a2a] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#FF1A2D]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-black text-white font-heading">
              {stats.ticketsAvailable}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 font-medium">
            Capacidade restante nos lotes atuais
          </div>
        </div>

        {/* Card 3: Check-ins (531) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Check-ins</span>
            <div className="w-9 h-9 rounded-xl bg-[#121c15] text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-black text-white font-heading">
              {stats.checkinsCount}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>↑ {stats.checkinsGrowth}% taxa de presença</span>
          </div>
        </div>

        {/* Card 4: Faturamento (R$ 29.680,00) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Faturamento</span>
            <div className="w-9 h-9 rounded-xl bg-[#1a080a] text-[#FF1A2D] border border-[#FF1A2D]/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>↑ {stats.revenueGrowth}% meta batida</span>
          </div>
        </div>

      </div>

      {/* 2. CHARTS / ANALYTICS SECTION (Matching Mockup 2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Chart 1: Vendas por dia (Line chart with red glowing stroke) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Vendas por dia
            </h3>
            <span className="text-xs text-gray-500 font-mono">08/11 a 15/11</span>
          </div>

          <div className="h-56 w-full flex flex-col justify-end">
            {/* SVG Line Chart */}
            <div className="relative h-44 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF1A2D" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FF1A2D" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="3 3" />

                {/* Area fill */}
                <polygon
                  points="0,120 0,110 70,100 140,75 210,85 280,55 350,65 420,40 500,20 500,150 0,150"
                  fill="url(#lineGrad)"
                />

                {/* Red Stroke with glow */}
                <polyline
                  points="0,110 70,100 140,75 210,85 280,55 350,65 420,40 500,20"
                  fill="none"
                  stroke="#FF1A2D"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {[
                  [0, 110], [70, 100], [140, 75], [210, 85],
                  [280, 55], [350, 65], [420, 40], [500, 20]
                ].map(([x, y], idx) => (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#FF1A2D"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[11px] text-gray-500 font-mono pt-3 border-t border-[#181818]">
              {(stats.salesByDay || []).map((d) => (
                <span key={d.date}>{d.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Vendas por lote (Donut Chart: Pista 52%, Camarote 28%, VIP 20%) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Vendas por lote
            </h3>
            <span className="text-xs text-gray-500">Distribuição</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-56">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#181818" strokeWidth="14" />
                {/* Pista (52%) -> stroke-dasharray ~ 124 of 238 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#FF1A2D"
                  strokeWidth="14"
                  strokeDasharray="124 238"
                  strokeDashoffset="0"
                />
                {/* Camarote (28%) -> stroke-dasharray ~ 67 of 238 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="14"
                  strokeDasharray="67 238"
                  strokeDashoffset="-124"
                />
                {/* VIP (20%) -> stroke-dasharray ~ 47 of 238 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#666666"
                  strokeWidth="14"
                  strokeDasharray="47 238"
                  strokeDashoffset="-191"
                />
              </svg>

              {/* Center counter (742 vendas) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white font-heading">742</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">vendas</span>
              </div>
            </div>

            {/* Legend with percentages matching mockup */}
            <div className="space-y-3 w-full sm:w-auto">
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF1A2D]" />
                  <span className="text-gray-200 font-semibold">Pista</span>
                </div>
                <span className="font-mono font-bold text-white">52 %</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-white" />
                  <span className="text-gray-200 font-semibold">Camarote</span>
                </div>
                <span className="font-mono font-bold text-white">28 %</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#666666]" />
                  <span className="text-gray-200 font-semibold">VIP</span>
                </div>
                <span className="font-mono font-bold text-white">20 %</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Faturamento (Bar Chart with red bars) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Faturamento
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">R$ 29.680,00</span>
          </div>

          <div className="h-56 w-full flex flex-col justify-end">
            <div className="flex items-end justify-between h-40 gap-2 sm:gap-3 px-2">
              {(stats.salesByDay || []).map((d, idx) => {
                const heightPct = Math.min(100, Math.max(15, (d.revenue / 7000) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[9px] font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition">
                      R${(d.revenue / 1000).toFixed(1)}k
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[28px] rounded-t-md bg-[#FF1A2D] group-hover:bg-[#FF3344] transition-all shadow-md shadow-red-950/40"
                    />
                  </div>
                );
              })}
            </div>

            {/* X Labels */}
            <div className="flex justify-between text-[11px] text-gray-500 font-mono pt-3 border-t border-[#181818]">
              {(stats.salesByDay || []).map((d) => (
                <span key={d.date}>{d.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 4: Formas de Pagamento (PIX 62%, Cartão 28%, Boleto 6%, Outros 4%) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Formas de pagamento
            </h3>
            <span className="text-xs text-gray-500">Mercado Pago Gateway</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-56">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#181818" strokeWidth="14" />
                {/* PIX (62%) -> 147 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#FF1A2D"
                  strokeWidth="14"
                  strokeDasharray="147 238"
                  strokeDashoffset="0"
                />
                {/* Cartão (28%) -> 67 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="14"
                  strokeDasharray="67 238"
                  strokeDashoffset="-147"
                />
                {/* Boleto (6%) -> 14 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#888888"
                  strokeWidth="14"
                  strokeDasharray="14 238"
                  strokeDashoffset="-214"
                />
                {/* Outros (4%) -> 10 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#333333"
                  strokeWidth="14"
                  strokeDasharray="10 238"
                  strokeDashoffset="-228"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white font-heading">742</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">vendas</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2.5 w-full sm:w-auto">
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF1A2D]" />
                  <span className="text-gray-200 font-semibold">PIX</span>
                </div>
                <span className="font-mono font-bold text-white">62 %</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-white" />
                  <span className="text-gray-200 font-semibold">Cartão de Crédito</span>
                </div>
                <span className="font-mono font-bold text-white">28 %</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#888888]" />
                  <span className="text-gray-200 font-semibold">Boleto</span>
                </div>
                <span className="font-mono font-bold text-white">6 %</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#333333]" />
                  <span className="text-gray-200 font-semibold">Outros</span>
                </div>
                <span className="font-mono font-bold text-white">4 %</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. EVENTOS RECENTES & ÚLTIMOS CHECK-INS (Matching Mockup Bottom Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Eventos Recentes */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Eventos recentes
            </h3>
            <button
              onClick={() => onNavigateSection('events')}
              className="text-xs text-gray-400 hover:text-[#FF1A2D] transition"
            >
              Ver todos →
            </button>
          </div>

          <div className="space-y-3">
            {events.slice(0, 3).map((event) => {
              const isLive = event.status === 'EM_ANDAMENTO';
              return (
                <div
                  key={event.id}
                  onClick={() => onNavigateSection('events')}
                  className="p-3 rounded-xl bg-[#121212] border border-[#1c1c1c] hover:border-[#FF1A2D]/40 flex items-center justify-between gap-3 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={event.bannerImage}
                      alt={event.name}
                      className="w-12 h-12 rounded-lg object-cover border border-[#262626]"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading">{event.name}</h4>
                      <p className="text-xs text-gray-400">
                        {event.dateBadge} • {event.city} - {event.state}
                      </p>
                    </div>
                  </div>

                  {isLive ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase">
                      Em andamento
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-[#1c1c1c] text-gray-300 border border-[#2b2b2b] text-[10px] font-bold uppercase">
                      Em breve
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimos Check-ins (Matches Mockup exact list: João Silva, Lucas Ferreira, Rafael Souza) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Últimos check-ins
            </h3>
            <button
              onClick={() => onNavigateSection('checkin')}
              className="text-xs text-gray-400 hover:text-[#FF1A2D] transition"
            >
              Ver todos →
            </button>
          </div>

          <div className="space-y-3">
            {(stats.recentCheckins || []).slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-[#121212] border border-[#1c1c1c] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center text-gray-300 font-bold text-xs">
                    <User className="w-4 h-4 text-[#FF1A2D]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{log.attendeeName}</h4>
                    <p className="text-xs text-gray-400">
                      {log.timestamp} • <span className="text-gray-300 font-medium">{log.batchName}</span>
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase">
                  Confirmado
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
