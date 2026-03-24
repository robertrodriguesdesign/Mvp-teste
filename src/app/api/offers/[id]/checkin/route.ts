import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// POST /api/offers/[id]/checkin
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;

  const offer = await db.localOffer.update({
    where: { id },
    data: { checkIns: { increment: 1 } },
  });

  return NextResponse.json({ success: true, checkIns: offer.checkIns });
}
