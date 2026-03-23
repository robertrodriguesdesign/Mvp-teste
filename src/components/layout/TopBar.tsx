'use client';

import { Bell, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Avatar } from '@/components/ui/Avatar';
import { getLevelConfig } from '@/lib/utils';

interface TopBarProps {
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
}

export function TopBar({ onNotificationsClick, onProfileClick }: TopBarProps) {
  const { currentUser, notifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const level = getLevelConfig(currentUser.level);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo + Level */}
        <div className="flex items-center gap-3">
          <button onClick={onProfileClick} className="flex items-center gap-2">
            <Avatar initials={currentUser.avatar} size="md" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-gray-900">{currentUser.name.split(' ')[0]}</span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">{level.icon}</span>
                <span className={`text-xs font-medium ${level.color}`}>{level.name}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Zei Logo */}
        <div className="text-center">
          <span className="text-xl font-black text-purple-600 tracking-tight">ZEI</span>
          <div className="text-[9px] text-gray-400 tracking-widest font-medium -mt-1">PREÇO JUSTO</div>
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
