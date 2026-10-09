import React from 'react';
import { Trash2, Star, ArrowLeft, ArrowRight, Eye, ShieldCheck, HardDrive } from 'lucide-react';
import { MediaItem } from '../../types';

interface ImagePreviewProps {
  item: MediaItem;
  index: number;
  total: number;
  allowSetPrimary?: boolean;
  allowReorder?: boolean;
  allowRemove?: boolean;
  onSetPrimary?: (id: string) => void;
  onMove?: (index: number, direction: 'left' | 'right') => void;
  onRemove?: (id: string) => void;
  onEnlarge?: (item: MediaItem) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  item,
  index,
  total,
  allowSetPrimary = true,
  allowReorder = true,
  allowRemove = true,
  onSetPrimary,
  onMove,
  onRemove,
  onEnlarge,
}) => {
  const sizeFormatted = (item.fileSize / 1024).toFixed(0);

  return (
    <div
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 bg-[#0e0e0e] flex flex-col justify-between ${
        item.isPrimary
          ? 'border-[#FF1A2D] shadow-lg shadow-red-950/40 ring-1 ring-[#FF1A2D]'
          : 'border-[#222222] hover:border-[#383838]'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        <img
          src={item.url}
          alt={item.fileName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Primary Badge */}
        {item.isPrimary && (
          <div className="absolute top-2 left-2 z-10">
            <span className="px-2 py-0.5 rounded-md bg-[#FF1A2D] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-red-950/60 font-heading">
              <Star className="w-3 h-3 fill-current" />
              <span>PRINCIPAL</span>
            </span>
          </div>
        )}

        {/* Local Preview indicator */}
        <div className="absolute top-2 right-2 z-10">
          <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-[#333333] text-[9px] font-mono text-gray-300 flex items-center gap-1">
            <HardDrive className="w-2.5 h-2.5 text-yellow-400" />
            <span>Prévia</span>
          </span>
        </div>

        {/* Hover Quick Action to Enlarge */}
        {onEnlarge && (
          <button
            type="button"
            onClick={() => onEnlarge(item)}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
            title="Visualizar em tamanho real"
          >
            <div className="p-2 rounded-full bg-black/70 border border-[#333333] hover:scale-110 transition-transform">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </button>
        )}
      </div>

      {/* Meta info & Action Controls */}
      <div className="p-2.5 space-y-2 bg-[#121212] border-t border-[#1a1a1a]">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span className="truncate max-w-[130px] font-mono text-gray-200" title={item.fileName}>
            {item.fileName}
          </span>
          <span className="font-mono text-[10px] text-gray-500">
            {sizeFormatted} KB
          </span>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#1a1a1a]">
          {/* Reorder Buttons */}
          {allowReorder && total > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove?.(index, 'left')}
                className="p-1 rounded bg-[#181818] hover:bg-[#222222] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white transition cursor-pointer"
                title="Mover para esquerda"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                onClick={() => onMove?.(index, 'right')}
                className="p-1 rounded bg-[#181818] hover:bg-[#222222] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white transition cursor-pointer"
                title="Mover para direita"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Set Primary Button */}
          {allowSetPrimary && !item.isPrimary && (
            <button
              type="button"
              onClick={() => onSetPrimary?.(item.id)}
              className="text-[10px] font-bold text-gray-400 hover:text-[#FF1A2D] px-2 py-1 rounded bg-[#181818] hover:bg-[#222222] transition flex items-center gap-1 cursor-pointer"
              title="Definir como foto principal"
            >
              <Star className="w-3 h-3" />
              <span className="hidden sm:inline">Definir Principal</span>
            </button>
          )}

          {/* Remove Button */}
          {allowRemove && (
            <button
              type="button"
              onClick={() => onRemove?.(item.id)}
              className="p-1 rounded bg-[#181818] hover:bg-red-950/40 text-gray-400 hover:text-[#FF1A2D] transition ml-auto cursor-pointer"
              title="Remover imagem"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
