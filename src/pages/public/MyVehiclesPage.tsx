import React, { useState } from 'react';
import { Car, Plus, Trash2, Tag, Calendar, Palette, X, ShieldAlert, Images, Eye, Edit } from 'lucide-react';
import { Vehicle, MediaItem } from '../../types';
import { MediaUploader } from '../../components/media/MediaUploader';
import { useAuth } from '../../context/AuthContext';

interface MyVehiclesPageProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Partial<Vehicle>) => void;
  onUpdateVehicle?: (id: string, vehicle: Partial<Vehicle>) => void;
  onDeleteVehicle?: (id: string) => void;
}

export const MyVehiclesPage: React.FC<MyVehiclesPageProps> = ({
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
}) => {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2018);
  const [color, setColor] = useState('');
  const [category, setCategory] = useState<'Rebaixado' | 'Original' | 'Tuning' | 'Som Automotivo' | 'Antigo'>('Rebaixado');
  const [plate, setPlate] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleMedia, setVehicleMedia] = useState<MediaItem[]>([]);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setBrand('');
    setModel('');
    setYear(2020);
    setColor('');
    setCategory('Rebaixado');
    setPlate('');
    setDescription('');
    setVehicleMedia([]);
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setBrand(v.brand);
    setModel(v.model);
    setYear(v.year);
    setColor(v.color);
    setCategory(v.category || 'Rebaixado');
    setPlate(v.plate || '');
    setDescription(v.description || '');

    const existingPhotos: MediaItem[] = v.photos && v.photos.length > 0
      ? v.photos
      : v.photoUrl
      ? [{
          id: `med-veh-${v.id}-1`,
          url: v.photoUrl,
          fileName: 'foto-principal.jpg',
          fileSize: 480 * 1024,
          mimeType: 'image/jpeg',
          isPrimary: true,
        }]
      : [];

    setVehicleMedia(existingPhotos);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !model || !color) return;

    const primaryPhoto = vehicleMedia.find((m) => m.isPrimary) || vehicleMedia[0];
    const mainPhotoUrl = primaryPhoto?.url || 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=600&q=80';

    const vehiclePayload = {
      type: 'Carro' as const,
      brand,
      model,
      year: Number(year),
      color,
      category,
      plate,
      description,
      photoUrl: mainPhotoUrl,
      photos: vehicleMedia.length > 0 ? vehicleMedia : undefined,
      userId: user?.id || '',
    };

    if (editingVehicle && onUpdateVehicle) {
      onUpdateVehicle(editingVehicle.id, vehiclePayload);
    } else {
      onAddVehicle({
        id: editingVehicle ? editingVehicle.id : undefined,
        ...vehiclePayload,
      });
    }

    setModalOpen(false);
    setEditingVehicle(null);
    setBrand('');
    setModel('');
    setColor('');
    setPlate('');
    setDescription('');
    setVehicleMedia([]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-heading">
            Meus Veículos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Cadastre seus projetos automotivos com fotos em alta definição para exposição e credenciamento oficial da PX CUSTOM
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-red-950/40"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Veículo</span>
        </button>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(vehicles || []).map((v) => {
          const allPhotos = v.photos || (v.photoUrl ? [{ id: 'p1', url: v.photoUrl, fileName: 'foto-principal.jpg', fileSize: 500 * 1024, mimeType: 'image/jpeg', isPrimary: true }] : []);
          const primary = allPhotos.find(p => p.isPrimary) || allPhotos[0];

          return (
            <div
              key={v.id}
              className="group bg-[#0e0e0e] hover:bg-[#121212] border border-[#1c1c1c] hover:border-[#FF1A2D]/60 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Image banner */}
                <div className="relative h-48 w-full bg-black overflow-hidden border-b border-[#181818]">
                  <img
                    src={primary?.url || 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=600&q=80'}
                    alt={`${v.brand} ${v.model}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md bg-black/85 border border-[#333333] text-[10px] font-bold text-[#FF1A2D] uppercase tracking-wider backdrop-blur-md">
                      {v.category || 'Rebaixado'}
                    </span>
                  </div>
                  {v.plate && (
                    <div className="absolute top-3 right-3 bg-white text-black px-2 py-0.5 rounded text-[10px] font-mono font-black border border-black shadow">
                      {v.plate}
                    </div>
                  )}

                  {/* Photo count indicator */}
                  {allPhotos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setViewingVehicle(v)}
                      className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-[#333333] text-[10px] font-bold text-gray-200 flex items-center gap-1.5 hover:text-white cursor-pointer"
                    >
                      <Images className="w-3.5 h-3.5 text-[#FF1A2D]" />
                      <span>{allPhotos.length} fotos</span>
                    </button>
                  )}
                </div>

                {/* Additional photos thumbnails strip */}
                {allPhotos.length > 1 && (
                  <div className="flex items-center gap-1.5 p-2 bg-[#080808] border-b border-[#181818] overflow-x-auto scrollbar-none">
                    {allPhotos.slice(0, 4).map((p, idx) => (
                      <img
                        key={idx}
                        src={p.url}
                        alt={`thumb ${idx}`}
                        onClick={() => setViewingVehicle(v)}
                        className={`w-10 h-8 rounded object-cover border cursor-pointer ${
                          p.isPrimary ? 'border-[#FF1A2D]' : 'border-[#262626] opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                    {allPhotos.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setViewingVehicle(v)}
                        className="w-8 h-8 rounded bg-[#161616] text-[10px] font-bold text-gray-400 flex items-center justify-center hover:text-white cursor-pointer"
                      >
                        +{allPhotos.length - 4}
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-5 space-y-2.5">
                  <h3 className="text-lg font-black text-white font-heading group-hover:text-[#FF1A2D] transition-colors">
                    {v.brand} {v.model}
                  </h3>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {v.year}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-gray-500" />
                      {v.color}
                    </span>
                  </div>

                  {v.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 pt-1 border-t border-[#181818]">
                      {v.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 pt-0 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Credenciamento ativo</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(v)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition cursor-pointer flex items-center gap-1 text-[11px]"
                    title="Editar veículo e gerenciar fotos"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#FF1A2D]" />
                    <span className="hidden sm:inline">Editar/Fotos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingVehicle(v)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition cursor-pointer"
                    title="Ver galeria do veículo"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {onDeleteVehicle && (
                    <button
                      type="button"
                      onClick={() => onDeleteVehicle(v.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#FF1A2D] hover:bg-[#1a1a1a] transition cursor-pointer"
                      title="Excluir veículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Vehicle Modal with MediaUploader */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0e0e0e] border border-[#222222] rounded-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black text-white font-heading uppercase mb-1">
              {editingVehicle ? `Gerenciar Fotos: ${editingVehicle.brand} ${editingVehicle.model}` : 'Cadastrar Veículo'}
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              {editingVehicle
                ? 'Atualize os dados e faça a gestão completa das fotos oficiais do seu projeto.'
                : 'Adicione seu carro, moto ou caminhão na plataforma oficial da PX CUSTOM com fotos do projeto.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Chevrolet, VW, BMW"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Classic, Golf, Civic"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Ano *</label>
                  <input
                    type="number"
                    required
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Cor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prata, Preto"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Placa (Opcional)</label>
                  <input
                    type="text"
                    placeholder="ABC-1234"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Categoria do Projeto</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                >
                  <option value="Rebaixado">Carro Rebaixado (Ar / Rosca / Fixa)</option>
                  <option value="Som Automotivo">Som Automotivo / Paredão</option>
                  <option value="Tuning">Tuning & Performance</option>
                  <option value="Antigo">Clássico / Antigo</option>
                  <option value="Original">Original / Projeto em Andamento</option>
                </select>
              </div>

              {/* UPLOAD MULTI-FOTOS DO VEÍCULO (Item 2 da Especificação) */}
              <div className="p-4 bg-[#111111] border border-[#222222] rounded-xl space-y-2">
                <MediaUploader
                  multiple={true}
                  maxFiles={10}
                  value={vehicleMedia}
                  onChange={setVehicleMedia}
                  uploadType="vehicle_photos"
                  resourceId={editingVehicle?.id || 'veh-new'}
                  vehicleId={editingVehicle?.id || 'veh-new'}
                  userId={user?.id || ''}
                  label="Fotos do Veículo (1 Principal + Adicionais)"
                  hint="Adicione fotos de frente, traseira, rodas, interior e som. No celular, selecione da galeria ou tire foto pela câmera."
                  allowCamera={true}
                  allowReorder={true}
                  allowSetPrimary={true}
                  allowRemove={true}
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Descrição e Modificações</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Suspensão a ar montada na PX Custom, rodas aro 18, som com 2 tornados de 18..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1a1a1a]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] text-gray-300 font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold transition cursor-pointer shadow-lg shadow-red-950/40"
                >
                  Salvar Veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Photos Lightbox Modal */}
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
              {viewingVehicle.brand} {viewingVehicle.model} ({viewingVehicle.year})
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Galeria completa de fotos cadastradas do projeto
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(viewingVehicle.photos || (viewingVehicle.photoUrl ? [{ id: '1', url: viewingVehicle.photoUrl, fileName: 'Foto principal', fileSize: 500 * 1024, mimeType: 'image/jpeg', isPrimary: true }] : [])).map((photo, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-[#222222] aspect-video bg-black">
                  <img src={photo.url} alt={`foto ${idx}`} className="w-full h-full object-cover" />
                  {photo.isPrimary && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#FF1A2D] text-white text-[10px] font-black uppercase">
                      PRINCIPAL
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

