'use client';

import { TrendingUp, Award, Users, MapPin, Zap, ChevronRight, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency, getLevelConfig, getNextLevel, getLevelProgress } from '@/lib/utils';
import { LEVEL_CONFIGS } from '@/lib/constants';

export function Dashboard() {
  const { currentUser, missions, alerts, setActiveTab } = useAppStore();
  const level = getLevelConfig(currentUser.level);
  const nextLevel = getNextLevel(currentUser.level);
  const progress = getLevelProgress(
    currentUser.referrals.length,
    currentUser.networkSize * 8,
    currentUser.level,
  );

  const activeMissions = missions.filter(m => m.status === 'active' && !m.completedBy.includes(currentUser.id));
  const recentAlerts = alerts.slice(0, 2);

  return (
    <div className="pb-24 space-y-4 px-4 pt-4">
      {/* Wallet highlight */}
      <Card padding="none" className="overflow-hidden">
        <div className="zei-gradient p-5 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Sua carteira Zei</p>
              <h2 className="text-3xl font-black mt-1">{formatCurrency(currentUser.walletBalance)}</h2>
              <p className="text-white/70 text-sm mt-1">
                {currentUser.confirmedRegistrations} registros confirmados
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl">{level.icon}</div>
              <p className="text-white/80 text-xs mt-1 font-medium">{level.name}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('wallet')}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
          >
            Ver carteira e sacar via Pix
          </button>
        </div>

        {/* Level Progress */}
        {nextLevel && (
          <div className="px-5 py-3 bg-gray-50">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-500">Progresso para {nextLevel.icon} {nextLevel.name}</span>
              <span className="text-xs font-semibold text-purple-600">{progress}%</span>
            </div>
            <ProgressBar value={progress} color="purple" />
            <p className="text-xs text-gray-400 mt-1.5">{nextLevel.requirements}</p>
          </div>
        )}
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-black text-purple-600">{currentUser.totalRegistrations}</div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">Registros</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-black text-green-600">{currentUser.referrals.length}</div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">Convidados</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-black text-blue-600">{currentUser.networkSize}</div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">Na rede</div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('register')}
          className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-2xl border border-purple-100 hover:bg-purple-100 transition-colors"
        >
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-purple-800">Registrar Preço</span>
          <span className="text-xs text-purple-600">+{formatCurrency(level.rewardPerConfirm)}</span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-2xl border border-green-100 hover:bg-green-100 transition-colors"
        >
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-green-800">Convidar</span>
          <span className="text-xs text-green-600">Ganhe passivo</span>
        </button>

        <button
          onClick={() => setActiveTab('missions')}
          className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-2xl border border-orange-100 hover:bg-orange-100 transition-colors"
        >
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-orange-800">Missões</span>
          <span className="text-xs text-orange-600">{activeMissions.length} disponíveis</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-blue-800">Ranking</span>
          <span className="text-xs text-blue-600">Bairro #1</span>
        </button>
      </div>

      {/* Active Missions Preview */}
      {activeMissions.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-900">🎯 Missões Abertas</h3>
            <button onClick={() => setActiveTab('missions')} className="text-xs text-purple-600 font-medium flex items-center gap-0.5">
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {activeMissions.slice(0, 2).map(m => (
              <Card key={m.id} padding="sm" hover onClick={() => setActiveTab('missions')}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-lg font-black text-orange-600">
                    {m.brandLogo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.targetCity} · Expira em breve</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">{formatCurrency(m.rewardPerUser)}</p>
                    <p className="text-xs text-gray-400">por registro</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Price Alerts */}
      {recentAlerts.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-900">🚨 Alertas de Preço</h3>
            <button onClick={() => setActiveTab('alerts')} className="text-xs text-purple-600 font-medium flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentAlerts.map(alert => (
              <Card key={alert.id} padding="sm" className="border-red-100 bg-red-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">{alert.productName}</p>
                    <p className="text-xs text-red-600">{alert.storeName} · {alert.neighborhood}</p>
                    <p className="text-xs text-gray-600 mt-1">{formatCurrency(alert.price)} vs média {formatCurrency(alert.avgPrice)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="danger">+{alert.percentAbove.toFixed(0)}%</Badge>
                    <p className="text-xs text-gray-500 mt-1">{alert.shares} shares</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Level Roadmap */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2">🏆 Sua jornada no Zei</h3>
        <div className="space-y-2">
          {LEVEL_CONFIGS.map((l, idx) => {
            const isCurrent = l.id === currentUser.level;
            const isUnlocked = LEVEL_CONFIGS.findIndex(x => x.id === currentUser.level) >= idx;
            return (
              <div
                key={l.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  isCurrent ? 'border-purple-200 bg-purple-50' : isUnlocked ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="text-2xl">{l.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isCurrent ? 'text-purple-700' : isUnlocked ? 'text-green-700' : 'text-gray-500'}`}>{l.name}</span>
                    {isCurrent && <Badge variant="purple">Atual</Badge>}
                    {isUnlocked && !isCurrent && <Badge variant="success">✓</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{formatCurrency(l.rewardPerConfirm)}/registro · {l.networkBonusPercent}% bônus de rede</p>
                </div>
                <Star className={`w-4 h-4 ${isUnlocked ? 'text-yellow-500' : 'text-gray-300'}`} fill={isUnlocked ? 'currentColor' : 'none'} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral CTA */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🔗</div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-sm">Seu código de convite</h4>
            <p className="text-xs text-gray-500 mt-0.5">Cada pessoa que você convidar gera renda passiva pra você!</p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 text-sm font-bold text-purple-600 bg-white border border-purple-200 rounded-lg px-2 py-1">
                {currentUser.referralCode}
              </code>
              <button
                onClick={() => setActiveTab('network')}
                className="text-xs font-semibold text-white bg-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Convidar
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
