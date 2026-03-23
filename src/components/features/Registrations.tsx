'use client';

import { useState } from 'react';
import { Search, ThumbsUp, Flag, MapPin, Filter } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PRODUCTS } from '@/lib/mockData';

export function Registrations() {
  const { registrations, currentUser, confirmRegistration } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filters = ['all', 'confirmed', 'pending'];
  const filterLabels: Record<string, string> = { all: 'Todos', confirmed: 'Confirmados', pending: 'Pendentes' };

  const filtered = registrations.filter(r => {
    const matchSearch = r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === 'all' || r.status === activeFilter;
    return matchSearch && matchFilter;
  });

  // Compare with avg for a product
  const getAvgForProduct = (name: string) => {
    const p = PRODUCTS.find(p => p.name.toLowerCase().includes(name.toLowerCase().slice(0, 8)));
    return p?.avgPrice;
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">Preços Registrados</h2>
        <p className="text-sm text-gray-500">{registrations.length} registros na sua região</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
          placeholder="Buscar produto, mercado ou bairro..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Product avg reference */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRODUCTS.slice(0, 5).map(p => (
          <div key={p.id} className="flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500 whitespace-nowrap truncate max-w-[80px]">{p.name.split(' ')[0]}</p>
            <p className="text-xs font-bold text-purple-600">{formatCurrency(p.avgPrice)}</p>
            <p className="text-[9px] text-gray-400">média</p>
          </div>
        ))}
      </div>

      {/* Registration list */}
      <div className="space-y-3">
        {filtered.map(reg => {
          const avg = getAvgForProduct(reg.productName);
          const isAbove = avg && reg.price > avg * 1.15;
          const isBelow = avg && reg.price < avg * 0.9;
          const alreadyConfirmed = reg.confirmedBy.includes(currentUser.id);

          return (
            <Card key={reg.id} padding="sm">
              <div className="flex items-start gap-3">
                <Avatar initials={reg.userName.split(' ').map(n => n[0]).join('')} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{reg.productName}</p>
                      {reg.productBrand && (
                        <p className="text-xs text-gray-500">{reg.productBrand} · {reg.unit}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-black ${isAbove ? 'text-red-600' : isBelow ? 'text-green-600' : 'text-gray-900'}`}>
                        {formatCurrency(reg.price)}
                      </p>
                      {avg && (
                        <p className="text-[10px] text-gray-400">
                          {isAbove ? '▲' : isBelow ? '▼' : '≈'} média {formatCurrency(avg)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500 truncate">{reg.storeName} · {reg.neighborhood}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={reg.status === 'confirmed' ? 'success' : 'warning'}>
                        {reg.status === 'confirmed' ? `✓ ${reg.confirmedBy.length} confirmações` : 'Pendente'}
                      </Badge>
                      {reg.missionId && <Badge variant="purple">Missão</Badge>}
                    </div>
                    <p className="text-[10px] text-gray-400">{formatDateTime(reg.registeredAt)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {reg.userId !== currentUser.id && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => confirmRegistration(reg.id)}
                    disabled={alreadyConfirmed}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      alreadyConfirmed
                        ? 'bg-green-50 text-green-600 cursor-default'
                        : 'bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {alreadyConfirmed ? 'Confirmado' : 'Confirmar'}
                  </button>
                  <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-red-50 rounded-lg text-xs font-semibold text-gray-600 hover:text-red-500 transition-colors">
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <Search className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Nenhum resultado encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
