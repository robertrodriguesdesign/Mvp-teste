import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// POST /api/missions/[id]/join
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const mission = await db.mission.findUnique({ where: { id } });
  if (!mission) return NextResponse.json({ error: 'Missão não encontrada' }, { status: 404 });
  if (mission.status !== 'active') {
    return NextResponse.json({ error: 'Missão não está ativa' }, { status: 400 });
  }

  const participant = await db.missionParticipant.upsert({
    where: { missionId_userId: { missionId: id, userId: session.user.id } },
    create: { missionId: id, userId: session.user.id },
    update: {},
  });

  return NextResponse.json(participant);
}
