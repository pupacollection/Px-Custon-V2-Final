import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-lg bg-[#FF1A2D] hover:bg-[#C90018] text-white font-semibold transition shadow-md shadow-red-950/40 cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
        title="Instalar aplicativo PX CUSTOM"
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-[#333333] hover:border-[#FF1A2D] bg-[#111111] hover:bg-[#181818] text-gray-200 text-xs font-medium transition cursor-pointer ${
            compact ? 'px-2 py-1' : 'px-3 py-1.5'
          }`}
          title="Como instalar no iPhone"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#FF1A2D]" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#111111] border border-[#222222] p-6 shadow-2xl relative text-left">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-white mb-2 font-heading">
                Instalar no iPhone / iPad
              </h3>
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                Adicione o aplicativo oficial da <strong className="text-white">PX CUSTOM</strong> à sua tela de início para acesso rápido e ingressos offline:
              </p>
              <ol className="text-xs text-gray-300 space-y-2.5 mb-5 bg-[#080808] p-3.5 rounded-lg border border-[#1a1a1a]">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF1A2D] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  <span>Toque no botão de <strong>Compartilhar</strong> no Safari (ícone com quadrado e seta).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF1A2D] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF1A2D] text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#FF1A2D] hover:bg-[#C90018] py-2.5 text-sm font-semibold text-white transition cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback demo/generic install button if neither has triggered yet (keeps UI ready)
  return (
    <button
      onClick={() => {
        alert('Para instalar o app PX CUSTOM, adicione este site à tela inicial do seu dispositivo através do menu do navegador.');
      }}
      className={`hidden sm:flex items-center gap-1.5 rounded-lg border border-[#262626] hover:border-[#FF1A2D] bg-[#111111]/80 hover:bg-[#181818] text-gray-300 text-xs font-medium transition cursor-pointer ${
        compact ? 'px-2 py-1' : 'px-3 py-1.5'
      }`}
    >
      <Download className="w-3.5 h-3.5 text-[#FF1A2D]" />
      <span>Baixar App</span>
    </button>
  );
};
