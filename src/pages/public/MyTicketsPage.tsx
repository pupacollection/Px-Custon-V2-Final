import React, { useState } from 'react';
import { Ticket as TicketIcon, Calendar, Clock, MapPin, QrCode, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { Ticket } from '../../types';
import { DigitalTicketCard } from '../../components/tickets/DigitalTicketCard';

interface MyTicketsPageProps {
  tickets: Ticket[];
  onBrowseEvents: () => void;
}

export const MyTicketsPage: React.FC<MyTicketsPageProps> = ({ tickets, onBrowseEvents }) => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-heading">
            Meus Ingressos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Seus ingressos digitais oficiais com QR Code para acesso aos eventos da PX CUSTOM
          </p>
        </div>

        <button
          onClick={onBrowseEvents}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-xs font-bold text-gray-200 transition cursor-pointer"
        >
          Ver mais eventos
        </button>
      </div>

      {/* Tickets List */}
      {(tickets || []).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(tickets || []).map((ticket) => {
            const isPaid = ticket.status === 'PAGO';
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="group bg-[#0e0e0e] hover:bg-[#141414] border border-[#1e1e1e] hover:border-[#FF1A2D]/60 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-black/90 space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#181818]">
                    <div>
                      <span className="text-[10px] font-bold text-[#FF1A2D] uppercase tracking-wider block">
                        PX CUSTOM OFICIAL
                      </span>
                      <h3 className="text-lg font-black text-white font-heading group-hover:text-[#FF1A2D] transition-colors">
                        {ticket.eventName}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 border ${
                        isPaid
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : ticket.status === 'PENDENTE'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-[#1e1e1e] text-gray-400 border-[#2a2a2a]'
                      }`}
                    >
                      {ticket.status === 'PENDENTE' ? 'AGUARDANDO PAGAMENTO' : ticket.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-200">{ticket.batchName}</span>
                      <span>•</span>
                      <span>R$ {ticket.price.toFixed(2).replace('.', ',')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#FF1A2D] shrink-0" />
                      <span>{ticket.eventDate}</span>
                      <Clock className="w-3.5 h-3.5 text-gray-500 ml-2 shrink-0" />
                      <span>{ticket.eventTime}</span>
                    </div>

                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#FF1A2D] shrink-0" />
                      <span className="truncate">{ticket.eventLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#181818] flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-400 font-bold">
                    {ticket.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF1A2D] group-hover:translate-x-1 transition-transform">
                    <QrCode className="w-4 h-4" />
                    <span>Abrir Ingresso</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl p-12 text-center space-y-4">
          <TicketIcon className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-lg font-bold text-white font-heading">
            Você ainda não possui ingressos
          </h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Garanta sua entrada nos eventos oficiais da PX CUSTOM e tenha seu QR Code sempre à mão no aplicativo.
          </p>
          <button
            onClick={onBrowseEvents}
            className="px-6 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Explorar Eventos
          </button>
        </div>
      )}

      {/* Full Digital Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-sm my-8">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute -top-10 right-0 text-gray-400 hover:text-white p-2 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <DigitalTicketCard ticket={selectedTicket} />
          </div>
        </div>
      )}

    </div>
  );
};
