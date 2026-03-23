'use client';

import { create } from 'zustand';
import { User, PriceRegistration, Mission, PriceAlert, LocalOffer, Transaction, Notification, Cart } from '@/lib/types';
import {
  CURRENT_USER, NETWORK_USERS, PRICE_REGISTRATIONS, MISSIONS,
  PRICE_ALERTS, LOCAL_OFFERS, TRANSACTIONS, NOTIFICATIONS, SAMPLE_CART,
} from '@/lib/mockData';

interface AppState {
  // Auth
  currentUser: User;
  isAuthenticated: boolean;

  // Data
  registrations: PriceRegistration[];
  missions: Mission[];
  alerts: PriceAlert[];
  offers: LocalOffer[];
  transactions: Transaction[];
  notifications: Notification[];
  cart: Cart;

  // UI State
  activeTab: string;

  // Actions
  setActiveTab: (tab: string) => void;
  addRegistration: (reg: PriceRegistration) => void;
  confirmRegistration: (regId: string) => void;
  joinMission: (missionId: string) => void;
  completeMission: (missionId: string) => void;
  markNotificationsRead: () => void;
  addTransaction: (tx: Transaction) => void;
  updateWalletBalance: (amount: number) => void;
  addCartItem: (item: Cart['items'][0]) => void;
  shareCart: () => void;
  shareAlert: (alertId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: CURRENT_USER,
  isAuthenticated: true,
  registrations: PRICE_REGISTRATIONS,
  missions: MISSIONS,
  alerts: PRICE_ALERTS,
  offers: LOCAL_OFFERS,
  transactions: TRANSACTIONS,
  notifications: NOTIFICATIONS,
  cart: SAMPLE_CART,
  activeTab: 'dashboard',

  setActiveTab: (tab) => set({ activeTab: tab }),

  addRegistration: (reg) => set((state) => ({
    registrations: [reg, ...state.registrations],
    currentUser: {
      ...state.currentUser,
      totalRegistrations: state.currentUser.totalRegistrations + 1,
    },
  })),

  confirmRegistration: (regId) => set((state) => {
    const reg = state.registrations.find(r => r.id === regId);
    if (!reg) return state;

    const alreadyConfirmed = reg.confirmedBy.includes(state.currentUser.id);
    if (alreadyConfirmed) return state;

    const updatedRegs = state.registrations.map(r =>
      r.id === regId
        ? { ...r, confirmedBy: [...r.confirmedBy, state.currentUser.id], status: r.confirmedBy.length + 1 >= 2 ? 'confirmed' as const : r.status }
        : r
    );

    // Credit 0.02 for confirming someone else's registration
    const creditAmount = 0.02;
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: state.currentUser.id,
      type: 'earn_registration',
      amount: creditAmount,
      description: `Confirmação: ${reg.productName}`,
      reference: regId,
      createdAt: new Date().toISOString(),
    };

    return {
      registrations: updatedRegs,
      transactions: [newTx, ...state.transactions],
      currentUser: { ...state.currentUser, walletBalance: state.currentUser.walletBalance + creditAmount },
    };
  }),

  joinMission: (missionId) => set((state) => {
    const mission = state.missions.find(m => m.id === missionId);
    if (!mission || mission.participants.includes(state.currentUser.id)) return state;

    return {
      missions: state.missions.map(m =>
        m.id === missionId
          ? { ...m, participants: [...m.participants, state.currentUser.id], filledSlots: m.filledSlots + 1 }
          : m
      ),
    };
  }),

  completeMission: (missionId) => set((state) => {
    const mission = state.missions.find(m => m.id === missionId);
    if (!mission || mission.completedBy.includes(state.currentUser.id)) return state;

    const reward = mission.rewardPerUser;
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: state.currentUser.id,
      type: 'earn_mission',
      amount: reward,
      description: `Missão concluída: ${mission.title}`,
      reference: missionId,
      createdAt: new Date().toISOString(),
    };

    return {
      missions: state.missions.map(m =>
        m.id === missionId
          ? { ...m, completedBy: [...m.completedBy, state.currentUser.id] }
          : m
      ),
      transactions: [newTx, ...state.transactions],
      currentUser: { ...state.currentUser, walletBalance: state.currentUser.walletBalance + reward },
    };
  }),

  markNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  })),

  addTransaction: (tx) => set((state) => ({
    transactions: [tx, ...state.transactions],
  })),

  updateWalletBalance: (amount) => set((state) => ({
    currentUser: { ...state.currentUser, walletBalance: state.currentUser.walletBalance + amount },
  })),

  addCartItem: (item) => set((state) => ({
    cart: {
      ...state.cart,
      items: [...state.cart.items, item],
      totalSpent: state.cart.totalSpent + item.price * item.quantity,
    },
  })),

  shareCart: () => set((state) => ({
    cart: { ...state.cart, shared: true },
  })),

  shareAlert: (alertId) => set((state) => ({
    alerts: state.alerts.map(a =>
      a.id === alertId ? { ...a, shares: a.shares + 1 } : a
    ),
  })),
}));

// Network users store (separate for referral network view)
export const networkUsers = NETWORK_USERS;
