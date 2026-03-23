'use client';

import { useState } from 'react';
import { Copy, Share2, Users, TrendingUp, ChevronRight, Check } from 'lucide-react';
import { useAppStore, networkUsers } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency, getLevelConfig, getNextLevel, getLevelProgress, generateReferralLink } from '@/lib/utils';
import { LEVEL_CONFIGS } from '@/lib/constants';

export function Network() {
  const { currentUser } = useAppStore();
  const level = getLevelConfig(currentUser.level);
  const nextLevel = getNextLevel(currentUser.level);
  const progress = getLevelProgress(
    currentUser.referrals.length,
    currentUser.networkSize * 8,
    currentUser.level,
  );

  const [copied, setCopied] = useState(false);
  const referralLink = generateReferralLink(currentUser.referralCode);

  const directReferrals = networkUsers.filter(u => currentUser.referrals.includes(u.id));

  const copyLink = () => {
    navigator.clipboard?.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `🛒 Você sabia que está pagando mais caro do que deveria?\n\n` +
      `Baixei o Zei e já descobri os melhores preços do meu bairro — e ainda ganho dinheiro de verdade registrando preços!\n\n` +
      `Entre pelo meu convite e ganhe R$5 de bônus: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Estimated monthly passive income
  const estimatedPassive = directReferrals.reduce((sum, u) => {
    return sum + (u.totalRegistrations / 30) * 0.10 * (level.networkBonusPercent / 100);
  }, 0) * 30;

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">Sua Rede</h2>
        <p className="text-sm text-gray-500">Recrute agentes e ganhe passivamente</p>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-black text-purple-600">{currentUser.referrals.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Diretos</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-black text-green-600">{currentUser.networkSize}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total na rede</div>
        </Card>
      </div>

      {/* Passive income estimate */}
      {level.networkBonusPercent > 0 && (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💰</div>
            <div>
              <p className="text-sm font-bold text-green-800">Renda passiva estimada</p>
              <p className="text-2xl font-black text-green-600">{formatCurrency(estimatedPassive)}<span className="text-sm font-normal">/mês</span></p>
              <p className="text-xs text-green-600 mt-0.5">{level.networkBonusPercent}% de {currentUser.referrals.length} pessoas registrando diariamente</p>
            </div>
          </div>
        </Card>
      )}

      {/* Referral Link */}
      <Card>
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-600" />
          Compartilhar convite
        </h4>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400 leading-none mb-1">Seu link</p>
            <p className="text-sm font-mono text-purple-600 truncate">{referralLink}</p>
          </div>
          <button
            onClick={copyLink}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <button
          onClick={shareWhatsApp}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.558 4.122 1.535 5.851L.057 23.447l5.73-1.504A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.893 9.893 0 01-5.045-1.381l-.361-.215-3.748.983.998-3.648-.235-.375A9.868 9.868 0 012.106 12C2.106 6.55 6.55 2.106 12 2.106S21.894 6.55 21.894 12 17.45 21.894 12 21.894z"/></svg>
          Convidar via WhatsApp
        </button>
      </Card>

      {/* Level Progress */}
      {nextLevel && (
        <Card className="border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{level.icon}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-xl">{nextLevel.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Próximo: {nextLevel.name}</p>
              <p className="text-xs text-gray-500">{nextLevel.requirements}</p>
            </div>
            <span className="text-sm font-bold text-purple-600">{progress}%</span>
          </div>
          <ProgressBar value={progress} color="purple" size="md" />
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Convidados diretos ativos</span>
              <span className={`font-semibold ${currentUser.referrals.length >= nextLevel.minReferrals ? 'text-green-600' : 'text-gray-700'}`}>
                {currentUser.referrals.length}/{nextLevel.minReferrals}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Registros na rede</span>
              <span className={`font-semibold ${currentUser.networkSize * 8 >= nextLevel.minNetworkRegistrations ? 'text-green-600' : 'text-gray-700'}`}>
                {currentUser.networkSize * 8}/{nextLevel.minNetworkRegistrations}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Direct Referrals */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-purple-600" />
          <h4 className="font-bold text-gray-900">Seus convidados diretos ({directReferrals.length})</h4>
        </div>
        <div className="space-y-2">
          {directReferrals.map(user => {
            const uLevel = getLevelConfig(user.level);
            const myEarnings = user.totalRegistrations * 0.10 * (level.networkBonusPercent / 100);
            return (
              <Card key={user.id} padding="sm">
                <div className="flex items-center gap-3">
                  <Avatar initials={user.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{user.name}</span>
                      <span className="text-sm">{uLevel.icon}</span>
                    </div>
                    <p className="text-xs text-gray-500">{user.totalRegistrations} registros · {user.neighborhood}</p>
                    <p className="text-xs text-gray-400">{user.referrals.length} sub-convidados</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {level.networkBonusPercent > 0 ? (
                      <>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(myEarnings)}</p>
                        <p className="text-xs text-gray-400">minha ganho</p>
                      </>
                    ) : (
                      <Badge variant="outline">Ativo</Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {directReferrals.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum convidado ainda</p>
              <p className="text-xs mt-1">Compartilhe seu link e comece a ganhar!</p>
            </div>
          )}
        </div>
      </div>

      {/* Level benefits comparison */}
      <div>
        <h4 className="font-bold text-gray-900 mb-3">🏆 Benefícios por nível</h4>
        <div className="space-y-2">
          {LEVEL_CONFIGS.map(l => {
            const isCurrent = l.id === currentUser.level;
            return (
              <Card key={l.id} padding="sm" className={isCurrent ? 'border-purple-300 bg-purple-50' : ''}>
                <div className="flex items-start gap-2">
                  <span className="text-xl">{l.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isCurrent ? 'text-purple-700' : 'text-gray-700'}`}>{l.name}</span>
                      {isCurrent && <Badge variant="purple">Você</Badge>}
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {l.perks.slice(0, 3).map((perk, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="text-green-500">✓</span> {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-green-600">{formatCurrency(l.rewardPerConfirm)}</p>
                    <p className="text-xs text-gray-400">/registro</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
