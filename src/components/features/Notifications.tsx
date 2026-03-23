'use client';

import { Bell, Gift, Target, AlertTriangle, Users, ArrowUp, ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { formatDateTime } from '@/lib/utils';
import { Notification } from '@/lib/types';

const notifIcons: Record<Notification['type'], { icon: React.ComponentType<{className?: string}>, bg: string, color: string }> = {
  reward: { icon: Gift, bg: 'bg-green-100', color: 'text-green-600' },
  mission: { icon: Target, bg: 'bg-orange-100', color: 'text-orange-600' },
  alert: { icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
  network: { icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' },
  level_up: { icon: ArrowUp, bg: 'bg-purple-100', color: 'text-purple-600' },
};

interface NotificationsProps {
  onClose: () => void;
}

export function Notifications({ onClose }: NotificationsProps) {
  const { notifications, markNotificationsRead } = useAppStore();

  const handleClose = () => {
    markNotificationsRead();
    onClose();
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-black text-gray-900">Notificações</h2>
          <p className="text-sm text-gray-500">{notifications.filter(n => !n.read).length} não lidas</p>
        </div>
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-10">
          <Bell className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Nenhuma notificação ainda</p>
        </div>
      )}

      {notifications.map(notif => {
        const meta = notifIcons[notif.type];
        const Icon = meta.icon;
        return (
          <div
            key={notif.id}
            className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors ${
              notif.read ? 'bg-white border-gray-100' : 'bg-purple-50 border-purple-100'
            }`}
          >
            <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">{notif.title}</p>
                {!notif.read && <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(notif.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
