import React, { useState } from 'react';
import { MapPin, Clock, ChevronRight, Search, Filter } from 'lucide-react';
import { EventItem, EventStatus } from '../../types';

interface EventsPageProps {
  events: EventItem[];
  onSelectEvent: (slug: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ events, onSelectEvent }) => {
  const [selectedFilter, setSelectedFilter] = useState<'TODOS' | EventStatus>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  const filterTabs = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'EM_BREVE', label: 'Em breve' },
    { id: 'EM_ANDAMENTO', label: 'Em andamento' },
    { id: 'FINALIZADO', label: 'Finalizados' },
  ];

  const filteredEvents = (events || []).filter((event) => {
    const matchesFilter = selectedFilter === 'TODOS' || event.status === selectedFilter;
    const matchesSearch =
      (event.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.city || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* Header (Matching Mockup Screen 2) */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-heading">
          Eventos
        </h1>
        <p className="text-sm text-gray-400">
          Confira todos os eventos oficiais da PX Custom
        </p>
      </div>

      {/* Filter Chips Bar (Identical to Mockup Screen 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => {
            const active = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#FF1A2D] text-white shadow-md shadow-red-950/40'
                    : 'bg-[#141414] text-gray-300 hover:text-white hover:bg-[#1f1f1f] border border-[#222222]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-[#222222] focus:border-[#FF1A2D] rounded-full pl-9 pr-4 py-2 text-xs text-white focus:outline-none transition"
          />
        </div>
      </div>

      {/* Event Cards List (Matching Mockup Screen 2) */}
      <div className="space-y-4">
        {filteredEvents.map((event) => {
          const isLive = event.status === 'EM_ANDAMENTO';
          const isDone = event.status === 'FINALIZADO';

          return (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event.slug)}
              className="group bg-[#0d0d0d] hover:bg-[#121212] border border-[#1b1b1b] hover:border-[#FF1A2D]/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-black/90"
            >
              <div className="flex items-start sm:items-center gap-4">
                {/* Image with date badge overlay */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-black border border-[#222222]">
                  <img
                    src={event.bannerImage}
                    alt={event.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/90 border border-[#2f2f2f] rounded-lg px-2 py-0.5 text-center">
                    <span className="block text-[11px] font-black text-[#FF1A2D] font-heading leading-tight">
                      {event.dateBadge.split(' ')[0]}
                    </span>
                    <span className="block text-[8px] font-bold text-white uppercase">
                      {event.dateBadge.split(' ')[1]}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-black text-white font-heading group-hover:text-[#FF1A2D] transition-colors">
                    {event.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5 text-gray-300">
                      <MapPin className="w-3.5 h-3.5 text-[#FF1A2D] shrink-0" />
                      {event.city} - {event.state}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      {event.time}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-1 max-w-lg hidden sm:block">
                    {event.tagline || event.description}
                  </p>
                </div>
              </div>

              {/* Status Pill & Action Arrow */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-[#181818] sm:border-0">
                <div>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Em andamento
                    </span>
                  ) : isDone ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#1f1f1f] text-gray-400 text-xs font-bold">
                      Finalizado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FF1A2D]/15 text-[#FF1A2D] border border-[#FF1A2D]/30 text-xs font-bold">
                      Em breve
                    </span>
                  )}
                </div>

                <div className="w-9 h-9 rounded-full bg-[#181818] group-hover:bg-[#FF1A2D] text-gray-400 group-hover:text-white flex items-center justify-center transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl p-12 text-center space-y-3">
            <p className="text-gray-400 text-sm">Nenhum evento encontrado para este filtro.</p>
            <button
              onClick={() => {
                setSelectedFilter('TODOS');
                setSearchQuery('');
              }}
              className="text-xs text-[#FF1A2D] font-bold hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
