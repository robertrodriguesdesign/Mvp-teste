'use client';

import { useState } from 'react';
import { Clock, Users, CheckCircle, Zap, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency, getTimeUntil, getMissionProgress, getMissionTypeLabel } from '@/lib/utils';
import { Mission } from '@/lib/types';

const missionTypeColors: Record<Mission['type'], string> = {
  price_check: 'text-blue-600 bg-blue-50',
  shelf_audit: 'text-green-600 bg-green-50',
  competitor_compare: 'text-orange-600 bg-orange-50',
  treasure_hunt: 'text-yellow-700 bg-yellow-50',
};

const missionTypeEmoji: Record<Mission['type'], string> = {
  price_check: '🔍',
  shelf_audit: '🛒',
  competitor_compare: '⚖️',
  treasure_hunt: '🏆',
};

export function Missions() {
  const { currentUser, missions, joinMission, completeMission, setActiveTab } = useAppStore();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completedNow, setCompletedNow] = useState<string | null>(null);

  const activeMissions = missions.filter(m => m.status === 'active');
  const myMissions = missions.filter(m => m.participants.includes(currentUser.id));
  const completedMissions = missions.filter(m => m.completedBy.includes(currentUser.id));

  const handleJoin = (mission: Mission) => {
    joinMission(mission.id);
    setSelectedMission({ ...mission, participants: [...mission.participants, currentUser.id] });
  };

  const handleComplete = async (missionId: string) => {
    setCompleting(true);
    await new Promise(r => setTimeout(r, 1000));
    completeMission(missionId);
    setCompletedNow(missionId);
    setCompleting(false);
    setSelectedMission(null);
  };

  if (selectedMission) {
    const joined = selectedMission.participants.includes(currentUser.id);
    const completed = selectedMission.completedBy.includes(currentUser.id);
    const prog = getMissionProgress(selectedMission.filledSlots, selectedMission.totalSlots);

    return (
      <div className="pb-24 px-4 pt-4">
        <button onClick={() => setSelectedMission(null)} className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          ← Voltar às missões
        </button>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${missionTypeColors[selectedMission.type]}`}>
          {missionTypeEmoji[selectedMission.type]} {getMissionTypeLabel(selectedMission.type)}
        </div>

        <h2 className="text-xl font-black text-gray-900 mb-1">{selectedMission.title}</h2>
        <p className="text-sm text-gray-500 mb-4">{selectedMission.description}</p>

        {/* Rewards */}
        <Card className="bg-green-50 border-green-200 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-green-700 font-medium">Sua recompensa</p>
              <p className="text-3xl font-black text-green-600">{formatCurrency(selectedMission.rewardPerUser)}</p>
            </div>
            {selectedMission.bonusForReferrals && (
              <div className="text-right">
                <p className="text-xs text-orange-700 font-medium">Bônus por amigos</p>
                <p className="text-xl font-black text-orange-600">+{formatCurrency(selectedMission.bonusForReferrals)}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Progress */}
        <Card className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Vagas preenchidas</span>
            <span className="text-sm font-bold text-purple-600">{prog}%</span>
          </div>
          <ProgressBar value={prog} color={prog > 80 ? 'orange' : 'purple'} size="md" />
          <p className="text-xs text-gray-500 mt-2">{selectedMission.filledSlots}/{selectedMission.totalSlots} participantes · {getTimeUntil(selectedMission.expiresAt)}</p>
        </Card>

        {/* Details */}
        <Card className="mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Produto</span>
            <span className="font-semibold">{selectedMission.productName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Marca patrocinadora</span>
            <span className="font-semibold">{selectedMission.brandName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Cidade-alvo</span>
            <span className="font-semibold">{selectedMission.targetCity}</span>
          </div>
          {selectedMission.targetNeighborhoods && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bairros prioritários</span>
              <span className="font-semibold">{selectedMission.targetNeighborhoods.join(', ')}</span>
            </div>
          )}
        </Card>

        {/* Referral bonus */}
        {selectedMission.bonusForReferrals && (
          <Card className="bg-orange-50 border-orange-200 mb-4">
            <p className="text-sm font-bold text-orange-800">🤝 Traga amigos, ganhe mais!</p>
            <p className="text-xs text-orange-600 mt-1">
              Se você convidar alguém que também complete esta missão, vocês dois ganham +{formatCurrency(selectedMission.bonusForReferrals)} de bônus coletivo!
            </p>
          </Card>
        )}

        {/* CTA */}
        {completed ? (
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-bold text-green-800">Missão concluída!</p>
                <p className="text-xs text-green-600">{formatCurrency(selectedMission.rewardPerUser)} creditados na carteira</p>
              </div>
            </div>
          </Card>
        ) : joined ? (
          <div className="space-y-3">
            <Card className="bg-blue-50 border-blue-200">
              <p className="text-sm font-bold text-blue-800">✅ Você está participando!</p>
              <p className="text-xs text-blue-600 mt-1">
                Vá ao mercado, registre o preço do {selectedMission.productName} e clique em "Concluir missão" abaixo.
              </p>
            </Card>
            <Button
              variant="success"
              fullWidth
              size="lg"
              loading={completing}
              onClick={() => handleComplete(selectedMission.id)}
            >
              ✓ Registrei — Concluir missão
            </Button>
            <Button variant="primary" fullWidth onClick={() => setActiveTab('register')}>
              Registrar preço agora
            </Button>
          </div>
        ) : (
          <Button variant="primary" fullWidth size="lg" onClick={() => handleJoin(selectedMission)}>
            Participar desta missão
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">Missões de Marcas</h2>
        <p className="text-sm text-gray-500">Ganhe dinheiro executando auditorias patrocinadas</p>
      </div>

      {completedNow && (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-bold text-green-800">Missão concluída! Valor creditado na carteira 🎉</p>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card padding="sm" className="text-center">
          <p className="text-xl font-black text-orange-500">{activeMissions.length}</p>
          <p className="text-[10px] text-gray-500">Abertas</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xl font-black text-blue-500">{myMissions.length}</p>
          <p className="text-[10px] text-gray-500">Em andamento</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xl font-black text-green-500">{completedMissions.length}</p>
          <p className="text-[10px] text-gray-500">Concluídas</p>
        </Card>
      </div>

      {/* Active Missions */}
      <div className="space-y-3">
        {activeMissions.map(mission => {
          const joined = mission.participants.includes(currentUser.id);
          const completed = mission.completedBy.includes(currentUser.id);
          const prog = getMissionProgress(mission.filledSlots, mission.totalSlots);
          const isUrgent = prog > 80;

          return (
            <Card key={mission.id} hover onClick={() => setSelectedMission(mission)} className={mission.type === 'treasure_hunt' ? 'border-yellow-200 bg-yellow-50' : ''}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-xl font-black text-gray-700 shadow-sm flex-shrink-0">
                  {mission.brandLogo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{mission.title}</p>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-base font-black text-green-600">{formatCurrency(mission.rewardPerUser)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{mission.description}</p>

                  <div className="mt-2">
                    <ProgressBar value={prog} color={isUrgent ? 'orange' : 'green'} />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-gray-400">{mission.filledSlots}/{mission.totalSlots} vagas</span>
                      <span className={`text-[10px] font-semibold ${isUrgent ? 'text-orange-600' : 'text-gray-400'}`}>{getTimeUntil(mission.expiresAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${missionTypeColors[mission.type]}`}>
                      {missionTypeEmoji[mission.type]} {getMissionTypeLabel(mission.type)}
                    </span>
                    {completed && <Badge variant="success">✓ Concluída</Badge>}
                    {joined && !completed && <Badge variant="purple">Participando</Badge>}
                    {mission.bonusForReferrals && <Badge variant="warning">+bônus coletivo</Badge>}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
            </Card>
          );
        })}
      </div>

      {/* B2B info */}
      <Card className="bg-gray-50 border-gray-200">
        <div className="flex items-start gap-2">
          <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-800">Você é uma marca?</p>
            <p className="text-xs text-gray-500 mt-0.5">Crie missões para nossa rede de agentes. Auditoria de preços e gôndola por uma fração do custo tradicional.</p>
            <button className="text-xs text-purple-600 font-semibold mt-2">Saiba mais →</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
