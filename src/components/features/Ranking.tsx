'use client';

import { Trophy, TrendingUp, Users, MapPin, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { NEIGHBORHOOD_RANKING } from '@/lib/mockData';

const medals = ['🥇', '🥈', '🥉'];
const rankColors = ['bg-yellow-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200'];

export function Ranking() {
  const { currentUser } = useAppStore();
  const userNeighborhoodRank = NEIGHBORHOOD_RANKING.find(n => n.name === currentUser.neighborhood);

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">🏆 Ranking de Bairros</h2>
        <p className="text-sm text-gray-500">Qual bairro é o mais esperto da cidade?</p>
      </div>

      {/* Your neighborhood */}
      {userNeighborhoodRank && (
        <Card className="border-purple-200 bg-purple-50">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-purple-800">Seu bairro: {userNeighborhoodRank.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-black text-purple-600">#{userNeighborhoodRank.rank}</p>
              <p className="text-[10px] text-gray-500">Posição</p>
            </div>
            <div>
              <p className="text-2xl font-black text-green-600">{userNeighborhoodRank.totalRegistrations.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">Registros</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-600">+{userNeighborhoodRank.weeklyGrowth}%</p>
              <p className="text-[10px] text-gray-500">Esta semana</p>
            </div>
          </div>
          <div className="mt-2 p-2 bg-white rounded-lg">
            <p className="text-xs text-gray-600">
              <span className="font-semibold">{userNeighborhoodRank.totalUsers} pessoas</span> já mapearam o bairro, gerando
              <span className="font-semibold text-green-600"> {formatCurrency(userNeighborhoodRank.totalSavings)}</span> de economia estimada
            </p>
          </div>
        </Card>
      )}

      {/* Top 3 podium */}
      <div className="flex items-end gap-2 px-2">
        {/* 2nd */}
        <div className="flex-1 text-center">
          <div className="bg-gray-100 rounded-2xl pt-4 pb-3 px-2">
            <div className="text-3xl mb-1">🥈</div>
            <p className="text-xs font-bold text-gray-700 truncate">{NEIGHBORHOOD_RANKING[1].name}</p>
            <p className="text-xs text-gray-500">{NEIGHBORHOOD_RANKING[1].totalRegistrations.toLocaleString()}</p>
          </div>
        </div>
        {/* 1st */}
        <div className="flex-1 text-center -mt-4">
          <div className="bg-yellow-100 border-2 border-yellow-300 rounded-2xl pt-4 pb-3 px-2">
            <div className="text-4xl mb-1">🥇</div>
            <p className="text-xs font-bold text-yellow-800 truncate">{NEIGHBORHOOD_RANKING[0].name}</p>
            <p className="text-xs text-yellow-600">{NEIGHBORHOOD_RANKING[0].totalRegistrations.toLocaleString()}</p>
            <Badge variant="warning" className="mt-1">#1</Badge>
          </div>
        </div>
        {/* 3rd */}
        <div className="flex-1 text-center">
          <div className="bg-orange-50 rounded-2xl pt-4 pb-3 px-2">
            <div className="text-3xl mb-1">🥉</div>
            <p className="text-xs font-bold text-orange-700 truncate">{NEIGHBORHOOD_RANKING[2].name}</p>
            <p className="text-xs text-orange-500">{NEIGHBORHOOD_RANKING[2].totalRegistrations.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Full ranking */}
      <div>
        <h4 className="font-bold text-gray-900 mb-2">Ranking completo</h4>
        <div className="space-y-2">
          {NEIGHBORHOOD_RANKING.map((nb, idx) => {
            const isUser = nb.name === currentUser.neighborhood;
            return (
              <div
                key={nb.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  isUser ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-white'
                }`}
              >
                <div className="w-8 text-center">
                  {idx < 3 ? (
                    <span className="text-xl">{medals[idx]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{nb.rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-bold truncate ${isUser ? 'text-purple-700' : 'text-gray-900'}`}>{nb.name}</p>
                    {isUser && <Badge variant="purple">Você</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{nb.city} · Top: {nb.topContributor}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-800">{nb.totalRegistrations.toLocaleString()}</p>
                  <div className={`flex items-center justify-end gap-0.5 text-[10px] ${nb.weeklyGrowth > 10 ? 'text-green-600' : 'text-gray-400'}`}>
                    <ChevronUp className="w-3 h-3" />
                    {nb.weeklyGrowth}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <Card className="text-center border-purple-200 bg-purple-50">
        <p className="text-2xl mb-2">⚔️</p>
        <p className="font-bold text-purple-800">Desafio do bairro!</p>
        <p className="text-xs text-purple-600 mt-1 mb-3">
          Convide seus vizinhos e suba no ranking. O bairro #1 do mês ganha destaque no app e campanha especial de marcas!
        </p>
        <button className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
          Desafiar meu bairro
        </button>
      </Card>
    </div>
  );
}
