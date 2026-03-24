import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/wallet/transactions
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const take = parseInt(searchParams.get('take') || '50');

  const [transactions, user] = await Promise.all([
    db.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { walletBalance: true },
    }),
  ]);

  const totalEarned = transactions
    .filter(t => t.type !== 'withdraw')
    .reduce((s, t) => s + t.amount, 0);

  const totalWithdrawn = transactions
    .filter(t => t.type === 'withdraw')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const networkEarnings = transactions
    .filter(t => t.type === 'earn_network')
    .reduce((s, t) => s + t.amount, 0);

  return NextResponse.json({
    balance: user?.walletBalance ?? 0,
    totalEarned,
    totalWithdrawn,
    networkEarnings,
    transactions,
  });
}
