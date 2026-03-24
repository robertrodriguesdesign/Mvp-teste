import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  email: z.string().email('Email inválido').trim(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  referralCode: z.string().optional(),
});

// ─── Price Registration ────────────────────────────────────────────────────

export const priceRegistrationSchema = z.object({
  productName: z.string().min(2, 'Nome do produto obrigatório'),
  productCategory: z.string().min(1),
  productBrand: z.string().optional(),
  price: z.number().positive('Preço deve ser positivo'),
  unit: z.string().default('un'),
  storeName: z.string().min(2, 'Nome do mercado obrigatório'),
  storeAddress: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  missionId: z.string().optional(),
});

// ─── Mission ───────────────────────────────────────────────────────────────

export const missionSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(['price_check', 'shelf_audit', 'competitor_compare', 'treasure_hunt']),
  productName: z.string().min(2),
  productBrand: z.string().optional(),
  targetCity: z.string().min(2),
  rewardPerUser: z.number().positive(),
  totalSlots: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  bonusForReferrals: z.number().optional(),
});

// ─── Withdraw ─────────────────────────────────────────────────────────────

export const withdrawSchema = z.object({
  amount: z.number().min(10, 'Mínimo R$10 para saque'),
  pixKey: z.string().min(3, 'Chave Pix inválida'),
});

// ─── Local Offer ───────────────────────────────────────────────────────────

export const localOfferSchema = z.object({
  storeName: z.string().min(2),
  storeCategory: z.string().min(2),
  storeAddress: z.string().min(2),
  neighborhood: z.string().min(2),
  city: z.string().min(2),
  productName: z.string().min(2),
  originalPrice: z.number().positive(),
  offerPrice: z.number().positive(),
  description: z.string().min(5),
  validUntil: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PriceRegistrationInput = z.infer<typeof priceRegistrationSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
