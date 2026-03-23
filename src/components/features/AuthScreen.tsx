'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';

interface AuthScreenProps {
  referralCode?: string;
  onAuth: () => void;
}

export function AuthScreen({ referralCode, onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>(referralCode ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    neighborhood: '', city: 'Vitória',
    referral: referralCode || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    onAuth();
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-purple-600 via-purple-700 to-green-600 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 text-white text-center">
        <div className="mb-6">
          <h1 className="text-5xl font-black tracking-tight">ZEI</h1>
          <p className="text-white/80 text-sm tracking-widest font-medium mt-1">PREÇO JUSTO</p>
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-3">
          O IBGE do seu bairro,<br />construído por você
        </h2>
        <p className="text-white/70 text-sm max-w-xs">
          Registre preços, recrute sua rede e ganhe <strong className="text-white">dinheiro real</strong> com as compras do dia a dia
        </p>

        {referralCode && (
          <div className="mt-4 bg-white/20 backdrop-blur rounded-xl px-4 py-2">
            <p className="text-sm">🎁 Você foi convidado! Ganhe <strong>R$5,00</strong> de bônus</p>
          </div>
        )}
      </div>

      {/* Auth card */}
      <div className="bg-white rounded-t-3xl px-5 pt-6 pb-8">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          )}

          <input
            required
            type="email"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="E-mail"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />

          {mode === 'register' && (
            <input
              required
              type="tel"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Telefone (WhatsApp)"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          )}

          <input
            required
            type="password"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="Senha"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />

          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Bairro"
                  value={form.neighborhood}
                  onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                />
                <input
                  required
                  className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Cidade"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Código de convite (opcional)"
                  value={form.referral}
                  onChange={e => setForm({ ...form, referral: e.target.value })}
                />
                {form.referral && (
                  <p className="text-xs text-green-600 mt-1 ml-1">🎁 Bônus de R$5 aplicado!</p>
                )}
              </div>
            </>
          )}

          <Button type="submit" variant="primary" fullWidth size="lg" loading={loading} className="mt-2">
            {mode === 'login' ? 'Entrar no Zei' : 'Criar minha conta'}
          </Button>
        </form>

        {mode === 'register' && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Ao criar sua conta você concorda com os Termos de Uso e Política de Privacidade do Zei
          </p>
        )}

        {/* Demo shortcut */}
        <button
          onClick={onAuth}
          className="w-full mt-3 text-xs text-gray-400 underline text-center"
        >
          Entrar como João (demo)
        </button>
      </div>
    </div>
  );
}
