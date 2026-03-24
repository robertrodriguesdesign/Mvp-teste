import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/alerts — get price alerts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const take = parseInt(searchParams.get('take') || '20');

  const alerts = await db.priceAlert.findMany({
    where: { ...(city && { city }) },
    orderBy: [{ percentAbove: 'desc' }, { createdAt: 'desc' }],
    take,
  });

  return NextResponse.json(alerts);
}

// POST /api/alerts/[id]/share — increment share count
export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const alert = await db.priceAlert.update({
    where: { id },
    data: { shares: { increment: 1 } },
  });

  return NextResponse.json(alert);
}
