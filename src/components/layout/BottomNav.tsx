'use client';

import { Home, Search, PlusCircle, Wallet, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const tabs = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'registrations', label: 'Preços', icon: Search },
  { id: 'register', label: 'Registrar', icon: PlusCircle },
  { id: 'wallet', label: 'Carteira', icon: Wallet },
  { id: 'network', label: 'Rede', icon: Users },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2 py-2 z-50 safe-area-pb">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCenter = tab.id === 'register';

          if (isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center -mt-5"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isActive ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs mt-1 text-purple-600 font-medium">Registrar</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : ''}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-purple-600' : ''}`}>{tab.label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-purple-600" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
