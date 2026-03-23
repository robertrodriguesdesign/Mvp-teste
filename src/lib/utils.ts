import { UserLevel, LevelConfig } from './types';
import { LEVEL_CONFIGS } from './constants';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function getLevelConfig(level: UserLevel): LevelConfig {
  return LEVEL_CONFIGS.find(l => l.id === level)!;
}

export function getNextLevel(level: UserLevel): LevelConfig | null {
  const idx = LEVEL_CONFIGS.findIndex(l => l.id === level);
  return idx < LEVEL_CONFIGS.length - 1 ? LEVEL_CONFIGS[idx + 1] : null;
}

export function getLevelProgress(referrals: number, networkRegs: number, level: UserLevel): number {
  const next = getNextLevel(level);
  if (!next) return 100;
  const refProgress = Math.min(referrals / next.minReferrals, 1);
  const regProgress = next.minNetworkRegistrations > 0
    ? Math.min(networkRegs / next.minNetworkRegistrations, 1)
    : 1;
  return Math.round(((refProgress + regProgress) / 2) * 100);
}

export function generateReferralLink(code: string): string {
  return `https://zei.app/convite/${code}`;
}

export function getAlertSeverity(percentAbove: number): { label: string; color: string; bg: string } {
  if (percentAbove >= 80) return { label: 'ABSURDO', color: 'text-red-700', bg: 'bg-red-100 border-red-300' };
  if (percentAbove >= 40) return { label: 'CARO DEMAIS', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300' };
  return { label: 'ACIMA DA MÉDIA', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300' };
}

export function getMissionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    price_check: 'Verificação de Preço',
    shelf_audit: 'Auditoria de Gôndola',
    competitor_compare: 'Comparativo com Concorrente',
    treasure_hunt: 'Caça ao Tesouro',
  };
  return labels[type] || type;
}

export function getTimeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Expirado';
  if (days === 0) return 'Hoje!';
  if (days === 1) return '1 dia restante';
  return `${days} dias restantes`;
}

export function getMissionProgress(filled: number, total: number): number {
  return Math.round((filled / total) * 100);
}

export function abbreviateName(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
