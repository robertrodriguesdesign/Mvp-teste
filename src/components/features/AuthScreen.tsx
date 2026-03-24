'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { signInWithGoogle, signInWithFacebook, loginWithCredentials, registerUser } from '@/actions/auth';

interface AuthScreenProps {
  referralCode?: string;
  onAuth: () => void;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export function AuthScreen({ referralCode, onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>(referralCode ? 'register' : 'login');
  const [loginState, loginAction, loginPending] = useActionState(loginWithCredentials, { error: null });
  const [registerState, registerAction, registerPending] = useActionState(registerUser, { error: null, success: null });

  // For demo mode (no OAuth credentials configured)
  const handleDemoLogin = onAuth;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-purple-600 via-purple-700 to-green-600 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 text-white text-center">
        <div className="mb-4">
          <h1 className="text-5xl font-black tracking-tight">ZEI</h1>
          <p className="text-white/80 text-sm tracking-widest font-medium mt-1">PREÇO JUSTO</p>
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-2">
          O IBGE do seu bairro,<br />construído por você
        </h2>
        <p className="text-white/70 text-sm max-w-xs">
          Registre preços, recrute sua rede e ganhe{' '}
          <strong className="text-white">dinheiro real</strong> com as compras do dia a dia
        </p>
        {referralCode && (
          <div className="mt-4 bg-white/20 backdrop-blur rounded-xl px-4 py-2">
            <p className="text-sm">🎁 Você foi convidado! Ganhe <strong>R$5,00</strong> de bônus</p>
          </div>
        )}
      </div>

      {/* Auth Card */}
      <div className="bg-white rounded-t-3xl px-5 pt-6 pb-8 space-y-4">
        {/* Tab selector */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
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

        {/* Social Login */}
        <div className="space-y-2">
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <GoogleIcon />
              Continuar com Google
            </button>
          </form>
          <form action={signInWithFacebook}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-3 bg-[#1877F2] rounded-xl text-sm font-semibold text-white hover:bg-[#1565C0] transition-all"
            >
              <FacebookIcon />
              Continuar com Facebook
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ou use seu email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Error messages */}
        {(loginState.error || registerState.error) && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-sm text-red-600">{loginState.error || registerState.error}</p>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form action={loginAction} className="space-y-3">
            <input
              name="email"
              type="email"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Seu email"
            />
            <input
              name="password"
              type="password"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Senha"
            />
            <Button type="submit" variant="primary" fullWidth size="lg" loading={loginPending}>
              Entrar no Zei
            </Button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form action={registerAction} className="space-y-3">
            <input
              name="name"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Seu nome completo"
            />
            <input
              name="email"
              type="email"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Email"
            />
            <input
              name="phone"
              type="tel"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Telefone (WhatsApp)"
            />
            <input
              name="password"
              type="password"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Senha (mínimo 6 caracteres)"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="neighborhood"
                className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Bairro"
              />
              <input
                name="city"
                className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Cidade"
              />
            </div>
            <div className="relative">
              <input
                name="referralCode"
                defaultValue={referralCode}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Código de convite (opcional)"
              />
              {referralCode && (
                <p className="text-xs text-green-600 mt-1 ml-1">🎁 Bônus de R$5 aplicado!</p>
              )}
            </div>
            <Button type="submit" variant="primary" fullWidth size="lg" loading={registerPending}>
              Criar minha conta grátis
            </Button>
            <p className="text-xs text-gray-400 text-center">
              Ao criar sua conta você concorda com os Termos de Uso do Zei
            </p>
          </form>
        )}

        {/* Demo shortcut */}
        <button
          onClick={handleDemoLogin}
          className="w-full text-xs text-gray-400 underline text-center py-1"
        >
          Entrar no modo demonstração →
        </button>
      </div>
    </div>
  );
}
