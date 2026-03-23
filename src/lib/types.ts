// ─── User & Network Types ──────────────────────────────────────────────────

export type UserLevel = 'explorador' | 'guardiao' | 'capitao' | 'embaixador';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  level: UserLevel;
  points: number;
  walletBalance: number;
  referralCode: string;
  referredBy: string | null;
  referrals: string[]; // direct referral user IDs
  neighborhood: string;
  city: string;
  state: string;
  registeredAt: string;
  totalRegistrations: number;
  confirmedRegistrations: number;
  networkSize: number; // total users below in network
}

export interface LevelConfig {
  id: UserLevel;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  requirements: string;
  rewardPerConfirm: number; // R$ per confirmed price
  networkBonusPercent: number; // % of network earnings
  perks: string[];
  minReferrals: number;
  minNetworkRegistrations: number;
}

// ─── Price Registration ────────────────────────────────────────────────────

export interface PriceRegistration {
  id: string;
  userId: string;
  userName: string;
  productName: string;
  productCategory: string;
  productBrand: string;
  price: number;
  unit: string;
  storeName: string;
  storeAddress: string;
  neighborhood: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  confirmedBy: string[];
  flaggedBy: string[];
  status: 'pending' | 'confirmed' | 'flagged';
  registeredAt: string;
  photo?: string;
  missionId?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  registrationCount: number;
}

// ─── Wallet & Rewards ──────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  userId: string;
  type: 'earn_registration' | 'earn_network' | 'earn_mission' | 'earn_bonus' | 'withdraw';
  amount: number;
  description: string;
  reference?: string;
  createdAt: string;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  amount: number;
  pixKey: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// ─── Missions (Brand Campaigns) ────────────────────────────────────────────

export type MissionStatus = 'active' | 'completed' | 'expired';
export type MissionType = 'price_check' | 'shelf_audit' | 'competitor_compare' | 'treasure_hunt';

export interface Mission {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo: string;
  title: string;
  description: string;
  type: MissionType;
  productName: string;
  productBrand: string;
  targetStores?: string[];
  targetNeighborhoods?: string[];
  targetCity: string;
  rewardPerUser: number; // R$ pago ao usuário
  brandCost: number; // R$ cobrado da marca (incluindo margem Zei)
  totalSlots: number;
  filledSlots: number;
  status: MissionStatus;
  expiresAt: string;
  createdAt: string;
  participants: string[];
  completedBy: string[];
  bonusForReferrals?: number; // bônus extra se trouxer amigos
}

// ─── Alerts ────────────────────────────────────────────────────────────────

export interface PriceAlert {
  id: string;
  productName: string;
  registrationId: string;
  price: number;
  avgPrice: number;
  percentAbove: number;
  storeName: string;
  neighborhood: string;
  city: string;
  reportedBy: string;
  createdAt: string;
  shares: number;
  confirmedCount: number;
}

// ─── Marketplace (Local Offers) ────────────────────────────────────────────

export interface LocalOffer {
  id: string;
  storeId: string;
  storeName: string;
  storeCategory: string;
  storeAddress: string;
  neighborhood: string;
  city: string;
  productName: string;
  originalPrice: number;
  offerPrice: number;
  discountPercent: number;
  description: string;
  validUntil: string;
  views: number;
  checkIns: number;
  costPerClick: number;
  costPerCheckIn: number;
  active: boolean;
  createdAt: string;
  distance?: number;
}

// ─── Neighborhood Ranking ──────────────────────────────────────────────────

export interface NeighborhoodRank {
  id: string;
  name: string;
  city: string;
  state: string;
  totalRegistrations: number;
  totalUsers: number;
  totalSavings: number;
  topContributor: string;
  weeklyGrowth: number;
  rank: number;
}

// ─── B2B Brand Dashboard ───────────────────────────────────────────────────

export interface BrandInsight {
  productName: string;
  brand: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceVariance: number;
  registrationCount: number;
  neighborhoodsPresent: number;
  competitorAvgPrice?: number;
  priceAboveCompetitor?: number;
}

// ─── Cart (for Cart Challenge) ─────────────────────────────────────────────

export interface CartItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  storeName: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalSpent: number;
  neighborhood: string;
  city: string;
  createdAt: string;
  shared: boolean;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: 'reward' | 'mission' | 'alert' | 'network' | 'level_up';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
