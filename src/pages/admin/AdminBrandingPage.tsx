import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  Palette,
  Layers,
  Sparkles,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { PxLogo } from '../../components/common/PxLogo';
import { MediaUploader } from '../../components/media/MediaUploader';
import { MediaItem } from '../../types';

export const AdminBrandingPage: React.FC = () => {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [brandingAssets, setBrandingAssets] = useState<MediaItem[]>([
    {
      id: 'brand-official-logo',
      url: '/logo.svg',
      fileName: 'px-custom-logo-oficial.svg',
      fileSize: 42 * 1024,
      mimeType: 'image/svg+xml',
      isPrimary: true,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: 'brand-official-favicon',
      url: '/favicon.svg',
      fileName: 'px-custom-favicon.svg',
      fileSize: 12 * 1024,
      mimeType: 'image/svg+xml',
      isPrimary: false,
      uploadedAt: new Date().toISOString(),
    },
  ]);

  const officialColors = [
    { name: 'BLACK', hex: '#000000', label: 'Fundo Absoluto' },
    { name: 'DARK', hex: '#080808', label: 'Superfícies Escuras' },
    { name: 'GRAPHITE', hex: '#111111', label: 'Bordas & Cards' },
    { name: 'GRAPHITE 2', hex: '#181818', label: 'Containers Secundários' },
    { name: 'RED PRIMARY', hex: '#FF1A2D', label: 'Destaques & CTAs' },
    { name: 'RED DARK', hex: '#C90018', label: 'Hover & Sombras' },
    { name: 'WHITE', hex: '#FFFFFF', label: 'Tipografia em Alto Contraste' },
  ];

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1a1a] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#FF1A2D]/20 text-[#FF1A2D] text-[10px] font-mono font-bold tracking-wider border border-[#FF1A2D]/30">
              PX CONTROL • ATIVOS OFICIAIS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading tracking-wide">
            Identidade Visual & Branding
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gestão dos ativos visuais oficiais da PX CUSTOM, paleta de cores corporativa e upload de materiais institucionais.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Logo Oficial Protegida</span>
          </div>
        </div>
      </div>

      {/* 1. LOGO OFICIAL EM DESTAQUE (Imutável e Preservada) */}
      <div className="rounded-2xl bg-[#090909] border border-[#222222] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#181818]">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF1A2D]" />
              <h2 className="text-lg font-black text-white font-heading uppercase">
                Logotipo Oficial PX CUSTOM (Asset Primário)
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Identidade visual obrigatória da organização. Não passível de substituição automática por mocks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/logo.svg"
              download="px-custom-logo-oficial.svg"
              className="px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-xs font-bold text-gray-200 hover:text-white transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#FF1A2D]" />
              <span>Baixar SVG Oficial</span>
            </a>
            <a
              href="/favicon.svg"
              download="px-custom-favicon.svg"
              className="px-3 py-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-xs font-bold text-gray-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Baixar Ícone / Favicon"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Favicon</span>
            </a>
          </div>
        </div>

        {/* Logo Preview Displays */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Full Logo */}
          <div className="p-6 rounded-2xl bg-black border border-[#262626] flex flex-col items-center justify-center min-h-[220px] text-center space-y-4">
            <div className="w-48 h-32 flex items-center justify-center">
              <img src="/logo.svg" alt="PX CUSTOM Logo Oficial" className="w-full h-full object-contain" />
            </div>
            <div className="text-[11px] text-gray-400">
              <strong className="text-white block font-heading">Vetor Oficial Padrão (Fundo Preto)</strong>
              <span className="font-mono text-gray-500">/public/logo.svg</span>
            </div>
          </div>

          {/* Control Variant */}
          <div className="p-6 rounded-2xl bg-[#0c0c0c] border border-[#262626] flex flex-col items-center justify-center min-h-[220px] text-center space-y-4">
            <div className="flex items-center justify-center py-4">
              <PxLogo variant="control" size="lg" />
            </div>
            <div className="text-[11px] text-gray-400">
              <strong className="text-white block font-heading">Versão Painel Administrativo</strong>
              <span className="text-gray-500">Emblema PX + Badge CONTROL</span>
            </div>
          </div>

          {/* Icon / Favicon Variant */}
          <div className="p-6 rounded-2xl bg-black border border-[#262626] flex flex-col items-center justify-center min-h-[220px] text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-[#333333] p-3 flex items-center justify-center">
              <img src="/favicon.svg" alt="PX Favicon" className="w-full h-full object-contain" />
            </div>
            <div className="text-[11px] text-gray-400">
              <strong className="text-white block font-heading">Ícone PWA / Favicon</strong>
              <span className="font-mono text-gray-500">/public/favicon.svg (128x128)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PALETA DE CORES OFICIAL (Guia de Estilo) */}
      <div className="rounded-2xl bg-[#090909] border border-[#222222] p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#181818]">
          <Palette className="w-4 h-4 text-[#FF1A2D]" />
          <h2 className="text-lg font-black text-white font-heading uppercase">
            Paleta de Cores Oficial da Marca
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {officialColors.map((color) => {
            const isCopied = copiedColor === color.hex;
            return (
              <button
                key={color.name}
                type="button"
                onClick={() => handleCopy(color.hex)}
                className="group p-3 rounded-xl bg-[#121212] hover:bg-[#181818] border border-[#242424] hover:border-[#333333] text-left transition flex flex-col justify-between cursor-pointer space-y-3"
                title="Clique para copiar o código hexadecimal"
              >
                <div
                  className="w-full h-12 rounded-lg border border-white/10 shadow-inner"
                  style={{ backgroundColor: color.hex }}
                />
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 block font-heading">
                    {color.name}
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono text-xs font-bold text-white">
                      {color.hex}
                    </span>
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-500 group-hover:text-white" />
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 block mt-1">
                    {color.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. UPLOAD DE NOVOS ASSETS OFICIAIS (Banners de Patrocínio, Wallpapers, etc.) */}
      <div className="rounded-2xl bg-[#090909] border border-[#222222] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#181818]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF1A2D]" />
            <h2 className="text-lg font-black text-white font-heading uppercase">
              Upload de Ativos Institucionais & Banners de Campanha
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            Bucket Supabase: <code className="text-[#FF1A2D] font-mono">branding/</code>
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Utilize esta área administrativa para anexar wallpapers oficiais, logotipos de patrocinadores, artes de divulgação e banners comemorativos.
        </p>

        <MediaUploader
          multiple={true}
          maxFiles={12}
          value={brandingAssets}
          onChange={setBrandingAssets}
          uploadType="branding"
          resourceId="brand-assets-master"
          label="Adicionar Novos Assets de Branding (PNG, JPG, WEBP, SVG)"
          hint="Arquivos em alta definição de até 10 MB. Imagens adicionadas aqui ficam disponíveis para a equipe de eventos e marketing."
          allowCamera={false}
          allowReorder={true}
          allowSetPrimary={false}
          allowRemove={true}
        />
      </div>
    </div>
  );
};
