'use client';

import { useState } from 'react';
import { ShoppingCart, Share2, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

export function CartChallenge() {
  const { currentUser, cart, addCartItem, shareCart } = useAppStore();
  const [shared, setShared] = useState(cart.shared);
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1', store: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const totalSpent = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return;
    addCartItem({
      id: `ci-${Date.now()}`,
      productName: newItem.name,
      quantity: parseInt(newItem.quantity),
      price: parseFloat(newItem.price),
      storeName: newItem.store || 'Não informado',
    });
    setNewItem({ name: '', price: '', quantity: '1', store: '' });
    setShowAddForm(false);
  };

  const handleShare = () => {
    shareCart();
    setShared(true);

    const lines = cart.items.map(item =>
      `• ${item.productName} x${item.quantity} — ${formatCurrency(item.price)}`
    ).join('\n');

    const text = encodeURIComponent(
      `🛒 Desafio do Carrinho Zei!\n\n` +
      `Fiz minhas compras em ${cart.neighborhood}, ${cart.city} e gastei:\n\n` +
      `${lines}\n\n` +
      `💰 Total: ${formatCurrency(totalSpent)}\n\n` +
      `Quanto você gasta no seu bairro? Descubra e ainda ganhe dinheiro registrando preços!\n` +
      `👉 https://zei.app/convite/${currentUser.referralCode}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">🛒 Desafio do Carrinho</h2>
        <p className="text-sm text-gray-500">
          Registre suas compras e compare com outros bairros — cada compartilhamento traz alguém para sua rede!
        </p>
      </div>

      {/* How it works */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="space-y-2">
          {[
            { step: '1', text: 'Monte seu carrinho de compras aqui' },
            { step: '2', text: 'Compartilhe no WhatsApp/Instagram' },
            { step: '3', text: 'Quem clicar e baixar o app entra na SUA rede' },
            { step: '4', text: 'Você ganha passivamente quando eles registrarem preços' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">{step}</div>
              <p className="text-xs text-blue-800">{text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Cart items */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Meu Carrinho
          </h4>
          <span className="text-xs text-gray-500">{cart.neighborhood}, {cart.city}</span>
        </div>

        <div className="space-y-2 mb-3">
          {cart.items.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                <p className="text-xs text-gray-400">{item.storeName} · x{item.quantity}</p>
              </div>
              <p className="text-sm font-bold text-gray-700">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center py-3 border-t border-gray-100">
          <span className="font-bold text-gray-900">Total gasto</span>
          <span className="text-xl font-black text-purple-600">{formatCurrency(totalSpent)}</span>
        </div>

        {/* Add item form */}
        {showAddForm && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Nome do produto"
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.01"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Preço"
                value={newItem.price}
                onChange={e => setNewItem({ ...newItem, price: e.target.value })}
              />
              <input
                type="number"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Qtd"
                value={newItem.quantity}
                onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
              />
              <input
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Mercado"
                value={newItem.store}
                onChange={e => setNewItem({ ...newItem, store: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" fullWidth onClick={() => setShowAddForm(false)}>Cancelar</Button>
              <Button variant="primary" size="sm" fullWidth onClick={handleAddItem}>Adicionar</Button>
            </div>
          </div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar item
          </button>
        )}
      </Card>

      {/* Share card preview */}
      <Card className="bg-gradient-to-br from-purple-600 to-green-500 text-white">
        <p className="text-sm font-bold opacity-80 mb-1">Preview do card compartilhável</p>
        <h3 className="text-2xl font-black">Gastei {formatCurrency(totalSpent)}</h3>
        <p className="text-white/80 text-sm">no {cart.neighborhood}, {cart.city}</p>
        <p className="text-white/70 text-xs mt-2">Quanto você gasta no seu bairro? →</p>
      </Card>

      {/* Share CTA */}
      {shared ? (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-bold text-green-800">Compartilhado!</p>
              <p className="text-xs text-green-600">Cada download pelo seu link entra na sua rede. 💸</p>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="success" fullWidth size="lg" onClick={handleShare}>
          <Share2 className="w-5 h-5" />
          Compartilhar no WhatsApp
        </Button>
      )}

      <p className="text-xs text-gray-400 text-center">
        Pessoas que baixarem o app pelo seu link serão seus convidados diretos
      </p>
    </div>
  );
}
