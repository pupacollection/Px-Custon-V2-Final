import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Car, Volume2, Bike, Utensils, ShieldCheck, Ticket, CheckCircle2, ExternalLink, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { EventItem } from '../../types';

interface EventDetailPageProps {
  event: EventItem;
  onBack: () => void;
  onBuyTickets: (eventSlug: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  onBack,
  onBuyTickets,
}) => {
  const [activeTab, setActiveTab] = useState<'sobre' | 'ingressos' | 'localizacao' | 'galeria'>('sobre');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const tabs = [
    { id: 'sobre', label: 'Sobre' },
    { id: 'ingressos', label: 'Ingressos' },
    { id: 'localizacao', label: 'Localização' },
    { id: 'galeria', label: 'Galeria' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para eventos</span>
      </button>

      {/* Hero Banner (Matching Mockup Screen 3) */}
      <div className="relative h-64 sm:h-80 md:h-96 rounded-2xl sm:rounded-3xl overflow-hidden border border-[#1e1e1e] shadow-2xl">
        <img
          src={event.bannerImage}
          alt={event.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        {/* Floating status pill */}
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 rounded-full bg-[#FF1A2D] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-950/60 font-heading">
            {event.status === 'EM_ANDAMENTO' ? 'Em andamento' : 'Em breve'}
          </span>
        </div>

        {/* Floating Event Title on Banner bottom */}
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded bg-black/80 border border-[#333333] text-[11px] font-bold text-[#FF1A2D] uppercase tracking-wider backdrop-blur-md">
            PX CUSTOM OFICIAL
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white font-heading uppercase drop-shadow-md">
            {event.name}
          </h1>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-gray-200">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#FF1A2D]" />
              {event.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#FF1A2D]" />
              {event.time}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar (Matching Mockup Screen 3) */}
      <div className="border-b border-[#1c1c1c] flex items-center gap-6 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-bold transition relative whitespace-nowrap cursor-pointer ${
                active ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF1A2D] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Sobre */}
      {activeTab === 'sobre' && (
        <div className="space-y-8 animate-fadeIn">
          {/* About description */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white uppercase tracking-wider font-heading">
              Sobre o evento
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Feature Highlights Grid (Matching Mockup Screen 3 icons) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-3.5 text-center space-y-1.5">
              <div className="w-9 h-9 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white block">Carros Rebaixados</span>
              <span className="text-[10px] text-gray-500 block">Exposição de gala</span>
            </div>

            <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-3.5 text-center space-y-1.5">
              <div className="w-9 h-9 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
                <Bike className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white block">Motos</span>
              <span className="text-[10px] text-gray-500 block">Área reservada</span>
            </div>

            <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-3.5 text-center space-y-1.5">
              <div className="w-9 h-9 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white block">Som Automotivo</span>
              <span className="text-[10px] text-gray-500 block">Arena de graves</span>
            </div>

            <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-3.5 text-center space-y-1.5">
              <div className="w-9 h-9 mx-auto rounded-lg bg-[#181818] text-[#FF1A2D] flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white block">Área de Alimentação</span>
              <span className="text-[10px] text-gray-500 block">Food trucks</span>
            </div>
          </div>

          {/* Localização Preview (Matching Mockup Screen 3 Map Block) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-heading">
                Localização
              </h3>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#FF1A2D] hover:underline flex items-center gap-1"
              >
                <span>Ver no mapa</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl overflow-hidden">
              <div className="p-3.5 flex items-center gap-2.5 text-xs text-gray-300 border-b border-[#181818]">
                <MapPin className="w-4 h-4 text-[#FF1A2D] shrink-0" />
                <span className="font-semibold text-white">{event.location}</span>
              </div>

              {/* Styled dark map simulation */}
              <div className="relative h-44 bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                {/* SVG Map Lines & Marker */}
                <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
                  <path d="M-50,80 Q200,40 500,100 T1000,50" stroke="#333333" strokeWidth="18" fill="none" />
                  <path d="M120,-30 L220,240" stroke="#333333" strokeWidth="14" fill="none" />
                  <path d="M380,-30 L320,240" stroke="#333333" strokeWidth="12" fill="none" />
                  <path d="M0,130 L900,130" stroke="#222222" strokeWidth="8" fill="none" />
                </svg>

                {/* Pulsing Pin Center */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#FF1A2D]/20 flex items-center justify-center animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-[#FF1A2D] text-white flex items-center justify-center shadow-lg shadow-red-900/60">
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="mt-2 text-xs font-bold text-white bg-black/90 border border-[#2a2a2a] px-2.5 py-1 rounded-full shadow-lg">
                    {event.location.split('-')[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Ingressos */}
      {activeTab === 'ingressos' && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-heading">
            Lotes & Tipos de Ingresso Disponíveis
          </h3>
          <div className="space-y-3">
            {event.ticketBatches.map((batch) => (
              <div
                key={batch.id}
                className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white font-heading">{batch.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181818] text-[#FF1A2D] border border-[#262626]">
                      {batch.batchNumber}º Lote
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{batch.description}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-xl font-black text-white font-heading">
                    R$ {batch.price.toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    onClick={() => onBuyTickets(event.slug)}
                    className="px-4 py-2 rounded-lg bg-[#FF1A2D] hover:bg-[#C90018] text-white text-xs font-bold transition cursor-pointer"
                  >
                    Selecionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Localização Full */}
      {activeTab === 'localizacao' && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-base font-bold text-white uppercase tracking-wider font-heading">
            Como Chegar
          </h3>
          <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
            <p className="text-sm text-gray-300">
              O evento será realizado no <strong>{event.location}</strong> com fácil acesso para veículos rebaixados (sem lombadas proibitivas na entrada principal) e estacionamento credenciado para motos e visitantes.
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF1A2D]" />
                <span>Portaria 1: Entrada de carros rebaixados e som automotivo</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF1A2D]" />
                <span>Portaria 2: Entrada de pedestres e camarote/VIP</span>
              </div>
            </div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-bold text-white transition"
            >
              <MapPin className="w-4 h-4 text-[#FF1A2D]" />
              <span>Abrir no Google Maps</span>
            </a>
          </div>
        </div>
      )}

      {/* Tab 4: Galeria */}
      {activeTab === 'galeria' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white uppercase tracking-wider font-heading">
              Galeria de Edições Anteriores
            </h3>
            <span className="text-xs text-gray-400">
              {(event.gallery || []).length} fotos • Clique para ampliar
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {(event.gallery || []).map((img, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                className="group relative h-44 sm:h-52 rounded-xl overflow-hidden border border-[#1f1f1f] bg-black cursor-pointer"
              >
                <img
                  src={img}
                  alt={`Galeria ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="p-2 rounded-full bg-black/70 border border-[#333333]">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Event Gallery */}
      {lightboxIndex !== null && event.gallery && event.gallery[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-full bg-[#141414] border border-[#2a2a2a] cursor-pointer z-10"
            title="Fechar visualizador"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous Button */}
          {event.gallery.length > 1 && (
            <button
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev !== null && prev > 0 ? prev - 1 : (event.gallery?.length || 1) - 1
                )
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#141414]/80 hover:bg-[#202020] border border-[#2a2a2a] text-white cursor-pointer z-10 transition-transform hover:scale-110"
              title="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Current Image */}
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img
              src={event.gallery[lightboxIndex]}
              alt={`Galeria ampliada ${lightboxIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-[#262626] shadow-2xl"
            />
            <div className="mt-4 flex items-center gap-3 text-xs text-gray-300">
              <span className="font-bold text-white uppercase font-heading tracking-wide">
                {event.name}
              </span>
              <span>•</span>
              <span className="text-[#FF1A2D] font-bold font-mono">
                Foto {lightboxIndex + 1} de {event.gallery.length}
              </span>
            </div>
          </div>

          {/* Next Button */}
          {event.gallery.length > 1 && (
            <button
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev !== null && prev < (event.gallery?.length || 1) - 1 ? prev + 1 : 0
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#141414]/80 hover:bg-[#202020] border border-[#2a2a2a] text-white cursor-pointer z-10 transition-transform hover:scale-110"
              title="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {/* Fixed/Prominent Sticky Bottom CTA (Matching Mockup Screen 3) */}
      <div className="pt-4">
        <button
          onClick={() => onBuyTickets(event.slug)}
          className="w-full py-4 rounded-xl sm:rounded-2xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-black text-base sm:text-lg tracking-wider uppercase transition shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer font-heading hover:scale-[1.01]"
        >
          <Ticket className="w-5 h-5" />
          <span>Comprar Ingressos</span>
        </button>
      </div>

    </div>
  );
};
