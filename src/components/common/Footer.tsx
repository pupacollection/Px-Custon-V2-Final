import React from 'react';
import { PxLogo } from './PxLogo';
import { ShieldCheck, MapPin, Phone, Mail, Instagram, Youtube } from 'lucide-react';

export const Footer: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#050505] border-t border-[#141414] text-gray-400 text-sm mt-20 pb-16 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4 md:col-span-1">
            <PxLogo size="md" />
            <p className="text-xs text-gray-400 leading-relaxed">
              A PX CUSTOM é a produtora oficial de experiências e grandes encontros automotivos. 
              Paixão, adrenalina, cultura automotiva e eventos inesquecíveis.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111111] border border-[#222222] text-[11px] text-gray-300">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF1A2D]" />
                Organização Oficial
              </span>
            </div>
          </div>

          {/* Col 2: Navegação */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-heading">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-[#FF1A2D] transition">
                  Página Inicial
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('events')} className="hover:text-[#FF1A2D] transition">
                  Próximos Eventos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('tickets')} className="hover:text-[#FF1A2D] transition">
                  Meus Ingressos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('vehicles')} className="hover:text-[#FF1A2D] transition">
                  Meus Veículos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('px-control')} className="hover:text-[#FF1A2D] transition text-gray-300 font-semibold">
                  Acesso Administrativo (PX CONTROL)
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contato & Sede */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-heading">
              Sede Oficial
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#FF1A2D] shrink-0 mt-0.5" />
                <span>Manhuaçu — Minas Gerais, Brasil</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#FF1A2D] shrink-0" />
                <span>(33) 99876-5432</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#FF1A2D] shrink-0" />
                <span>contato@pxcustom.com.br</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Pagamentos & Segurança */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-heading">
              Pagamentos Seguros
            </h4>
            <p className="text-xs text-gray-400">
              Transações processadas via gateway oficial Mercado Pago com criptografia de ponta a ponta.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-gray-300">
              <span className="px-2 py-1 bg-[#111111] border border-[#222222] rounded">PIX Automático</span>
              <span className="px-2 py-1 bg-[#111111] border border-[#222222] rounded">Cartão em até 12x</span>
              <span className="px-2 py-1 bg-[#111111] border border-[#222222] rounded">Boleto Bancário</span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#141414] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} PX CUSTOM. Todos os direitos reservados. Não é permitido criar eventos de terceiros.</p>
          <p className="text-gray-400">Desenvolvido para apaixonados por carros e som automotivo.</p>
        </div>
      </div>
    </footer>
  );
};
