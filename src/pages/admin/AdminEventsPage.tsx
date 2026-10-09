import React, { useState } from 'react';
import { Calendar, Plus, Edit, MapPin, Clock, Tag, X, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { EventItem, EventStatus, MediaItem } from '../../types';
import { MediaUploader } from '../../components/media/MediaUploader';

interface AdminEventsPageProps {
  events: EventItem[];
  onAddEvent: (newEvent: Partial<EventItem>) => void;
}

export const AdminEventsPage: React.FC<AdminEventsPageProps> = ({ events, onAddEvent }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [dateBadge, setDateBadge] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('Parque de Exposições - Manhuaçu/MG');
  const [description, setDescription] = useState('');
  const [bannerMedia, setBannerMedia] = useState<MediaItem[]>([]);
  const [coverMedia, setCoverMedia] = useState<MediaItem[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [pistaPrice, setPistaPrice] = useState(40);
  const [camarotePrice, setCamarotePrice] = useState(80);
  const [vipPrice, setVipPrice] = useState(120);

  const openCreateModal = () => {
    setEditingEvent(null);
    setName('');
    setDate('');
    setDateBadge('');
    setTime('Das 08:00 às 22:00');
    setLocation('Parque de Exposições - Manhuaçu/MG');
    setDescription('');
    setBannerMedia([]);
    setCoverMedia([]);
    setGalleryMedia([]);
    setPistaPrice(40);
    setCamarotePrice(80);
    setVipPrice(120);
    setModalOpen(true);
  };

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setName(event.name);
    setDate(event.date);
    setDateBadge(event.dateBadge);
    setTime(event.time);
    setLocation(event.location);
    setDescription(event.description);
    
    // Set banner media
    if (event.bannerMedia) {
      setBannerMedia([event.bannerMedia]);
    } else if (event.bannerImage) {
      setBannerMedia([{
        id: `med-banner-${event.id}`,
        url: event.bannerImage,
        fileName: 'banner-principal.jpg',
        fileSize: 450 * 1024,
        mimeType: 'image/jpeg',
        isPrimary: true,
      }]);
    } else {
      setBannerMedia([]);
    }

    // Set cover media
    if (event.coverMedia) {
      setCoverMedia([event.coverMedia]);
    } else if (event.coverImage) {
      setCoverMedia([{
        id: `med-cover-${event.id}`,
        url: event.coverImage,
        fileName: 'imagem-capa.jpg',
        fileSize: 380 * 1024,
        mimeType: 'image/jpeg',
        isPrimary: true,
      }]);
    } else {
      setCoverMedia([]);
    }

    // Set gallery media
    if (event.galleryMedia && event.galleryMedia.length > 0) {
      setGalleryMedia(event.galleryMedia);
    } else if (event.gallery && event.gallery.length > 0) {
      setGalleryMedia(
        event.gallery.map((url, idx) => ({
          id: `med-gal-${event.id}-${idx}`,
          url,
          fileName: `foto-galeria-${idx + 1}.jpg`,
          fileSize: 320 * 1024,
          mimeType: 'image/jpeg',
          sortOrder: idx,
        }))
      );
    } else {
      setGalleryMedia([]);
    }

    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;

    const primaryBannerUrl = bannerMedia[0]?.url || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80';
    const galleryUrls = galleryMedia.map((m) => m.url);

    onAddEvent({
      id: editingEvent ? editingEvent.id : undefined,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      date,
      dateBadge: dateBadge || 'NOVO',
      time: time || 'Das 08:00 às 22:00',
      location,
      city: 'Manhuaçu',
      state: 'MG',
      description,
      status: editingEvent ? editingEvent.status : 'EM_BREVE',
      bannerImage: primaryBannerUrl,
      bannerMedia: bannerMedia[0],
      coverImage: coverMedia[0]?.url || primaryBannerUrl,
      coverMedia: coverMedia[0],
      gallery: galleryUrls.length > 0 ? galleryUrls : editingEvent?.gallery || [],
      galleryMedia: galleryMedia,
      features: editingEvent?.features || { cars: true, motos: true, audio: true, food: true },
      ticketBatches: editingEvent?.ticketBatches || [
        {
          id: `batch-${Date.now()}-1`,
          name: 'Pista',
          description: 'Acesso ao evento e área principal.',
          price: Number(pistaPrice),
          totalQuantity: 500,
          soldQuantity: 0,
          available: true,
          batchNumber: 1,
        },
        {
          id: `batch-${Date.now()}-2`,
          name: 'Camarote',
          description: 'Área exclusiva e vista privilegiada.',
          price: Number(camarotePrice),
          totalQuantity: 200,
          soldQuantity: 0,
          available: true,
          batchNumber: 1,
        },
        {
          id: `batch-${Date.now()}-3`,
          name: 'VIP',
          description: 'Acesso total e backstage.',
          price: Number(vipPrice),
          totalQuantity: 100,
          soldQuantity: 0,
          available: true,
          batchNumber: 1,
        },
      ],
    });

    setModalOpen(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading">
            Gerenciamento de Eventos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Apenas a PX CUSTOM tem permissão para cadastrar e publicar eventos oficiais na plataforma
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md shadow-red-950/40"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Evento</span>
        </button>
      </div>

      {/* Events Table / Cards */}
      <div className="space-y-4">
        {(events || []).map((event) => (
          <div
            key={event.id}
            className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#1c1c1c] flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start md:items-center gap-4">
              <img
                src={event.bannerImage}
                alt={event.name}
                className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#242424]"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white font-heading">{event.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#FF1A2D] border border-[#2a2a2a]">
                    {event.dateBadge}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FF1A2D]" />
                    {event.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {event.time}
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1 text-[#FF1A2D]">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{event.gallery?.length || 0} fotos na galeria</span>
                  </span>
                  <span>•</span>
                  <span>Lotes ativos: {event.ticketBatches.map(b => b.name).join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  event.status === 'EM_ANDAMENTO'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#181818] text-gray-300 border border-[#262626]'
                }`}
              >
                {event.status === 'EM_ANDAMENTO' ? 'Em andamento' : 'Em breve'}
              </span>
              <button
                onClick={() => openEditModal(event)}
                className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-gray-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Editar evento e mídia"
              >
                <Edit className="w-3.5 h-3.5 text-[#FF1A2D]" />
                <span>Editar / Mídia</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar / Editar Evento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0c0c0c] border border-[#222222] rounded-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black text-white font-heading uppercase mb-1">
              {editingEvent ? `Editar Evento: ${editingEvent.name}` : 'Novo Evento PX CUSTOM'}
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Cadastre e gerencie a experiência oficial com banners em alta resolução e galeria de fotos.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Encontro Noturno PX Custom 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Data Completa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 20 de Janeiro de 2026"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Badge de Data (Ex: 20 JAN) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 20 JAN"
                    value={dateBadge}
                    onChange={(e) => setDateBadge(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Horário</label>
                  <input
                    type="text"
                    placeholder="Das 08:00 às 22:00"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Local</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                  />
                </div>
              </div>

              {/* 1. UPLOAD DE BANNER PRINCIPAL (Widescreen Hero) */}
              <div className="p-4 bg-[#101010] border border-[#222222] rounded-xl space-y-2">
                <MediaUploader
                  multiple={false}
                  maxFiles={1}
                  value={bannerMedia}
                  onChange={setBannerMedia}
                  uploadType="event_banner"
                  resourceId={editingEvent?.id || 'new-event'}
                  label="1. Banner Principal do Evento (Widescreen 16:9)"
                  hint="Banner de destaque no topo da página do evento (JPG, PNG ou WEBP até 10 MB)."
                  allowCamera={true}
                />
              </div>

              {/* 2. UPLOAD DE IMAGEM DE CAPA (Card / Listagem) */}
              <div className="p-4 bg-[#101010] border border-[#222222] rounded-xl space-y-2">
                <MediaUploader
                  multiple={false}
                  maxFiles={1}
                  value={coverMedia}
                  onChange={setCoverMedia}
                  uploadType="event_cover"
                  resourceId={editingEvent?.id || 'new-event'}
                  label="2. Imagem de Capa (Cards e Feed)"
                  hint="Imagem de capa exibida nas listas de eventos e prévias de ingressos (JPG, PNG ou WEBP até 10 MB)."
                  allowCamera={true}
                />
              </div>

              {/* 3. UPLOAD MÚLTIPLO DE GALERIA */}
              <div className="p-4 bg-[#101010] border border-[#222222] rounded-xl space-y-2">
                <MediaUploader
                  multiple={true}
                  maxFiles={20}
                  value={galleryMedia}
                  onChange={setGalleryMedia}
                  uploadType="event_gallery"
                  resourceId={editingEvent?.id || 'new-event'}
                  label="3. Galeria de Fotos do Evento (Até 20 fotos)"
                  hint="Fotos de edições anteriores, carros de destaque, paredões de som e atrações. Permite reordenar, remover e definir foto principal."
                  allowCamera={true}
                  allowReorder={true}
                  allowSetPrimary={true}
                  allowRemove={true}
                />
              </div>

              {/* Preço dos Lotes Iniciais (apenas para novos eventos) */}
              {!editingEvent && (
                <div className="p-3 bg-[#111111] rounded-xl border border-[#1f1f1f] space-y-2">
                  <span className="font-bold text-gray-300 block">Preços dos Lotes (1º Lote):</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-gray-400 block mb-1">Pista (R$)</label>
                      <input
                        type="number"
                        value={pistaPrice}
                        onChange={(e) => setPistaPrice(Number(e.target.value))}
                        className="w-full bg-[#181818] border border-[#262626] rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Camarote (R$)</label>
                      <input
                        type="number"
                        value={camarotePrice}
                        onChange={(e) => setCamarotePrice(Number(e.target.value))}
                        className="w-full bg-[#181818] border border-[#262626] rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">VIP (R$)</label>
                      <input
                        type="number"
                        value={vipPrice}
                        onChange={(e) => setVipPrice(Number(e.target.value))}
                        className="w-full bg-[#181818] border border-[#262626] rounded p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-400 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações sobre medição de som, categorias de carros e atrações..."
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#1a1a1a]">
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
                  {editingEvent ? 'Salvar Alterações' : 'Publicar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

