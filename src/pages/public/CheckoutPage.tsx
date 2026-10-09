import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  CreditCard,
  FileText,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { EventItem, Ticket, CheckoutResult } from '../../types';
import { api } from '../../services/api';

interface CheckoutPageProps {
  event: EventItem;
  user: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  onBack: () => void;
  onSuccess: (ticket: Ticket) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  event,
  user,
  onBack,
  onSuccess,
}) => {
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARTAO' | 'BOLETO'>('PIX');
  const [buyerName, setBuyerName] = useState(user.name);
  const [buyerEmail, setBuyerEmail] = useState(user.email);
  const [buyerCpf, setBuyerCpf] = useState(user.cpf);
  const [buyerPhone, setBuyerPhone] = useState(user.phone);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados do pagamento real retornado
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>('AGUARDANDO_PAGAMENTO');
  const [checkingPayment, setCheckingPayment] = useState(false);

  const batches = event?.ticketBatches || [];
  const selectedBatch = batches[selectedBatchIndex] || batches[0] || { id: 'default', name: 'Ingresso Oficial', price: 50 };

  // Gera a imagem do QR Code quando receber a chave Copia-e-Cola do PIX
  useEffect(() => {
    if (checkoutResult?.qrCodePix) {
      if (checkoutResult.qrCodePixBase64) {
        setPixQrDataUrl(`data:image/png;base64,${checkoutResult.qrCodePixBase64}`);
      } else {
        QRCode.toDataURL(checkoutResult.qrCodePix, {
          width: 240,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
          .then((url) => setPixQrDataUrl(url))
          .catch((err) => console.error('Erro ao renderizar QR code PIX', err));
      }
    }
  }, [checkoutResult]);

  // Polling periódico do status do pedido no backend para confirmação do webhook
  useEffect(() => {
    if (!checkoutResult?.orderId || pollingStatus === 'PAGO') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getOrderStatus(checkoutResult.orderId);
        if (res.status === 'PAID' || res.status === 'PAGO') {
          setPollingStatus('PAGO');
          clearInterval(interval);
          if (res.ticket) {
            setTimeout(() => {
              onSuccess(res.ticket!);
            }, 1500);
          }
        }
      } catch (err) {
        // Polling silencioso
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [checkoutResult?.orderId, pollingStatus, onSuccess]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerEmail || !buyerCpf) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      const result = await api.purchaseTicket({
        eventId: event.id,
        batchName: selectedBatch.name,
        price: selectedBatch.price,
        buyerName,
        buyerEmail,
        buyerCpf,
        buyerPhone,
        paymentMethod,
      });

      setProcessing(false);
      setCheckoutResult(result);
    } catch (err: any) {
      setProcessing(false);
      setErrorMsg(err.message || 'Erro ao processar compra. Tente novamente.');
    }
  };

  const handleCopyPix = () => {
    if (checkoutResult?.qrCodePix) {
      navigator.clipboard.writeText(checkoutResult.qrCodePix);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleManualCheckPayment = async () => {
    if (!checkoutResult?.orderId) return;
    setCheckingPayment(true);
    try {
      const res = await api.getOrderStatus(checkoutResult.orderId);
      if (res.status === 'PAID' || res.status === 'PAGO') {
        setPollingStatus('PAGO');
        if (res.ticket) {
          onSuccess(res.ticket);
        }
      } else {
        setErrorMsg('Pagamento ainda em processamento pelo Mercado Pago. Aguarde alguns instantes.');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg('Não foi possível verificar no momento. Tentaremos novamente em instantes.');
    } finally {
      setCheckingPayment(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TELA DE PAGAMENTO ATIVO (PIX / MERCADO PAGO COM QR CODE REAL)
  // ---------------------------------------------------------------------------
  if (checkoutResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCheckoutResult(null)}
            className="p-2 rounded-lg bg-[#111111] hover:bg-[#181818] text-gray-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-heading">
              Pagamento via Mercado Pago
            </h1>
            <p className="text-xs text-gray-400">
              Pedido: #{checkoutResult.orderId.substring(0, 12)}
            </p>
          </div>
        </div>

        {/* Status de Confirmação */}
        {pollingStatus === 'PAGO' ? (
          <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h2 className="text-lg font-black text-white font-heading uppercase">
              Pagamento Confirmado!
            </h2>
            <p className="text-xs text-gray-300">
              O Mercado Pago confirmou o pagamento com sucesso. Seu ingresso digital oficial com QR Code foi emitido e liberado.
            </p>
            <div className="pt-2">
              <button
                onClick={() => checkoutResult.ticket && onSuccess(checkoutResult.ticket)}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider transition cursor-pointer font-heading"
              >
                Abrir Meu Ingresso
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Card de Instrução PIX Oficial */}
            <div className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl p-6 space-y-6">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black text-[#FF1A2D] uppercase tracking-wider block">
                  PAGAMENTO INSTANTÂNEO
                </span>
                <h2 className="text-xl font-black text-white font-heading">
                  Escaneie o QR Code PIX
                </h2>
                <p className="text-xs text-gray-400">
                  Abra o app do seu banco, escolha <strong>Pagar via Pix</strong> e aponte a câmera ou copie o código abaixo.
                </p>
              </div>

              {/* QR Code Container Branco de Alto Contraste */}
              {checkoutResult.qrCodePix && (
                <div className="bg-white p-4 rounded-2xl max-w-xs mx-auto flex flex-col items-center justify-center shadow-2xl border-2 border-[#FF1A2D]/40">
                  {pixQrDataUrl ? (
                    <img
                      src={pixQrDataUrl}
                      alt="QR Code Pix Mercado Pago"
                      className="w-56 h-56 object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center text-black text-xs font-mono gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#FF1A2D]" />
                      <span>Gerando QR Code Pix...</span>
                    </div>
                  )}
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">
                    Mercado Pago • PX CUSTOM
                  </span>
                </div>
              )}

              {/* Botão Copia e Cola */}
              {checkoutResult.qrCodePix && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-300 uppercase">
                    Código Pix Copia e Cola
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={checkoutResult.qrCodePix}
                      className="flex-1 bg-[#141414] border border-[#242424] rounded-xl px-3 py-2.5 text-xs text-gray-300 font-mono focus:outline-none select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-4 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      {copiedPix ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Valor e Resumo */}
              <div className="bg-[#141414] border border-[#202020] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">{selectedBatch.name}</span>
                  <span className="text-sm font-bold text-white font-heading">{event.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase block">Valor Total</span>
                  <span className="text-lg font-black text-white font-heading">
                    R$ {checkoutResult.totalAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Aguardando Webhook / Polling */}
              <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-[#141414] border border-[#222222] text-xs text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF1A2D]" />
                <span>
                  Aguardando confirmação do pagamento... O ingresso será liberado automaticamente após a aprovação.
                </span>
              </div>

              {/* Botão de Verificação Manual */}
              <button
                type="button"
                onClick={handleManualCheckPayment}
                disabled={checkingPayment}
                className="w-full py-3 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] text-gray-200 hover:text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {checkingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Consultando Mercado Pago...</span>
                  </>
                ) : (
                  <span>Já paguei, verificar pagamento</span>
                )}
              </button>

              {errorMsg && (
                <p className="text-xs text-[#FF1A2D] bg-[#1a0507] border border-[#FF1A2D]/40 p-3 rounded-lg text-center">
                  {errorMsg}
                </p>
              )}

              {/* Selo de Segurança */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2 border-t border-[#1c1c1c]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Ambiente Seguro Mercado Pago • PX CUSTOM Oficial</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // FORMULÁRIO DE CHECKOUT (SELEÇÃO DE LOTE E DADOS DO COMPRADOR)
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-[#111111] hover:bg-[#181818] text-gray-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-heading">
            Comprar Ingressos
          </h1>
          <p className="text-xs text-gray-400">{event.name}</p>
        </div>
      </div>

      {/* Event Summary Mini Card */}
      <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl p-4 flex items-center gap-3.5">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#2a2a2a]">
          <img
            src={event.bannerImage}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1 left-1 bg-black/90 border border-[#2a2a2a] rounded px-1.5 py-0.5 text-center">
            <span className="block text-[10px] font-black text-[#FF1A2D] font-heading leading-tight">
              {event.dateBadge.split(' ')[0]}
            </span>
            <span className="block text-[8px] font-bold text-white uppercase">
              {event.dateBadge.split(' ')[1]}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-black text-white font-heading">{event.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-[#FF1A2D] shrink-0" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{event.time}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleCheckout} className="space-y-6">
        {/* Ticket Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-white font-heading uppercase tracking-wide">
            Selecione o ingresso
          </label>

          <div className="space-y-2.5">
            {event.ticketBatches.map((batch, idx) => {
              const isSelected = selectedBatchIndex === idx;
              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatchIndex(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#141414] border-[#FF1A2D] shadow-lg shadow-red-950/30'
                      : 'bg-[#0a0a0a] border-[#1f1f1f] hover:border-[#333333]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-[#FF1A2D]' : 'border-gray-500'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#FF1A2D]" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-heading">{batch.name}</span>
                        <span className="text-[10px] text-gray-400 bg-[#1a1a1a] px-2 py-0.5 rounded">
                          {batch.batchNumber}º Lote
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{batch.description}</p>
                    </div>
                  </div>

                  <span className="text-base font-black text-white whitespace-nowrap font-heading">
                    R$ {batch.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Buyer Data Form */}
        <div className="space-y-3 bg-[#0c0c0c] border border-[#1a1a1a] rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white font-heading uppercase tracking-wide">
            Dados do Comprador
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full bg-[#141414] border border-[#242424] focus:border-[#FF1A2D] rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">CPF *</label>
              <input
                type="text"
                required
                value={buyerCpf}
                onChange={(e) => setBuyerCpf(e.target.value)}
                className="w-full bg-[#141414] border border-[#242424] focus:border-[#FF1A2D] rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">E-mail para Envio do Ingresso *</label>
              <input
                type="email"
                required
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full bg-[#141414] border border-[#242424] focus:border-[#FF1A2D] rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">WhatsApp / Telefone *</label>
              <input
                type="text"
                required
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full bg-[#141414] border border-[#242424] focus:border-[#FF1A2D] rounded-lg p-2.5 text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-white font-heading uppercase tracking-wide">
            Forma de Pagamento
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('PIX')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'PIX'
                  ? 'bg-[#141414] border-[#FF1A2D] text-white shadow-md shadow-red-950/30'
                  : 'bg-[#0a0a0a] border-[#1f1f1f] text-gray-400 hover:text-white'
              }`}
            >
              <QrCode className="w-5 h-5 text-[#FF1A2D]" />
              <span className="text-xs font-bold">PIX</span>
              <span className="text-[10px] text-emerald-400">Aprovação imediata</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CARTAO')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'CARTAO'
                  ? 'bg-[#141414] border-[#FF1A2D] text-white shadow-md shadow-red-950/30'
                  : 'bg-[#0a0a0a] border-[#1f1f1f] text-gray-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-5 h-5 text-[#FF1A2D]" />
              <span className="text-xs font-bold">Cartão</span>
              <span className="text-[10px] text-gray-400">Até 12x</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('BOLETO')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'BOLETO'
                  ? 'bg-[#141414] border-[#FF1A2D] text-white shadow-md shadow-red-950/30'
                  : 'bg-[#0a0a0a] border-[#1f1f1f] text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5 text-[#FF1A2D]" />
              <span className="text-xs font-bold">Boleto</span>
              <span className="text-[10px] text-gray-400">Até 3 dias</span>
            </button>
          </div>
        </div>

        {/* Resumo da Compra */}
        <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Ingresso ({selectedBatch.name})</span>
            <span>R$ {selectedBatch.price.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Taxa de emissão oficial</span>
            <span className="text-emerald-400 font-bold">GRÁTIS</span>
          </div>
          <div className="border-t border-[#1a1a1a] pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-white font-heading">Total</span>
            <span className="text-xl font-black text-white font-heading">
              R$ {selectedBatch.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-[#FF1A2D] bg-[#1a0507] border border-[#FF1A2D]/40 p-3 rounded-lg">
            {errorMsg}
          </p>
        )}

        {/* CTA Button */}
        <button
          type="submit"
          disabled={processing}
          className="w-full py-4 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] disabled:opacity-50 text-white font-black text-base uppercase tracking-wider transition shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer font-heading"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Gerando cobrança no Mercado Pago...</span>
            </>
          ) : (
            <span>Gerar cobrança e pagar</span>
          )}
        </button>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Pagamento seguro via Mercado Pago</span>
        </div>
      </form>
    </div>
  );
};
