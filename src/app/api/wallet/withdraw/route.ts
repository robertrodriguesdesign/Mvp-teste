import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { withdrawSchema } from '@/lib/validations';

// POST /api/wallet/withdraw
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { amount, pixKey } = parsed.data;
  const userId = session.user.id;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  if (user.walletBalance < amount) {
    return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
  }

  const [withdraw] = await db.$transaction([
    db.withdrawRequest.create({
      data: { userId, amount, pixKey, status: 'pending' },
    }),
    db.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: amount } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: 'withdraw',
        amount: -amount,
        description: `Saque via Pix — ${pixKey}`,
      },
    }),
  ]);

  return NextResponse.json({ success: true, withdrawId: withdraw.id });
}
