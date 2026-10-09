import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, UserPlus, Trash2, Key, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CHECKIN_OPERATOR' | 'FINANCE' | 'SUPPORT';
  active: boolean;
  assignedAt: string;
}

export const AdminAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([
    {
      id: 'adm-1',
      name: 'Deivid Santos',
      email: 'deividbmx779@gmail.com',
      role: 'SUPER_ADMIN',
      active: true,
      assignedAt: '10/01/2025',
    },
    {
      id: 'adm-2',
      name: 'Rodrigo Manhuaçu',
      email: 'rodrigo.px@pxcustom.com.br',
      role: 'ADMIN',
      active: true,
      assignedAt: '15/02/2025',
    },
    {
      id: 'adm-3',
      name: 'Operador Portaria Principal',
      email: 'portaria1@pxcustom.com.br',
      role: 'CHECKIN_OPERATOR',
      active: true,
      assignedAt: '01/11/2025',
    },
    {
      id: 'adm-4',
      name: 'Equipe Financeira PX',
      email: 'financeiro@pxcustom.com.br',
      role: 'FINANCE',
      active: true,
      assignedAt: '10/05/2025',
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminUser['role']>('CHECKIN_OPERATOR');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDbAdmins() {
      if (!supabase) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['SUPER_ADMIN', 'ADMIN', 'CHECKIN_OPERATOR', 'FINANCE', 'SUPPORT'])
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: AdminUser[] = data.map((d) => ({
            id: d.id,
            name: d.name || 'Administrador PX',
            email: d.email || '',
            role: d.role as AdminUser['role'],
            active: d.is_active !== false,
            assignedAt: d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '2025',
          }));
          setAdmins(mapped);
        }
      } catch {
        // Mantém fallback
      } finally {
        setLoading(false);
      }
    }
    loadDbAdmins();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setAdmins([
      ...admins,
      {
        id: `adm-${Date.now()}`,
        name,
        email,
        role,
        active: true,
        assignedAt: 'Hoje',
      },
    ]);
    setModalOpen(false);
    setName('');
    setEmail('');
  };

  const roleDescriptions = {
    SUPER_ADMIN: 'Acesso total e irrestrito ao sistema, faturamento e exclusão.',
    ADMIN: 'Gerenciamento operacional de eventos, lotes e ingressos.',
    CHECKIN_OPERATOR: 'Acesso restrito ao scanner de QR Code e validação de portaria.',
    FINANCE: 'Relatórios de faturamento, Mercado Pago e extratos.',
    SUPPORT: 'Atendimento aos participantes, reemissão de ingressos e dúvidas.',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-heading">
            Equipe Administrativa & RBAC
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Controle de permissões e operadores da portaria da PX CUSTOM
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md shadow-red-950/40"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Operador / Admin</span>
        </button>
      </div>

      {/* Roles Legend Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-xl p-3.5 space-y-1">
          <span className="text-xs font-bold text-[#FF1A2D] uppercase font-heading">SUPER_ADMIN & ADMIN</span>
          <p className="text-[11px] text-gray-400">Gestão global de eventos, vendas, faturamento e configurações.</p>
        </div>
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-xl p-3.5 space-y-1">
          <span className="text-xs font-bold text-emerald-400 uppercase font-heading">CHECKIN_OPERATOR</span>
          <p className="text-[11px] text-gray-400">Operador na pista / portaria com leitor de QR Code e liberação.</p>
        </div>
        <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-xl p-3.5 space-y-1">
          <span className="text-xs font-bold text-blue-400 uppercase font-heading">FINANCE & SUPPORT</span>
          <p className="text-[11px] text-gray-400">Extratos de vendas, Mercado Pago e suporte a participantes.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-[#141414] text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#222222]">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Função / Papel</th>
              <th className="p-4">Cadastrado em</th>
              <th className="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#181818]">
            {admins.map((adm) => (
              <tr key={adm.id} className="hover:bg-[#121212] transition">
                <td className="p-4 font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF1A2D]" />
                  <span>{adm.name}</span>
                </td>
                <td className="p-4 text-gray-400 font-mono">{adm.email}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                      adm.role === 'SUPER_ADMIN'
                        ? 'bg-[#FF1A2D]/20 text-[#FF1A2D] border border-[#FF1A2D]/40'
                        : adm.role === 'CHECKIN_OPERATOR'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-[#181818] text-gray-300 border border-[#262626]'
                    }`}
                  >
                    {adm.role}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{adm.assignedAt}</td>
                <td className="p-4 text-right">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    Ativo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0c0c0c] border border-[#222222] rounded-2xl p-6 shadow-2xl text-xs space-y-4">
            <h2 className="text-base font-black text-white font-heading uppercase">
              Adicionar Administrador / Operador
            </h2>
            <form onSubmit={handleAdd} className="space-y-3">
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
                <label className="block text-gray-400 mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Papel (RBAC)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#FF1A2D]"
                >
                  <option value="CHECKIN_OPERATOR">CHECKIN_OPERATOR (Operador de Portaria / Scanner)</option>
                  <option value="ADMIN">ADMIN (Operacional de Eventos e Ingressos)</option>
                  <option value="FINANCE">FINANCE (Financeiro e Mercado Pago)</option>
                  <option value="SUPPORT">SUPPORT (Suporte a Usuários)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Acesso Total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141414] text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF1A2D] hover:bg-[#C90018] text-white font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
