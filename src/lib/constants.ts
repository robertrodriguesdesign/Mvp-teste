import { LevelConfig } from './types';

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 'explorador',
    name: 'Explorador',
    icon: '🔍',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Começa a jornada registrando preços',
    requirements: 'Primeiro registro confirmado',
    rewardPerConfirm: 0.05,
    networkBonusPercent: 0,
    perks: ['R$0,05 por registro confirmado', 'Acesso ao ranking de bairro', 'Carteira Zei'],
    minReferrals: 0,
    minNetworkRegistrations: 0,
  },
  {
    id: 'guardiao',
    name: 'Guardião do Bairro',
    icon: '🛡️',
    color: 'text-green-500',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Referência no seu bairro',
    requirements: '5 convidados com 3+ registros cada',
    rewardPerConfirm: 0.10,
    networkBonusPercent: 2,
    perks: [
      'R$0,10 por registro confirmado',
      '2% dos ganhos da rede direto',
      'Território desbloqueado (bairro)',
      'Badge de Guardião no perfil',
    ],
    minReferrals: 5,
    minNetworkRegistrations: 15,
  },
  {
    id: 'capitao',
    name: 'Capitão de Região',
    icon: '⚔️',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 border-purple-200',
    description: 'Lidera uma rede de agentes de preço',
    requirements: 'Convidados diretos com 10+ pessoas ativas cada',
    rewardPerConfirm: 0.20,
    networkBonusPercent: 5,
    perks: [
      'R$0,20 por registro confirmado',
      '5% dos ganhos de 2 níveis abaixo',
      'Acesso antecipado a missões pagas',
      'Badge de Capitão no perfil',
      'Painel de analytics da rede',
    ],
    minReferrals: 5,
    minNetworkRegistrations: 65,
  },
  {
    id: 'embaixador',
    name: 'Embaixador Zei',
    icon: '👑',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 border-yellow-200',
    description: 'Top contribuidor do estado',
    requirements: 'Top contribuidores por estado',
    rewardPerConfirm: 0.50,
    networkBonusPercent: 10,
    perks: [
      'R$0,50 por registro confirmado',
      '10% dos ganhos de toda a rede abaixo',
      'Convites para eventos exclusivos',
      'Canal direto com a equipe Zei',
      'Comissão em campanhas de marcas',
      'Badge de Embaixador Zei',
    ],
    minReferrals: 10,
    minNetworkRegistrations: 200,
  },
];

export const PRODUCT_CATEGORIES = [
  'Hortifrúti',
  'Carnes & Aves',
  'Laticínios',
  'Padaria',
  'Bebidas',
  'Higiene & Limpeza',
  'Mercearia',
  'Congelados',
  'Pet',
  'Outros',
];

export const SUSPICIOUS_PRICE_THRESHOLD = 1.5; // 50% above average triggers alert

export const MIN_WITHDRAW_AMOUNT = 10; // R$10 mínimo para saque

export const ZEI_MARGIN_ON_MISSIONS = 0.75; // 75% de margem sobre missões (paga R$2, cobra R$3.50)
