import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  LogOut,
  Check,
  Ticket,
  Car,
  Bell,
  Camera,
  Trash2,
  Upload,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { UserProfile, MediaItem } from '../../types';
import { MediaUploader } from '../../components/media/MediaUploader';
import { useAuth } from '../../context/AuthContext';

interface ProfilePageProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onNavigate: (tab: string) => void;
  onLogout?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUpdateUser,
  onNavigate,
  onLogout,
}) => {
  const { updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || 'Manhuaçu');
  const [state, setState] = useState(user?.state || 'MG');
  const [avatarMedia, setAvatarMedia] = useState<MediaItem[]>(
    user?.avatarUrl
      ? [{
          id: 'avatar-current',
          url: user.avatarUrl,
          fileName: 'foto-perfil.jpg',
          fileSize: 180 * 1024,
          mimeType: 'image/jpeg',
          isPrimary: true,
        }]
      : []
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCity(user.city || 'Manhuaçu');
      setState(user.state || 'MG');
      if (user.avatarUrl) {
        setAvatarMedia([{
          id: 'avatar-current',
          url: user.avatarUrl,
          fileName: 'foto-perfil.jpg',
          fileSize: 180 * 1024,
          mimeType: 'image/jpeg',
          isPrimary: true,
        }]);
      }
    }
  }, [user]);

  const handleAvatarChange = async (items: MediaItem[]) => {
    setAvatarMedia(items);
    if (items.length > 0) {
      const newAvatarUrl = items[0].url;
      onUpdateUser({ avatarUrl: newAvatarUrl, avatarMedia: items[0] });
      await updateProfile({ avatarUrl: newAvatarUrl });
    }
  };

  const handleRemoveAvatar = async () => {
    const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
    setAvatarMedia([]);
    onUpdateUser({
      avatarUrl: fallbackAvatar,
      avatarMedia: undefined,
    });
    await updateProfile({ avatarUrl: fallbackAvatar });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const updatedAvatarUrl = avatarMedia[0]?.url || user.avatarUrl;

    const payload: Partial<UserProfile> = {
      name,
      phone,
      city,
      state,
      avatarUrl: updatedAvatarUrl,
      avatarMedia: avatarMedia[0],
    };

    const { error } = await updateProfile(payload);
    setSaving(false);

    if (error) {
      setErrorMsg(`Erro ao salvar no banco de dados: ${error}`);
      return;
    }

    onUpdateUser(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSignOut = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      onNavigate('home');
    }
  };

  const currentAvatarDisplay = avatarMedia[0]?.url || user.avatarUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-heading">
            Meu Perfil
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Gerencie seus dados de participante, foto oficial e credenciais da PX CUSTOM
          </p>
        </div>

        {/* Botão Sair da Conta */}
        <button
          onClick={handleSignOut}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-red-950/30 border border-[#242424] hover:border-red-500/40 text-xs font-bold text-gray-300 hover:text-red-400 transition flex items-center gap-2 cursor-pointer"
          title="Encerrar sessão nesta máquina"
        >
          <LogOut className="w-3.5 h-3.5 text-[#FF1A2D]" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* User Card with Photo Change Controls */}
      <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <img
            src={currentAvatarDisplay}
            alt={user.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-[#FF1A2D] shadow-xl shadow-red-950/40"
          />
          <button
            type="button"
            onClick={() => setShowAvatarUploader(!showAvatarUploader)}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-[#FF1A2D] hover:bg-[#C90018] text-white shadow-lg cursor-pointer transition-transform hover:scale-110"
            title="Alterar foto de perfil"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-black text-white font-heading">{user.name}</h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#FF1A2D]/20 text-[#FF1A2D] border border-[#FF1A2D]/40">
              {user.role}
            </span>
          </div>
          <p className="text-xs text-gray-400">{user.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setShowAvatarUploader(!showAvatarUploader)}
              className="text-[#FF1A2D] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{showAvatarUploader ? 'Fechar Uploader' : 'Alterar Foto de Perfil'}</span>
            </button>
            {avatarMedia.length > 0 && (
              <>
                <span className="text-gray-600">•</span>
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-gray-400 hover:text-[#FF1A2D] text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Foto</span>
                </button>
              </>
            )}
          </div>

          <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
            <button
              onClick={() => onNavigate('tickets')}
              className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-xs font-bold text-gray-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-[#FF1A2D]" />
              <span>Ingressos</span>
            </button>
            <button
              onClick={() => onNavigate('vehicles')}
              className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-xs font-bold text-gray-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Car className="w-3.5 h-3.5 text-[#FF1A2D]" />
              <span>Veículos</span>
            </button>
            {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => onNavigate('px-control')}
                className="px-3 py-1.5 rounded-lg bg-[#FF1A2D]/15 hover:bg-[#FF1A2D]/25 border border-[#FF1A2D]/40 text-xs font-bold text-[#FF1A2D] flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Painel PX CONTROL</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Avatar Uploader Drawer */}
      {showAvatarUploader && (
        <div className="bg-[#0e0e0e] border border-[#222222] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#181818]">
            <h3 className="text-sm font-bold text-white font-heading uppercase">
              Upload de Foto de Perfil
            </h3>
            <button
              type="button"
              onClick={() => setShowAvatarUploader(false)}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              Fechar
            </button>
          </div>
          <MediaUploader
            multiple={false}
            maxFiles={1}
            maxSize={5 * 1024 * 1024}
            value={avatarMedia}
            onChange={handleAvatarChange}
            uploadType="profile_avatar"
            resourceId={user.id}
            userId={user.id}
            label="Selecione sua foto de participante"
            hint="Formatos aceitos: JPG, PNG ou WEBP até 5 MB. A imagem é vinculada ao seu usuário oficial no Supabase Storage."
            allowCamera={true}
          />
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-heading uppercase">
          Informações Pessoais
        </h3>

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/40 p-2.5 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FF1A2D]" />
            <span>{errorMsg}</span>
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-gray-400 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">E-mail (Supabase Auth)</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2.5 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Telefone / WhatsApp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(33) 99999-9999"
              className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">CPF</label>
            <input
              type="text"
              disabled
              value={user.cpf || 'Não informado'}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2.5 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Estado</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
            />
          </div>
        </div>

        {saved && (
          <p className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/40 p-2.5 rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Dados e foto de perfil atualizados com sucesso no Supabase!</span>
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <span>Salvar Alterações</span>
            )}
          </button>
        </div>
      </form>

    </div>
  );
};
