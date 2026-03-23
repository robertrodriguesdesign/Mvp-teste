'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Dashboard } from '@/components/features/Dashboard';
import { RegisterPrice } from '@/components/features/RegisterPrice';
import { Wallet } from '@/components/features/Wallet';
import { Network } from '@/components/features/Network';
import { Missions } from '@/components/features/Missions';
import { PriceAlerts } from '@/components/features/PriceAlerts';
import { Ranking } from '@/components/features/Ranking';
import { CartChallenge } from '@/components/features/CartChallenge';
import { Marketplace } from '@/components/features/Marketplace';
import { B2BDashboard } from '@/components/features/B2BDashboard';
import { Registrations } from '@/components/features/Registrations';
import { Notifications } from '@/components/features/Notifications';
import { AuthScreen } from '@/components/features/AuthScreen';

// Secondary navigation tabs accessible from more menu
const MORE_TABS = [
  { id: 'missions', label: '🎯 Missões de Marcas' },
  { id: 'alerts', label: '🚨 Alertas de Preço' },
  { id: 'ranking', label: '🏆 Ranking de Bairros' },
  { id: 'cart', label: '🛒 Desafio do Carrinho' },
  { id: 'marketplace', label: '🏪 Ofertas do Bairro' },
  { id: 'b2b', label: '📊 Inteligência de Mercado' },
];

export function AppShell() {
  const { activeTab, setActiveTab } = useAppStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!isAuthenticated) {
    return <AuthScreen onAuth={() => setIsAuthenticated(true)} />;
  }

  const renderTab = () => {
    if (showNotifications) return <Notifications onClose={() => setShowNotifications(false)} />;

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'register': return <RegisterPrice />;
      case 'wallet': return <Wallet />;
      case 'network': return <Network />;
      case 'registrations': return <Registrations />;
      case 'missions': return <Missions />;
      case 'alerts': return <PriceAlerts />;
      case 'ranking': return <Ranking />;
      case 'cart': return <CartChallenge />;
      case 'marketplace': return <Marketplace />;
      case 'b2b': return <B2BDashboard />;
      default: return <Dashboard />;
    }
  };

  const showTopBar = !showNotifications && activeTab !== 'register';

  return (
    <div className="relative flex flex-col min-h-dvh bg-gray-50">
      {/* Top bar */}
      {showTopBar && (
        <TopBar
          onNotificationsClick={() => { setShowNotifications(true); setShowMoreMenu(false); }}
          onProfileClick={() => setActiveTab('network')}
        />
      )}

      {/* Register has its own minimal header */}
      {activeTab === 'register' && !showNotifications && (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActiveTab('dashboard')} className="p-2 hover:bg-gray-100 rounded-xl">
            ←
          </button>
          <span className="font-bold text-gray-900">Registrar Preço</span>
        </div>
      )}

      {/* More menu modal */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[390px] bg-white rounded-3xl shadow-2xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-3 px-1">Mais opções</h3>
            <div className="grid grid-cols-2 gap-2">
              {MORE_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowMoreMenu(false); }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-purple-50 text-left transition-colors"
                >
                  <span className="text-lg">{tab.label.split(' ')[0]}</span>
                  <span className="text-sm font-medium text-gray-700">{tab.label.slice(tab.label.indexOf(' ') + 1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        {renderTab()}
      </main>

      {/* Bottom navigation */}
      <BottomNav />

      {/* More menu button (between wallet and network) - appears as a secondary floating button */}
      {!showNotifications && (
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="fixed bottom-20 right-4 w-10 h-10 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center text-lg z-40 hover:bg-purple-700 transition-colors"
          title="Mais funcionalidades"
        >
          ⋯
        </button>
      )}
    </div>
  );
}
