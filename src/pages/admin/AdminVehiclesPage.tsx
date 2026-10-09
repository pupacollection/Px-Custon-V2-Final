import React, { useState } from 'react';
import { Car, Search, Tag, Calendar, Palette, User, Images, Eye, X } from 'lucide-react';
import { Vehicle } from '../../types';

export const AdminVehiclesPage: React.FC<{
  vehicles: Vehicle[];
  onUpdateVehicle?: (id: string, vehicle: Partial<Vehicle>) => void;
}> = ({ vehicles, onUpdateVehicle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(null);

  const filtered = (vehicles || []).filter(
    (v) =>
      v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading">
            Frota de Veículos Cadastrados
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Veículos inscritos pelos participantes para credenciamento nas arenas da PX CUSTOM
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por marca, modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((v) => {
          const allPhotos = v.photos || (v.photoUrl ? [{ id: '1', url: v.photoUrl, fileName: 'Foto principal', fileSize: 500 * 1024, mimeType: 'image/jpeg', isPrimary: true }] : []);
          const primary = allPhotos.find(p => p.isPrimary) || allPhotos[0];

          return (
            <div
              key={v.id}
              className="rounded-2xl bg-[#0c0c0c] border border-[#1c1c1c] overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-black overflow-hidden border-b border-[#181818]">
                  <img
                    src={primary?.url || 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=600&q=80'}
                    alt={`${v.brand} ${v.model}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-0.5 rounded bg-black/85 border border-[#333333] text-[10px] font-bold text-[#FF1A2D] uppercase tracking-wider backdrop-blur-md">
                      {v.category || 'Rebaixado'}
                    </span>
                  </div>
                  {allPhotos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setViewingVehicle(v)}
                      className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded bg-black/80 backdrop-blur-md border border-[#333333] text-[10px] font-bold text-gray-200 flex items-center gap-1 hover:text-white cursor-pointer"
                    >
                      <Images className="w-3.5 h-3.5 text-[#FF1A2D]" />
                      <span>{allPhotos.length} fotos</span>
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-base font-black text-white font-heading">
                    {v.brand} {v.model}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{v.year}</span>
                    <span>•</span>
                    <span>{v.color}</span>
                    {v.plate && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-gray-300 font-bold">{v.plate}</span>
                      </>
                    )}
                  </div>
                  {v.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 pt-1 border-t border-[#181818]">
                      {v.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 text-[11px] text-gray-500 flex items-center justify-between">
                <span>Proprietário: Deivid Santos</span>
                <button
                  type="button"
                  onClick={() => setViewingVehicle(v)}
                  className="text-xs font-bold text-[#FF1A2D] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Fotos</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Photo Gallery Lightbox */}
      {viewingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#0e0e0e] border border-[#222222] rounded-2xl p-6 shadow-2xl my-8">
            <button
              onClick={() => setViewingVehicle(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-black text-white font-heading uppercase mb-1">
              Fotos do Veículo: {viewingVehicle.brand} {viewingVehicle.model} ({viewingVehicle.year})
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Imagens submetidas para credenciamento oficial da PX CUSTOM
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(viewingVehicle.photos || (viewingVehicle.photoUrl ? [{ id: '1', url: viewingVehicle.photoUrl, fileName: 'Foto principal', fileSize: 500 * 1024, mimeType: 'image/jpeg', isPrimary: true }] : [])).map((photo, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl overflow-hidden border border-[#222222] aspect-video bg-black cursor-pointer"
                  onClick={() => setFullPhotoUrl(photo.url)}
                >
                  <img src={photo.url} alt={`foto ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {photo.isPrimary && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#FF1A2D] text-white text-[10px] font-black uppercase shadow">
                      PRINCIPAL
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-2 rounded-full bg-black/80 border border-[#333333] text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Fullscreen Lightbox */}
      {fullPhotoUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <button
            onClick={() => setFullPhotoUrl(null)}
            className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-full bg-[#141414] border border-[#2a2a2a] cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fullPhotoUrl}
            alt="Foto em alta resolução"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-[#262626] shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
