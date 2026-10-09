import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  User,
  Clock,
  Ticket,
  Search,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { CheckInLog } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AdminCheckinPage: React.FC = () => {
  const { user, profile } = useAuth();
  const operatorName = profile?.name || user?.email || 'Operador PX Portaria';

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{
    authorized: boolean;
    reason: string;
    details: string;
    ticket?: any;
    log?: CheckInLog | null;
  } | null>(null);
  const [checkins, setCheckins] = useState<CheckInLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  const loadCheckins = async () => {
    const logs = await api.getCheckins();
    setCheckins(logs);
  };

  const handleValidate = useCallback(async (codeToTest: string) => {
    if (!codeToTest.trim()) return;
    setValidating(true);
    setResult(null);

    const res = await api.validateCheckIn(codeToTest, operatorName);
    setResult(res);
    setValidating(false);
    if (res.authorized) {
      loadCheckins();
    }
  }, [operatorName]);

  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (qrCode && qrCode.data) {
          const now = Date.now();
          const cleanData = qrCode.data.trim();
          // Prevenção de leituras repetidas em sequência
          if (cleanData !== lastScannedCodeRef.current || now - lastScanTimestampRef.current > 3500) {
            lastScannedCodeRef.current = cleanData;
            lastScanTimestampRef.current = now;
            setManualCode(cleanData);
            handleValidate(cleanData);
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanLoop);
  }, [handleValidate]);

  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setCameraActive(true);
      animFrameIdRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.warn('[PX CHECKIN] Falha ao acessar a câmera:', err);
      const msg = err?.name === 'NotAllowedError'
        ? 'Permissão de acesso à câmera negada. Permita o uso da câmera nas configurações do navegador.'
        : 'Câmera não encontrada ou em uso por outro aplicativo. Digite o código manualmente.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    loadCheckins();
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const filteredLogs = checkins.filter(
    (l) =>
      l.attendeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.ticketCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading flex items-center gap-3">
          <QrCode className="w-7 h-7 text-[#FF1A2D]" />
          <span>Check-in (Scanner QR Code)</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Validação de ingressos em tempo real na portaria com verificação segura no servidor
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. CAMERA / SCANNER VIEWFINDER (Matching Mockup Screen) */}
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 flex flex-col items-center justify-between space-y-4">
          
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Leitor de Câmera
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-gray-300 border border-[#242424]">
              {cameraActive ? '● Câmera Ativa' : '○ Standby'}
            </span>
          </div>

          {/* Viewfinder Frame (Matching Mockup with animated red scan line) */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-[#050505] border-2 border-[#242424] flex items-center justify-center overflow-hidden shadow-2xl">
            {cameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
                muted
              />
            ) : (
              <div className="p-4 text-center space-y-3">
                <QrCode className="w-16 h-16 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400">
                  Aproxime o QR Code do ingresso da câmera
                </p>
              </div>
            )}

            {/* Hidden canvas for optical frame analysis with jsQR */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle Brackets (White/Red corners) */}
            <div className="absolute inset-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#FF1A2D] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FF1A2D] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FF1A2D] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#FF1A2D] rounded-br-lg" />
            </div>

            {/* Red Laser Scanning Beam (Animated) */}
            {cameraActive && (
              <div className="absolute left-6 right-6 h-0.5 bg-[#FF1A2D] shadow-[0_0_12px_#FF1A2D] animate-scanline pointer-events-none" />
            )}
          </div>

          {cameraError && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Aproxime o QR Code impresso ou no celular do participante
          </p>

          {/* Camera Button (Matching Mockup Screen) */}
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              cameraActive
                ? 'bg-[#181818] hover:bg-[#222222] text-gray-200 border border-[#333333]'
                : 'bg-[#FF1A2D] hover:bg-[#C90018] text-white shadow-lg shadow-red-950/40'
            }`}
          >
            {cameraActive ? (
              <>
                <CameraOff className="w-4 h-4" />
                <span>Desativar câmera</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Ativar leitor de câmera</span>
              </>
            )}
          </button>
        </div>

        {/* 2. MANUAL VALIDATION & REAL CONTROLS */}
        <div className="space-y-4">
          <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Validação Manual do Código
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: PX-2025-ENC-..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleValidate(manualCode)}
                className="flex-1 bg-[#141414] border border-[#292929] focus:border-[#FF1A2D] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase focus:outline-none"
              />
              <button
                onClick={() => handleValidate(manualCode)}
                disabled={validating || !manualCode.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                {validating ? 'Verificando...' : 'Validar'}
              </button>
            </div>

            <p className="text-[11px] text-gray-500">
              A validação verifica a autenticidade do lote, evento e status de pagamento em tempo real no banco PostgreSQL com controle transacional anti-duplicidade.
            </p>
          </div>

          {/* Validation Result Display (High Contrast Banner) */}
          {result && (
            <div
              className={`p-5 rounded-2xl border transition-all ${
                result.authorized
                  ? 'bg-[#081a0e] border-emerald-500/60 shadow-lg shadow-emerald-950/40 text-emerald-300'
                  : result.reason.includes('UTILIZADO')
                  ? 'bg-[#1f1705] border-yellow-500/60 shadow-lg shadow-yellow-950/40 text-yellow-300'
                  : 'bg-[#1f0507] border-[#FF1A2D]/60 shadow-lg shadow-red-950/40 text-[#FF3344]'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-black/40 shrink-0 mt-0.5">
                  {result.authorized ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : result.reason.includes('UTILIZADO') ? (
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-[#FF1A2D]" />
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  <h3 className="text-base font-black uppercase font-heading tracking-wide">
                    {result.reason}
                  </h3>
                  <p className="text-xs opacity-90 leading-relaxed">{result.details}</p>

                  {result.ticket && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="opacity-75">Participante:</span>
                        <span className="font-bold text-white">{result.ticket.buyerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-75">Lote / Setor:</span>
                        <span className="font-bold text-white">{result.ticket.batchName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-75">Evento:</span>
                        <span className="font-bold text-white">{result.ticket.eventName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 3. HISTÓRICO DE CHECK-INS (Matching Mockup Screen) */}
      <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-white font-heading uppercase">
              Histórico de Check-ins
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#181818] text-xs font-mono text-gray-300">
              {checkins.length} registros
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar participante ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#141414] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none w-56"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-[#121212] border border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#292929] flex items-center justify-center text-gray-300">
                  <User className="w-4 h-4 text-[#FF1A2D]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{log.attendeeName}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="text-gray-300 font-medium">{log.batchName}</span>
                    <span>•</span>
                    <span className="font-mono text-gray-500">{log.ticketCode}</span>
                    <span>•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-[#181818] sm:border-0">
                <span className="text-[11px] text-gray-500">{log.operatorName}</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase">
                  Confirmado
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
