import React, { useState } from 'react';
import { Ticket as TicketIcon, Search, QrCode, CheckCircle2, User, Eye, X } from 'lucide-react';
import { Ticket } from '../../types';
import { DigitalTicketCard } from '../../components/tickets/DigitalTicketCard';

export const AdminTicketsPage: React.FC<{ tickets: Ticket[] }> = ({ tickets }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const filteredTickets = (tickets || []).filter(
    (t) =>
      t.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.batchName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading">
            Ingressos Emitidos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Controle de todos os ingressos digitais com QR Code e pagamentos confirmados
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código ou titular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#141414] text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#222222]">
              <tr>
                <th className="p-4">Código / QR</th>
                <th className="p-4">Participante</th>
                <th className="p-4">Evento</th>
                <th className="p-4">Lote / Setor</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818]">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-[#121212] transition">
                  <td className="p-4 font-mono font-bold text-white flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#FF1A2D]" />
                    <span>{t.code}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-white block">{t.buyerName}</span>
                    <span className="text-[10px] text-gray-500">{t.buyerEmail}</span>
                  </td>
                  <td className="p-4 text-gray-300">{t.eventName}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-[#181818] border border-[#2a2a2a] text-gray-200">
                      {t.batchName}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-white">
                    R$ {t.price.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase">
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#292929] text-gray-200 hover:text-white transition flex items-center gap-1.5 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#FF1A2D]" />
                      <span>Ver Ingresso</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Modal */}
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
