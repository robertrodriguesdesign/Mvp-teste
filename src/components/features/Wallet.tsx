'use client';

import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, getLevelConfig } from '@/lib/utils';
import { MIN_WITHDRAW_AMOUNT } from '@/lib/constants';
import { Transaction } from '@/lib/types';

const txIcons: Record<Transaction['type'], { icon: React.ComponentType<{className?: string}>, color: string, label: string }> = {
  earn_registration: { icon: TrendingUp, color: 'text-green-500', label: 'Registro' },
  earn_network: { icon: ArrowDownCircle, color: 'text-blue-500', label: 'Rede' },
  earn_mission: { icon: TrendingUp, color: 'text-orange-500', label: 'Missão' },
  earn_bonus: { icon: TrendingUp, color: 'text-purple-500', label: 'Bônus' },
  withdraw: { icon: ArrowUpCircle, color: 'text-gray-500', label: 'Saque' },
};

export function Wallet() {
  const { currentUser, transactions, addTransaction, updateWalletBalance } = useAppStore();
  const level = getLevelConfig(currentUser.level);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawDone, setWithdrawDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const canWithdraw = currentUser.walletBalance >= MIN_WITHDRAW_AMOUNT;

  const totalEarned = transactions
    .filter(t => t.type !== 'withdraw' && t.userId === currentUser.id)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawn = transactions
    .filter(t => t.type === 'withdraw' && t.userId === currentUser.id)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const networkEarnings = transactions
    .filter(t => t.type === 'earn_network' && t.userId === currentUser.id)
    .reduce((sum, t) => sum + t.amount, 0);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!pixKey || !amt || amt < MIN_WITHDRAW_AMOUNT || amt > currentUser.walletBalance) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      type: 'withdraw',
      amount: -amt,
      description: `Saque via Pix — ${pixKey}`,
      createdAt: new Date().toISOString(),
    };
    addTransaction(tx);
    updateWalletBalance(-amt);
    setLoading(false);
    setWithdrawDone(true);
    setShowWithdraw(false);
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <h2 className="text-xl font-black text-gray-900">Carteira Zei</h2>

      {/* Balance Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="zei-gradient p-5 text-white">
          <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Saldo disponível</p>
          <h3 className="text-4xl font-black">{formatCurrency(currentUser.walletBalance)}</h3>
          <p className="text-white/70 text-sm mt-1">Saque mínimo: {formatCurrency(MIN_WITHDRAW_AMOUNT)} via Pix</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="text-center py-3">
            <p className="text-xs text-gray-500">Total ganho</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(totalEarned)}</p>
          </div>
          <div className="text-center py-3">
            <p className="text-xs text-gray-500">Sacado</p>
            <p className="text-sm font-bold text-gray-700">{formatCurrency(totalWithdrawn)}</p>
          </div>
          <div className="text-center py-3">
            <p className="text-xs text-gray-500">Da rede</p>
            <p className="text-sm font-bold text-blue-600">{formatCurrency(networkEarnings)}</p>
          </div>
        </div>
      </Card>

      {/* Earnings breakdown */}
      <Card>
        <h4 className="text-sm font-bold text-gray-900 mb-3">Como você ganha</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-600">Por registro confirmado</span>
            </div>
            <span className="text-xs font-bold text-green-600">{formatCurrency(level.rewardPerConfirm)}</span>
          </div>
          {level.networkBonusPercent > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs text-gray-600">Bônus de rede (nível {level.name})</span>
              </div>
              <span className="text-xs font-bold text-blue-600">{level.networkBonusPercent}%</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-xs text-gray-600">Missões de marcas</span>
            </div>
            <span className="text-xs font-bold text-orange-600">R$2 a R$5</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-xs text-gray-600">Confirmações de outros</span>
            </div>
            <span className="text-xs font-bold text-purple-600">R$0,02</span>
          </div>
        </div>
      </Card>

      {/* Withdraw */}
      {withdrawDone && (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-bold text-green-800">Saque solicitado!</p>
              <p className="text-xs text-green-600">Você receberá via Pix em até 1 dia útil.</p>
            </div>
          </div>
        </Card>
      )}

      {!showWithdraw ? (
        <Button
          variant={canWithdraw ? 'success' : 'secondary'}
          fullWidth
          size="lg"
          disabled={!canWithdraw}
          onClick={() => setShowWithdraw(true)}
        >
          {canWithdraw ? '💸 Sacar via Pix' : `Mínimo R$${MIN_WITHDRAW_AMOUNT} para sacar`}
        </Button>
      ) : (
        <Card className="border-green-200">
          <h4 className="font-bold text-gray-900 mb-3">Saque via Pix</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Chave Pix</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Valor (disponível: {formatCurrency(currentUser.walletBalance)})
              </label>
              <input
                type="number"
                min={MIN_WITHDRAW_AMOUNT}
                max={currentUser.walletBalance}
                step="0.01"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                placeholder={`Mínimo ${formatCurrency(MIN_WITHDRAW_AMOUNT)}`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setShowWithdraw(false)}>Cancelar</Button>
              <Button variant="success" fullWidth loading={loading} onClick={handleWithdraw}>Confirmar</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction History */}
      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-3">Histórico de movimentações</h4>
        <div className="space-y-2">
          {transactions.filter(t => t.userId === currentUser.id).map(tx => {
            const meta = txIcons[tx.type];
            const Icon = meta.icon;
            const isPositive = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-green-50' : 'bg-gray-100'}`}>
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(tx.createdAt)}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-gray-600'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                  </p>
                  <Badge variant={meta.label === 'Saque' ? 'outline' : 'success'} size="sm">{meta.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
