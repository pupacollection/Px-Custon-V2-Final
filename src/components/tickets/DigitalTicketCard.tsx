import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Calendar, Clock, MapPin, User, CheckCircle2, Download, Share2, Copy, Check } from 'lucide-react';
import { Ticket } from '../../types';
import { PxLogo } from '../common/PxLogo';

interface DigitalTicketCardProps {
  ticket: Ticket;
  compact?: boolean;
}

export const DigitalTicketCard: React.FC<DigitalTicketCardProps> = ({
  ticket,
  compact = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate QR Code with high error correction
    QRCode.toDataURL(ticket.code, {
      width: compact ? 180 : 280,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code', err));
  }, [ticket.code, compact]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticket.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPaid = ticket.status === 'PAGO';
  const isUsed = ticket.status === 'UTILIZADO';

  return (
    <div className="relative max-w-sm mx-auto bg-[#0a0a0a] border border-[#222222] rounded-3xl overflow-hidden shadow-2xl text-left select-none">
      
      {/* Top Header with PX CUSTOM Official Branding */}
      <div className="bg-[#111111] border-b border-[#1c1c1c] p-5 text-center relative">
        <PxLogo size="sm" className="mx-auto" />
        <span className="block text-[10px] font-bold text-[#FF1A2D] uppercase tracking-widest mt-1">
          INGRESSO DIGITAL OFICIAL
        </span>
      </div>

      {/* Ticket Body */}
      <div className="p-6 space-y-5">
        
        {/* Event Title & Batch */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-white font-heading uppercase">
            {ticket.eventName}
          </h2>
          <div className="inline-block px-3 py-1 rounded-full bg-[#181818] border border-[#FF1A2D]/40 text-[#FF1A2D] text-xs font-black uppercase tracking-wider">
            {ticket.batchName} • R$ {ticket.price.toFixed(2).replace('.', ',')}
          </div>
        </div>

        {/* Big High-Contrast QR Code in White Container */}
        <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg relative border-2 border-[#FF1A2D]/40">
          {isPaid || isUsed ? (
            qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${ticket.code}`}
                className="w-48 h-48 object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-black text-xs font-mono">
                Gerando QR Code...
              </div>
            )
          ) : (
            <div className="w-48 h-48 flex flex-col items-center justify-center text-center p-4 bg-gray-100 rounded-xl space-y-2">
              <span className="text-xs font-bold text-gray-700 uppercase">
                QR Code Bloqueado
              </span>
              <span className="text-[10px] text-gray-500">
                Aguardando confirmação do pagamento pelo Mercado Pago para liberar seu acesso.
              </span>
            </div>
          )}

          {/* Ticket unique code */}
          <div className="mt-2 flex items-center gap-2 bg-black px-3 py-1.5 rounded-lg border border-[#333333]">
            <span className="font-mono text-xs font-bold text-white tracking-widest">
              {ticket.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="text-gray-400 hover:text-[#FF1A2D] transition cursor-pointer"
              title="Copiar código"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="text-center">
          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PAGO • ENTRADA AUTORIZADA
            </span>
          ) : isUsed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs font-black uppercase tracking-wide">
              UTILIZADO EM {ticket.checkedInAt || 'PORTARIA'}
            </span>
          ) : ticket.status === 'PENDENTE' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black uppercase tracking-wide">
              AGUARDANDO PAGAMENTO
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1c1c] text-gray-300 text-xs font-black uppercase">
              STATUS: {ticket.status}
            </span>
          )}
        </div>

        {/* Perforated tear line with semicircle notches */}
        <div className="relative my-4">
          <div className="absolute -left-10 -top-3 w-6 h-6 rounded-full bg-black border-r border-[#222222]" />
          <div className="absolute -right-10 -top-3 w-6 h-6 rounded-full bg-black border-l border-[#222222]" />
          <div className="border-t-2 border-dashed border-[#222222] my-2" />
        </div>

        {/* Participant & Event Info Grid */}
        <div className="space-y-2 text-xs text-gray-300">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#141414]">
            <span className="text-gray-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF1A2D]" />
              Titular:
            </span>
            <span className="font-bold text-white">{ticket.buyerName}</span>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-[#141414]">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FF1A2D]" />
              Data:
            </span>
            <span className="font-bold text-white">{ticket.eventDate}</span>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-[#141414]">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF1A2D]" />
              Horário:
            </span>
            <span className="font-bold text-white">{ticket.eventTime}</span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#FF1A2D]" />
              Local:
            </span>
            <span className="font-bold text-white text-right max-w-[180px] truncate">
              {ticket.eventLocation}
            </span>
          </div>
        </div>

        {/* Ticket Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] text-xs font-bold text-white transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FF1A2D]" />
            <span>Salvar / PDF</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Ingresso ${ticket.eventName}`,
                  text: `Meu ingresso digital PX CUSTOM: ${ticket.code}`,
                }).catch(() => {});
              } else {
                handleCopyCode();
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] text-xs font-bold text-white transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#FF1A2D]" />
            <span>Compartilhar</span>
          </button>
        </div>

      </div>

      {/* Footer Notice */}
      <div className="bg-[#050505] p-3 text-center border-t border-[#141414]">
        <p className="text-[10px] text-gray-500">
          Apresente este QR Code diretamente na portaria do evento. É obrigatório apresentar documento oficial com foto.
        </p>
      </div>

    </div>
  );
};
