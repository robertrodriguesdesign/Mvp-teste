'use client';

import { useState } from 'react';
import { MapPin, Camera, CheckCircle, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, getLevelConfig } from '@/lib/utils';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { PriceRegistration, Transaction } from '@/lib/types';
import { PRODUCTS } from '@/lib/mockData';

export function RegisterPrice() {
  const { currentUser, addRegistration, addTransaction, updateWalletBalance, setActiveTab, missions } = useAppStore();
  const level = getLevelConfig(currentUser.level);

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  const [form, setForm] = useState({
    productName: '',
    productCategory: PRODUCT_CATEGORIES[0],
    productBrand: '',
    price: '',
    unit: 'un',
    storeName: '',
    storeAddress: '',
    neighborhood: currentUser.neighborhood,
    city: currentUser.city,
  });

  const activeMissions = missions.filter(m =>
    m.status === 'active' &&
    !m.completedBy.includes(currentUser.id) &&
    m.targetCity === currentUser.city,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await new Promise(r => setTimeout(r, 800));

    const price = parseFloat(form.price);
    const reg: PriceRegistration = {
      id: `reg-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      productName: form.productName,
      productCategory: form.productCategory,
      productBrand: form.productBrand,
      price,
      unit: form.unit,
      storeName: form.storeName,
      storeAddress: form.storeAddress,
      neighborhood: form.neighborhood,
      city: form.city,
      state: currentUser.state,
      lat: -20.28 + (Math.random() * 0.05),
      lng: -40.30 + (Math.random() * 0.05),
      confirmedBy: [],
      flaggedBy: [],
      status: 'pending',
      registeredAt: new Date().toISOString(),
      missionId: selectedMission || undefined,
    };

    addRegistration(reg);

    // Earn reward
    const baseReward = level.rewardPerConfirm;
    const missionReward = selectedMission
      ? (activeMissions.find(m => m.id === selectedMission)?.rewardPerUser || 0)
      : 0;
    const totalReward = baseReward + missionReward;

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      type: missionReward > 0 ? 'earn_mission' : 'earn_registration',
      amount: totalReward,
      description: `Registro: ${form.productName}${missionReward > 0 ? ' (missão)' : ''}`,
      reference: reg.id,
      createdAt: new Date().toISOString(),
    };
    addTransaction(tx);
    updateWalletBalance(totalReward);

    setLoading(false);
    setStep('success');
  };

  if (step === 'success') {
    const missionBonus = selectedMission
      ? (activeMissions.find(m => m.id === selectedMission)?.rewardPerUser || 0)
      : 0;
    const totalEarned = level.rewardPerConfirm + missionBonus;

    return (
      <div className="pb-24 px-4 pt-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900">Registro enviado!</h2>
        <p className="text-gray-500 mt-1 text-sm">Quando confirmado pela comunidade, você ganha:</p>

        <div className="mt-4 w-full">
          <Card className="bg-green-50 border-green-200">
            <div className="text-center">
              <p className="text-3xl font-black text-green-600">+{formatCurrency(totalEarned)}</p>
              {missionBonus > 0 && (
                <p className="text-xs text-green-700 mt-1">
                  {formatCurrency(level.rewardPerConfirm)} base + {formatCurrency(missionBonus)} missão
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-6 space-y-3 w-full">
          <Card className="bg-blue-50 border-blue-200 text-left">
            <p className="text-sm text-blue-800 font-medium">💡 Dica: Compartilhe o desafio do carrinho!</p>
            <p className="text-xs text-blue-600 mt-1">Monte sua lista e mostre quanto você gastou no bairro. Quem entrar pelo seu link, vai para sua rede!</p>
          </Card>

          <Button variant="primary" fullWidth onClick={() => { setStep('form'); setSelectedMission(null); setForm({ ...form, productName: '', productBrand: '', price: '' }); }}>
            Registrar mais um preço
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setActiveTab('dashboard')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="mb-4">
        <h2 className="text-xl font-black text-gray-900">Registrar Preço</h2>
        <p className="text-sm text-gray-500">Cada registro confirmado vale <span className="font-bold text-purple-600">{formatCurrency(level.rewardPerConfirm)}</span> pra você</p>
      </div>

      {/* Mission selector */}
      {activeMissions.length > 0 && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-2">
            <span className="text-lg">🎯</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800">Vincular a uma missão paga</p>
              <p className="text-xs text-orange-600 mb-2">Ganhe até {formatCurrency(Math.max(...activeMissions.map(m => m.rewardPerUser)))} extra!</p>
              <div className="space-y-2">
                {activeMissions.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mission"
                      value={m.id}
                      checked={selectedMission === m.id}
                      onChange={() => setSelectedMission(m.id)}
                      className="text-orange-500"
                    />
                    <span className="text-xs text-gray-700 flex-1">{m.title}</span>
                    <Badge variant="warning">+{formatCurrency(m.rewardPerUser)}</Badge>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mission"
                    checked={selectedMission === null}
                    onChange={() => setSelectedMission(null)}
                  />
                  <span className="text-xs text-gray-500">Sem missão</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product search / name */}
        <div>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Produto *</label>
          <input
            required
            list="products-list"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
            placeholder="Ex: Arroz Agulhinha 5kg"
            value={form.productName}
            onChange={e => setForm({ ...form, productName: e.target.value })}
          />
          <datalist id="products-list">
            {PRODUCTS.map(p => (
              <option key={p.id} value={p.name}>{p.name} — avg {formatCurrency(p.avgPrice)}</option>
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Categoria *</label>
            <div className="relative">
              <select
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.productCategory}
                onChange={e => setForm({ ...form, productCategory: e.target.value })}
              >
                {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Marca</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Ex: Camil"
              value={form.productBrand}
              onChange={e => setForm({ ...form, productBrand: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Preço (R$) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="0,00"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Unidade</label>
            <div className="relative">
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
              >
                {['un', 'kg', 'g', 'L', 'ml', 'cx', 'dz', 'pc', 'lt'].map(u => <option key={u}>{u}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Nome do mercado *</label>
          <input
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="Ex: Supermercado Extra"
            value={form.storeName}
            onChange={e => setForm({ ...form, storeName: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Endereço</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="Av. Principal, 123"
            value={form.storeAddress}
            onChange={e => setForm({ ...form, storeAddress: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Bairro *</label>
            <input
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              value={form.neighborhood}
              onChange={e => setForm({ ...form, neighborhood: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">Cidade *</label>
            <input
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>

        {/* Location hint */}
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
          <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span>A localização GPS é registrada automaticamente para validar o check-in</span>
        </div>

        {/* Photo CTA */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-colors"
        >
          <Camera className="w-5 h-5" />
          Adicionar foto da etiqueta (opcional, +20% credibilidade)
        </button>

        {/* Submit */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Recompensa base</span>
            <span className="font-semibold text-gray-700">{formatCurrency(level.rewardPerConfirm)}</span>
          </div>
          {selectedMission && (
            <div className="flex justify-between text-xs">
              <span className="text-orange-600">Bônus de missão</span>
              <span className="font-semibold text-orange-600">+{formatCurrency(activeMissions.find(m => m.id === selectedMission)?.rewardPerUser || 0)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-1 mt-1">
            <span className="font-bold text-gray-800">Total ao confirmar</span>
            <span className="font-black text-green-600">
              +{formatCurrency(level.rewardPerConfirm + (selectedMission ? (activeMissions.find(m => m.id === selectedMission)?.rewardPerUser || 0) : 0))}
            </span>
          </div>
        </div>

        <Button type="submit" variant="primary" fullWidth size="lg" loading={loading}>
          Registrar Preço
        </Button>
      </form>
    </div>
  );
}
