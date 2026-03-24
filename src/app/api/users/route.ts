import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';

// GET /api/users — get current user profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      referrals: {
        select: {
          id: true, name: true, image: true, level: true,
          neighborhood: true, city: true,
          _count: { select: { registrations: true, referrals: true } },
        },
      },
      _count: {
        select: { registrations: true, referrals: true },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  // Remove sensitive fields
  const { passwordHash: _pw, ...safeUser } = user;
  return NextResponse.json(safeUser);
}

// POST /api/users — register new user (email+password)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, password, neighborhood, city, state, referralCode } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Find referrer
  let referredById: string | undefined;
  if (referralCode) {
    const referrer = await db.user.findUnique({ where: { referralCode } });
    referredById = referrer?.id;
  }

  const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      neighborhood,
      city,
      state,
      referralCode: newReferralCode,
      referredById,
      walletBalance: 5.00, // Bônus de boas-vindas
    },
  });

  // Welcome bonus transaction
  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'earn_bonus',
      amount: 5.00,
      description: 'Bônus de boas-vindas Zei 🎉',
    },
  });

  const { passwordHash: _pw, ...safeUser } = user;
  return NextResponse.json(safeUser, { status: 201 });
}
