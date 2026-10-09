import React, { useState, useEffect } from 'react';
import { Users, User, ShieldCheck, Mail, Phone, MapPin, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackUsers: UserProfile[] = [
    {
      id: 'usr-01',
      name: 'Deivid Santos (Admin)',
      email: 'deividbmx779@gmail.com',
      phone: '(33) 99876-5432',
      cpf: '123.456.789-00',
      city: 'Manhuaçu',
      state: 'MG',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: 'SUPER_ADMIN',
      createdAt: '2025-01-10',
    },
    {
      id: 'usr-02',
      name: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '(33) 98811-2233',
      cpf: '333.444.555-66',
      city: 'Manhuaçu',
      state: 'MG',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      role: 'USER',
      createdAt: '2025-10-15',
    },
    {
      id: 'usr-03',
      name: 'Lucas Ferreira',
      email: 'lucas.ferreira@email.com',
      phone: '(33) 99122-3344',
      cpf: '777.888.999-00',
      city: 'Caratinga',
      state: 'MG',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      role: 'USER',
      createdAt: '2025-10-20',
    },
    {
      id: 'usr-04',
      name: 'Rafael Souza',
      email: 'rafael.souza@email.com',
      phone: '(33) 98455-6677',
      cpf: '111.222.333-44',
      city: 'Manhumirim',
      state: 'MG',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      role: 'CHECKIN_OPERATOR',
      createdAt: '2025-10-22',
    },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    if (!supabase) {
      setUsers(fallbackUsers);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar profiles do Supabase:', error.message);
        setUsers(fallbackUsers);
      } else if (data && data.length > 0) {
        const formatted: UserProfile[] = data.map((d) => ({
          id: d.id,
          name: d.name || 'Participante PX',
          email: d.email || '',
          phone: d.phone || '',
          cpf: d.cpf || '',
          city: d.city || 'Manhuaçu',
          state: d.state || 'MG',
          avatarUrl: d.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          role: d.role || 'USER',
          is_active: d.is_active ?? true,
          createdAt: d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '2025',
        }));
        setUsers(formatted);
      } else {
        setUsers(fallbackUsers);
      }
    } catch {
      setUsers(fallbackUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading">
            Gerenciamento de Usuários
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Contas cadastradas no Supabase Auth e perfis oficiais de participantes
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#242424] text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer"
          title="Recarregar do Supabase"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#111111] border border-[#262626] focus:border-[#FF1A2D] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="bg-[#0e0e0e] border border-[#1c1c1c] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141414] text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#222]">
              <tr>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Localização</th>
                <th className="py-3 px-4">Papel (Role)</th>
                <th className="py-3 px-4">Data Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818] text-gray-300">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-[#141414]/60 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border border-[#2a2a2a]"
                      />
                      <div>
                        <span className="font-bold text-white block">{user.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono truncate block max-w-[180px]">
                          {user.id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Mail className="w-3 h-3 text-gray-500" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                        <Phone className="w-3 h-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-gray-400">
                      <MapPin className="w-3 h-3 text-[#FF1A2D]" />
                      <span>{user.city} - {user.state}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase font-mono ${
                        user.role === 'SUPER_ADMIN'
                          ? 'bg-red-950/40 text-[#FF1A2D] border-red-500/40'
                          : user.role === 'ADMIN'
                          ? 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                          : user.role === 'CHECKIN_OPERATOR'
                          ? 'bg-purple-950/40 text-purple-400 border-purple-500/40'
                          : 'bg-gray-800/40 text-gray-400 border-gray-700/40'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                    {user.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
