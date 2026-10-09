import React from 'react';
import { Home, Ticket, Car, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onNavigate }) => {
  const items = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'tickets', label: 'Ingressos', icon: Ticket },
    { id: 'vehicles', label: 'Veículos', icon: Car },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080808]/95 backdrop-blur-lg border-t border-[#1a1a1a] px-3 py-2">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition cursor-pointer ${
                active ? 'text-[#FF1A2D]' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${active ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              <span className={`text-[11px] font-semibold ${active ? 'text-[#FF1A2D]' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
