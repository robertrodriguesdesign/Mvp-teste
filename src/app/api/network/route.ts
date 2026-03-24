import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/network — user's referral network with stats
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = session.user.id;

  // Direct referrals (level 1)
  const directReferrals = await db.user.findMany({
    where: { referredById: userId },
    select: {
      id: true, name: true, image: true, level: true,
      neighborhood: true, city: true, createdAt: true,
      _count: { select: { registrations: true, referrals: true } },
    },
  });

  // Level 2: referrals of referrals
  const level2Ids = directReferrals.flatMap(u => []);
  const level2Users = await db.user.findMany({
    where: { referredById: { in: directReferrals.map(u => u.id) } },
    select: {
      id: true, name: true, level: true, referredById: true,
      _count: { select: { registrations: true } },
    },
  });

  const networkSize = directReferrals.length + level2Users.length;

  // Estimated passive income based on level
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { level: true, walletBalance: true, referralCode: true },
  });

  const bonusPercent: Record<string, number> = { guardiao: 0.02, capitao: 0.05, embaixador: 0.10 };
  const pct = bonusPercent[currentUser?.level ?? 'explorador'] ?? 0;

  const estimatedMonthlyPassive = directReferrals.reduce((sum, u) => {
    const avgDailyRegs = u._count.registrations / 30;
    return sum + avgDailyRegs * 0.10 * pct * 30;
  }, 0);

  return NextResponse.json({
    directReferrals,
    level2Users,
    networkSize,
    referralCode: currentUser?.referralCode,
    estimatedMonthlyPassive,
  });
}
