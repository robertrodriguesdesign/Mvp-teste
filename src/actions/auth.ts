'use server';

import { signIn, signOut } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';

// ─── Social Login ──────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/' });
}

export async function signInWithFacebook() {
  await signIn('facebook', { redirectTo: '/' });
}

export async function signOutUser() {
  await signOut({ redirectTo: '/' });
}

// ─── Email + Password Login ────────────────────────────────────────────────

export async function loginWithCredentials(_prevState: { error?: string | null }, formData: FormData): Promise<{ error?: string | null }> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email ou senha incorretos' };
    }
    throw error;
  }
  return { error: null };
}

// ─── Register ─────────────────────────────────────────────────────────────

export async function registerUser(_prevState: { error?: string | null; success?: boolean | null }, formData: FormData): Promise<{ error?: string | null; success?: boolean | null }> {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    password: formData.get('password') as string,
    neighborhood: formData.get('neighborhood') as string,
    city: formData.get('city') as string,
    referralCode: formData.get('referralCode') as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstError ?? 'Dados inválidos' };
  }

  const { name, email, phone, password, neighborhood, city, referralCode } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: 'Este email já está cadastrado' };

  const passwordHash = await bcrypt.hash(password, 10);

  let referredById: string | undefined;
  if (referralCode) {
    const referrer = await db.user.findUnique({ where: { referralCode } });
    referredById = referrer?.id;
  }

  const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const user = await db.user.create({
    data: {
      name, email, phone, passwordHash,
      neighborhood, city,
      referralCode: newReferralCode,
      referredById,
      walletBalance: 5.00,
    },
  });

  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'earn_bonus',
      amount: 5.00,
      description: 'Bônus de boas-vindas Zei 🎉',
    },
  });

  // Auto login after register
  try {
    await signIn('credentials', { email, password, redirectTo: '/' });
  } catch {
    // redirect throws, that's expected
  }

  return { success: true };
}
