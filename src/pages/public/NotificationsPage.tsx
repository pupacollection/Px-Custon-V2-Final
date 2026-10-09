import React from 'react';
import { Bell, CheckCircle2, Info, AlertTriangle, Check } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onNavigate: (tab: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkAllAsRead,
  onNavigate,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase font-heading">
            Notificações
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Atualizações de ingressos, aprovações de pagamento e alertas de eventos
          </p>
        </div>

        <button
          onClick={onMarkAllAsRead}
          className="text-xs font-bold text-[#FF1A2D] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Marcar todas como lidas</span>
        </button>
      </div>

      <div className="space-y-3">
        {(notifications || []).map((notif) => {
          return (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition flex items-start gap-3.5 ${
                notif.read
                  ? 'bg-[#0a0a0a] border-[#181818] text-gray-400'
                  : 'bg-[#111111] border-[#292929] text-gray-200 shadow-md'
              }`}
            >
              <div className="p-2 rounded-lg bg-[#181818] text-[#FF1A2D] shrink-0 mt-0.5">
                {notif.type === 'SUCCESS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : notif.type === 'WARNING' ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Info className="w-4 h-4 text-[#FF1A2D]" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-heading">{notif.title}</h4>
                  <span className="text-[10px] text-gray-500">{notif.createdAt}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{notif.message}</p>
              </div>

              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-[#FF1A2D] shrink-0 mt-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
